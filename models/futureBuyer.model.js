const mongoose = require('mongoose');

const futureBuyerSchema = new mongoose.Schema(
  {
    // Client Information
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: false // Optional for backward compatibility
    },
    
    // Property Requirements
    propertyType: { 
      type: String, 
      required: true,
      enum: ['Apartment', 'Villa', 'Land', 'Holiday Home', 'Office', 'Commercial']
    },
    
    // Price Range
    minPrice: { type: Number, required: false },
    maxPrice: { type: Number, required: false },
    currency: { 
      type: String, 
      enum: ['USD', 'SYP', 'TRY', 'EUR'],
      default: 'USD'
    },
    
    // Size Range
    minSize: { type: Number, required: false },
    maxSize: { type: Number, required: false },
    sizeUnit: { 
      type: String, 
      enum: ['sqm', 'dunam', 'sqft', 'sqyd', 'feddan'],
      default: 'sqm'
    },
    
    // Location
    city: { type: String, required: true },
    
    // Property Specifications
    bedrooms: { type: Number, required: false },
    bathrooms: { type: Number, required: false },
    
    // Status (sale or rent)
    status: { 
      type: String, 
      enum: ['sale', 'rent', 'both'],
      required: true
    },
    
    // Amenities
    amenities: [{ type: String }],
    
    // Additional Notes
    notes: { type: String, required: false },
    
    // Metadata
    metadata: {
      ip: { type: String },
      userAgent: { type: String }
    },
    
    // Matching Properties (will be populated)
    matchedProperties: [{
      propertyId: { type: String },
      matchScore: { type: Number }, // 0-100, how well it matches
      matchedAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

// Indexes for efficient queries
futureBuyerSchema.index({ email: 1, createdAt: -1 });
futureBuyerSchema.index({ userId: 1, createdAt: -1 });
futureBuyerSchema.index({ propertyType: 1 });
futureBuyerSchema.index({ city: 1 });
futureBuyerSchema.index({ status: 1 });
futureBuyerSchema.index({ createdAt: -1 });

const FutureBuyer = mongoose.model('FutureBuyer', futureBuyerSchema);

module.exports = FutureBuyer;

