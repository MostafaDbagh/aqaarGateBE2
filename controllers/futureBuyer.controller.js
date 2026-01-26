const FutureBuyer = require('../models/futureBuyer.model');
const Listing = require('../models/listing.model');
const errorHandler = require('../utils/error');
const logger = require('../utils/logger');

// Helper function to get client IP
const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }
  if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1') {
    return req.ip;
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

// Helper function to convert size units for comparison
const convertSizeToSqm = (size, unit) => {
  if (!size || !unit) return null;
  
  const conversions = {
    sqm: 1,
    sqft: 0.092903,
    sqyd: 0.836127,
    dunam: 1000,
    feddan: 4200
  };
  
  return size * (conversions[unit] || 1);
};

// Matching algorithm to find properties that match future buyer requirements
const findMatchingProperties = async (futureBuyer) => {
  try {
    const query = {
      approvalStatus: 'approved',
      isSold: false,
      isDeleted: false
    };
    
    // Property Type
    if (futureBuyer.propertyType) {
      query.propertyType = futureBuyer.propertyType;
    }
    
    // Status (sale/rent)
    if (futureBuyer.status && futureBuyer.status !== 'both') {
      query.status = futureBuyer.status;
    }
    
    // City
    if (futureBuyer.city) {
      query.$or = [
        { city: futureBuyer.city },
        { state: futureBuyer.city }
      ];
    }
    
    // Bedrooms
    if (futureBuyer.bedrooms !== undefined) {
      query.bedrooms = futureBuyer.bedrooms;
    }
    
    // Bathrooms
    if (futureBuyer.bathrooms !== undefined) {
      query.bathrooms = futureBuyer.bathrooms;
    }
    
    // Price range (same currency)
    if ((futureBuyer.minPrice !== undefined || futureBuyer.maxPrice !== undefined) && futureBuyer.currency) {
      query.currency = futureBuyer.currency;
      query.propertyPrice = {};
      if (futureBuyer.minPrice !== undefined) {
        query.propertyPrice.$gte = futureBuyer.minPrice;
      }
      if (futureBuyer.maxPrice !== undefined) {
        query.propertyPrice.$lte = futureBuyer.maxPrice;
      }
    }
    
    // Get all matching listings
    const listings = await Listing.find(query).lean();
    
    // Calculate match scores and filter by size if specified
    const matchedProperties = [];
    
    for (const listing of listings) {
      let matchScore = 100; // Start with perfect score
      
      // Size matching (convert to sqm for comparison)
      if (futureBuyer.minSize !== undefined || futureBuyer.maxSize !== undefined) {
        const listingSizeInSqm = convertSizeToSqm(listing.size, listing.sizeUnit || 'sqm');
        const buyerMinSizeInSqm = convertSizeToSqm(futureBuyer.minSize, futureBuyer.sizeUnit || 'sqm');
        const buyerMaxSizeInSqm = convertSizeToSqm(futureBuyer.maxSize, futureBuyer.sizeUnit || 'sqm');
        
        if (listingSizeInSqm !== null) {
          if (buyerMinSizeInSqm !== null && listingSizeInSqm < buyerMinSizeInSqm) {
            continue; // Skip if too small
          }
          if (buyerMaxSizeInSqm !== null && listingSizeInSqm > buyerMaxSizeInSqm) {
            continue; // Skip if too large
          }
          
          // Calculate size match score (closer to middle of range = higher score)
          if (buyerMinSizeInSqm !== null && buyerMaxSizeInSqm !== null) {
            const rangeMiddle = (buyerMinSizeInSqm + buyerMaxSizeInSqm) / 2;
            const sizeDiff = Math.abs(listingSizeInSqm - rangeMiddle);
            const rangeSize = buyerMaxSizeInSqm - buyerMinSizeInSqm;
            const sizeScore = Math.max(0, 100 - (sizeDiff / rangeSize) * 50);
            matchScore = (matchScore + sizeScore) / 2;
          }
        }
      }
      
      // Amenities matching
      if (futureBuyer.amenities && futureBuyer.amenities.length > 0 && listing.amenities) {
        const matchingAmenities = futureBuyer.amenities.filter(amenity => 
          listing.amenities.includes(amenity)
        );
        const amenitiesScore = (matchingAmenities.length / futureBuyer.amenities.length) * 100;
        matchScore = (matchScore + amenitiesScore) / 2;
      }
      
      // Price matching (if not already filtered)
      if (futureBuyer.minPrice !== undefined && futureBuyer.maxPrice !== undefined) {
        const priceRange = futureBuyer.maxPrice - futureBuyer.minPrice;
        const priceMiddle = (futureBuyer.minPrice + futureBuyer.maxPrice) / 2;
        const priceDiff = Math.abs(listing.propertyPrice - priceMiddle);
        const priceScore = Math.max(0, 100 - (priceDiff / priceRange) * 50);
        matchScore = (matchScore + priceScore) / 2;
      }
      
      matchedProperties.push({
        propertyId: listing.propertyId,
        matchScore: Math.round(matchScore)
      });
    }
    
    // Sort by match score (highest first)
    matchedProperties.sort((a, b) => b.matchScore - a.matchScore);
    
    return matchedProperties;
  } catch (error) {
    logger.error('Error finding matching properties:', error);
    return [];
  }
};

// Create a new future buyer interest
const createFutureBuyer = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      propertyType,
      minPrice,
      maxPrice,
      currency,
      minSize,
      maxSize,
      sizeUnit,
      city,
      bedrooms,
      bathrooms,
      status,
      amenities,
      notes
    } = req.body;
    
    // Validation - Required fields: name, email, phone, city, propertyType, status
    if (!name || !email || !phone || !city || !propertyType || !status) {
      return next(errorHandler(400, 'Name, email, phone, city, property type, and status are required'));
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(errorHandler(400, 'Invalid email format'));
    }
    
    // Validate price range
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return next(errorHandler(400, 'Minimum price cannot be greater than maximum price'));
    }
    
    // Validate size range
    if (minSize !== undefined && maxSize !== undefined && minSize > maxSize) {
      return next(errorHandler(400, 'Minimum size cannot be greater than maximum size'));
    }
    
    // Check if user has reached the maximum limit (3 requests per registered user)
    if (req.user && req.user.id) {
      const existingRequestsCount = await FutureBuyer.countDocuments({ 
        userId: req.user.id 
      });
      
      if (existingRequestsCount >= 3) {
        return next(errorHandler(429, 'Maximum limit reached. You can only submit 3 future buyer interest requests.'));
      }
    }
    
    const clientIp = getClientIp(req);
    
    // Create future buyer
    const futureBuyerData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      userId: req.user?.id || null, // Add userId if authenticated
      propertyType,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      currency: currency || 'USD',
      minSize: minSize ? parseFloat(minSize) : undefined,
      maxSize: maxSize ? parseFloat(maxSize) : undefined,
      sizeUnit: sizeUnit || 'sqm',
      city: city.trim(),
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      status: status,
      amenities: Array.isArray(amenities) ? amenities : [],
      notes: notes ? notes.trim() : undefined,
      metadata: {
        ip: clientIp,
        userAgent: req.headers['user-agent'] || 'unknown'
      }
    };
    
    const futureBuyer = await FutureBuyer.create(futureBuyerData);
    
    // Find matching properties
    const matchedProperties = await findMatchingProperties(futureBuyer);
    
    // Update future buyer with matched properties
    futureBuyer.matchedProperties = matchedProperties.map(match => ({
      propertyId: match.propertyId,
      matchScore: match.matchScore,
      matchedAt: new Date()
    }));
    
    await futureBuyer.save();
    
    // Notify all admins about the new future buyer request
    try {
      const { notifyAdminFutureBuyerRequest } = require('../utils/notifications');
      await notifyAdminFutureBuyerRequest(
        futureBuyer._id.toString(),
        futureBuyer.name,
        futureBuyer.email,
        futureBuyer.propertyType,
        matchedProperties.length
      );
    } catch (notifError) {
      // Don't fail the request if notification fails
      logger.error('Failed to send future buyer notification to admins:', notifError);
    }
    
    logger.info('Future buyer interest created', {
      id: futureBuyer._id,
      email: futureBuyer.email,
      matchedProperties: matchedProperties.length
    });
    
    res.status(201).json({
      success: true,
      data: futureBuyer,
      matchedPropertiesCount: matchedProperties.length
    });
  } catch (error) {
    next(error);
  }
};

// Get all future buyers (admin only)
const getFutureBuyers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, propertyType, city, status } = req.query;
    
    const query = {};
    
    if (propertyType) {
      query.propertyType = propertyType;
    }
    
    if (city) {
      query.city = city;
    }
    
    if (status) {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const futureBuyers = await FutureBuyer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // For each future buyer, populate matched properties with full listing details
    const futureBuyersWithDetails = await Promise.all(
      futureBuyers.map(async (buyer) => {
        const matchedListings = await Promise.all(
          buyer.matchedProperties.map(async (match) => {
            const listing = await Listing.findOne({ propertyId: match.propertyId }).lean();
            return {
              ...match,
              listing: listing || null
            };
          })
        );
        
        return {
          ...buyer,
          matchedProperties: matchedListings
        };
      })
    );
    
    const total = await FutureBuyer.countDocuments(query);
    
    res.json({
      success: true,
      data: futureBuyersWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single future buyer by ID
const getFutureBuyer = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const futureBuyer = await FutureBuyer.findById(id).lean();
    
    if (!futureBuyer) {
      return next(errorHandler(404, 'Future buyer not found'));
    }
    
    // Populate matched properties with full listing details
    const matchedListings = await Promise.all(
      futureBuyer.matchedProperties.map(async (match) => {
        const listing = await Listing.findOne({ propertyId: match.propertyId }).lean();
        return {
          ...match,
          listing: listing || null
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        ...futureBuyer,
        matchedProperties: matchedListings
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a future buyer
const deleteFutureBuyer = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const futureBuyer = await FutureBuyer.findByIdAndDelete(id);
    
    if (!futureBuyer) {
      return next(errorHandler(404, 'Future buyer not found'));
    }
    
    logger.info('Future buyer deleted', { id });
    
    res.json({
      success: true,
      message: 'Future buyer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Recalculate matches for a future buyer (admin can trigger this)
const recalculateMatches = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const futureBuyer = await FutureBuyer.findById(id);
    
    if (!futureBuyer) {
      return next(errorHandler(404, 'Future buyer not found'));
    }
    
    // Find matching properties
    const matchedProperties = await findMatchingProperties(futureBuyer);
    
    // Update future buyer with matched properties
    futureBuyer.matchedProperties = matchedProperties.map(match => ({
      propertyId: match.propertyId,
      matchScore: match.matchScore,
      matchedAt: new Date()
    }));
    
    await futureBuyer.save();
    
    logger.info('Matches recalculated for future buyer', {
      id: futureBuyer._id,
      matchedProperties: matchedProperties.length
    });
    
    res.json({
      success: true,
      data: futureBuyer,
      matchedPropertiesCount: matchedProperties.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFutureBuyer,
  getFutureBuyers,
  getFutureBuyer,
  deleteFutureBuyer,
  recalculateMatches
};

