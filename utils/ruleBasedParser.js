const logger = require('./logger');

// Available property types in the system
const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Office',
  'Land',
  'Commercial',
  'Holiday Home'
];

// Available amenities in the system
const AMENITIES = [
  'Solar energy system',
  'Star link internet',
  'Fiber internet',
  'Basic internet',
  'Parking',
  'Lift',
  'A/C',
  'Gym',
  'Security cameras',
  'Reception (nator)',
  'Balcony',
  'Swimming pool',
  'Fire alarms'
];

// Syrian provinces/cities (English and Arabic)
const SYRIAN_CITIES = [
  { en: 'Aleppo', ar: ['حلب', 'حلبي'] },
  { en: 'As-Suwayda', ar: ['السويداء', 'سويداء'] },
  { en: 'Damascus', ar: ['دمشق', 'دمشقي'] },
  { en: 'Daraa', ar: ['درعا', 'درعاوي'] },
  { en: 'Deir ez-Zur', ar: ['دير الزور', 'ديري'] },
  { en: 'Hama', ar: ['حماة', 'حمص'] },
  { en: 'Homs', ar: ['حمص', 'حمصي'] },
  { en: 'Idlib', ar: ['إدلب', 'إدلبي'] },
  { en: 'Latakia', ar: ['اللاذقية', 'لاذقاني'] },
  { en: 'Raqqah', ar: ['الرقة', 'رقي'] },
  { en: 'Tartus', ar: ['طرطوس', 'طرطوسي'] }
];

/**
 * Rule-based parser for natural language property queries
 * Works without external APIs - perfect for Syria!
 * @param {string} query - User's natural language query
 * @returns {Object} Extracted search parameters
 */
const parseQuery = (query) => {
  try {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query is required and must be a non-empty string');
    }

    // Limit query length
    if (query.length > 500) {
      throw new Error('Query is too long. Please keep it under 500 characters.');
    }

    const normalizedQuery = query.toLowerCase().trim();
    logger.info(`🔍 Parsing query: "${query}"`);

    const extractedParams = {
      propertyType: null,
      bedrooms: null,
      bathrooms: null,
      sizeMin: null,
      sizeMax: null,
      priceMin: null,
      priceMax: null,
      status: null,
      city: null,
      neighborhood: null,
      amenities: [],
      furnished: null,
      garages: null,
      keywords: [],
      viewType: null
    };

    // Extract property type
    for (const propType of PROPERTY_TYPES) {
      const propTypeLower = propType.toLowerCase();
      // Check for exact match or partial match
      if (normalizedQuery.includes(propTypeLower) || 
          normalizedQuery.includes(propTypeLower.substring(0, 4))) {
        extractedParams.propertyType = propType;
        break;
      }
    }

    // Handle common variations (English)
    if (!extractedParams.propertyType) {
      if (normalizedQuery.match(/\b(apt|apartment|flat|unit)\b/)) {
        extractedParams.propertyType = 'Apartment';
      } else if (normalizedQuery.match(/\b(villa|house|home)\b/)) {
        extractedParams.propertyType = 'Villa';
      } else if (normalizedQuery.match(/\b(office|commercial|shop|store)\b/)) {
        extractedParams.propertyType = 'Commercial';
      } else if (normalizedQuery.match(/\b(land|plot|piece)\b/)) {
        extractedParams.propertyType = 'Land';
      }
    }

    // Handle Arabic property types
    if (!extractedParams.propertyType) {
      if (query.includes('شقة') || query.includes('شقق')) {
        extractedParams.propertyType = 'Apartment';
      } else if (query.includes('فيلا') || query.includes('فيلا')) {
        extractedParams.propertyType = 'Villa';
      } else if (query.includes('مكتب') || query.includes('مكاتب')) {
        extractedParams.propertyType = 'Office';
      } else if (query.includes('أرض') || query.includes('أراضي')) {
        extractedParams.propertyType = 'Land';
      } else if (query.includes('تجاري') || query.includes('محل')) {
        extractedParams.propertyType = 'Commercial';
      }
    }

    // Extract bedrooms
    // Patterns: "2 bedrooms", "2 bedroom", "2 BR", "2 room", "2 rooms", "two bedrooms"
    const bedroomPatterns = [
      /(\d+)\s*(?:bedroom|bedrooms|bed|br|room|rooms)\b/i,
      /\b(?:bedroom|bedrooms|bed|br|room|rooms)\s*(?:of|with|has)?\s*(\d+)/i,
      /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bedroom|bedrooms|bed|br|room|rooms)\b/i
    ];

    for (const pattern of bedroomPatterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        const num = match[1] ? parseInt(match[1]) : wordToNumber(match[0]);
        if (!isNaN(num) && num > 0) {
          extractedParams.bedrooms = num;
          break;
        }
      }
    }

    // Extract bedrooms from Arabic (غرفتين = 2 rooms, غرفة = 1 room, etc.)
    if (extractedParams.bedrooms === null) {
      const arabicBedroomPatterns = [
        /(?:غرفتين|غرفتان|غرفتين|غرفتين)/, // 2 rooms
        /(?:غرفة|غرفة واحدة)/, // 1 room
        /(?:ثلاث غرف|ثلاثة غرف)/, // 3 rooms
        /(?:أربع غرف|أربعة غرف)/, // 4 rooms
        /(?:خمس غرف|خمسة غرف)/, // 5 rooms
        /(\d+)\s*(?:غرفة|غرف)/, // Number + room(s)
        /(?:غرف|غرفة)\s*(\d+)/ // room(s) + number
      ];

      for (const pattern of arabicBedroomPatterns) {
        const match = query.match(pattern);
        if (match) {
          if (query.includes('غرفتين') || query.includes('غرفتان')) {
            extractedParams.bedrooms = 2;
            break;
          } else if (query.includes('غرفة') && !query.includes('غرفتين') && !query.includes('ثلاث')) {
            extractedParams.bedrooms = 1;
            break;
          } else if (query.includes('ثلاث غرف') || query.includes('ثلاثة غرف')) {
            extractedParams.bedrooms = 3;
            break;
          } else if (query.includes('أربع غرف') || query.includes('أربعة غرف')) {
            extractedParams.bedrooms = 4;
            break;
          } else if (query.includes('خمس غرف') || query.includes('خمسة غرف')) {
            extractedParams.bedrooms = 5;
            break;
          } else if (match[1]) {
            const num = parseInt(match[1]);
            if (!isNaN(num) && num > 0) {
              extractedParams.bedrooms = num;
              break;
            }
          }
        }
      }
    }

    // Extract bathrooms
    const bathroomPatterns = [
      /(\d+)\s*(?:bathroom|bathrooms|bath|baths)\b/i,
      /\b(?:bathroom|bathrooms|bath|baths)\s*(?:of|with|has)?\s*(\d+)/i,
      /\b(one|two|three|four|five)\s*(?:bathroom|bathrooms|bath|baths)\b/i
    ];

    for (const pattern of bathroomPatterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        const num = match[1] ? parseInt(match[1]) : wordToNumber(match[0]);
        if (!isNaN(num) && num > 0) {
          extractedParams.bathrooms = num;
          break;
        }
      }
    }

    // Extract city/location
    for (const city of SYRIAN_CITIES) {
      const cityLower = city.en.toLowerCase();
      // Check English name
      if (normalizedQuery.includes(cityLower)) {
        extractedParams.city = city.en;
        break;
      }
      // Check Arabic names
      for (const arName of city.ar) {
        if (query.includes(arName)) {
          extractedParams.city = city.en;
          break;
        }
      }
    }

    // Extract status (rent/sale) - English
    if (normalizedQuery.match(/\b(rent|rental|for rent|renting|to rent)\b/)) {
      extractedParams.status = 'rent';
    } else if (normalizedQuery.match(/\b(sale|sell|buy|for sale|purchase|buying)\b/)) {
      extractedParams.status = 'sale';
    }

    // Extract status from Arabic (للإيجار = rent, للبيع = sale)
    if (!extractedParams.status) {
      if (query.includes('للإيجار') || query.includes('للايجار') || query.includes('إيجار') || query.includes('ايجار')) {
        extractedParams.status = 'rent';
      } else if (query.includes('للبيع') || query.includes('بيع') || query.includes('شراء')) {
        extractedParams.status = 'sale';
      }
    }

    // Extract price range
    const pricePatterns = [
      /(?:under|below|less than|max|maximum)\s*\$?\s*(\d+[,\d]*)\s*(?:usd|dollar|dollars)?/i,
      /(?:over|above|more than|min|minimum|at least)\s*\$?\s*(\d+[,\d]*)\s*(?:usd|dollar|dollars)?/i,
      /\$?\s*(\d+[,\d]*)\s*(?:to|-|and)\s*\$?\s*(\d+[,\d]*)\s*(?:usd|dollar|dollars)?/i,
      /(?:price|cost)\s*(?:is|of|around|about)?\s*\$?\s*(\d+[,\d]*)/i
    ];

    for (const pattern of pricePatterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          // Range
          extractedParams.priceMin = parseInt(match[1].replace(/,/g, ''));
          extractedParams.priceMax = parseInt(match[2].replace(/,/g, ''));
        } else if (normalizedQuery.match(/\b(under|below|less than|max|maximum)\b/)) {
          // Maximum
          extractedParams.priceMax = parseInt(match[1].replace(/,/g, ''));
        } else if (normalizedQuery.match(/\b(over|above|more than|min|minimum|at least)\b/)) {
          // Minimum
          extractedParams.priceMin = parseInt(match[1].replace(/,/g, ''));
        } else {
          // Single price (use as max)
          extractedParams.priceMax = parseInt(match[1].replace(/,/g, ''));
        }
        break;
      }
    }

    // Extract price from Arabic (خمسين الف دولار = 50,000 USD)
    if (extractedParams.priceMax === null && extractedParams.priceMin === null) {
      // Arabic number words to numbers
      const arabicNumbers = {
        'خمسين ألف': 50000, 'خمسين الف': 50000, 'خمسين': 50,
        'أربعين ألف': 40000, 'أربعين الف': 40000, 'أربعين': 40,
        'ثلاثين ألف': 30000, 'ثلاثين الف': 30000, 'ثلاثين': 30,
        'عشرين ألف': 20000, 'عشرين الف': 20000, 'عشرين': 20,
        'عشرة آلاف': 10000, 'عشرة الاف': 10000, 'عشرة': 10,
        'مئة ألف': 100000, 'مائة ألف': 100000, 'مئة الف': 100000, 'مائة الف': 100000
      };

      // Check for Arabic price patterns
      for (const [arabicWord, value] of Object.entries(arabicNumbers)) {
        if (query.includes(arabicWord) && (query.includes('دولار') || query.includes('ميزانية') || query.includes('سعر'))) {
          extractedParams.priceMax = value;
          break;
        }
      }

      // Also check for numeric patterns with Arabic words (e.g., "50 الف دولار")
      const arabicPricePattern = /(\d+[,\d]*)\s*(?:ألف|الف|آلاف|الاف)\s*(?:دولار|دولار|ميزانية)?/;
      const arabicPriceMatch = query.match(arabicPricePattern);
      if (arabicPriceMatch && !extractedParams.priceMax) {
        const num = parseInt(arabicPriceMatch[1].replace(/,/g, ''));
        if (query.includes('ألف') || query.includes('الف')) {
          extractedParams.priceMax = num * 1000;
        } else {
          extractedParams.priceMax = num;
        }
      }
    }

    // Extract size
    const sizePatterns = [
      /(?:size|area|sqft|sq ft|square feet|square foot)\s*(?:is|of|around|about)?\s*(\d+[,\d]*)/i,
      /(\d+[,\d]*)\s*(?:sqft|sq ft|square feet|square foot|m2|square meter)/i
    ];

    for (const pattern of sizePatterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        const size = parseInt(match[1].replace(/,/g, ''));
        if (!isNaN(size) && size > 0) {
          extractedParams.sizeMin = size;
          extractedParams.sizeMax = size;
          break;
        }
      }
    }

    // Extract amenities
    const amenityKeywords = {
      'parking': 'Parking',
      'garage': 'Parking',
      'elevator': 'Lift',
      'lift': 'Lift',
      'air conditioning': 'A/C',
      'ac': 'A/C',
      'air condition': 'A/C',
      'gym': 'Gym',
      'fitness': 'Gym',
      'pool': 'Swimming pool',
      'swimming': 'Swimming pool',
      'security': 'Security cameras',
      'camera': 'Security cameras',
      'cameras': 'Security cameras',
      'balcony': 'Balcony',
      'internet': 'Basic internet',
      'wifi': 'Basic internet',
      'fiber': 'Fiber internet',
      'solar': 'Solar energy system',
      'furnished': null, // Special handling
      'unfurnished': null // Special handling
    };

    for (const [keyword, amenity] of Object.entries(amenityKeywords)) {
      if (normalizedQuery.includes(keyword)) {
        if (amenity) {
          if (!extractedParams.amenities.includes(amenity)) {
            extractedParams.amenities.push(amenity);
          }
        } else if (keyword === 'furnished') {
          extractedParams.furnished = true;
        } else if (keyword === 'unfurnished') {
          extractedParams.furnished = false;
        }
      }
    }

    // Extract view type
    if (normalizedQuery.match(/\b(sea|ocean|water)\s*view\b/)) {
      extractedParams.viewType = 'sea view';
      extractedParams.keywords.push('sea view');
    } else if (normalizedQuery.match(/\b(mountain|hill)\s*view\b/)) {
      extractedParams.viewType = 'mountain view';
      extractedParams.keywords.push('mountain view');
    } else if (normalizedQuery.match(/\b(open|wide)\s*view\b/)) {
      extractedParams.viewType = 'open view';
      extractedParams.keywords.push('open view');
    } else if (normalizedQuery.match(/\b(nice|beautiful|good|great|amazing)\s*view\b/)) {
      extractedParams.viewType = 'view';
      extractedParams.keywords.push('nice view', 'view');
    }

    // Extract other keywords (English)
    const keywordPatterns = [
      /\b(nice|beautiful|good|great|amazing|spacious|modern|luxury|luxurious|new|old)\b/gi
    ];

    for (const pattern of keywordPatterns) {
      const matches = normalizedQuery.match(pattern);
      if (matches) {
        extractedParams.keywords.push(...matches.map(m => m.toLowerCase()));
      }
    }

    // Extract Arabic keywords
    if (query.includes('طابو اخضر') || query.includes('طابو أخضر')) {
      extractedParams.keywords.push('green title deed', 'طابو اخضر');
    }
    if (query.includes('بناء جديد') || query.includes('بناء جديد')) {
      extractedParams.keywords.push('new building', 'بناء جديد');
    }
    if (query.includes('صالون') || query.includes('صالة')) {
      extractedParams.keywords.push('salon', 'living room', 'صالون');
    }
    if (query.includes('جديد') || query.includes('حديث')) {
      extractedParams.keywords.push('new', 'جديد');
    }
    if (query.includes('جميل') || query.includes('حلو')) {
      extractedParams.keywords.push('nice', 'beautiful', 'جميل');
    }
    if (query.includes('فاخر') || query.includes('راقي')) {
      extractedParams.keywords.push('luxury', 'فاخر');
    }

    // Extract garages
    if (normalizedQuery.match(/\b(garage|garages)\b/)) {
      extractedParams.garages = true;
    }

    // Extract neighborhood (if mentioned) - English
    const neighborhoodPattern = /(?:in|at|near|neighborhood|neighbourhood|area)\s+([A-Za-z\s]+?)(?:\s|,|$)/i;
    const neighborhoodMatch = query.match(neighborhoodPattern);
    if (neighborhoodMatch && neighborhoodMatch[1]) {
      const potentialNeighborhood = neighborhoodMatch[1].trim();
      // Don't set if it's a city name
      const isCity = SYRIAN_CITIES.some(c => 
        c.en.toLowerCase() === potentialNeighborhood.toLowerCase()
      );
      if (!isCity && potentialNeighborhood.length > 2) {
        extractedParams.neighborhood = potentialNeighborhood;
      }
    }

    // Extract neighborhood from Arabic (حي العزيزية = Al-Aziziyah neighborhood)
    if (!extractedParams.neighborhood && query.includes('حي')) {
      const arabicNeighborhoodPattern = /حي\s+([^\s]+)/;
      const arabicNeighborhoodMatch = query.match(arabicNeighborhoodPattern);
      if (arabicNeighborhoodMatch && arabicNeighborhoodMatch[1]) {
        const neighborhood = arabicNeighborhoodMatch[1].trim();
        // Common neighborhood names mapping
        const neighborhoodMap = {
          'العزيزية': 'Al-Aziziyah',
          'العزيزيه': 'Al-Aziziyah',
          'الجميلية': 'Al-Jamiliyah',
          'الصالحية': 'Al-Salihiyah',
          'الميدان': 'Al-Midan',
          'الشهباء': 'Al-Shahba',
          'الجميلية': 'Al-Jamiliyah'
        };
        extractedParams.neighborhood = neighborhoodMap[neighborhood] || neighborhood;
      }
    }

    logger.info(`✅ Extracted parameters:`, extractedParams);

    return extractedParams;
  } catch (error) {
    logger.error('Error parsing query:', error);
    throw error;
  }
};

/**
 * Convert word numbers to integers
 */
const wordToNumber = (word) => {
  const wordMap = {
    'one': 1,
    'two': 2,
    'three': 3,
    'four': 4,
    'five': 5,
    'six': 6,
    'seven': 7,
    'eight': 8,
    'nine': 9,
    'ten': 10
  };
  return wordMap[word.toLowerCase()] || null;
};

module.exports = {
  parseQuery,
  PROPERTY_TYPES,
  AMENITIES,
  SYRIAN_CITIES
};

