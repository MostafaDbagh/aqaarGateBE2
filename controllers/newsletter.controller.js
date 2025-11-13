const Newsletter = require('../models/newsletter.model');
const errorHandler = require('../utils/error');

// Subscribe to newsletter
const subscribeNewsletter = async (req, res, next) => {
  try {
    const { email, source = 'website', preferences = {} } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase() });

    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return res.status(409).json({
          success: false,
          message: 'Email is already subscribed to our newsletter'
        });
      } else {
        // Reactivate subscription
        existingSubscriber.isActive = true;
        existingSubscriber.unsubscribedAt = null;
        existingSubscriber.source = source;
        existingSubscriber.preferences = { ...existingSubscriber.preferences, ...preferences };
        await existingSubscriber.save();

        return res.status(200).json({
          success: true,
          message: 'Welcome back! You have been resubscribed to our newsletter',
          data: {
            email: existingSubscriber.email,
            subscribedAt: existingSubscriber.subscribedAt,
            preferences: existingSubscriber.preferences
          }
        });
      }
    }

    // Create new subscription
    const newSubscriber = await Newsletter.create({
      email: email.toLowerCase(),
      source,
      preferences: {
        propertyUpdates: preferences.propertyUpdates !== false,
        marketNews: preferences.marketNews !== false,
        promotions: preferences.promotions !== false
      }
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      data: {
        email: newSubscriber.email,
        subscribedAt: newSubscriber.subscribedAt,
        preferences: newSubscriber.preferences
      }
    });

  } catch (error) {
    next(error);
  }
};

// Unsubscribe from newsletter
const unsubscribeNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const subscriber = await Newsletter.findOne({ email: email.toLowerCase() });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our newsletter subscription list'
      });
    }

    if (!subscriber.isActive) {
      return res.status(409).json({
        success: false,
        message: 'Email is already unsubscribed'
      });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });

  } catch (error) {
    next(error);
  }
};

// Get all subscribers (admin only)
const getAllSubscribers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { isActive, source, search } = req.query;

    // Build filter object
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (source) filter.source = source;
    if (search) {
      filter.email = { $regex: search, $options: 'i' };
    }

    const subscribers = await Newsletter.find(filter)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Newsletter.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: subscribers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get subscription statistics
const getSubscriptionStats = async (req, res, next) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments({ isActive: true });
    const totalUnsubscribed = await Newsletter.countDocuments({ isActive: false });
    
    const sourceStats = await Newsletter.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    const monthlyStats = await Newsletter.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: {
            year: { $year: '$subscribedAt' },
            month: { $month: '$subscribedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: {
          active: totalSubscribers,
          inactive: totalUnsubscribed
        },
        bySource: sourceStats,
        monthly: monthlyStats
      }
    });

  } catch (error) {
    next(error);
  }
};

// Update subscription preferences
const updatePreferences = async (req, res, next) => {
  try {
    const { email, preferences } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const subscriber = await Newsletter.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found'
      });
    }

    subscriber.preferences = { ...subscriber.preferences, ...preferences };
    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        email: subscriber.email,
        preferences: subscriber.preferences
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getAllSubscribers,
  getSubscriptionStats,
  updatePreferences
};
