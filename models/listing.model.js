const  mongoose = require('mongoose');
const listingSchema = new mongoose.Schema(
  {
    propertyId: { type: String, unique: true },  
    propertyType: { type: String, required: true },           
    propertyKeyword: { type: String, required: true },
    propertyDesc: { type: String, required: true },
    description: { type: String }, // Alternative field name
    description_ar: { type: String }, // Arabic description
    propertyPrice: { type: Number, required: true },
    currency: { 
      type: String, 
      enum: ['USD', 'SYP', 'TRY', 'EUR'],
      default: 'USD',
      required: true 
    },
    status: { type: String, required: true, enum: ['sale', 'rent'] },   
    rentType: {
      type: String,
      enum: ['monthly', 'three-month', 'six-month', 'one-year', 'yearly', 'weekly', 'daily'],
      required: function () {
        return this.status === 'rent';
      }
    },
//////property specification//////
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    size: { type: Number,required:true },
    squareFootage: { type: Number }, // Alternative field name                      
    landArea: { type: Number },
    sizeUnit: { 
      type: String, 
      enum: ['sqm', 'dunam', 'sqft', 'sqyd', 'feddan'], 
      default: 'sqm',
      required: false 
    }, // Unit of measurement: sqm (متر مربع), dunam (دونم), sqft (قدم مربع), sqyd (ياردة مربعة), feddan (فدان)                       
    furnished: { type: Boolean, required: true },
    garages: { type: Boolean, required: true },
    garageSize: { type: Number },
    yearBuilt: { type: Number },
    floor: { type: Number }, // Floor number
    amenities: [{ type: String }],  
//////property location//////////
    address: { type: String, required: true },
    address_ar: { type: String }, // Arabic full address
    country: { type: String,required:true  },
    city: { type: String,required:true  },
    state: { type: String }, // Keep for backward compatibility
    neighborhood: { type: String,required:true },
    neighborhood_ar: { type: String }, // Arabic neighborhood
    mapLocation: { type: String, required: false }, // Google Maps location URL or coordinates

    agent: { type: String, required: true }, // Legacy field - keep for backward compatibility
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: false }, // New field for proper reference
    agentEmail: { type: String, required: false },
    agentNumber: { type: String, required: false },
    agentWhatsapp: { type: String, required: false },
    approvalStatus: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'closed'], 
      default: 'pending',
      lowercase: true, // Always store in lowercase
      trim: true
    },
    isSold: { type: Boolean, default: false },
    soldCharges: { type: Number, default: 0 }, // Charges/fees for sold listing record
    soldDate: { type: Date }, // Date when property was marked as sold
    isDeleted: { type: Boolean, default: false },
    deletedReason: { type: String, required: false }, // Reason for deletion
    deletedAt: { type: Date }, // Date when property was deleted
    offer: { type: Boolean, required: false },
    visitCount: { type: Number, default: 0 },
    notes: { type: String, required: false }, // Additional notes about the property
    notes_ar: { type: String, required: false }, // Arabic notes

    ////media -part
    imageNames: { 
      type: [String], 
      required: false,
      default: [],
      maxlength: 7 // Maximum 7 images as per requirement
    },         
    images: [
      {
        publicId: { type: String, required: false },
        url: { type: String, required: false },
        filename: { type: String, required: false }, // Store original filename
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
     
      
  },
  { timestamps: true }
);

// Database indexes for query performance optimization
// Compound indexes for common query patterns
listingSchema.index({ status: 1, isDeleted: 1 }); // Filter by status and exclude deleted
listingSchema.index({ propertyType: 1, status: 1 }); // Search by type and status
listingSchema.index({ city: 1, state: 1 }); // Location-based searches
listingSchema.index({ agentId: 1 }); // Agent dashboard queries
listingSchema.index({ approvalStatus: 1 }); // Admin filtering
listingSchema.index({ createdAt: -1 }); // Sorting by newest
listingSchema.index({ propertyPrice: 1 }); // Price range queries
listingSchema.index({ status: 1, propertyType: 1, isDeleted: 1 }); // Common filter combination
listingSchema.index({ city: 1, status: 1, isDeleted: 1 }); // Location + status filtering
listingSchema.index({ agentId: 1, isDeleted: 1 }); // Agent's non-deleted listings
// Optimized index for category stats aggregation query
listingSchema.index({ isDeleted: 1, isSold: 1, approvalStatus: 1, propertyType: 1 }); // Category stats performance
// Optimized index for city stats aggregation query
listingSchema.index({ isDeleted: 1, isSold: 1, approvalStatus: 1, city: 1 }); // City stats performance
listingSchema.index({ isDeleted: 1, isSold: 1, approvalStatus: 1, state: 1 }); // City stats performance (state fallback)

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;
