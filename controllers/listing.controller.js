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
 * IMPORTANT: For propertyPrice, we preserve exact value without any rounding
 */
const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  // For exact price preservation, use parseFloat instead of Number to avoid any precision issues
  const num = parseFloat(value);
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
      agentName,
      agentName_ar,
      agentEmail,
      agentNumber,
      agentWhatsapp,
      agentFacebook,
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

    // Validate required fields (description, address, neighborhood are optional)
    const requiredFields = {
      propertyType,
      propertyPrice,
      status,
      bedrooms,
      bathrooms,
      size,
      furnished,
      garages,
      country,
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
    if (status === 'rent' && rentType && !['monthly', 'three-month', 'six-month', 'one-year', 'yearly', 'weekly', 'daily'].includes(rentType)) {
      return next(errorHandler(400, 'RentType must be "monthly", "three-month", "six-month", "one-year", "yearly", "weekly", or "daily"'));
    }

    // Map state to city (backend schema requires 'city')
    const city = state || req.body.city || 'Unknown';

    // Build listing data object with proper type conversions
    // CRITICAL: Preserve exact propertyPrice value as entered by agent
    // NO DEDUCTION, NO MODIFICATION, NO FEES - Price must be stored exactly as received
    // Log the original value from request body
    logger.info(`💰 Property Price - Raw from req.body: ${JSON.stringify(propertyPrice)}, Type: ${typeof propertyPrice}`);
    
    // Convert to number - use parseFloat to preserve exact decimal values if any
    // NO DEDUCTION - Price is converted but never modified or reduced
    let exactPrice;
    if (typeof propertyPrice === 'string') {
      exactPrice = parseFloat(propertyPrice);
    } else if (typeof propertyPrice === 'number') {
      exactPrice = propertyPrice;
    } else {
      exactPrice = toNumber(propertyPrice);
    }
    
    // Ensure it's a valid number
    if (isNaN(exactPrice)) {
      return next(errorHandler(400, 'Invalid property price value'));
    }
    
    // CRITICAL: Verify no price modification occurred during conversion
    // If original was a number, ensure it matches exactly
    if (typeof propertyPrice === 'number' && propertyPrice !== exactPrice) {
      logger.error(`💰 CRITICAL: Price modification detected! Original: ${propertyPrice}, Converted: ${exactPrice}`);
      return next(errorHandler(500, 'Price validation error - price was modified'));
    }
    
    logger.info(`💰 Property Price - After conversion: ${exactPrice}, Type: ${typeof exactPrice}, String representation: ${exactPrice.toString()}`);
    
    const listingData = {
      propertyId: propertyId || `PROP_${Date.now()}`,
      propertyType: String(propertyType),
      propertyKeyword: propertyKeyword ? String(propertyKeyword) : undefined, // Optional field
      propertyDesc: (propertyDesc != null && propertyDesc !== '') ? String(propertyDesc) : '',
      description_ar: req.body.description_ar ? String(req.body.description_ar) : undefined,
      propertyPrice: exactPrice, // CRITICAL: Store exact price - NO DEDUCTION, NO MODIFICATION, NO FEES
      currency: currency ? String(currency) : 'USD',
      status: String(status),
      rentType: status === 'rent' ? (rentType || 'monthly') : undefined,
      bedrooms: toNumber(bedrooms),
      bathrooms: toNumber(bathrooms),
      size: toNumber(size),
      sizeUnit: req.body.sizeUnit || 'sqm', // Unit of measurement: sqm, dunam, sqft, sqyd
      landArea: landArea ? toNumber(landArea) : toNumber(size), // Default to size if not provided
      furnished: toBoolean(furnished),
      garages: toBoolean(garages),
      garageSize: garages && garageSize ? toNumber(garageSize) : 0,
      yearBuilt: (yearBuilt && yearBuilt !== 0 && yearBuilt !== '0' && yearBuilt.toString().trim() !== '') ? toNumber(yearBuilt) : null,
      floor: req.body.floor ? toNumber(req.body.floor) : undefined,
      numberOfFloors: req.body.numberOfFloors ? toNumber(req.body.numberOfFloors) : undefined,
      amenities: toArray(amenities),
      address: (address != null && address !== '') ? String(address) : '',
      address_ar: req.body.address_ar ? String(req.body.address_ar) : undefined,
      country: String(country),
      city: String(city),
      state: state ? String(state) : undefined, // Keep for backward compatibility
      neighborhood: (neighborhood != null && neighborhood !== '') ? String(neighborhood) : '',
      neighborhood_ar: req.body.neighborhood_ar ? String(req.body.neighborhood_ar) : undefined,
      agent: String(agent), // Required legacy field
      agentId: agentId ? (mongoose.Types.ObjectId.isValid(agentId) ? new mongoose.Types.ObjectId(agentId) : null) : null,
      agentName: agentName ? String(agentName).trim() : undefined, // Agent name as string
      agentName_ar: agentName_ar ? String(agentName_ar).trim() : undefined, // Arabic agent name
      agentEmail: agentEmail ? String(agentEmail) : undefined,
      agentNumber: agentNumber ? String(agentNumber) : undefined,
      agentWhatsapp: agentWhatsapp ? String(agentWhatsapp) : undefined,
      agentFacebook: req.body.agentFacebook ? String(req.body.agentFacebook).trim() : undefined,
      approvalStatus: approvalStatus || 'pending',
      isSold: toBoolean(isSold, false),
      isDeleted: toBoolean(isDeleted, false),
      notes: notes ? String(notes) : undefined,
      notes_ar: req.body.notes_ar ? String(req.body.notes_ar) : undefined,
      mapLocation: req.body.mapLocation ? String(req.body.mapLocation) : undefined,
      images: Array.isArray(images) ? images : [],
      imageNames: toArray(imageNames)
    };

    // Holiday Homes Requirements Enforcement
    if (listingData.propertyType === 'Holiday Home') {
      listingData.status = 'rent'; // Force rent only
      listingData.furnished = true; // Force furnished true
    }

    // Log the prepared data with special attention to propertyPrice
    logger.info(`💰 Final propertyPrice before save: ${listingData.propertyPrice}, Type: ${typeof listingData.propertyPrice}, String: ${listingData.propertyPrice.toString()}`);
    logger.debug('Listing data prepared:', {
      propertyId: listingData.propertyId,
      propertyType: listingData.propertyType,
      status: listingData.status,
      city: listingData.city,
      agentId: listingData.agentId,
      imagesCount: listingData.images.length,
      amenitiesCount: listingData.amenities.length,
      propertyPrice: listingData.propertyPrice
    });

    // Create listing in database
    const newListing = await Listing.create(listingData);
    
    // Log the saved price to verify it matches what we sent
    logger.info(`💰 Property Price - Saved in DB: ${newListing.propertyPrice}, Type: ${typeof newListing.propertyPrice}, String: ${newListing.propertyPrice.toString()}`);
    logger.info(`✅ Listing created successfully: ${newListing._id}`);
    
    // Notify admin about new listing
    try {
      const { notifyAdminAgentNewListing } = require('../utils/notifications');
      const listingTitle = newListing.propertyTitle || newListing.propertyDesc || newListing.propertyKeyword || 'Untitled Property';
      await notifyAdminAgentNewListing(
        newListing._id.toString(),
        listingData.agentId || listingData.agent || req.user?.id,
        listingTitle,
        newListing.propertyId // Pass propertyId (PROP_xxx) instead of ObjectId
      );
    } catch (notifError) {
      // Don't fail listing creation if notification fails
      logger.error('Failed to send new listing notification:', notifError);
    }

    // Cache removed - data is always fresh now

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
    logger.info(`Delete listing request - ID: ${req.params.id}, User: ${req.user?.id || 'unknown'}`);
    logger.debug('Request body:', req.body);
    logger.debug('Request headers:', req.headers);

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      logger.warn(`Listing not found: ${req.params.id}`);
      return next(errorHandler(404, 'Listing not found!'));
    }

    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Delete attempt without authentication');
      return next(errorHandler(401, 'You must be logged in to delete listings!'));
    }

    // Get user ID from req.user (could be req.user.id or req.user._id)
    const userId = req.user.id || req.user._id?.toString();
    const listingAgentId = listing.agentId?.toString();

    // Check if user is the owner or admin
    if (userId !== listingAgentId && req.user.role !== 'admin') {
      logger.warn(`Unauthorized delete attempt - User: ${userId}, Listing Owner: ${listingAgentId}`);
      return next(errorHandler(403, 'You can only delete your own listings!'));
    }

    // Get deletion reason from request body
    const { deletedReason } = req.body;
    logger.info(`Deletion reason: ${deletedReason || 'No reason provided'}`);

    // Normalize status to match enum values (sale or rent)
    // Handle cases where status might be "For Sale", "For Rent", etc.
    if (listing.status) {
      const statusLower = listing.status.toLowerCase().trim();
      if (statusLower.includes('rent')) {
        listing.status = 'rent';
      } else if (statusLower.includes('sale')) {
        listing.status = 'sale';
      }
      // If it's already 'sale' or 'rent', keep it as is
    }

    // Soft delete: mark as deleted instead of actually deleting
    listing.isDeleted = true;
    listing.deletedReason = deletedReason || 'No reason provided';
    listing.deletedAt = new Date();
    await listing.save();
    
    // Notify admin about listing deletion (only if not deleted by admin)
    if (req.user.role !== 'admin') {
      try {
        const { notifyAdminAgentDeleteListing } = require('../utils/notifications');
        const listingTitle = listing.propertyTitle || listing.propertyDesc || listing.propertyKeyword || 'Untitled Property';
        await notifyAdminAgentDeleteListing(
          listing._id.toString(),
          listing.agentId || listing.agent,
          listingTitle,
          listing.propertyId // Pass propertyId (PROP_xxx) instead of ObjectId
        );
      } catch (notifError) {
        logger.error('Failed to send delete listing notification:', notifError);
      }
    }

    // Cache removed - data is always fresh now

    // Delete all favorites associated with this deleted listing
    // This ensures favorites count is accurate and users don't see deleted listings in favorites
    const Favorite = require('../models/favorite.model');
    const deleteFavoritesResult = await Favorite.deleteMany({ 
      propertyId: listing._id 
    });
    
    if (deleteFavoritesResult.deletedCount > 0) {
      logger.info(`Deleted ${deleteFavoritesResult.deletedCount} favorites for deleted listing ${listing._id}`);
    }

    // Delete all reviews associated with this deleted listing
    const Review = require('../models/review.model');
    const deleteReviewsResult = await Review.deleteMany({ 
      propertyId: listing._id 
    });
    
    if (deleteReviewsResult.deletedCount > 0) {
      logger.info(`Deleted ${deleteReviewsResult.deletedCount} reviews for deleted listing ${listing._id}`);
    }

    // Delete all messages associated with this deleted listing
    const Message = require('../models/message.model');
    const deleteMessagesResult = await Message.deleteMany({ 
      propertyId: listing._id 
    });
    
    if (deleteMessagesResult.deletedCount > 0) {
      logger.info(`Deleted ${deleteMessagesResult.deletedCount} messages for deleted listing ${listing._id}`);
    }

    logger.info(`Listing ${listing._id} deleted successfully by user ${userId}`);
    res.status(200).json({
      success: true,
      message: 'Listing has been deleted!',
      data: listing
    });
  } catch (error) {
    logger.error('Error in deleteListing controller:', error);
    logger.error('Error stack:', error.stack);
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

    // If marking as sold, automatically set soldDate to current date/time
    // If marking as unsold, clear soldDate
    if (req.body.isSold === true) {
      // Dynamically set soldDate to current date when marking as sold
      // This ensures the date is always saved when user clicks "Mark as Sold"
      if (!listing.soldDate) {
        // No soldDate exists, set it to current date
        req.body.soldDate = new Date();
      } else if (!req.body.soldDate) {
        // soldDate exists but frontend didn't send it, preserve existing date
        req.body.soldDate = listing.soldDate;
      }
      // If frontend sends soldDate explicitly, use it (allows manual override if needed)
    } else if (req.body.isSold === false) {
      // Clear soldDate when marking as unsold
      req.body.soldDate = null;
    }

    // CRITICAL: Ensure propertyPrice is preserved exactly as sent (no rounding, no modification, NO DEDUCTION)
    const updateData = { ...req.body };
    if (updateData.propertyPrice !== undefined) {
      // CRITICAL: Preserve exact price value - convert to number but NEVER deduct or modify
      // NO DEDUCTION, NO FEES, NO MODIFICATION - Price must be stored exactly as received
      const originalPrice = updateData.propertyPrice;
      const exactPrice = parseFloat(updateData.propertyPrice);
      if (isNaN(exactPrice)) {
        return next(errorHandler(400, 'Invalid property price'));
      }
      
      // Verify no price modification occurred
      if (typeof originalPrice === 'number' && originalPrice !== exactPrice) {
        logger.error(`💰 CRITICAL: Price modification detected during update! Original: ${originalPrice}, Converted: ${exactPrice}`);
        return next(errorHandler(500, 'Price validation error - price was modified'));
      }
      
      logger.info(`💰 Update Property Price - Original: ${originalPrice}, Converted: ${exactPrice}, Type: ${typeof exactPrice}`);
      updateData.propertyPrice = exactPrice; // CRITICAL: Store exact price - NO DEDUCTION, NO MODIFICATION
    }

    // IMPORTANT: Preserve approvalStatus - only allow changes by admin
    // Log current approvalStatus before update
    logger.info(`📋 Update Listing - Current approvalStatus: ${listing.approvalStatus}, User role: ${req.user.role}`);
    logger.info(`📋 Update Listing - Request body approvalStatus: ${req.body.approvalStatus}, Type: ${typeof req.body.approvalStatus}`);
    
    // If user is not admin, ALWAYS preserve the existing approvalStatus
    if (req.user.role !== 'admin') {
      // Non-admin users cannot change approvalStatus - ALWAYS preserve existing value
      // Remove approvalStatus from updateData completely to ensure it's not changed
      if (updateData.approvalStatus !== undefined) {
        logger.warn(`⚠️ Non-admin user attempted to change approvalStatus from ${listing.approvalStatus} to ${updateData.approvalStatus}. Preserving original: ${listing.approvalStatus}`);
      }
      // ALWAYS remove approvalStatus from updateData for non-admin users
      delete updateData.approvalStatus;
      // Explicitly set it to the existing value to ensure it's preserved
      updateData.approvalStatus = listing.approvalStatus;
    } else {
      // Admin can change approvalStatus - but log it
      if (updateData.approvalStatus !== undefined && updateData.approvalStatus !== listing.approvalStatus) {
        logger.info(`✅ Admin changed approvalStatus from ${listing.approvalStatus} to ${updateData.approvalStatus}`);
      } else if (updateData.approvalStatus === undefined) {
        // If admin didn't send approvalStatus, preserve existing
        updateData.approvalStatus = listing.approvalStatus;
      }
    }

    // Final check: If approvalStatus is being changed to 'rejected' by non-admin, prevent it
    if (req.user.role !== 'admin' && updateData.approvalStatus && updateData.approvalStatus.toLowerCase() === 'rejected') {
      logger.error(`🚨 CRITICAL: Non-admin user attempted to set approvalStatus to 'rejected'. Forcing to original: ${listing.approvalStatus}`);
      updateData.approvalStatus = listing.approvalStatus; // Force to original value
    }
    
    // Normalize approvalStatus to lowercase before saving (model also has lowercase: true, but this ensures consistency)
    if (updateData.approvalStatus) {
      updateData.approvalStatus = updateData.approvalStatus.toLowerCase().trim();
    }
    
    // Normalize status to match enum values (sale or rent)
    // Handle cases where status might be "For Sale", "For Rent", etc. (from old data or frontend)
    if (updateData.status) {
      const statusLower = updateData.status.toLowerCase().trim();
      if (statusLower.includes('rent')) {
        updateData.status = 'rent';
      } else if (statusLower.includes('sale')) {
        updateData.status = 'sale';
      }
      // If it's already 'sale' or 'rent', keep it as is
      logger.info(`📋 Update Listing - Status normalized: ${updateData.status}`);
    }
    
    // Also normalize existing listing status if it's in old format (before saving)
    if (listing.status && !['sale', 'rent'].includes(listing.status)) {
      const statusLower = listing.status.toLowerCase().trim();
      if (statusLower.includes('rent')) {
        listing.status = 'rent';
      } else if (statusLower.includes('sale')) {
        listing.status = 'sale';
      }
      logger.info(`📋 Update Listing - Existing listing status normalized: ${listing.status}`);
    }
    
    logger.info(`📋 Update Listing - Final approvalStatus to save: ${updateData.approvalStatus}`);
    
    // Handle contact information fields (agentName, agentName_ar, agentEmail, agentNumber, agentWhatsapp, agentFacebook)
    // These can be updated by admin, and can be null to clear the value
    if (updateData.agentName !== undefined) {
      updateData.agentName = updateData.agentName ? String(updateData.agentName).trim() : null;
    }
    if (updateData.agentName_ar !== undefined) {
      updateData.agentName_ar = updateData.agentName_ar ? String(updateData.agentName_ar).trim() : null;
    }
    if (updateData.agentEmail !== undefined) {
      updateData.agentEmail = updateData.agentEmail ? String(updateData.agentEmail).trim() : null;
    }
    if (updateData.agentNumber !== undefined) {
      updateData.agentNumber = updateData.agentNumber ? String(updateData.agentNumber).trim() : null;
    }
    if (updateData.agentWhatsapp !== undefined) {
      updateData.agentWhatsapp = updateData.agentWhatsapp ? String(updateData.agentWhatsapp).trim() : null;
    }
    if (updateData.agentFacebook !== undefined || req.body.agentFacebook !== undefined) {
      updateData.agentFacebook = req.body.agentFacebook ? String(req.body.agentFacebook).trim() : null;
    }

    // Handle yearBuilt - convert empty string or 0 to null (null means not provided)
    if (updateData.yearBuilt !== undefined) {
      if (updateData.yearBuilt === '' || updateData.yearBuilt === null || updateData.yearBuilt === 0 || updateData.yearBuilt === '0' || (typeof updateData.yearBuilt === 'string' && updateData.yearBuilt.trim() === '')) {
        updateData.yearBuilt = null;
      } else {
        const yearNum = toNumber(updateData.yearBuilt);
        updateData.yearBuilt = (isNaN(yearNum) || yearNum === 0) ? null : yearNum;
      }
    }

    // Handle numberOfFloors (for Building type)
    if (updateData.numberOfFloors !== undefined) {
      if (updateData.numberOfFloors === '' || updateData.numberOfFloors === null || updateData.numberOfFloors === 0 || updateData.numberOfFloors === '0' || (typeof updateData.numberOfFloors === 'string' && updateData.numberOfFloors.trim() === '')) {
        updateData.numberOfFloors = null;
      } else {
        const num = toNumber(updateData.numberOfFloors);
        updateData.numberOfFloors = (isNaN(num) || num < 1) ? null : num;
      }
    }

    // Handle squareFootage - use parseFloat for decimals, sync to size and landArea for display
    if (updateData.squareFootage !== undefined) {
      const sq = parseFloat(updateData.squareFootage);
      if (!isNaN(sq) && sq >= 0) {
        updateData.squareFootage = sq;
        updateData.size = sq;
        updateData.landArea = sq;
      }
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      {
        $set: updateData,
      },
      { new: true }
    );
    
    // Cache removed - data is always fresh now
    
    // Log the saved approvalStatus to verify it matches what we intended
    logger.info(`📋 Update Listing - Saved approvalStatus in DB: ${updatedListing.approvalStatus}, Original was: ${listing.approvalStatus}`);
    
    // Notify admin about listing update (only if not updated by admin)
    if (req.user.role !== 'admin') {
      try {
        const { notifyAdminAgentUpdateListing } = require('../utils/notifications');
        const listingTitle = updatedListing.propertyTitle || updatedListing.propertyDesc || updatedListing.propertyKeyword || 'Untitled Property';
        await notifyAdminAgentUpdateListing(
          updatedListing._id.toString(),
          updatedListing.agentId || updatedListing.agent,
          listingTitle,
          updatedListing.propertyId // Pass propertyId (PROP_xxx) instead of ObjectId
        );
      } catch (notifError) {
        logger.error('Failed to send update listing notification:', notifError);
      }
    }

    res.status(200).json(updatedListing);
  } catch (error) {
    next(error);
  }
};
const getListingById = async (req, res, next) => {
  try {
    const { translateListing } = require('../utils/translateData');
    
    const listing = await Listing.findById(req.params.id).lean();
    if (!listing) {
      const message = req.t ? req.t('listing.not_found') : 'Listing not found!';
      return next(errorHandler(404, message));
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
    
    // Translate listing if translation function is available
    const translatedListing = req.t ? translateListing(listing, req.t) : listing;
    
    res.status(200).json(translatedListing);
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
    
    // For public pages (home, listing page, agent listing page), show only approved and exclude sold
    // For agent dashboard, show all statuses (pending, approved, rejected) including sold
    if (isPublic === 'true' || isPublic === true) {
      query.approvalStatus = { $in: ['approved', 'Approved', 'APPROVED'] }; // Match any case variation
      query.isSold = { $ne: true }; // Exclude sold listings from public pages
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
    
    // Log approvalStatus for debugging
    if (listings.length > 0) {
      logger.info(`📋 getListingsByAgent - Found ${listings.length} listings for agent ${agentId}`);
      listings.forEach((listing, index) => {
        logger.info(`📋 getListingsByAgent - Listing ${index + 1}: ID=${listing._id}, approvalStatus=${listing.approvalStatus}, propertyId=${listing.propertyId}`);
      });
    }
    
    // Translate listings if translation function is available
    const { translateListings } = require('../utils/translateData');
    const translatedListings = req.t ? translateListings(listings, req.t) : listings;
    
    res.status(200).json({
      success: true,
      data: translatedListings,
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
    const { translateListings } = require('../utils/translateData');
    
    // Wait for MongoDB connection if not ready
    if (mongoose.connection.readyState !== 1) {
      // Connection not ready, wait up to 5 seconds
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: 'Database connection not ready. Please try again in a moment.'
        });
      }
    }
    
    // Get filters and sort options from middleware
    const filters = req.filter || {};
    const sortOptions = req.sortOptions || { createdAt: -1 };
    const limit = parseInt(req.query.limit) || parseInt(req.query.pageSize) || 12;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    // Add filter to exclude deleted listings
    filters.isDeleted = { $ne: true };
    
    // Exclude sold listings from public pages
    filters.isSold = { $ne: true };
    
    // For public search, show approved listings only
    // No listing will be published without admin approval
    // Use exact match first (most common case - lowercase due to model validation)
    filters.approvalStatus = 'approved';
    
    logger.debug('getFilteredListings - filters:', JSON.stringify(filters, null, 2));
    logger.debug('getFilteredListings - sortOptions:', sortOptions);
    logger.debug('getFilteredListings - limit:', limit, 'skip:', skip);
    
    // Query the database with filters
    let listings = await Listing.find(filters)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .lean(); // Use lean() for better performance
    
    // If no results with exact match, try case-insensitive regex (for backward compatibility)
    if (listings.length === 0) {
      logger.warn(`⚠️ getFilteredListings - No listings found with exact 'approved' match, trying case-insensitive...`);
      const filtersWithRegex = { ...filters };
      filtersWithRegex.approvalStatus = { $regex: /^approved$/i };
      
      listings = await Listing.find(filtersWithRegex)
        .sort(sortOptions)
        .limit(limit)
        .skip(skip)
        .lean();
    }
    
    // Log approvalStatus values for debugging
    if (listings.length > 0) {
      logger.info(`📋 getFilteredListings - Found ${listings.length} listings`);
      listings.slice(0, 3).forEach((listing, index) => {
        logger.info(`📋 getFilteredListings - Listing ${index + 1}: propertyId=${listing.propertyId}, approvalStatus=${listing.approvalStatus}, type=${typeof listing.approvalStatus}, isSold=${listing.isSold}, isDeleted=${listing.isDeleted}`);
      });
    } else {
      logger.warn(`⚠️ getFilteredListings - No listings found with filters:`, JSON.stringify(filters, null, 2));
      // Debug: Check what listings exist in database
      const allListings = await Listing.find({ isDeleted: { $ne: true } }).select('propertyId approvalStatus isSold isDeleted').limit(5).lean();
      logger.warn(`⚠️ getFilteredListings - Sample listings in DB:`, JSON.stringify(allListings, null, 2));
    }
    
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
    
    // Translate listings if translation function is available
    const translatedListings = req.t ? translateListings(listings, req.t) : listings;
    
    logger.debug('getFilteredListings - found', listings.length, 'listings');
    
    // Get total count for pagination
    const total = await Listing.countDocuments(filters);
    const totalPages = Math.ceil(total / limit);
    
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
    
    // Return listings with pagination info
    res.status(200).json({
      success: true,
      data: translatedListings,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    logger.error('getFilteredListings error:', error);
    next(error);
  }
};

const getEachStateListing = async (req, res, next) => {
  try {
    const stateCounts = await Listing.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          isSold: { $ne: true }, // Exclude sold listings
          approvalStatus: { $in: ['approved', 'Approved', 'APPROVED'] } // Match any case variation
        }
      },
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
    
    // Notify agent about listing view milestone
    if (listing.agentId) {
      try {
        const { notifyAgentListingView } = require('../utils/notifications');
        const listingTitle = listing.propertyTitle || listing.propertyDesc || listing.propertyKeyword || 'Untitled Property';
        await notifyAgentListingView(
          listing.agentId.toString(),
          listing._id.toString(),
          listingTitle,
          listing.visitCount
        );
      } catch (notifError) {
        // Don't fail visit increment if notification fails
        logger.debug('Failed to send view milestone notification:', notifError);
      }
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
    
    // Match both agentId (new) and agent (legacy) fields, exclude deleted and sold listings
    // Match both lowercase and any case variations (should be lowercase due to model validation)
    const listings = await Listing.find({
      $or: [
        { agentId: agentIdObj },
        { agent: agentId }
      ],
      isDeleted: { $ne: true },
      isSold: { $ne: true }, // Exclude sold listings from most visited
      approvalStatus: { $in: ['approved', 'Approved', 'APPROVED'] }
    })
      .sort({ visitCount: -1 })
      .limit(10)
      .lean();
    
    // Log approvalStatus values for debugging
    if (listings.length > 0) {
      logger.info(`📋 getMostVisitedListings - Found ${listings.length} listings for agent ${agentId}`);
      listings.slice(0, 3).forEach((listing, index) => {
        logger.info(`📋 getMostVisitedListings - Listing ${index + 1}: propertyId=${listing.propertyId}, approvalStatus=${listing.approvalStatus}, type=${typeof listing.approvalStatus}`);
      });
    } else {
      logger.warn(`⚠️ getMostVisitedListings - No listings found for agent ${agentId}`);
    }
    
    logger.debug('getMostVisitedListings - found listings:', listings.length);
    logger.debug('getMostVisitedListings - sample listing:', listings[0] ? {
      id: listings[0]._id,
      visitCount: listings[0].visitCount,
      agentId: listings[0].agentId,
      agent: listings[0].agent
    } : 'none');
    
    // Translate listings if translation function is available
    const { translateListings } = require('../utils/translateData');
    const translatedListings = req.t ? translateListings(listings, req.t) : listings;
    
    res.status(200).json(translatedListings);
  } catch (error) {
    logger.error('getMostVisitedListings error:', error);
    next(error);
  }
};

/**
 * AI-powered natural language property search
 * POST /api/listing/ai-search
 * Body: { query: "I want one apartment 2 room 1 bedroom with nice view" }
 * 
 * Uses rule-based parser (works in Syria) with optional OpenAI fallback
 */
const aiSearch = async (req, res, next) => {
  try {
    const { translateListings } = require('../utils/translateData');
    const { parseQuery } = require('../utils/ruleBasedParser');
    
    const { query } = req.body;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return next(errorHandler(400, 'Query is required and must be a non-empty string'));
    }

    logger.info(`🔍 Natural Language Search request: "${query}"`);

    // Parse natural language query using rule-based parser (works in Syria!)
    let extractedParams;
    try {
      // Use rule-based parser (no external API needed - works in Syria)
      extractedParams = parseQuery(query);

      // Use OpenAI when available - merge: AI enriches, but rule-based keeps values AI returns null for
      // (Rule-based handles word numbers like "three" reliably; AI may return null and overwrite)
      if (process.env.OPENAI_API_KEY) {
        try {
          const { parseAIQuery } = require('../utils/aiSearchParser');
          const aiParams = await parseAIQuery(query);
          const mergeValue = (ruleVal, aiVal) => (aiVal != null && aiVal !== '') ? aiVal : ruleVal;
          extractedParams = {
            ...extractedParams,
            ...Object.fromEntries(
              Object.entries(aiParams || {}).map(([k, v]) => [k, mergeValue(extractedParams[k], v)])
            )
          };
          logger.info('✅ Using OpenAI for enhanced parsing');
        } catch (aiError) {
          logger.warn('OpenAI parsing failed, using rule-based only:', aiError.message);
        }
      }
    } catch (parseError) {
      logger.error('Query parsing error:', parseError);
      return next(errorHandler(500, `Query parsing failed: ${parseError.message}`));
    }

    // If parser didn't extract anything meaningful, return empty result (avoid showing all listings)
    const hasMeaningfulParams = () => {
      if (!extractedParams || typeof extractedParams !== 'object') return false;
      const {
        propertyType, bedrooms, bathrooms, sizeMin, sizeMax,
        priceMin, priceMax, status, city, neighborhood,
        furnished, garages, viewType, rentType,
        amenities = [], keywords = []
      } = extractedParams;

      const hasNeighborhood = Boolean(neighborhood && String(neighborhood).trim().length > 0);

      // Strong signals: any of these alone is enough
      const hasStrong =
        propertyType ||
        status ||
        city ||
        viewType ||
        rentType ||
        (furnished !== null && furnished !== undefined) ||
        (garages !== null && garages !== undefined) ||
        (Array.isArray(amenities) && amenities.length > 0) ||
        (bedrooms !== null && bedrooms !== undefined) ||
        (bathrooms !== null && bathrooms !== undefined) ||
        (sizeMin !== null && sizeMin !== undefined) ||
        (sizeMax !== null && sizeMax !== undefined) ||
        (priceMin !== null && priceMin !== undefined) ||
        (priceMax !== null && priceMax !== undefined);

      // Neighborhood alone is weak; require city with it if there are no strong signals
      if (hasStrong) return true;
      if (hasNeighborhood && city) return true;
      return false;
    };

    const meaningful = hasMeaningfulParams();
    if (!meaningful) {
      logger.warn(`AI Search returned no meaningful params for query: "${query}", responding with empty results.`);
      return res.status(200).json({
        success: true,
        data: [],
        extractedParams,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Build MongoDB query filters from extracted parameters
    const filters = {
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved'
    };

    // Apply property type filter
    if (extractedParams.propertyType) {
      // Villa/farms and Villa are related: include both when user searches for villa
      if (extractedParams.propertyType === 'Villa/farms') {
        filters.propertyType = { $in: ['Villa', 'Villa/farms'] };
      } else {
        filters.propertyType = extractedParams.propertyType;
      }
    }

    // Ensure bedrooms/bathrooms are numbers (handle "three", "3", etc.)
    const toNum = (v) => {
      if (v == null) return null;
      if (typeof v === 'number' && !isNaN(v) && v >= 0) return Math.floor(v);
      const s = String(v).toLowerCase().trim();
      const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
      if (words[s] != null) return words[s];
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 0 ? Math.floor(n) : null;
    };
    if (extractedParams.bedrooms != null) {
      const n = toNum(extractedParams.bedrooms);
      if (n != null) extractedParams.bedrooms = n;
    }
    if (extractedParams.bathrooms != null) {
      const n = toNum(extractedParams.bathrooms);
      if (n != null) extractedParams.bathrooms = n;
    }

    // Apply numeric filters
    // For bedrooms: if user searches for "X rooms + salon", search for X or more rooms
    // This handles cases where properties are listed as "2 rooms" but have a salon (which counts as +1)
    if (extractedParams.bedrooms !== null) {
      // Check if salon was mentioned in the original query (from keywords)
      const hasSalonKeyword = extractedParams.keywords && extractedParams.keywords.some(k => 
        k.toLowerCase().includes('salon') || k.includes('صالون') || k.includes('صالة')
      );
      
      if (hasSalonKeyword && extractedParams.bedrooms > 1) {
        // If salon was mentioned and bedrooms > 1, search for bedrooms >= (bedrooms - 1)
        // Example: "غرفتين وصالون" = 3 total, but search for bedrooms >= 2
        // This finds properties with 2+ rooms (which may have a salon)
        filters.bedrooms = { $gte: extractedParams.bedrooms - 1 };
        logger.info(`✅ AI Search - Salon mentioned, searching for bedrooms >= ${extractedParams.bedrooms - 1} (${extractedParams.bedrooms} total including salon)`);
      } else {
        // Exact match for bedrooms
        filters.bedrooms = extractedParams.bedrooms;
      }
    }

    if (extractedParams.bathrooms !== null) {
      filters.bathrooms = extractedParams.bathrooms;
    }

    // Apply size range filter
    if (extractedParams.sizeMin || extractedParams.sizeMax) {
      filters.size = {};
      if (extractedParams.sizeMin !== null) {
        filters.size.$gte = extractedParams.sizeMin;
      }
      if (extractedParams.sizeMax !== null) {
        filters.size.$lte = extractedParams.sizeMax;
      }
    }

    // Apply price range filter
    if (extractedParams.priceMin || extractedParams.priceMax) {
      filters.propertyPrice = {};
      if (extractedParams.priceMin !== null) {
        filters.propertyPrice.$gte = extractedParams.priceMin;
      }
      if (extractedParams.priceMax !== null) {
        filters.propertyPrice.$lte = extractedParams.priceMax;
      }
    }

    // Apply status filter
    if (extractedParams.status) {
      filters.status = extractedParams.status;
    }

    // Apply rent type filter for AI search
    // When user searches "فيلات اجار بشكل يومي", show only villas with rentType: 'daily'
    if (extractedParams.status === 'rent' && extractedParams.rentType) {
      filters.rentType = extractedParams.rentType;
      logger.info(`✅ AI Search - Filtering by rent type: "${extractedParams.rentType}"`);
    }

    // Apply city filter (case-insensitive regex for flexible matching)
    if (extractedParams.city) {
      // Use case-insensitive exact match or partial match for city
      // This handles variations like "Latakia", "latakia", "LATAKIA", etc.
      filters.city = { $regex: new RegExp(`^${extractedParams.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
      logger.info(`✅ AI Search - Filtering by city: ${extractedParams.city} (regex: ${filters.city.$regex})`);
    }

    // IGNORE neighborhood filter for AI search - focus on city only
    // Neighborhood filtering is disabled to avoid false negatives
    // Users can use regular search filters for neighborhood-specific searches
    if (extractedParams.neighborhood) {
      logger.info(`⚠️  AI Search - Ignoring neighborhood filter: "${extractedParams.neighborhood}" (focusing on city only)`);
      // Neighborhood filter is intentionally NOT applied
    }

    // Apply amenities filter
    if (extractedParams.amenities && extractedParams.amenities.length > 0) {
      filters.amenities = { $in: extractedParams.amenities };
    }

    // Apply boolean filters
    if (extractedParams.furnished !== null) {
      filters.furnished = extractedParams.furnished;
    }

    if (extractedParams.garages !== null) {
      filters.garages = extractedParams.garages;
    }

    // Build keyword search (for view types and other descriptive keywords)
    // NOTE: We don't search for "salon" in keywords because it's already handled in bedrooms logic
    // Searching for salon in descriptions would be too restrictive and might miss properties
    const keywordConditions = [];
    
    // Add view type keywords
    if (extractedParams.viewType) {
      const viewKeywords = extractedParams.viewType.split(' ');
      viewKeywords.forEach(keyword => {
        keywordConditions.push(
          { propertyKeyword: { $regex: keyword, $options: 'i' } },
          { propertyDesc: { $regex: keyword, $options: 'i' } },
          { description_ar: { $regex: keyword, $options: 'i' } }
        );
      });
    }

    // Add other keywords (but exclude salon-related keywords - they're handled in bedrooms logic)
    if (extractedParams.keywords && extractedParams.keywords.length > 0) {
      const salonKeywords = ['salon', 'living room', 'صالون', 'صالة', 'صاله'];
      extractedParams.keywords.forEach(keyword => {
        // Skip salon keywords - they're already handled in bedrooms >= logic
        const isSalonKeyword = salonKeywords.some(sk => 
          keyword.toLowerCase().includes(sk.toLowerCase()) || 
          sk.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!isSalonKeyword) {
          keywordConditions.push(
            { propertyKeyword: { $regex: keyword, $options: 'i' } },
            { propertyDesc: { $regex: keyword, $options: 'i' } },
            { description_ar: { $regex: keyword, $options: 'i' } }
          );
        }
      });
    }

    // If we have keyword conditions, add $or to filters
    if (keywordConditions.length > 0) {
      // If filters already has $or, merge them
      if (filters.$or) {
        filters.$and = [
          { $or: filters.$or },
          { $or: keywordConditions }
        ];
        delete filters.$or;
      } else {
        filters.$or = keywordConditions;
      }
    }

    logger.debug('AI Search filters:', JSON.stringify(filters, null, 2));

    // Query the database
    let listings = await Listing.find(filters)
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(limit)
      .skip(skip)
      .lean();

    // If no results with exact match, try fallback strategies
    if (listings.length === 0) {
      logger.warn('⚠️ AI Search - No listings found with exact match, trying fallback strategies...');
      
      // Strategy 1: Try case-insensitive regex for approvalStatus
      const filtersWithRegex = { ...filters };
      filtersWithRegex.approvalStatus = { $regex: /^approved$/i };
      
      listings = await Listing.find(filtersWithRegex)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
      
      // Strategy 2: If still no results and we have bedrooms filter with salon, try searching for exact bedrooms (without salon)
      if (listings.length === 0 && filters.bedrooms && filters.bedrooms.$gte) {
        logger.warn(`⚠️ AI Search - No results with bedrooms >= ${filters.bedrooms.$gte}, trying exact bedrooms match...`);
        const filtersExactBedrooms = { ...filters };
        filtersExactBedrooms.bedrooms = filters.bedrooms.$gte; // Try exact match for the base number
        
        listings = await Listing.find(filtersExactBedrooms)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();
      }
      
      // Strategy 3: If still no results, try without bedrooms filter (only city)
      if (listings.length === 0 && filters.bedrooms && filters.city) {
        logger.warn('⚠️ AI Search - No results with bedrooms filter, trying without bedrooms (city only)...');
        const filtersCityOnly = { ...filters };
        delete filtersCityOnly.bedrooms;
        
        listings = await Listing.find(filtersCityOnly)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();
      }
    }

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

    // Get total count for pagination
    const totalCount = await Listing.countDocuments(filters);
    const totalPages = Math.ceil(totalCount / limit);

    // Translate listings if translation function is available
    const translatedListings = req.t ? translateListings(listings, req.t) : listings;

    logger.info(`✅ Natural Language Search found ${listings.length} listings (page ${page} of ${totalPages})`);

    // Return response with extracted parameters for transparency
    res.status(200).json({
      success: true,
      data: translatedListings,
      extractedParams: extractedParams,
      pagination: {
        page: page,
        limit: limit,
        total: totalCount,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    logger.error('AI Search error:', error);
    next(error);
  }
};

/**
 * Export properties to CSV
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const exportProperties = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('agentId role');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;
    const isObjectId = mongoose.Types.ObjectId.isValid(queryId);
    const queryIdObj = isObjectId ? new mongoose.Types.ObjectId(queryId) : queryId;

    // Get all listings for this agent (no pagination for export)
    const listings = await Listing.find({
      $or: [{ agent: queryId }, { agentId: queryIdObj }],
      isDeleted: { $ne: true }
    }).lean();

    if (!listings || listings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No properties found to export'
      });
    }

    // CSV Headers
    const headers = [
      'Property ID',
      'Property Type',
      'Property Keyword',
      'Description',
      'Price',
      'Currency',
      'Status',
      'Rent Type',
      'Bedrooms',
      'Bathrooms',
      'Size',
      'Size Unit',
      'Furnished',
      'Garages',
      'Year Built',
      'Floor',
      'Address',
      'City',
      'State',
      'Neighborhood',
      'Amenities',
      'Approval Status',
      'Is Sold',
      'Visit Count'
    ];

    // Convert listings to CSV rows
    const csvRows = listings.map(listing => {
      return [
        listing.propertyId || listing._id,
        listing.propertyType || '',
        listing.propertyKeyword || '',
        (listing.propertyDesc || listing.description || '').replace(/"/g, '""'), // Escape quotes
        listing.propertyPrice || 0,
        listing.currency || 'USD',
        listing.status || '',
        listing.rentType || '',
        listing.bedrooms || 0,
        listing.bathrooms || 0,
        listing.size || 0,
        listing.sizeUnit || 'sqm',
        listing.furnished ? 'Yes' : 'No',
        listing.garages ? 'Yes' : 'No',
        listing.yearBuilt || '',
        listing.floor || '',
        (listing.address || '').replace(/"/g, '""'),
        listing.city || '',
        listing.state || '',
        (listing.neighborhood || '').replace(/"/g, '""'),
        Array.isArray(listing.amenities) ? listing.amenities.join('; ') : '',
        listing.approvalStatus || 'pending',
        listing.isSold ? 'Yes' : 'No',
        listing.visitCount || 0
      ];
    });

    // Escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...csvRows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Set response headers for CSV download
    const filename = `properties_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

    // Send CSV file
    res.status(200).send('\ufeff' + csvContent); // BOM for Excel UTF-8 support
  } catch (error) {
    logger.error('Export Properties Error:', error);
    next(error);
  }
};

/**
 * Import properties from CSV
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const importProperties = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('agentId role agent');
    const queryId = (user && user.role === 'agent' && user.agentId) ? user.agentId.toString() : userId;
    
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded'
      });
    }

    // Parse CSV buffer to string
    const csvContent = req.file.buffer.toString('utf-8');
    
    // Remove BOM if present
    const csvText = csvContent.replace(/^\ufeff/, '');
    
    // Simple CSV parser (handles quoted values)
    const parseCSV = (text) => {
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) return { headers: [], rows: [] };
      
      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      // Parse rows
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j];
          if (char === '"') {
            if (inQuotes && lines[i][j + 1] === '"') {
              currentValue += '"';
              j++; // Skip next quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim()); // Add last value
        rows.push(values);
      }
      
      return { headers, rows };
    };

    const { headers, rows } = parseCSV(csvText);
    
    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or has no data rows'
      });
    }

    // Map CSV columns to listing fields
    const getColumnIndex = (name) => {
      const index = headers.findIndex(h => 
        h.toLowerCase().replace(/\s+/g, ' ') === name.toLowerCase().replace(/\s+/g, ' ')
      );
      return index >= 0 ? index : null;
    };

    const results = {
      success: 0,
      errors: [],
      total: rows.length
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Map CSV values to listing data
        const propertyData = {
          propertyId: row[getColumnIndex('Property ID')] || `PROP_${Date.now()}_${i}`,
          propertyType: row[getColumnIndex('Property Type')] || 'Apartment',
          propertyKeyword: row[getColumnIndex('Property Keyword')] || '',
          propertyDesc: row[getColumnIndex('Description')] || '',
          propertyPrice: parseFloat(row[getColumnIndex('Price')]) || 0,
          currency: row[getColumnIndex('Currency')] || 'USD',
          status: (row[getColumnIndex('Status')] || 'sale').toLowerCase(),
          rentType: row[getColumnIndex('Rent Type')] || undefined,
          bedrooms: parseInt(row[getColumnIndex('Bedrooms')]) || 0,
          bathrooms: parseInt(row[getColumnIndex('Bathrooms')]) || 0,
          size: parseFloat(row[getColumnIndex('Size')]) || 0,
          sizeUnit: row[getColumnIndex('Size Unit')] || 'sqm',
          furnished: (row[getColumnIndex('Furnished')] || '').toLowerCase() === 'yes',
          garages: (row[getColumnIndex('Garages')] || '').toLowerCase() === 'yes',
          yearBuilt: row[getColumnIndex('Year Built')] ? parseInt(row[getColumnIndex('Year Built')]) : null,
          floor: row[getColumnIndex('Floor')] ? parseInt(row[getColumnIndex('Floor')]) : undefined,
          address: row[getColumnIndex('Address')] || '',
          city: row[getColumnIndex('City')] || '',
          state: row[getColumnIndex('State')] || undefined,
          neighborhood: row[getColumnIndex('Neighborhood')] || '',
          amenities: row[getColumnIndex('Amenities')] ? 
            row[getColumnIndex('Amenities')].split(';').map(a => a.trim()).filter(a => a) : [],
          approvalStatus: (row[getColumnIndex('Approval Status')] || 'pending').toLowerCase(),
          isSold: (row[getColumnIndex('Is Sold')] || '').toLowerCase() === 'yes',
          visitCount: parseInt(row[getColumnIndex('Visit Count')]) || 0,
          agent: queryId,
          agentId: mongoose.Types.ObjectId.isValid(queryId) ? new mongoose.Types.ObjectId(queryId) : null,
          isDeleted: false
        };

        // Holiday Homes Requirements
        if (propertyData.propertyType === 'Holiday Home') {
          propertyData.status = 'rent';
          propertyData.furnished = true;
        }

        // Create listing
        await Listing.create(propertyData);
        results.success++;
      } catch (error) {
        results.errors.push({
          row: i + 2, // +2 because row 1 is headers, rows start at 2
          error: error.message
        });
        logger.error(`Import error at row ${i + 2}:`, error);
      }
    }

    res.status(200).json({
      success: true,
      message: `Imported ${results.success} of ${results.total} properties`,
      data: results
    });
  } catch (error) {
    logger.error('Import Properties Error:', error);
    next(error);
  }
};

/**
 * Update listing images - add new and/or delete existing
 * Route uses: uploadListingImages, uploadListingImagesMiddleware (uploads new files to Cloudinary)
 * Expects multipart/form-data: images (files), imagesToDelete (JSON string of publicIds array)
 */
const updateListingImages = async (req, res, next) => {
  try {
    const cloudinary = require('../utils/cloudinary');
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }
    if (!req.user) {
      return next(errorHandler(401, 'You must be logged in to update listings!'));
    }
    const userId = req.user.id || req.user._id?.toString();
    const listingAgentId = listing.agentId?.toString();
    if (userId !== listingAgentId && req.user.role !== 'admin') {
      return next(errorHandler(403, 'You can only update your own listings!'));
    }

    let currentImages = Array.isArray(listing.images) ? [...listing.images] : [];
    let imageNames = Array.isArray(listing.imageNames) ? [...listing.imageNames] : [];

    // Parse imagesToDelete (publicIds or URLs to remove)
    const imagesToDelete = (() => {
      try {
        const raw = req.body?.imagesToDelete;
        if (!raw) return [];
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    // Remove deleted images from DB and Cloudinary
    for (const idOrUrl of imagesToDelete) {
      if (!idOrUrl || typeof idOrUrl !== 'string') continue;
      const idx = currentImages.findIndex(img => {
        if (!img) return false;
        if (img.publicId === idOrUrl) return true;
        const url = img.url || img.src || (typeof img === 'string' ? img : '');
        return url === idOrUrl;
      });
      if (idx >= 0) {
        const img = currentImages[idx];
        const publicId = img?.publicId;
        currentImages.splice(idx, 1);
        if (imageNames[idx] !== undefined) imageNames.splice(idx, 1);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { invalidate: true });
          } catch (err) {
            logger.warn('Cloudinary destroy failed for', publicId, err.message);
          }
        }
      }
    }

    // Append newly uploaded images (from uploadListingImagesMiddleware)
    const newImages = req.body?.images || [];
    const newNames = req.body?.imageNames || [];
    if (Array.isArray(newImages) && newImages.length > 0) {
      currentImages.push(...newImages);
      imageNames.push(...(Array.isArray(newNames) ? newNames : []));
    }

    // Enforce max 15 images
    const maxImages = 15;
    if (currentImages.length > maxImages) {
      currentImages = currentImages.slice(0, maxImages);
      imageNames = imageNames.slice(0, maxImages);
    }

    listing.images = currentImages;
    listing.imageNames = imageNames;
    await listing.save();

    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createListing,
  deleteListing,
  updateListing,
  updateListingImages,
  getListingById,
  getListingImages,
  getListingsByAgent,
  getFilteredListings,
  getEachStateListing,
  incrementVisitCount,
  getMostVisitedListings,
  aiSearch,
  exportProperties,
  importProperties,
};
