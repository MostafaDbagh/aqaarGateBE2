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
    'بيوت عطلة': 'Holiday Homes',
    'بناء كامل': 'Building'
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
  
  // Normalize input: trim and remove extra spaces
  const normalized = arabicCity.trim().replace(/\s+/g, ' ');
  const normalizedNoSpaces = normalized.replace(/\s+/g, '');
  
  const cityMap = {
    'دمشق': 'Damascus',
    'حلب': 'Aleppo',
    'حمص': 'Homs',
    'اللاذقية': 'Latakia',
    'طرطوس': 'Tartus',
    'درعا': 'Daraa',
    'حماة': 'Hama',
    'إدلب': 'Idlib',
    'دير الزور': 'Deir ez-Zur',
    'ديرالزور': 'Deir ez-Zur', // بدون فراغ
    'الدير': 'Deir ez-Zur',
    'ديري': 'Deir ez-Zur',
    'Deir ez-Zor': 'Deir ez-Zur',
    'Der El Zor': 'Deir ez-Zur',
    'Deir ez-Zur': 'Deir ez-Zur'
  };
  
  // Try exact match first
  if (cityMap[normalized]) return cityMap[normalized];
  // Try match without spaces (for "ديرالزور" vs "دير الزور")
  if (cityMap[normalizedNoSpaces]) return cityMap[normalizedNoSpaces];
  // Try original input
  if (cityMap[arabicCity]) return cityMap[arabicCity];
  
  return arabicCity;
};

// Arabic → English for keyword search (backend stores English in propertyKeyword/propertyDesc)
const ARABIC_TO_ENGLISH_KEYWORD = {
  'شقة': 'Apartment', 'شقق': 'Apartment', 'شقة سكنية': 'Apartment', 'شقق سكنية': 'Apartment',
  'فيلا': 'Villa', 'منزل': 'House', 'أرض': 'Land', 'مكتب': 'Office', 'تجاري': 'Commercial',
  'للبيع': 'sale', 'للإيجار': 'rent', 'بيع': 'sale', 'إيجار': 'rent',
  'سوريا': 'Syria', 'سورية': 'Syria',
  'دمشق': 'Damascus', 'حلب': 'Aleppo', 'حمص': 'Homs', 'اللاذقية': 'Latakia', 'طرطوس': 'Tartus',
  'درعا': 'Daraa', 'حماة': 'Hama', 'إدلب': 'Idlib', 'دير الزور': 'Deir ez-Zur', 'ديرالزور': 'Deir ez-Zur',
  'السويداء': 'As-Suwayda', 'الرقة': 'Raqqah'
};

const hasArabic = (str) => /[\u0600-\u06FF]/.test(str || '');

const convertArabicKeywordForSearch = (rawKeyword) => {
  if (!rawKeyword || typeof rawKeyword !== 'string') return rawKeyword;
  const trimmed = rawKeyword.trim();
  if (!trimmed) return trimmed;
  if (!hasArabic(trimmed)) return trimmed;
  const tokens = trimmed.split(/[\s,،]+/).map((t) => t.trim()).filter(Boolean);
  const translated = tokens
    .map((t) => ARABIC_TO_ENGLISH_KEYWORD[t] || ARABIC_TO_ENGLISH_KEYWORD[t.replace(/[،,]/g, '')])
    .filter(Boolean);
  if (translated.length > 0) return translated.join(' ');
  return trimmed;
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
    // Use case-insensitive regex to handle variations and spaces
    let cityValue = null;
    if (city) {
      cityValue = convertArabicCity(city.trim());
      // Use regex for flexible matching (handles spaces and case variations)
      filters.city = { $regex: new RegExp(`^${cityValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    } else if (cities) {
      cityValue = convertArabicCity(cities.trim());
      filters.city = { $regex: new RegExp(`^${cityValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    } else if (state) {
      // Legacy support - map state to city for backward compatibility
      cityValue = convertArabicCity(state.trim());
      filters.city = { $regex: new RegExp(`^${cityValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
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

    // Keyword: translate Arabic → English, then require ALL tokens in keyword or description
    // So "شقق للبيع في سوريا" and "apartments for sale in Syria" produce the same results
    if (keyword) {
      const searchKeyword = convertArabicKeywordForSearch(keyword.trim());
      const tokens = searchKeyword.split(/[\s,،]+/).map((t) => t.trim()).filter(Boolean);
      const keywordTokenConditions = tokens.map((token) => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return {
          $or: [
            { propertyKeyword: { $regex: escaped, $options: 'i' } },
            { propertyDesc: { $regex: escaped, $options: 'i' } }
          ]
        };
      });

      if (keywordTokenConditions.length > 0) {
        const keywordAnd = keywordTokenConditions.length === 1
          ? keywordTokenConditions[0]
          : { $and: keywordTokenConditions };

        if (filters.$or && filters.$or.length > 0) {
          const existingConditions = filters.$or;
          filters.$and = [{ $or: existingConditions }, keywordAnd];
          delete filters.$or;
        } else {
          Object.assign(filters, keywordAnd);
        }
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
