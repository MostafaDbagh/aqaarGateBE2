const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date,
    default: null
  },
  source: {
    type: String,
    default: 'website',
    enum: ['website', 'footer', 'sidebar', 'blog', 'admin']
  },
  preferences: {
    propertyUpdates: {
      type: Boolean,
      default: true
    },
    marketNews: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
// Note: email index is automatically created by unique: true, so we don't need to add it manually
newsletterSchema.index({ isActive: 1 });
newsletterSchema.index({ subscribedAt: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
