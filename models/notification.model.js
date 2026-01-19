const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient information
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Notification type
  type: {
    type: String,
    required: true,
    enum: [
      // Admin notifications
      'admin.new_agent',
      'admin.agent_new_listing',
      'admin.agent_update_listing',
      'admin.agent_delete_listing',
      'admin.message',
      'admin.review',
      // Agent notifications
      'agent.listing_view',
      'agent.review',
      'agent.message',
      'agent.listing_approved',
      'agent.listing_rejected',
      'agent.agent_approved'
    ],
    index: true
  },
  
  // Notification priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Alert type (for UI styling)
  alertType: {
    type: String,
    enum: ['success', 'info', 'warning', 'error', 'primary'],
    default: 'info'
  },
  
  // Notification title
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Notification message
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Related entity references (optional)
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['user', 'listing', 'message', 'review', null],
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  
  // Additional data (flexible JSON)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Read timestamp
  readAt: {
    type: Date,
    default: null
  },
  
  // Notification metadata
  metadata: {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    senderName: {
      type: String,
      default: null
    },
    source: {
      type: String,
      enum: ['system', 'user', 'admin'],
      default: 'system'
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for better query performance
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1 });
notificationSchema.index({ recipientId: 1, priority: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, createdAt: -1 });

// Virtual for notification age
notificationSchema.virtual('ageInMinutes').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60));
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(recipientId) {
  return this.countDocuments({
    recipientId: recipientId,
    isRead: false
  });
};

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

