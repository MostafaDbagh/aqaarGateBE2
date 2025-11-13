const Listing = require('../models/listing.model');
const logger = require('../utils/logger');

const filterListings = async (req, res, next) => {
  try {
    const {
      status,
      state,
      city, // Primary city parameter
      cities, // Alternative city parameter name
      bedrooms,
      bathrooms,
      priceMin,
      priceMax,
      sizeMin,
      sizeMax,
      neighborhood,
      furnished,
      garages,
      amenities,
      keyword,
      rentType,
      offer,
      propertyType,
      propertyId,
      agentId,
      sort,
    } = req.query;

    const filters = {};

    // Exact matches
    if (status) filters.status = status;
    // Handle city parameter - main field is 'city', but support legacy 'state' parameter
    // Priority: city > cities > state
    if (city) {
      filters.city = city;
    } else if (cities) {
      filters.city = cities;
    } else if (state) {
      // Legacy support - map state to city for backward compatibility
      filters.city = state;
    }
    if (neighborhood) filters.neighborhood = neighborhood;
    if (rentType) filters.rentType = rentType;
    if (propertyType) filters.propertyType = propertyType;
    if (propertyId) filters.propertyId = propertyId;
    if (agentId) filters.agentId = agentId;
    if (offer !== undefined) filters.offer = offer === 'true';
    if (furnished !== undefined) filters.furnished = furnished === 'true';
    if (garages !== undefined) filters.garages = garages === 'true';

    // Numeric filters
    if (bedrooms) filters.bedrooms = +bedrooms;
    if (bathrooms) filters.bathrooms = +bathrooms;

    if (priceMin || priceMax) {
      filters.propertyPrice = {};
      if (priceMin) filters.propertyPrice.$gte = +priceMin;
      if (priceMax) filters.propertyPrice.$lte = +priceMax;
    }

    if (sizeMin || sizeMax) {
      filters.size = {};
      if (sizeMin) filters.size.$gte = +sizeMin;
      if (sizeMax) filters.size.$lte = +sizeMax;
    }

    // Keyword (search in both keyword and description)
    if (keyword) {
      filters.$or = [
        { propertyKeyword: { $regex: keyword, $options: 'i' } },
        { propertyDesc: { $regex: keyword, $options: 'i' } }
      ];
    }

    // Amenities (match all selected)
    if (amenities) {
      const amenitiesArray = Array.isArray(amenities)
        ? amenities
        : amenities.split(',');
      filters.amenities = { $all: amenitiesArray };
    }

    // Handle sorting
    let sortOptions = { createdAt: -1 }; // Default: newest first
    if (sort) {
      logger.debug('Sort parameter received:', sort);
      switch (sort.toLowerCase()) {
        case 'newest':
          sortOptions = { createdAt: -1 };
          break;
        case 'oldest':
          sortOptions = { createdAt: 1 };
          break;
        case 'price_asc':
          sortOptions = { propertyPrice: 1 };
          break;
        case 'price_desc':
          sortOptions = { propertyPrice: -1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }
      logger.debug('Sort options applied:', sortOptions);
    }

    // Store filters and sort options in request object for the controller to use
    req.filter = filters;
    req.sortOptions = sortOptions;
    next();
  } catch (err) {
    logger.error('Listing middleware error:', err);
    logger.error('Error stack:', err.stack);
    // Pass error to error handling middleware
    next(err);
  }
};

module.exports = filterListings;
