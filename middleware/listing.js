const Listing = require('../models/listing.model');
const logger = require('../utils/logger');

/**
 * Convert Arabic property type to English
 * @param {string} arabicType - Arabic property type value
 * @returns {string} English property type value
 */
const convertArabicPropertyType = (arabicType) => {
  if (!arabicType || typeof arabicType !== 'string') return arabicType;
  
  const propertyTypeMap = {
    'شقة': 'Apartment',
    'فيلا/مزرعة': 'Villa/farms',
    'فيلا': 'Villa',
    'مكتب': 'Office',
    'تجاري': 'Commercial',
    'أرض': 'Land',
    'أرض/قطعة': 'Land/Plot',
    'بيت عطلة': 'Holiday Home',
    'بيوت عطلة': 'Holiday Homes'
  };
  
  return propertyTypeMap[arabicType] || arabicType;
};

/**
 * Convert Arabic city name to English
 * @param {string} arabicCity - Arabic city name
 * @returns {string} English city name
 */
const convertArabicCity = (arabicCity) => {
  if (!arabicCity || typeof arabicCity !== 'string') return arabicCity;
  
  const cityMap = {
    'دمشق': 'Damascus',
    'حلب': 'Aleppo',
    'حمص': 'Homs',
    'اللاذقية': 'Latakia',
    'طرطوس': 'Tartus',
    'درعا': 'Daraa',
    'حماة': 'Hama',
    'إدلب': 'Idlib',
    'دير الزور': 'Der El Zor',
    'Deir ez-Zor': 'Der El Zor'
  };
  
  return cityMap[arabicCity] || arabicCity;
};

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
    // Convert Arabic city names to English
    let cityValue = null;
    if (city) {
      cityValue = convertArabicCity(city);
      filters.city = cityValue;
    } else if (cities) {
      cityValue = convertArabicCity(cities);
      filters.city = cityValue;
    } else if (state) {
      // Legacy support - map state to city for backward compatibility
      cityValue = convertArabicCity(state);
      filters.city = cityValue;
    }
    
    if (neighborhood) filters.neighborhood = neighborhood;
    if (rentType) filters.rentType = rentType;
    
    // Convert Arabic property type to English
    if (propertyType) {
      const englishPropertyType = convertArabicPropertyType(propertyType);
      
      // Use flexible matching for property types (same as category stats)
      // This ensures consistency between category counts and search results
      const propertyTypeLower = englishPropertyType.toLowerCase().trim();
      
      if (propertyTypeLower === 'villa/farms' || propertyTypeLower === 'villa/farm') {
        // Match Villa/farms using flexible matching (villa, farm, villa/farms, etc.)
        // Use $or to match any variation - same logic as category stats
        filters.$or = filters.$or || [];
        filters.$or.push(
          { propertyType: { $regex: /villa/i } },
          { propertyType: { $regex: /farm/i } },
          { propertyType: { $regex: /villa\/farm/i } }
        );
        logger.debug(`Property type using flexible matching for Villa/farms`);
      } else {
        // For other types, use exact match (case-insensitive)
        filters.propertyType = { $regex: new RegExp(`^${englishPropertyType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
        logger.debug(`Property type converted: "${propertyType}" -> "${englishPropertyType}" (exact match, case-insensitive)`);
      }
    }
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
      const keywordConditions = [
        { propertyKeyword: { $regex: keyword, $options: 'i' } },
        { propertyDesc: { $regex: keyword, $options: 'i' } }
      ];
      
      // If we already have $or (from Villa/farms), we need to combine with $and
      if (filters.$or && filters.$or.length > 0) {
        // Convert existing $or to $and structure
        const existingConditions = filters.$or;
        filters.$and = [
          { $or: existingConditions },
          { $or: keywordConditions }
        ];
        delete filters.$or;
      } else {
        filters.$or = keywordConditions;
      }
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
