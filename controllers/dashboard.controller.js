const mongoose = require('mongoose');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const Favorite = require('../models/favorite.model');
const Review = require('../models/review.model');
const Message = require('../models/message.model');
const Point = require('../models/point.model');
const logger = require('../utils/logger');

/**
 * Get comprehensive dashboard statistics for an agent/user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.api('Dashboard Stats Request:', {
      userId,
      timestamp: new Date().toISOString()
    });

    // Get user details
    const user = await User.findById(userId).select('email firstName lastName isAgent pointBalance agentId role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Use agentId if available (for agent role), otherwise use userId
    const queryId = (user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;

    // Parallel queries for better performance
    // Build listing filter to check both agent (legacy) and agentId fields
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;
    
    // Ensure userId is converted to ObjectId for proper matching (required by Favorite schema)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.error('Invalid userId format in dashboard stats:', { userId });
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    const userIdObj = new mongoose.Types.ObjectId(userId);
    
    const listingFilter = {
      $or: [
        { agent: queryId },
        { agentId: queryIdObj }
      ],
      isDeleted: { $ne: true }
    };

    // Optimized: Combine listing counts into single aggregation
    const listingCounts = await Listing.aggregate([
      {
        $match: listingFilter
      },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Extract counts from aggregation result
    const countsMap = {};
    listingCounts.forEach(item => {
      countsMap[item._id || 'total'] = item.count;
    });
    
    const totalListings = countsMap.total || Object.values(countsMap).reduce((sum, count) => sum + count, 0);
    const pendingListings = countsMap.pending || 0;
    const approvedListings = countsMap.approved || 0;

    const [
      totalFavorites,
      totalReviews,
      messageStats,
      pointBalance
    ] = await Promise.all([
      
      // Optimized: Total favorites - use $lookup with pipeline for better performance
      Favorite.aggregate([
        {
          $match: {
            userId: userIdObj
          }
        },
        {
          $lookup: {
            from: 'listings',
            let: { propId: '$propertyId' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$propId'] },
                  isDeleted: { $ne: true }
                }
              },
              {
                $limit: 1
              }
            ],
            as: 'property'
          }
        },
        {
          $match: {
            'property.0': { $exists: true } // Only favorites with valid (non-deleted) listings
          }
        },
        {
          $count: 'total'
        }
      ]).then(result => result[0]?.total || 0),
      
      // Optimized: Total reviews - propertyId is already ObjectId, no conversion needed
      // Use $lookup with pipeline for better performance
      Review.aggregate([
        {
          $lookup: {
            from: 'listings',
            let: { propId: '$propertyId' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$propId'] },
                  agentId: queryIdObj,
                  isDeleted: { $ne: true }
                }
              },
              {
                $limit: 1
              }
            ],
            as: 'property'
          }
        },
        {
          $match: {
            'property.0': { $exists: true } // Only reviews for valid listings
          }
        },
        {
          $count: 'total'
        }
      ]).then(result => result[0]?.total || 0),
      
      // Optimized: Combine unread and total message counts in single aggregation
      Message.aggregate([
        {
          $match: {
            $or: [
              { recipientId: userIdObj },
              { agentId: userIdObj },
              { agentId: queryIdObj }
            ]
          }
        },
        {
          $lookup: {
            from: 'listings',
            let: { propId: '$propertyId' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$propId'] },
                  isDeleted: { $ne: true }
                }
              },
              {
                $limit: 1
              }
            ],
            as: 'property'
          }
        },
        {
          $match: {
            'property.0': { $exists: true } // Only messages for valid listings
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: {
              $sum: {
                $cond: [{ $eq: ['$status', 'unread'] }, 1, 0]
              }
            }
          }
        }
      ]).then(result => {
        const stats = result[0] || { total: 0, unread: 0 };
        return { total: stats.total, unread: stats.unread };
      }),
      
      // Point balance - use lean() for read-only query
      Point.findOne({ userId: userIdObj }).select('balance').lean()
    ]);

    // Extract message stats
    const unreadMessages = messageStats?.unread || 0;
    const totalMessages = messageStats?.total || 0;

    // Calculate additional metrics
    const listingLimit = user.isAgent ? 50 : 10; // Agents get 50, regular users get 10
    const remainingListings = Math.max(0, listingLimit - totalListings);
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Optimized: Recent activity counts (countDocuments is already optimized)
    const recentActivity = await Promise.all([
      Listing.countDocuments({
        ...listingFilter,
        createdAt: { $gte: sevenDaysAgo }
      }),
      Favorite.countDocuments({
        userId: userIdObj,
        createdAt: { $gte: sevenDaysAgo }
      }),
      Message.countDocuments({
        $or: [
          { agentId: userIdObj },
          { agentId: queryIdObj }
        ],
        createdAt: { $gte: sevenDaysAgo }
      })
    ]);

    // Optimized: Calculate average rating - use $lookup with pipeline, no $toObjectId needed
    const reviewsForAgent = await Review.aggregate([
      {
        $lookup: {
          from: 'listings',
          let: { propId: '$propertyId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$propId'] },
                agentId: queryIdObj,
                isDeleted: { $ne: true }
              }
            },
            {
              $limit: 1
            }
          ],
          as: 'property'
        }
      },
      {
        $match: {
          'property.0': { $exists: true } // Only reviews for valid listings
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);
    
    const averageRating = reviewsForAgent.length > 0 ? reviewsForAgent[0].averageRating : 0;

    // Prepare response data
    const dashboardData = {
      // Core metrics
      balance: pointBalance?.balance || user.pointBalance || 0,
      totalListings,
      pendingListings,
      approvedListings,
      totalFavorites,
      totalReviews: reviewsForAgent.length > 0 ? reviewsForAgent[0].totalReviews : 0,
      averageRating: parseFloat(averageRating.toFixed(2)),
      unreadMessages,
      totalMessages,
      
      // Additional info
      listingLimit,
      remainingListings,
      averageRating: parseFloat(averageRating),
      
      // Recent activity (last 7 days)
      recentActivity: {
        newListings: recentActivity[0],
        newFavorites: recentActivity[1],
        newMessages: recentActivity[2]
      },
      
      // User info
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAgent: user.isAgent
      },
      
      // Status indicators
      status: {
        hasUnreadMessages: unreadMessages > 0,
        hasPendingListings: pendingListings > 0,
        isNearListingLimit: remainingListings <= 5,
        hasLowBalance: (pointBalance?.balance || 0) < 100
      }
    };

    logger.api('Dashboard Stats Response:', {
      userId,
      totalListings,
      pendingListings,
      approvedListings,
      totalFavorites,
      averageRating,
      unreadMessages,
      totalMessages,
      balance: pointBalance?.balance || 0
    });

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: dashboardData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get detailed dashboard analytics with charts data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y

    logger.api('Dashboard Analytics Request:', {
      userId,
      period,
      timestamp: new Date().toISOString()
    });

    // Get user details to check for agentId
    const user = await User.findById(userId).select('agentId role');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;
    
    // Build ObjectId for proper matching
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get analytics data
    const [
      listingsOverTime,
      favoritesOverTime,
      messagesOverTime,
      reviewsOverTime,
      topPerformingListings,
      monthlyStats
    ] = await Promise.all([
      // Listings created over time
      Listing.aggregate([
        {
          $match: {
            $or: [
              { agent: queryId },
              { agentId: queryIdObj }
            ],
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // Favorites over time
      Favorite.aggregate([
        {
          $match: {
            userId: userIdObj,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // Messages over time - check both recipientId and agentId
      Message.aggregate([
        {
          $match: {
            $or: [
              { recipientId: userId },
              { agentId: userId },
              { agentId: queryId }
            ],
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // Optimized: Reviews over time - use $lookup with pipeline, no $toObjectId needed
      Review.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'listings',
            let: { propId: '$propertyId' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$propId'] },
                  agentId: queryIdObj,
                  isDeleted: { $ne: true }
                }
              },
              {
                $limit: 1
              }
            ],
            as: 'property'
          }
        },
        {
          $match: {
            'property.0': { $exists: true } // Only reviews for valid listings
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // Optimized: Top performing listings - use lean() for read-only query
      Listing.find({
        $or: [
          { agent: queryId },
          { agentId: queryIdObj }
        ],
        isDeleted: { $ne: true }
      })
      .select('propertyTitle propertyPrice visitCount createdAt')
      .sort({ visitCount: -1 })
      .limit(5)
      .lean(),

      // Monthly statistics
      Listing.aggregate([
        {
          $match: {
            $or: [
              { agent: queryId },
              { agentId: queryIdObj }
            ],
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalListings: { $sum: 1 },
            totalVisits: { $sum: '$visitCount' },
            avgPrice: { $avg: '$propertyPrice' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Format data for charts
    const formatChartData = (data, label) => {
      return data.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        value: item.count || item.avgRating || 0,
        label: label
      }));
    };

    const analyticsData = {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      
      // Chart data
      charts: {
        listingsOverTime: formatChartData(listingsOverTime, 'Listings'),
        favoritesOverTime: formatChartData(favoritesOverTime, 'Favorites'),
        messagesOverTime: formatChartData(messagesOverTime, 'Messages'),
        reviewsOverTime: formatChartData(reviewsOverTime, 'Reviews')
      },
      
      // Top performing listings
      topPerformingListings: topPerformingListings.map(listing => ({
        id: listing._id,
        title: listing.propertyTitle || 'Untitled Property',
        price: listing.propertyPrice || 0,
        visits: listing.visitCount || 0,
        createdAt: listing.createdAt
      })),
      
      // Monthly statistics
      monthlyStats: monthlyStats.map(stat => ({
        month: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
        totalListings: stat.totalListings,
        totalVisits: stat.totalVisits,
        avgPrice: Math.round(stat.avgPrice || 0)
      })),
      
      // Summary
      summary: {
        totalDataPoints: listingsOverTime.length + favoritesOverTime.length + messagesOverTime.length + reviewsOverTime.length,
        periodDays: Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)),
        dataCompleteness: '100%' // Could be calculated based on expected vs actual data points
      }
    };

    logger.api('Dashboard Analytics Response:', {
      userId,
      period,
      dataPoints: analyticsData.summary.totalDataPoints,
      topListings: topPerformingListings.length
    });

    res.json({
      success: true,
      message: 'Dashboard analytics retrieved successfully',
      data: analyticsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dashboard Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard analytics',
      error: error.message
    });
  }
};

/**
 * Get dashboard notifications and alerts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    logger.api('Dashboard Notifications Request:', {
      userId,
      timestamp: new Date().toISOString()
    });

    // Get user details to check for agentId reference
    const user = await User.findById(userId).select('agentId role');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;

    // Build ObjectId for proper matching
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Get various notifications
    const [
      unreadMessages,
      pendingListings,
      lowBalance,
      expiringListings,
      newReviews
    ] = await Promise.all([
      // Optimized: Unread messages - use lean() for read-only query
      Message.find({
        $or: [
          { recipientId: userIdObj },
          { agentId: userIdObj },
          { agentId: queryIdObj }
        ],
        status: 'unread' // Use status field instead of isRead
      }).select('senderName senderEmail subject createdAt').limit(5).lean(),

      // Optimized: Pending listings - use lean() for read-only query
      Listing.find({
        $or: [
          { agent: queryId },
          { agentId: queryIdObj }
        ],
        approvalStatus: 'pending',
        isDeleted: { $ne: true }
      }).select('propertyTitle createdAt').limit(5).lean(),

      // Low balance check
      Point.findOne({ userId: userIdObj }).select('balance'),

      // Optimized: Expiring listings - use lean() for read-only query
      Listing.find({
        $or: [
          { agent: queryId },
          { agentId: queryIdObj }
        ],
        createdAt: { $lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        isDeleted: { $ne: true }
      }).select('propertyTitle createdAt').limit(5).lean(),

      // Optimized: Recent reviews - use $lookup with pipeline, no $toObjectId needed
      Review.aggregate([
        {
          $lookup: {
            from: 'listings',
            let: { propId: '$propertyId' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$propId'] },
                  agentId: queryIdObj,
                  isDeleted: { $ne: true }
                }
              },
              {
                $limit: 1
              }
            ],
            as: 'property'
          }
        },
        {
          $match: {
            'property.0': { $exists: true } // Only reviews for valid listings
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $limit: 5
        },
        {
          $project: {
            rating: 1,
            comment: 1,
            createdAt: 1
          }
        }
      ])
    ]);

    const notifications = [];

    // Add notifications based on conditions
    if (unreadMessages.length > 0) {
      notifications.push({
        type: 'message',
        priority: 'high',
        title: `${unreadMessages.length} unread message${unreadMessages.length > 1 ? 's' : ''}`,
        message: `You have ${unreadMessages.length} unread message${unreadMessages.length > 1 ? 's' : ''}`,
        count: unreadMessages.length,
        data: unreadMessages
      });
    }

    if (pendingListings.length > 0) {
      notifications.push({
        type: 'listing',
        priority: 'medium',
        title: `${pendingListings.length} pending listing${pendingListings.length > 1 ? 's' : ''}`,
        message: `You have ${pendingListings.length} listing${pendingListings.length > 1 ? 's' : ''} awaiting approval`,
        count: pendingListings.length,
        data: pendingListings
      });
    }

    if (lowBalance && lowBalance.balance < 100) {
      notifications.push({
        type: 'balance',
        priority: 'high',
        title: 'Low balance warning',
        message: `Your balance is $${lowBalance.balance}. Consider adding more points.`,
        count: 1,
        data: { balance: lowBalance.balance }
      });
    }

    if (expiringListings.length > 0) {
      notifications.push({
        type: 'expiring',
        priority: 'low',
        title: `${expiringListings.length} listing${expiringListings.length > 1 ? 's' : ''} may need renewal`,
        message: `Consider renewing or updating your older listings`,
        count: expiringListings.length,
        data: expiringListings
      });
    }

    if (newReviews.length > 0) {
      notifications.push({
        type: 'review',
        priority: 'medium',
        title: `${newReviews.length} recent review${newReviews.length > 1 ? 's' : ''}`,
        message: `You have received ${newReviews.length} new review${newReviews.length > 1 ? 's' : ''}`,
        count: newReviews.length,
        data: newReviews
      });
    }

    logger.api('Dashboard Notifications Response:', {
      userId,
      notificationCount: notifications.length,
      types: notifications.map(n => n.type)
    });

    res.json({
      success: true,
      message: 'Dashboard notifications retrieved successfully',
      data: {
        notifications,
        totalCount: notifications.length,
        unreadCount: notifications.filter(n => n.priority === 'high').length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dashboard Notifications Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard notifications',
      error: error.message
    });
  }
};

/**
 * Get conversion rate tracking (views → inquiries → contacts)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getConversionRates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    logger.api('Conversion Rates Request:', { userId, period });

    const user = await User.findById(userId).select('agentId role');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setDate(now.getDate() - 30);
    }

    // Get all listings for this agent
    const listings = await Listing.find({
      $or: [{ agent: queryId }, { agentId: queryIdObj }],
      isDeleted: { $ne: true }
    }).select('_id visitCount').lean();

    const listingIds = listings.map(l => l._id);
    
    // Get total views (sum of all visitCount)
    const totalViews = listings.reduce((sum, l) => sum + (l.visitCount || 0), 0);

    // Get inquiries (messages)
    const totalInquiries = await Message.countDocuments({
      propertyId: { $in: listingIds },
      createdAt: { $gte: startDate }
    });

    // Get contacts (inquiries with phone or email)
    const totalContacts = await Message.countDocuments({
      propertyId: { $in: listingIds },
      createdAt: { $gte: startDate },
      $or: [
        { senderPhone: { $exists: true, $ne: null, $ne: '' } },
        { senderEmail: { $exists: true, $ne: null, $ne: '' } }
      ]
    });

    // Calculate conversion rates
    const viewsToInquiriesRate = totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(2) : 0;
    const inquiriesToContactsRate = totalInquiries > 0 ? ((totalContacts / totalInquiries) * 100).toFixed(2) : 0;
    const viewsToContactsRate = totalViews > 0 ? ((totalContacts / totalViews) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      message: 'Conversion rates retrieved successfully',
      data: {
        period,
        funnel: {
          views: totalViews,
          inquiries: totalInquiries,
          contacts: totalContacts
        },
        rates: {
          viewsToInquiries: parseFloat(viewsToInquiriesRate),
          inquiriesToContacts: parseFloat(inquiriesToContactsRate),
          viewsToContacts: parseFloat(viewsToContactsRate)
        },
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Conversion Rates Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversion rates',
      error: error.message
    });
  }
};

/**
 * Get top performing properties (enhanced)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTopPerformingProperties = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5, sortBy = 'visits' } = req.query; // visits, inquiries, conversion

    logger.api('Top Performing Properties Request:', { userId, limit, sortBy });

    const user = await User.findById(userId).select('agentId role');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;

    // Get all listings
    const listings = await Listing.find({
      $or: [{ agent: queryId }, { agentId: queryIdObj }],
      isDeleted: { $ne: true }
    }).lean();

    const listingIds = listings.map(l => l._id);

    // Get message counts per listing
    const messageCounts = await Message.aggregate([
      {
        $match: {
          propertyId: { $in: listingIds }
        }
      },
      {
        $group: {
          _id: '$propertyId',
          inquiryCount: { $sum: 1 },
          contactCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $ne: ['$senderPhone', null] },
                    { $ne: ['$senderEmail', null] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Create map for quick lookup
    const messageMap = {};
    messageCounts.forEach(item => {
      messageMap[item._id.toString()] = {
        inquiries: item.inquiryCount,
        contacts: item.contactCount
      };
    });

    // Enrich listings with message data and calculate conversion
    const enrichedListings = listings.map(listing => {
      const msgData = messageMap[listing._id.toString()] || { inquiries: 0, contacts: 0 };
      const visits = listing.visitCount || 0;
      const inquiries = msgData.inquiries;
      const contacts = msgData.contacts;
      
      const conversionRate = visits > 0 ? ((inquiries / visits) * 100).toFixed(2) : 0;

      return {
        id: listing._id,
        title: listing.propertyTitle || listing.propertyDesc || 'Untitled Property',
        price: listing.propertyPrice || 0,
        visits: visits,
        inquiries: inquiries,
        contacts: contacts,
        conversionRate: parseFloat(conversionRate),
        createdAt: listing.createdAt
      };
    });

    // Sort based on sortBy parameter
    let sortedListings = [...enrichedListings];
    switch (sortBy) {
      case 'inquiries':
        sortedListings.sort((a, b) => b.inquiries - a.inquiries);
        break;
      case 'conversion':
        sortedListings.sort((a, b) => b.conversionRate - a.conversionRate);
        break;
      case 'contacts':
        sortedListings.sort((a, b) => b.contacts - a.contacts);
        break;
      default: // 'visits'
        sortedListings.sort((a, b) => b.visits - a.visits);
    }

    const topProperties = sortedListings.slice(0, parseInt(limit));

    res.json({
      success: true,
      message: 'Top performing properties retrieved successfully',
      data: {
        properties: topProperties,
        sortBy,
        limit: parseInt(limit),
        totalListings: listings.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Top Performing Properties Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve top performing properties',
      error: error.message
    });
  }
};

/**
 * Get stats comparison (Month over Month, Year over Year)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getStatsComparison = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'mom' } = req.query; // 'mom' or 'yoy'

    logger.api('Stats Comparison Request:', { userId, type });

    const user = await User.findById(userId).select('agentId role');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;

    const now = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    if (type === 'yoy') {
      // Year over Year
      const currentYear = now.getFullYear();
      currentStart = new Date(currentYear, 0, 1);
      currentEnd = new Date(currentYear, 11, 31, 23, 59, 59);
      previousStart = new Date(currentYear - 1, 0, 1);
      previousEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59);
    } else {
      // Month over Month
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      currentStart = new Date(currentYear, currentMonth, 1);
      currentEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      previousStart = new Date(currentYear, currentMonth - 1, 1);
      previousEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    }

    const listingFilter = {
      $or: [{ agent: queryId }, { agentId: queryIdObj }],
      isDeleted: { $ne: true }
    };

    const listingIds = (await Listing.find(listingFilter).select('_id').lean()).map(l => l._id);

    // Get current period stats
    const [currentListings, currentMessages, currentViews] = await Promise.all([
      Listing.countDocuments({
        ...listingFilter,
        createdAt: { $gte: currentStart, $lte: currentEnd }
      }),
      Message.countDocuments({
        propertyId: { $in: listingIds },
        createdAt: { $gte: currentStart, $lte: currentEnd }
      }),
      Listing.aggregate([
        {
          $match: {
            ...listingFilter,
            createdAt: { $gte: currentStart, $lte: currentEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$visitCount', 0] } }
          }
        }
      ])
    ]);

    // Get previous period stats
    const [previousListings, previousMessages, previousViews] = await Promise.all([
      Listing.countDocuments({
        ...listingFilter,
        createdAt: { $gte: previousStart, $lte: previousEnd }
      }),
      Message.countDocuments({
        propertyId: { $in: listingIds },
        createdAt: { $gte: previousStart, $lte: previousEnd }
      }),
      Listing.aggregate([
        {
          $match: {
            ...listingFilter,
            createdAt: { $gte: previousStart, $lte: previousEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$visitCount', 0] } }
          }
        }
      ])
    ]);

    const currentViewsTotal = (currentViews && currentViews.length > 0 && currentViews[0]) ? (currentViews[0].total || 0) : 0;
    const previousViewsTotal = (previousViews && previousViews.length > 0 && previousViews[0]) ? (previousViews[0].total || 0) : 0;

    // Calculate percentage change
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return (((current - previous) / previous) * 100).toFixed(2);
    };

    const stats = {
      listings: {
        current: currentListings,
        previous: previousListings,
        change: parseFloat(calculateChange(currentListings, previousListings))
      },
      views: {
        current: currentViewsTotal,
        previous: previousViewsTotal,
        change: parseFloat(calculateChange(currentViewsTotal, previousViewsTotal))
      },
      inquiries: {
        current: currentMessages,
        previous: previousMessages,
        change: parseFloat(calculateChange(currentMessages, previousMessages))
      }
    };

    res.json({
      success: true,
      message: 'Stats comparison retrieved successfully',
      data: {
        type,
        currentPeriod: {
          start: currentStart.toISOString(),
          end: currentEnd.toISOString()
        },
        previousPeriod: {
          start: previousStart.toISOString(),
          end: previousEnd.toISOString()
        },
        comparison: stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Stats Comparison Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stats comparison',
      error: error.message
    });
  }
};

/**
 * Get listing health score for all agent listings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getListingHealthScores = async (req, res) => {
  try {
    const userId = req.user.id;

    logger.api('Listing Health Scores Request:', { userId });

    const user = await User.findById(userId).select('agentId role');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;

    const listings = await Listing.find({
      $or: [{ agent: queryId }, { agentId: queryIdObj }],
      isDeleted: { $ne: true }
    }).lean();

    const listingIds = listings.map(l => l._id);

    // Get message counts per listing
    const messageCounts = await Message.aggregate([
      {
        $match: {
          propertyId: { $in: listingIds }
        }
      },
      {
        $group: {
          _id: '$propertyId',
          inquiryCount: { $sum: 1 }
        }
      }
    ]);

    const messageMap = {};
    messageCounts.forEach(item => {
      messageMap[item._id.toString()] = item.inquiryCount;
    });

    // Calculate health score for each listing
    const healthScores = listings.map(listing => {
      const visits = listing.visitCount || 0;
      const inquiries = messageMap[listing._id.toString()] || 0;

      // Completeness score (40 points)
      let completeness = 0;
      if (listing.propertyDesc && listing.propertyDesc.trim()) completeness += 10;
      if (listing.images && listing.images.length >= 7) completeness += 10;
      else if (listing.images && listing.images.length >= 4) completeness += 7;
      else if (listing.images && listing.images.length > 0) completeness += 4;
      if (listing.bedrooms && listing.bathrooms && listing.size) completeness += 10;
      if (listing.address && listing.address.trim()) completeness += 10;

      // Engagement score (40 points)
      let engagement = 0;
      if (visits > 100) engagement += 15;
      else if (visits > 50) engagement += 10;
      else if (visits > 10) engagement += 5;
      if (inquiries > 10) engagement += 15;
      else if (inquiries > 5) engagement += 10;
      else if (inquiries > 0) engagement += 5;
      const conversionRate = visits > 0 ? (inquiries / visits) : 0;
      if (conversionRate > 0.1) engagement += 10;
      else if (conversionRate > 0.05) engagement += 7;
      else if (conversionRate > 0) engagement += 4;

      // Performance score (20 points)
      let performance = 0;
      if (visits > 0 && inquiries > 0) {
        const avgResponseTime = 24; // Assume 24 hours average (would need actual response time data)
        if (avgResponseTime < 12) performance += 10;
        else if (avgResponseTime < 24) performance += 7;
        else performance += 4;
        if (conversionRate > 0.1) performance += 10;
        else if (conversionRate > 0.05) performance += 7;
        else if (conversionRate > 0) performance += 4;
      }

      const totalScore = completeness + engagement + performance;

      // Recommendations
      const recommendations = [];
      if (completeness < 30) {
        if (!listing.propertyDesc) recommendations.push('Add detailed description');
        if (!listing.images || listing.images.length < 7) recommendations.push('Add more photos (7 recommended)');
        if (!listing.address) recommendations.push('Add full address');
      }
      if (engagement < 20) {
        if (visits < 10) recommendations.push('Promote this listing to get more views');
        if (inquiries === 0) recommendations.push('Improve listing description to attract inquiries');
      }
      if (performance < 10) {
        recommendations.push('Respond to inquiries faster');
      }

      return {
        id: listing._id,
        title: listing.propertyTitle || listing.propertyDesc || 'Untitled Property',
        score: totalScore,
        breakdown: {
          completeness,
          engagement,
          performance
        },
        metrics: {
          visits,
          inquiries,
          conversionRate: parseFloat((conversionRate * 100).toFixed(2))
        },
        recommendations
      };
    });

    // Sort by score (descending)
    healthScores.sort((a, b) => b.score - a.score);

    // Calculate average score
    const avgScore = healthScores.length > 0
      ? (healthScores.reduce((sum, item) => sum + item.score, 0) / healthScores.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      message: 'Listing health scores retrieved successfully',
      data: {
        listings: healthScores,
        averageScore: parseFloat(avgScore),
        totalListings: healthScores.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Listing Health Scores Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve listing health scores',
      error: error.message
    });
  }
};

/**
 * Get lead pipeline (categorize messages by status/stage)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLeadPipeline = async (req, res) => {
  try {
    const userId = req.user.id;

    logger.api('Lead Pipeline Request:', { userId });

    const user = await User.findById(userId).select('agentId role');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;

    // Get all listings
    const listings = await Listing.find({
      $or: [{ agent: queryId }, { agentId: queryIdObj }],
      isDeleted: { $ne: true }
    }).select('_id').lean();

    const listingIds = listings.map(l => l._id);

    // Get all messages
    const messages = await Message.find({
      propertyId: { $in: listingIds }
    }).lean();

    // Categorize messages into pipeline stages
    const pipeline = {
      new: [], // unread messages
      interested: [], // read but not replied
      followUp: [], // replied messages
      showing: [], // messages with specific showing keywords (future enhancement)
      negotiation: [], // messages with price/offer keywords (future enhancement)
      closed: [] // archived messages
    };

    messages.forEach(msg => {
      if (msg.status === 'archived') {
        pipeline.closed.push({
          id: msg._id,
          name: msg.senderName,
          email: msg.senderEmail,
          phone: msg.senderPhone,
          propertyId: msg.propertyId,
          subject: msg.subject,
          message: msg.message,
          status: msg.status,
          createdAt: msg.createdAt
        });
      } else if (msg.status === 'replied') {
        pipeline.followUp.push({
          id: msg._id,
          name: msg.senderName,
          email: msg.senderEmail,
          phone: msg.senderPhone,
          propertyId: msg.propertyId,
          subject: msg.subject,
          message: msg.message,
          status: msg.status,
          createdAt: msg.createdAt,
          respondedAt: msg.respondedAt
        });
      } else if (msg.status === 'read') {
        pipeline.interested.push({
          id: msg._id,
          name: msg.senderName,
          email: msg.senderEmail,
          phone: msg.senderPhone,
          propertyId: msg.propertyId,
          subject: msg.subject,
          message: msg.message,
          status: msg.status,
          createdAt: msg.createdAt,
          readAt: msg.readAt
        });
      } else {
        // unread
        pipeline.new.push({
          id: msg._id,
          name: msg.senderName,
          email: msg.senderEmail,
          phone: msg.senderPhone,
          propertyId: msg.propertyId,
          subject: msg.subject,
          message: msg.message,
          status: msg.status,
          createdAt: msg.createdAt
        });
      }
    });

    // Calculate conversion rates between stages
    const totalLeads = messages.length;
    const newToInterestedRate = pipeline.new.length > 0
      ? ((pipeline.interested.length / (pipeline.new.length + pipeline.interested.length)) * 100).toFixed(2)
      : 0;
    const interestedToFollowUpRate = (pipeline.interested.length + pipeline.followUp.length) > 0
      ? ((pipeline.followUp.length / (pipeline.interested.length + pipeline.followUp.length)) * 100).toFixed(2)
      : 0;
    const followUpToClosedRate = (pipeline.followUp.length + pipeline.closed.length) > 0
      ? ((pipeline.closed.length / (pipeline.followUp.length + pipeline.closed.length)) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      message: 'Lead pipeline retrieved successfully',
      data: {
        pipeline: {
          new: {
            count: pipeline.new.length,
            leads: pipeline.new
          },
          interested: {
            count: pipeline.interested.length,
            leads: pipeline.interested
          },
          followUp: {
            count: pipeline.followUp.length,
            leads: pipeline.followUp
          },
          showing: {
            count: pipeline.showing.length,
            leads: pipeline.showing
          },
          negotiation: {
            count: pipeline.negotiation.length,
            leads: pipeline.negotiation
          },
          closed: {
            count: pipeline.closed.length,
            leads: pipeline.closed
          }
        },
        totalLeads,
        conversionRates: {
          newToInterested: parseFloat(newToInterestedRate),
          interestedToFollowUp: parseFloat(interestedToFollowUpRate),
          followUpToClosed: parseFloat(followUpToClosedRate)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Lead Pipeline Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve lead pipeline',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getDashboardAnalytics,
  getDashboardNotifications,
  getConversionRates,
  getTopPerformingProperties,
  getStatsComparison,
  getListingHealthScores,
  getLeadPipeline
};
