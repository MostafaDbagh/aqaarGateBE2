const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true,
        index: true,
      },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: false, // Optional for backward compatibility
      index: true 
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    review: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5
    },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    hiddenFromDashboard: { 
      type: Boolean, 
      default: false 
    },
    hiddenFromListing: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }

);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

