const mongoose = require('mongoose');

const propertyRentalSchema = new mongoose.Schema(
  {
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: [true, 'Owner email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    ownerPhone: {
      type: String,
      required: [true, 'Owner phone is required'],
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Optional for backward compatibility
    },
    propertyType: {
      type: String,
      required: [true, 'Property type is required'],
      enum: ['apartment', 'villa', 'house', 'land', 'commercial', 'office', 'shop', 'other'],
    },
    propertySize: {
      type: Number,
      required: [true, 'Property size is required'],
      min: [1, 'Property size must be greater than 0'],
    },
    bedrooms: {
      type: Number,
      required: [true, 'Number of bedrooms is required'],
      min: [0, 'Number of bedrooms cannot be negative'],
    },
    bathrooms: {
      type: Number,
      required: [true, 'Number of bathrooms is required'],
      min: [0, 'Number of bathrooms cannot be negative'],
    },
    location: {
      type: String,
      required: [true, 'Property location is required'],
      trim: true,
    },
    features: {
      type: String,
      required: [true, 'Property features are required'],
      trim: true,
    },
    additionalDetails: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'inspected', 'agreement_sent', 'agreed', 'rejected'],
      default: 'pending',
    },
    inspectionDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
propertyRentalSchema.index({ status: 1, createdAt: -1 });
propertyRentalSchema.index({ ownerEmail: 1 });
propertyRentalSchema.index({ userId: 1, createdAt: -1 });

const PropertyRental = mongoose.model('PropertyRental', propertyRentalSchema);

module.exports = PropertyRental;

