const PropertyRental = require('../models/propertyRental.model');
const errorHandler = require('../utils/error');
const logger = require('../utils/logger');

// Create - POST /api/property-rental
const createPropertyRentalRequest = async (req, res, next) => {
  try {
    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      propertyType,
      propertySize,
      bedrooms,
      bathrooms,
      location,
      features,
      additionalDetails,
    } = req.body;

    // Validate required fields
    if (!ownerName || !ownerEmail || !ownerPhone || !propertyType || !propertySize || !bedrooms || !bathrooms || !location || !features) {
      return next(errorHandler(400, 'All required fields must be provided'));
    }

    // Validate property size
    if (propertySize <= 0) {
      return next(errorHandler(400, 'Property size must be greater than 0'));
    }

    // Validate bedrooms and bathrooms
    if (bedrooms < 0 || bathrooms < 0) {
      return next(errorHandler(400, 'Bedrooms and bathrooms cannot be negative'));
    }

    // Create property rental request
    const propertyRentalRequest = await PropertyRental.create({
      ownerName,
      ownerEmail,
      ownerPhone,
      propertyType,
      propertySize,
      bedrooms,
      bathrooms,
      location,
      features,
      additionalDetails: additionalDetails || '',
      status: 'pending',
    });

    logger.info('[PROPERTY_RENTAL_REQUEST] New request created', {
      id: propertyRentalRequest._id,
      ownerEmail,
      propertyType,
      location,
    });

    res.status(201).json({
      success: true,
      message: 'Property rental service request submitted successfully. Our team will contact you shortly to schedule a property inspection.',
      data: propertyRentalRequest,
    });
  } catch (error) {
    logger.error('[PROPERTY_RENTAL_REQUEST_ERROR]', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

// Read All - GET /api/property-rental
const getAllPropertyRentalRequests = async (req, res, next) => {
  try {
    const {
      status,
      propertyType,
      ownerEmail,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (propertyType) query.propertyType = propertyType;
    if (ownerEmail) query.ownerEmail = ownerEmail.toLowerCase();

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [requests, total] = await Promise.all([
      PropertyRental.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      PropertyRental.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('[PROPERTY_RENTAL_GET_ALL_ERROR]', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

// Read One - GET /api/property-rental/:id
const getPropertyRentalRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await PropertyRental.findById(id);

    if (!request) {
      return next(errorHandler(404, 'Property rental request not found'));
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    logger.error('[PROPERTY_RENTAL_GET_BY_ID_ERROR]', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

// Update - PUT /api/property-rental/:id
const updatePropertyRentalRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the request
    const request = await PropertyRental.findById(id);
    if (!request) {
      return next(errorHandler(404, 'Property rental request not found'));
    }

    // Validate property size if provided
    if (updateData.propertySize !== undefined && updateData.propertySize <= 0) {
      return next(errorHandler(400, 'Property size must be greater than 0'));
    }

    // Validate bedrooms and bathrooms if provided
    if (updateData.bedrooms !== undefined && updateData.bedrooms < 0) {
      return next(errorHandler(400, 'Bedrooms cannot be negative'));
    }
    if (updateData.bathrooms !== undefined && updateData.bathrooms < 0) {
      return next(errorHandler(400, 'Bathrooms cannot be negative'));
    }

    // Validate status if provided
    if (updateData.status && !['pending', 'under_review', 'inspected', 'agreement_sent', 'agreed', 'rejected'].includes(updateData.status)) {
      return next(errorHandler(400, 'Invalid status value'));
    }

    // Validate property type if provided
    if (updateData.propertyType && !['apartment', 'villa', 'house', 'land', 'commercial', 'office', 'shop', 'other'].includes(updateData.propertyType)) {
      return next(errorHandler(400, 'Invalid property type'));
    }

    // Update the request
    const updatedRequest = await PropertyRental.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    logger.info('[PROPERTY_RENTAL_UPDATE] Request updated', {
      id: updatedRequest._id,
      updatedFields: Object.keys(updateData),
    });

    res.status(200).json({
      success: true,
      message: 'Property rental request updated successfully',
      data: updatedRequest,
    });
  } catch (error) {
    logger.error('[PROPERTY_RENTAL_UPDATE_ERROR]', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

// Delete - DELETE /api/property-rental/:id
const deletePropertyRentalRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await PropertyRental.findById(id);
    if (!request) {
      return next(errorHandler(404, 'Property rental request not found'));
    }

    await PropertyRental.findByIdAndDelete(id);

    logger.info('[PROPERTY_RENTAL_DELETE] Request deleted', {
      id: request._id,
      ownerEmail: request.ownerEmail,
    });

    res.status(200).json({
      success: true,
      message: 'Property rental request deleted successfully',
    });
  } catch (error) {
    logger.error('[PROPERTY_RENTAL_DELETE_ERROR]', {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

module.exports = {
  createPropertyRentalRequest,
  getAllPropertyRentalRequests,
  getPropertyRentalRequestById,
  updatePropertyRentalRequest,
  deletePropertyRentalRequest,
};

