const Message = require('../models/message.model.js');
const User = require('../models/user.model.js');
const Listing = require('../models/listing.model.js');
const mongoose = require('mongoose');
const errorHandler = require('../utils/error.js');
const logger = require('../utils/logger');

const normalizeIdentifier = (value) => {
  if (!value) return value;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === 'object' && value._id) {
    return value._id.toString();
  }
  return value;
};

// Get messages for a specific agent with filtering and pagination
const getMessagesByAgent = async (req, res, next) => {
  try {
    let agentId = req.params.agentId;
    if (!agentId) {
      return next(errorHandler(400, 'Agent ID is required'));
    }

    // Check if this is a user ID that might have an agentId reference
    const user = await User.findById(agentId).select('agentId role');
    logger.debug('🔍 getMessagesByAgent - User lookup:', { userId: agentId, found: !!user, hasAgentId: !!(user && user.agentId) });
    
    if (user && user.role === 'agent' && user.agentId) {
      // Use the agent's ID from the agents collection
      const oldAgentId = agentId;
      agentId = user.agentId.toString();
      logger.debug('✅ Using agentId from user:', { oldId: oldAgentId, newId: agentId });
    }

    // Get pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const status = req.query.status; // 'unread', 'read', 'replied', 'archived', 'all'
    const messageType = req.query.messageType; // 'inquiry', 'info'
    const propertyId = req.query.propertyId; // MongoDB ObjectId
    const property_id = req.query.property_id; // Actual property ID string (e.g., "PROP_thread_id")
    const search = req.query.search; // Search in sender name, email, subject, or message

    // Build filter object - check both user and agent IDs
    const isObjectId = mongoose.Types.ObjectId.isValid(agentId);
    const agentIdObj = isObjectId ? new mongoose.Types.ObjectId(agentId) : agentId;
    const userAgentIdObj = user && user._id ? new mongoose.Types.ObjectId(user._id.toString()) : agentIdObj;
    
    let filter = { 
      $or: [
        { agentId: agentIdObj },
        { agentId: userAgentIdObj }
      ]
    };

    // Add status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Add message type filter
    if (messageType && messageType !== 'all') {
      filter.messageType = messageType;
    }

    // Add property filter
    // Note: property_id takes precedence over propertyId if both are provided
    let hasPropertyIdFilter = false;
    
    // Add property_id filter (filter by actual property ID string field)
    if (property_id && property_id !== 'all' && property_id.trim() !== '') {
      // Find listings with matching propertyId field
      const listings = await Listing.find({ 
        propertyId: property_id.trim(),
        isDeleted: { $ne: true }
      }).select('_id');
      
      if (listings.length > 0) {
        // Filter messages by the ObjectIds of matching listings
        const listingIds = listings.map(listing => listing._id);
        filter.propertyId = { $in: listingIds };
        hasPropertyIdFilter = true;
      } else {
        // No matching listings found, return empty results
        filter.propertyId = new mongoose.Types.ObjectId(); // Invalid ObjectId that won't match anything
        hasPropertyIdFilter = true;
      }
    }
    
    // Add propertyId filter (filter by MongoDB ObjectId) - only if property_id was not provided
    if (!hasPropertyIdFilter && propertyId && propertyId !== 'all') {
      // Filter by MongoDB ObjectId
      if (mongoose.Types.ObjectId.isValid(propertyId)) {
        filter.propertyId = new mongoose.Types.ObjectId(propertyId);
      }
    }

    // Add search filter
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { senderName: searchRegex },
        { senderEmail: searchRegex },
        { subject: searchRegex },
        { message: searchRegex }
      ];
    }

    // Get messages with pagination and populate property details
    const messages = await Message.find(filter)
      .populate('propertyId', 'propertyId propertyKeyword propertyPrice status propertyType images address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Message.countDocuments(filter);

    // Get statistics - use same filter logic
    const stats = await Message.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get agent's properties for filter dropdown
    const agentProperties = await Listing.find({ 
      $or: [
        { agent: agentId },
        { agentId: agentIdObj }
      ],
      isDeleted: { $ne: true }
    }).select('_id propertyKeyword propertyPrice status propertyType').limit(50);

    // Format statistics
    const statusStats = {
      total: total,
      unread: 0,
      read: 0,
      replied: 0,
      archived: 0
    };

    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      },
      stats: statusStats,
      filterOptions: {
        properties: agentProperties
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single message by ID
const getMessageById = async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const message = await Message.findById(messageId)
      .populate('propertyId', 'propertyId propertyKeyword propertyPrice status propertyType images address')
      .populate('agentId', 'username email fullName');

    if (!message) {
      return next(errorHandler(404, 'Message not found'));
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// Mark message as read
const markAsRead = async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const message = await Message.findByIdAndUpdate(
      messageId,
      { 
        status: 'replied',
        readAt: new Date(),
        respondedAt: new Date()
      },
      { new: true }
    );

    if (!message) {
      return next(errorHandler(404, 'Message not found'));
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// Reply to a message
const replyToMessage = async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const { response } = req.body;

    if (!response || response.trim() === '') {
      return next(errorHandler(400, 'Response is required'));
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      { 
        response: response.trim(),
        status: 'replied',
        respondedAt: new Date()
      },
      { new: true }
    ).populate('propertyId', 'propertyId propertyKeyword propertyPrice status propertyType');

    if (!message) {
      return next(errorHandler(404, 'Message not found'));
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// Archive a message
const archiveMessage = async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const message = await Message.findByIdAndUpdate(
      messageId,
      { 
        status: 'archived',
        archivedAt: new Date()
      },
      { new: true }
    );

    if (!message) {
      return next(errorHandler(404, 'Message not found'));
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// Create a new message (for contact forms)
const createMessage = async (req, res, next) => {
  try {
    let {
      propertyId,
      agentId,
      senderName,
      senderEmail,
      senderPhone,
      subject,
      message,
      messageType = 'inquiry'
    } = req.body;

    propertyId = normalizeIdentifier(propertyId);
    agentId = normalizeIdentifier(agentId);

    // Validation
    if (!propertyId || !agentId || !senderName || !senderEmail || !subject || !message) {
      return next(errorHandler(400, 'All required fields must be provided'));
    }

    // Handle agentId - could be email, user ID, or name
    let finalAgentId = agentId;
    
    // Check if it's a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(agentId)) {
      // It's already a valid ObjectId, use it
      finalAgentId = agentId;
    } else if (agentId.includes('@')) {
      // Check if agentId is an email
      const user = await User.findOne({ email: agentId });
      if (!user) {
        return next(errorHandler(404, 'Agent not found with the provided email'));
      }
      finalAgentId = user._id;
    } else {
      // Try to find agent from the property listing
      // First, try to find the property to get its agentId
      if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
        const listing = await Listing.findById(propertyId);
        if (listing && listing.agentId) {
          finalAgentId = listing.agentId;
          logger.debug('Found agentId from listing:', finalAgentId);
        } else if (listing && listing.agent) {
          // If listing has agent name, try to find user by name
          const user = await User.findOne({ 
            $or: [
              { username: listing.agent },
              { email: listing.agent }
            ]
          });
          if (user) {
            finalAgentId = user._id;
          }
        }
      }
      
      // If still not found, try to find by name directly
      if (!finalAgentId || finalAgentId === agentId) {
        const user = await User.findOne({ 
          $or: [
            { username: agentId },
            { email: agentId }
          ]
        });
        
        if (user) {
          finalAgentId = user._id;
        } else {
          return next(errorHandler(404, `Agent not found. Please provide a valid agent email or ID. Received: ${agentId}`));
        }
      }
    }
    
    logger.debug('createMessage - Agent lookup:', { originalAgentId: agentId, finalAgentId });

    // Create new message
    const newMessage = new Message({
      propertyId,
      agentId: finalAgentId,
      senderName,
      senderEmail,
      senderPhone,
      subject,
      message,
      messageType,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await newMessage.save();

    // Populate property details for response
    await newMessage.populate('propertyId', 'propertyId propertyKeyword propertyPrice status propertyType');

    res.status(201).json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    next(error);
  }
};

// Delete a message
const deleteMessage = async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const message = await Message.findByIdAndDelete(messageId);

    if (!message) {
      return next(errorHandler(404, 'Message not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessagesByAgent,
  getMessageById,
  markAsRead,
  replyToMessage,
  archiveMessage,
  createMessage,
  deleteMessage
};
