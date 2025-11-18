/**
 * Listing Controller
 * 
 * IMPORTANT: Holiday Homes Requirements Enforcement
 * 
 * For properties with propertyType: "Holiday Home":
 * - status MUST be "rent" (no sale option allowed)
 * - furnished MUST be true (always furnished)
 * 
 * These rules are automatically enforced in createListing() and updateListing()
 */

const Listing = require('../models/listing.model.js');
const User = require('../models/user.model.js');
const errorHandler = require('../utils/error.js');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Helper function to convert string to number
 */
const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Helper function to convert string to boolean
 */
const toBoolean = (value, defaultValue = false) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
};

/**
 * Helper function to ensure array
 */
const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') return [value];
  return [];
};

/**
 * Create a new listing
 * Frontend sends FormData with:
 * - All form fields as strings/numbers/booleans
 * - images: File objects (already processed by middleware into objects)
 * - imageNames: array of strings
 */
const createListing = async (req, res, next) => {
  try {
    logger.info('📝 Creating new listing');
    logger.debug('Request body keys:', Object.keys(req.body || {}));
    logger.debug('Request body:', req.body);
    logger.debug('req.user:', req.user);
    logger.debug('req.files:', req.files ? `${req.files.length} files` : 'no files');
    
    // Ensure req.body exists
    if (!req.body) {
      return next(errorHandler(400, 'Request body is empty'));
    }

    // Extract and validate required fields
    const {
      propertyType,
      propertyKeyword,
      propertyDesc,
      propertyPrice,
      currency,
      status,
      rentType,
      bedrooms,
      bathrooms,
      size,
      furnished,
      garages,
      address,
      country,
      state, // Frontend sends 'state', backend needs 'city'
      neighborhood,
      agent,
      agentId,
      agentEmail,
      agentNumber,
      agentWhatsapp,
      amenities,
      images, // Already processed by uploadListingImagesMiddleware (array of objects)
      imageNames, // Already processed by uploadListingImagesMiddleware (array of strings)
      propertyId,
      landArea,
      yearBuilt,
      garageSize,
      approvalStatus,
      isSold,
      isDeleted,
      notes
    } = req.body;

    // Validate required fields
    const requiredFields = {
      propertyType,
      propertyKeyword,
      propertyDesc,
      propertyPrice,
      status,
      bedrooms,
      bathrooms,
      size,
      furnished,
      garages,
      address,
      country,
      neighborhood,
      agent
    };

    // Log all required fields for debugging
    logger.debug('Required fields check:', Object.entries(requiredFields).map(([key, value]) => ({
      key,
      value,
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      isEmpty: value === ''
    })));
    
    // Handle boolean fields - they can be false, which is valid
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => {
        // Boolean fields (furnished, garages) can be false, which is valid
        if (key === 'furnished' || key === 'garages') {
          return value === null || value === undefined;
        }
        // Other fields cannot be null, undefined, or empty string
        return value === null || value === undefined || value === '';
      })
      .map(([key]) => key);

    if (missingFields.length > 0) {
      logger.error('Missing required fields:', missingFields);
      logger.error('Required fields values:', requiredFields);
      return next(errorHandler(400, `Missing required fields: ${missingFields.join(', ')}`));
    }

    // Validate status enum
    if (!['sale', 'rent'].includes(status)) {
      return next(errorHandler(400, 'Status must be either "sale" or "rent"'));
    }

    // Validate currency
    if (currency && !['USD', 'SYP', 'TRY', 'EUR'].includes(currency)) {
      return next(errorHandler(400, 'Currency must be "USD", "SYP", "TRY", or "EUR"'));
    }
    
    // Validate rentType if status is rent
    if (status === 'rent' && rentType && !['monthly', 'three-month', 'six-month', 'one-year', 'yearly', 'weekly'].includes(rentType)) {
      return next(errorHandler(400, 'RentType must be "monthly", "three-month", "six-month", "one-year", "yearly", or "weekly"'));
    }

    // Map state to city (backend schema requires 'city')
    const city = state || req.body.city || 'Unknown';

    // Build listing data object with proper type conversions
    const listingData = {
      propertyId: propertyId || `PROP_${Date.now()}`,
      propertyType: String(propertyType),
      propertyKeyword: String(propertyKeyword),
      propertyDesc: String(propertyDesc),
      propertyPrice: toNumber(propertyPrice),
      currency: currency ? String(currency) : 'USD',
      status: String(status),
      rentType: status === 'rent' ? (rentType || 'monthly') : undefined,
      bedrooms: toNumber(bedrooms),
      bathrooms: toNumber(bathrooms),
      size: toNumber(size),
      landArea: landArea ? toNumber(landArea) : toNumber(size), // Default to size if not provided
      furnished: toBoolean(furnished),
      garages: toBoolean(garages),
      garageSize: garages && garageSize ? toNumber(garageSize) : 0,
      yearBuilt: yearBuilt ? toNumber(yearBuilt) : new Date().getFullYear(),
      amenities: toArray(amenities),
      address: String(address),
      country: String(country),
      city: String(city),
      state: state ? String(state) : undefined, // Keep for backward compatibility
      neighborhood: String(neighborhood),
      agent: String(agent), // Required legacy field
      agentId: agentId ? (mongoose.Types.ObjectId.isValid(agentId) ? new mongoose.Types.ObjectId(agentId) : null) : null,
      agentEmail: agentEmail ? String(agentEmail) : undefined,
      agentNumber: agentNumber ? String(agentNumber) : undefined,
      agentWhatsapp: agentWhatsapp ? String(agentWhatsapp) : undefined,
      approvalStatus: approvalStatus || 'pending',
      isSold: toBoolean(isSold, false),
      isDeleted: toBoolean(isDeleted, false),
      notes: notes ? String(notes) : undefined,
      images: Array.isArray(images) ? images : [],
      imageNames: toArray(imageNames)
    };

    // Holiday Homes Requirements Enforcement
    if (listingData.propertyType === 'Holiday Home') {
      listingData.status = 'rent'; // Force rent only
      listingData.furnished = true; // Force furnished true
    }

    // Log the prepared data
    logger.debug('Listing data prepared:', {
      propertyId: listingData.propertyId,
      propertyType: listingData.propertyType,
      status: listingData.status,
      city: listingData.city,
      agentId: listingData.agentId,
      imagesCount: listingData.images.length,
      amenitiesCount: listingData.amenities.length
    });

    // Create listing in database
    const newListing = await Listing.create(listingData);
    
    logger.info(`✅ Listing created successfully: ${newListing._id}`);

    // Store listing ID for point deduction middleware
    req.listingId = newListing._id;
    res.locals.listingId = newListing._id;

    // Prepare response with points info if available
    const response = {
      success: true,
      ...newListing.toObject(),
      pointsInfo: res.locals.pointsDeducted || null
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating listing:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      return next(errorHandler(400, `Validation error: ${messages}`));
    }
    
    // Handle duplicate key error (propertyId)
    if (error.code === 11000) {
      return next(errorHandler(400, 'Property ID already exists'));
    }
    
    next(error);
  }
};

const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }

    // Check if user is authenticated
    if (!req.user) {
      return next(errorHandler(401, 'You must be logged in to delete listings!'));
    }

    // Get user ID from req.user (could be req.user.id or req.user._id)
    const userId = req.user.id || req.user._id?.toString();
    const listingAgentId = listing.agentId?.toString();

    // Check if user is the owner or admin
    if (userId !== listingAgentId && req.user.role !== 'admin') {
      return next(errorHandler(403, 'You can only delete your own listings!'));
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.status(200).json('Listing has been deleted!');
  } catch (error) {
    next(error);
  }
};

const updateListing = async (req, res, next) => {
  try {
    const logger = require('../utils/logger');
    
    // Ensure req.body exists
    if (!req.body) {
      return next(errorHandler(400, 'Request body is empty'));
    }
    
    logger.debug('updateListing - req.body:', req.body);
    logger.debug('updateListing - req.body keys:', Object.keys(req.body || {}));
    
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }

    // Check if user is authenticated
    if (!req.user) {
      return next(errorHandler(401, 'You must be logged in to update listings!'));
    }

    // Get user ID from req.user
    const userId = req.user.id || req.user._id?.toString();
    const listingAgentId = listing.agentId?.toString();

    // Check if user is the owner or admin
    if (userId !== listingAgentId && req.user.role !== 'admin') {
      return next(errorHandler(403, 'You can only update your own listings!'));
    }

    // Holiday Homes Requirements Enforcement
    if (req.body && req.body.propertyType === 'Holiday Home') {
      req.body.status = 'rent';
      req.body.furnished = true;
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );

    res.status(200).json(updatedListing);
  } catch (error) {
    next(error);
  }
};
const getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).lean();
    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }
    
    // If agentId exists, fetch agent data (agents are Users with role='agent')
    if (listing.agentId) {
      try {
        const userAgent = await User.findById(listing.agentId)
          .select('username email phone avatar location description role isBlocked')
          .lean();
        
        if (userAgent && userAgent.role === 'agent') {
          // Transform User to match agent format with avatar/image URL
          listing.agentId = {
            _id: userAgent._id,
            username: userAgent.username,
            fullName: userAgent.username || userAgent.email,
            email: userAgent.email,
            phone: userAgent.phone || '',
            avatar: userAgent.avatar || null, // Include agent image/avatar
            image: userAgent.avatar || null, // Also include as 'image' for compatibility
            imageUrl: userAgent.avatar || null, // Also include as 'imageUrl' for compatibility
            location: userAgent.location || '',
            description: userAgent.description || '',
            isBlocked: userAgent.isBlocked || false
          };
          // Add blocked flag to listing if agent is blocked
          if (userAgent.isBlocked) {
            listing.isAgentBlocked = true;
          }
        }
      } catch (populateError) {
        logger.warn('Error populating agentId:', populateError);
      }
    }
    
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

const getListingImages = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }
    res.status(200).json({
      images: listing.images || [],
      imageNames: listing.imageNames || []
    });
  } catch (error) {
    next(error);
  }
};

const getListingsByAgent = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 10, status, approvalStatus, public: isPublic } = req.query;
    
    // Build query - exclude deleted properties
    const query = {
      $or: [
        { agentId: agentId },
        { agent: agentId }
      ],
      isDeleted: { $ne: true }
    };
    
    // For public pages (home, listing page, agent listing page), show only approved
    // For agent dashboard, show all statuses (pending, approved, rejected)
    if (isPublic === 'true' || isPublic === true) {
      query.approvalStatus = 'approved';
    }
    
    // Add optional filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (approvalStatus && approvalStatus !== 'all') {
      query.approvalStatus = approvalStatus;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Listing.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      data: listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

const getFilteredListings = async (req, res, next) => {
  try {
    const logger = require('../utils/logger');
    
    // Get filters and sort options from middleware
    const filters = req.filter || {};
    const sortOptions = req.sortOptions || { createdAt: -1 };
    const limit = parseInt(req.query.limit) || 12;
    const skip = parseInt(req.query.skip) || 0;
    
    // Add filter to exclude deleted listings
    filters.isDeleted = { $ne: true };
    
    // For public search, show approved listings only
    // No listing will be published without admin approval
    filters.approvalStatus = 'approved';
    
    logger.debug('getFilteredListings - filters:', filters);
    logger.debug('getFilteredListings - sortOptions:', sortOptions);
    logger.debug('getFilteredListings - limit:', limit, 'skip:', skip);
    
    // Query the database with filters
    const listings = await Listing.find(filters)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .lean(); // Use lean() for better performance
    
    // Check if agents are blocked and add blocked flag to listings
    const agentIds = [...new Set(listings.map(l => l.agentId || l.agent).filter(Boolean))];
    if (agentIds.length > 0) {
      const blockedAgents = await User.find({
        _id: { $in: agentIds },
        isBlocked: true
      }).select('_id').lean();
      
      const blockedAgentIds = new Set(blockedAgents.map(a => a._id.toString()));
      
      listings.forEach(listing => {
        const agentId = listing.agentId?.toString() || listing.agent?.toString();
        if (agentId && blockedAgentIds.has(agentId)) {
          listing.isAgentBlocked = true;
        }
      });
    }
    
    logger.debug('getFilteredListings - found', listings.length, 'listings');
    
    // Log sample of listings for debugging
    if (listings.length > 0) {
      logger.debug('Sample listing:', {
        id: listings[0]._id,
        propertyType: listings[0].propertyType,
        city: listings[0].city,
        state: listings[0].state,
        approvalStatus: listings[0].approvalStatus,
        isDeleted: listings[0].isDeleted
      });
    } else {
      logger.warn('No listings found with filters:', filters);
      // Log total count of listings in database
      const totalCount = await Listing.countDocuments({});
      logger.debug('Total listings in database:', totalCount);
      const nonDeletedCount = await Listing.countDocuments({ isDeleted: { $ne: true } });
      logger.debug('Non-deleted listings in database:', nonDeletedCount);
    }
    
    res.status(200).json(listings);
  } catch (error) {
    logger.error('getFilteredListings error:', error);
    next(error);
  }
};

const getEachStateListing = async (req, res, next) => {
  try {
    const stateCounts = await Listing.aggregate([
      {
        $group: {
          _id: '$city', // Using city field instead of state
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          state: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    res.status(200).json(stateCounts);
  } catch (error) {
    next(error);
  }
};

const incrementVisitCount = async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { visitCount: 1 } },
      { new: true }
    );
    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }
    res.status(200).json({ visitCount: listing.visitCount });
  } catch (error) {
    next(error);
  }
};

const getMostVisitedListings = async (req, res, next) => {
  try {
    const agentId = req.params.agentId;
    logger.debug('getMostVisitedListings - agentId:', agentId);
    
    const isObjectId = mongoose.Types.ObjectId.isValid(agentId);
    const agentIdObj = isObjectId ? new mongoose.Types.ObjectId(agentId) : agentId;
    
    // Match both agentId (new) and agent (legacy) fields, and exclude deleted listings
    const listings = await Listing.find({
      $or: [
        { agentId: agentIdObj },
        { agent: agentId }
      ],
      isDeleted: { $ne: true }
    })
      .sort({ visitCount: -1 })
      .limit(10)
      .lean();
    
    logger.debug('getMostVisitedListings - found listings:', listings.length);
    logger.debug('getMostVisitedListings - sample listing:', listings[0] ? {
      id: listings[0]._id,
      visitCount: listings[0].visitCount,
      agentId: listings[0].agentId,
      agent: listings[0].agent
    } : 'none');
    
    res.status(200).json(listings);
  } catch (error) {
    logger.error('getMostVisitedListings error:', error);
    next(error);
  }
};

module.exports = {
  createListing,
  deleteListing,
  updateListing,
  getListingById,
  getListingImages,
  getListingsByAgent,
  getFilteredListings,
  getEachStateListing,
  incrementVisitCount,
  getMostVisitedListings,
};
