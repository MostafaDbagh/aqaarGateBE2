const mongoose = require('mongoose');

const pointTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'deduction', 'refund'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: function() {
        return this.type === 'deduction';
      },
      default: null
    },
    // For purchase transactions
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'paypal', 'bank_transfer', 'cash'],
      required: function() {
        return this.type === 'purchase';
      }
    },
    paymentReference: {
      type: String,
      required: function() {
        return this.type === 'purchase';
      }
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
pointTransactionSchema.index({ userId: 1, createdAt: -1 });
pointTransactionSchema.index({ listingId: 1 });

const PointTransaction = mongoose.model('PointTransaction', pointTransactionSchema);

module.exports = PointTransaction;
