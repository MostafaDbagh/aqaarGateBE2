const mongoose = require('mongoose');

const VERIFICATION_VALID_SECONDS = 10 * 60; // 10 minutes to complete password reset

const forgotPasswordVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// TTL: MongoDB auto-deletes when expiresAt is reached
forgotPasswordVerificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const ForgotPasswordVerification = mongoose.model(
  'ForgotPasswordVerification',
  forgotPasswordVerificationSchema
);

module.exports = ForgotPasswordVerification;
module.exports.VERIFICATION_VALID_MS = VERIFICATION_VALID_SECONDS * 1000;
