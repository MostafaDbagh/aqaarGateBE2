const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    addedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 }); // For recent activity queries
favoriteSchema.index({ propertyId: 1 }); // For listing-based queries

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;
