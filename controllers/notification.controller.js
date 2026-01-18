/**
 * Notification Controller
 * Handles notification operations for admin and agent
 */

const Notification = require('../models/notification.model');
const logger = require('../utils/logger');
const errorHandler = require('../utils/error');

/**
 * Get all notifications for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type = null, 
      isRead = null,
      priority = null 
    } = req.query;

    // Build query
    const query = { recipientId: userId };
    
    if (type) {
      query.type = type;
    }
    
    if (isRead !== null) {
      query.isRead = isRead === 'true' || isRead === true;
    }
    
    if (priority) {
      query.priority = priority;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false
    });

    logger.info('[NOTIFICATION_GET]', {
      userId,
      total,
      unreadCount,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: parseInt(page) < totalPages,
          hasPreviousPage: parseInt(page) > 1
        },
        unreadCount
      }
    });
  } catch (error) {
    logger.error('[NOTIFICATION_GET_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get unread notification count
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    logger.error('[NOTIFICATION_UNREAD_COUNT_ERROR]', error);
    next(error);
  }
};

/**
 * Mark a notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId: userId
    });

    if (!notification) {
      return next(errorHandler(404, 'Notification not found'));
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    logger.info('[NOTIFICATION_MARK_READ]', {
      userId,
      notificationId
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    logger.error('[NOTIFICATION_MARK_READ_ERROR]', error);
    next(error);
  }
};

/**
 * Mark all notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      {
        recipientId: userId,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    logger.info('[NOTIFICATION_MARK_ALL_READ]', {
      userId,
      updatedCount: result.modifiedCount
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updatedCount: result.modifiedCount
      }
    });
  } catch (error) {
    logger.error('[NOTIFICATION_MARK_ALL_READ_ERROR]', error);
    next(error);
  }
};

/**
 * Delete a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId
    });

    if (!notification) {
      return next(errorHandler(404, 'Notification not found'));
    }

    logger.info('[NOTIFICATION_DELETE]', {
      userId,
      notificationId
    });

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error('[NOTIFICATION_DELETE_ERROR]', error);
    next(error);
  }
};

/**
 * Delete all read notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await Notification.deleteMany({
      recipientId: userId,
      isRead: true
    });

    logger.info('[NOTIFICATION_DELETE_ALL_READ]', {
      userId,
      deletedCount: result.deletedCount
    });

    res.status(200).json({
      success: true,
      message: 'All read notifications deleted',
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    logger.error('[NOTIFICATION_DELETE_ALL_READ_ERROR]', error);
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
};

