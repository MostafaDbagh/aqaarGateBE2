/**
 * Notification Utility Functions
 * Helper functions to create notifications for admin and agent
 */

const Notification = require('../models/notification.model');
const {
  ADMIN_NOTIFICATION_TYPES,
  AGENT_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_TO_ALERT,
  NOTIFICATION_TYPE_TO_PRIORITY,
  NOTIFICATION_TYPE_LABELS
} = require('../constants/notificationTypes');
const logger = require('./logger');

/**
 * Create a notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Notification>} Created notification
 */
const createNotification = async (notificationData) => {
  try {
    const {
      recipientId,
      type,
      title,
      message,
      relatedEntity = null,
      data = {},
      metadata = {}
    } = notificationData;

    // Determine alert type and priority from notification type
    const alertType = NOTIFICATION_TYPE_TO_ALERT[type] || 'info';
    const priority = NOTIFICATION_TYPE_TO_PRIORITY[type] || 'medium';

    const notification = new Notification({
      recipientId,
      type,
      priority,
      alertType,
      title: title || NOTIFICATION_TYPE_LABELS[type] || 'New Notification',
      message,
      relatedEntity: relatedEntity || { entityType: null, entityId: null },
      data,
      metadata,
      isRead: false
    });

    await notification.save();

    logger.info('[NOTIFICATION_CREATED]', {
      notificationId: notification._id,
      recipientId,
      type,
      priority,
      alertType
    });

    return notification;
  } catch (error) {
    logger.error('[NOTIFICATION_CREATE_ERROR]', {
      error: error.message,
      stack: error.stack,
      notificationData
    });
    throw error;
  }
};

/**
 * Create notification for admin when new agent registers
 */
const notifyAdminNewAgent = async (agentId, agentName, agentEmail) => {
  try {
    // Get all admin users
    const User = require('../models/user.model');
    const admins = await User.find({ role: 'admin' }).select('_id email username').lean();

    // Get agent user to fetch username if agentName is not provided
    let agentUsername = null;
    if (!agentName || agentName.trim().length === 0) {
      try {
        const agent = await User.findById(agentId).select('username').lean();
        agentUsername = agent?.username || null;
      } catch (err) {
        logger.warn('[NOTIFICATION_ADMIN_NEW_AGENT_FETCH_USERNAME_ERROR]', { agentId, error: err.message });
      }
    }

    // Use agentName, fallback to username, then email
    const displayName = agentName || agentUsername || agentEmail;

    logger.info('[NOTIFICATION_ADMIN_NEW_AGENT_START]', {
      agentId,
      agentName,
      agentUsername,
      agentEmail,
      displayName,
      adminCount: admins.length,
      adminIds: admins.map(a => a._id.toString())
    });

    if (!admins || admins.length === 0) {
      logger.warn('[NOTIFICATION_ADMIN_NEW_AGENT_NO_ADMINS]', {
        agentId,
        message: 'No admin users found in database'
      });
      return [];
    }

    const notifications = await Promise.all(
      admins.map(async (admin) => {
        try {
          const notification = await createNotification({
            recipientId: admin._id,
            type: ADMIN_NOTIFICATION_TYPES.NEW_AGENT,
            title: 'New Agent Registered',
            message: `${displayName} has registered as a new agent`,
            relatedEntity: {
              entityType: 'user',
              entityId: agentId
            },
            data: {
              agentId,
              agentName: displayName,
              agentEmail
            },
            metadata: {
              senderId: agentId,
              senderName: displayName,
              source: 'system'
            }
          });
          logger.info('[NOTIFICATION_CREATED_FOR_ADMIN]', {
            adminId: admin._id.toString(),
            adminEmail: admin.email,
            notificationId: notification._id.toString()
          });
          return notification;
        } catch (err) {
          logger.error('[NOTIFICATION_CREATE_FAILED_FOR_ADMIN]', {
            adminId: admin._id.toString(),
            adminEmail: admin.email,
            error: err.message,
            stack: err.stack
          });
          return null;
        }
      })
    );

    const successfulNotifications = notifications.filter(n => n !== null);

    logger.info('[NOTIFICATION_ADMIN_NEW_AGENT_SUCCESS]', {
      agentId,
      agentName,
      agentUsername,
      agentEmail,
      displayName,
      adminCount: admins.length,
      notificationsCreated: successfulNotifications.length,
      notificationIds: successfulNotifications.map(n => n._id.toString())
    });

    return successfulNotifications;
  } catch (error) {
    logger.error('[NOTIFICATION_ADMIN_NEW_AGENT_ERROR]', {
      error: error.message,
      stack: error.stack,
      agentId,
      agentName,
      agentEmail
    });
    // Don't throw - notification failure shouldn't break the flow
    return [];
  }
};

/**
 * Create notification for admin when agent creates a new listing
 */
const notifyAdminAgentNewListing = async (listingId, agentId, listingTitle, propertyId = null) => {
  try {
    const User = require('../models/user.model');
    const admins = await User.find({ role: 'admin' }).select('_id').lean();

    // Use propertyId if provided, otherwise use listingId
    const displayId = propertyId || listingId;

    const notifications = await Promise.all(
      admins.map(admin =>
        createNotification({
          recipientId: admin._id,
          type: ADMIN_NOTIFICATION_TYPES.AGENT_NEW_LISTING,
          title: 'New Listing Created',
          message: `Agent has created a new listing: ${listingTitle} (ID: ${displayId})`,
          relatedEntity: {
            entityType: 'listing',
            entityId: listingId
          },
          data: {
            listingId,
            propertyId: displayId,
            agentId,
            listingTitle
          },
          metadata: {
            senderId: agentId,
            source: 'system'
          }
        })
      )
    );

    logger.info('[NOTIFICATION_ADMIN_AGENT_NEW_LISTING]', {
      listingId,
      agentId,
      adminCount: admins.length
    });

    return notifications;
  } catch (error) {
    logger.error('[NOTIFICATION_ADMIN_AGENT_NEW_LISTING_ERROR]', error);
  }
};

/**
 * Create notification for admin when agent updates a listing
 */
const notifyAdminAgentUpdateListing = async (listingId, agentId, listingTitle, propertyId = null) => {
  try {
    const User = require('../models/user.model');
    const admins = await User.find({ role: 'admin' }).select('_id').lean();

    // Use propertyId if provided, otherwise use listingId
    const displayId = propertyId || listingId;

    const notifications = await Promise.all(
      admins.map(admin =>
        createNotification({
          recipientId: admin._id,
          type: ADMIN_NOTIFICATION_TYPES.AGENT_UPDATE_LISTING,
          title: 'Listing Updated',
          message: `Agent has updated listing: ${listingTitle} (ID: ${displayId})`,
          relatedEntity: {
            entityType: 'listing',
            entityId: listingId
          },
          data: {
            listingId,
            propertyId: displayId,
            agentId,
            listingTitle
          },
          metadata: {
            senderId: agentId,
            source: 'system'
          }
        })
      )
    );

    logger.info('[NOTIFICATION_ADMIN_AGENT_UPDATE_LISTING]', {
      listingId,
      agentId
    });

    return notifications;
  } catch (error) {
    logger.error('[NOTIFICATION_ADMIN_AGENT_UPDATE_LISTING_ERROR]', error);
  }
};

/**
 * Create notification for admin when agent deletes a listing
 */
const notifyAdminAgentDeleteListing = async (listingId, agentId, listingTitle, propertyId = null) => {
  try {
    const User = require('../models/user.model');
    const admins = await User.find({ role: 'admin' }).select('_id').lean();

    // Use propertyId if provided, otherwise use listingId
    const displayId = propertyId || listingId;

    const notifications = await Promise.all(
      admins.map(admin =>
        createNotification({
          recipientId: admin._id,
          type: ADMIN_NOTIFICATION_TYPES.AGENT_DELETE_LISTING,
          title: 'Listing Deleted',
          message: `Agent has deleted listing: ${listingTitle} (ID: ${displayId})`,
          relatedEntity: {
            entityType: 'listing',
            entityId: listingId
          },
          data: {
            listingId,
            propertyId: displayId,
            agentId,
            listingTitle
          },
          metadata: {
            senderId: agentId,
            source: 'system'
          }
        })
      )
    );

    logger.info('[NOTIFICATION_ADMIN_AGENT_DELETE_LISTING]', {
      listingId,
      agentId
    });

    return notifications;
  } catch (error) {
    logger.error('[NOTIFICATION_ADMIN_AGENT_DELETE_LISTING_ERROR]', error);
  }
};

/**
 * Create notification for admin when they receive a message
 */
const notifyAdminMessage = async (adminId, messageId, senderName, messageSubject) => {
  try {
    await createNotification({
      recipientId: adminId,
      type: ADMIN_NOTIFICATION_TYPES.ADMIN_MESSAGE,
      title: 'New Message',
      message: `You have received a new message from ${senderName}: ${messageSubject}`,
      relatedEntity: {
        entityType: 'message',
        entityId: messageId
      },
      data: {
        messageId,
        senderName,
        messageSubject
      },
      metadata: {
        source: 'user'
      }
    });

    logger.info('[NOTIFICATION_ADMIN_MESSAGE]', {
      adminId,
      messageId
    });
  } catch (error) {
    logger.error('[NOTIFICATION_ADMIN_MESSAGE_ERROR]', error);
  }
};

/**
 * Create notification for admin when they receive a review
 */
const notifyAdminReview = async (adminId, reviewId, reviewerName, propertyTitle) => {
  try {
    await createNotification({
      recipientId: adminId,
      type: ADMIN_NOTIFICATION_TYPES.ADMIN_REVIEW,
      title: 'New Review',
      message: `${reviewerName} has left a review for your listing: ${propertyTitle}`,
      relatedEntity: {
        entityType: 'review',
        entityId: reviewId
      },
      data: {
        reviewId,
        reviewerName,
        propertyTitle
      },
      metadata: {
        source: 'user'
      }
    });

    logger.info('[NOTIFICATION_ADMIN_REVIEW]', {
      adminId,
      reviewId
    });
  } catch (error) {
    logger.error('[NOTIFICATION_ADMIN_REVIEW_ERROR]', error);
  }
};

/**
 * Create notification for agent when listing is viewed
 * Note: This is called when visitCount is incremented
 */
const notifyAgentListingView = async (agentId, listingId, listingTitle, viewCount) => {
  try {
    // Only notify for milestone views (e.g., 10, 50, 100, etc.)
    const milestones = [10, 50, 100, 250, 500, 1000];
    if (!milestones.includes(viewCount)) {
      return null;
    }

    const notification = await createNotification({
      recipientId: agentId,
      type: AGENT_NOTIFICATION_TYPES.LISTING_VIEW,
      title: 'Listing Milestone',
      message: `Your listing "${listingTitle}" has reached ${viewCount} views!`,
      relatedEntity: {
        entityType: 'listing',
        entityId: listingId
      },
      data: {
        listingId,
        listingTitle,
        viewCount
      },
      metadata: {
        source: 'system'
      }
    });

    logger.info('[NOTIFICATION_AGENT_LISTING_VIEW]', {
      agentId,
      listingId,
      viewCount
    });

    return notification;
  } catch (error) {
    logger.error('[NOTIFICATION_AGENT_LISTING_VIEW_ERROR]', error);
    return null;
  }
};

/**
 * Create notification for agent when they receive a review
 */
const notifyAgentReview = async (agentId, reviewId, reviewerName, propertyTitle, rating) => {
  try {
    const notification = await createNotification({
      recipientId: agentId,
      type: AGENT_NOTIFICATION_TYPES.LISTING_REVIEW,
      title: 'New Review',
      message: `${reviewerName} has left a ${rating}-star review for your listing: ${propertyTitle}`,
      relatedEntity: {
        entityType: 'review',
        entityId: reviewId
      },
      data: {
        reviewId,
        reviewerName,
        propertyTitle,
        rating
      },
      metadata: {
        source: 'user'
      }
    });

    logger.info('[NOTIFICATION_AGENT_REVIEW]', {
      agentId,
      reviewId,
      rating
    });

    return notification;
  } catch (error) {
    logger.error('[NOTIFICATION_AGENT_REVIEW_ERROR]', error);
    return null;
  }
};

/**
 * Create notification for agent when they receive a message
 */
const notifyAgentMessage = async (agentId, messageId, senderName, messageSubject) => {
  try {
    const notification = await createNotification({
      recipientId: agentId,
      type: AGENT_NOTIFICATION_TYPES.LISTING_MESSAGE,
      title: 'New Message',
      message: `You have received a new message from ${senderName}: ${messageSubject}`,
      relatedEntity: {
        entityType: 'message',
        entityId: messageId
      },
      data: {
        messageId,
        senderName,
        messageSubject
      },
      metadata: {
        source: 'user'
      }
    });

    logger.info('[NOTIFICATION_AGENT_MESSAGE]', {
      agentId,
      messageId
    });

    return notification;
  } catch (error) {
    logger.error('[NOTIFICATION_AGENT_MESSAGE_ERROR]', error);
    return null;
  }
};

/**
 * Create notification for agent when listing is approved
 */
const notifyAgentListingApproved = async (agentId, listingId, listingTitle) => {
  try {
    const notification = await createNotification({
      recipientId: agentId,
      type: AGENT_NOTIFICATION_TYPES.LISTING_APPROVED,
      title: 'Listing Approved',
      message: `Your listing "${listingTitle}" has been approved and is now live!`,
      relatedEntity: {
        entityType: 'listing',
        entityId: listingId
      },
      data: {
        listingId,
        listingTitle
      },
      metadata: {
        source: 'admin'
      }
    });

    logger.info('[NOTIFICATION_AGENT_LISTING_APPROVED]', {
      agentId,
      listingId
    });

    return notification;
  } catch (error) {
    logger.error('[NOTIFICATION_AGENT_LISTING_APPROVED_ERROR]', error);
    return null;
  }
};

/**
 * Create notification for agent when listing is rejected
 */
const notifyAgentListingRejected = async (agentId, listingId, listingTitle, rejectionReason = null) => {
  try {
    let message = `Your listing "${listingTitle}" has been rejected.`;
    if (rejectionReason) {
      message += ` Reason: ${rejectionReason}`;
    } else {
      message += ' Please review and update your listing details.';
    }

    const notification = await createNotification({
      recipientId: agentId,
      type: AGENT_NOTIFICATION_TYPES.LISTING_REJECTED,
      title: 'Listing Rejected',
      message: message,
      relatedEntity: {
        entityType: 'listing',
        entityId: listingId
      },
      data: {
        listingId,
        listingTitle,
        rejectionReason
      },
      metadata: {
        source: 'admin'
      }
    });

    logger.info('[NOTIFICATION_AGENT_LISTING_REJECTED]', {
      agentId,
      listingId
    });

    return notification;
  } catch (error) {
    logger.error('[NOTIFICATION_AGENT_LISTING_REJECTED_ERROR]', error);
    return null;
  }
};

/**
 * Create notification for agent when agent account is approved
 */
const notifyAgentApproved = async (agentId, agentName) => {
  try {
    // Get agent user to fetch username if agentName is not provided
    let agentUsername = null;
    if (!agentName || agentName.trim().length === 0) {
      try {
        const User = require('../models/user.model');
        const agent = await User.findById(agentId).select('username').lean();
        agentUsername = agent?.username || null;
      } catch (err) {
        logger.warn('[NOTIFICATION_AGENT_APPROVED_FETCH_USERNAME_ERROR]', { agentId, error: err.message });
      }
    }

    // Use agentName, fallback to username, then 'Agent'
    const displayName = agentName || agentUsername || 'Agent';

    const notification = await createNotification({
      recipientId: agentId,
      type: AGENT_NOTIFICATION_TYPES.AGENT_APPROVED,
      title: 'Account Approved',
      message: `Congratulations ${displayName}! Your agent account has been approved. You can now create listings.`,
      relatedEntity: {
        entityType: 'user',
        entityId: agentId
      },
      data: {
        agentId,
        agentName: displayName
      },
      metadata: {
        source: 'admin'
      }
    });

    logger.info('[NOTIFICATION_AGENT_APPROVED]', {
      agentId
    });

    return notification;
  } catch (error) {
    logger.error('[NOTIFICATION_AGENT_APPROVED_ERROR]', error);
    return null;
  }
};

module.exports = {
  createNotification,
  notifyAdminNewAgent,
  notifyAdminAgentNewListing,
  notifyAdminAgentUpdateListing,
  notifyAdminAgentDeleteListing,
  notifyAdminMessage,
  notifyAdminReview,
  notifyAgentListingView,
  notifyAgentReview,
  notifyAgentMessage,
  notifyAgentListingApproved,
  notifyAgentListingRejected,
  notifyAgentApproved
};

