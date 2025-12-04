const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Property-related fields
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message sender information
  senderName: {
    type: String,
    required: true,
    trim: true
  },
  senderEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  senderPhone: {
    type: String,
    trim: true
  },
  
  // Message content
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Message status
  status: {
    type: String,
    enum: ['unread', 'read', 'replied', 'archived'],
    default: 'unread'
  },
  
  // Message type
  messageType: {
    type: String,
    enum: ['inquiry', 'info'],
    default: 'inquiry'
  },
  
  // Response fields (for agent replies)
  response: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  respondedAt: {
    type: Date
  },
  
  // Additional metadata
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  
  // Timestamps
  readAt: {
    type: Date
  },
  archivedAt: {
    type: Date
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for better query performance
messageSchema.index({ agentId: 1, createdAt: -1 });
messageSchema.index({ propertyId: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ senderEmail: 1 });
messageSchema.index({ agentId: 1, status: 1 });
messageSchema.index({ recipientId: 1, status: 1 }); // For recipient-based queries
messageSchema.index({ agentId: 1, status: 1, createdAt: -1 }); // Compound index for dashboard
messageSchema.index({ propertyId: 1, status: 1 }); // For property message queries

// Virtual for message age
messageSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
