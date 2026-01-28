const mongoose = require('mongoose');

const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['signup', 'forgot_password'],
    },
    otp: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^\d{6}$/.test(v),
        message: 'OTP must be 6 digits',
      },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: false }
);

// One active OTP per email+type (replace previous when sending new)
otpSchema.index({ email: 1, type: 1 }, { unique: true });

// TTL: MongoDB auto-deletes documents after 5 minutes (cleanup expired OTPs)
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: OTP_EXPIRY_SECONDS });

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
