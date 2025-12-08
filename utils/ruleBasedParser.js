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
// Includes all spelling variations and dialect differences to avoid search errors
// Covers different dialects, missing hamza, and common misspellings
const SYRIAN_CITIES = [
  { 
    en: 'Aleppo', 
    ar: [
      'حلب', 'حلبي', 'حلبية', 'حلبا', 'حلب', 'حلبي'
    ] 
  },
  { 
    en: 'As-Suwayda', 
    ar: [
      'السويداء', 'السويدا', 'سويداء', 'سويدا', 'سويدا', 'سويداء'
    ] 
  },
  { 
    en: 'Damascus', 
    ar: [
      'دمشق', 'دمشئ', 'شام', 'دمشقي', 'الشام', 'دمشق', 'شام'
    ] 
  },
  { 
    en: 'Daraa', 
    ar: [
      'درعا', 'درعا', 'درعاوي', 'درعا', 'درعا'
    ] 
  },
  { 
    en: 'Deir ez-Zur', 
    ar: [
      'دير الزور', 'ديرالزور', 'الدير', 'ديري', 'دير الزور', 'ديرالزور', 'الدير'
    ] 
  },
  { 
    en: 'Hama', 
    ar: [
      'حماة', 'حما', 'حماة', 'حما', 'حماة', 'حما'
    ] 
  },
  { 
    en: 'Homs', 
    ar: [
      'حمص', 'حمصي', 'حمص', 'حمص', 'حمصي'
    ] 
  },
  { 
    en: 'Idlib', 
    ar: [
      'إدلب', 'ادلب', 'ادليب', 'إدلبي', 'ادلب', 'إدلب', 'ادلب', 'ادليب'
    ] 
  },
  { 
    en: 'Latakia', 
    ar: [
      'اللاذقية', 'اللادئية', 'اللادقية', 'لاذقية', 'لادقية', 'لادئية', 'لاذقاني',
      'اللاذقية', 'اللادئية', 'اللادقية', 'لاذقية', 'لادقية', 'لادئية'
    ] 
  },
  { 
    en: 'Raqqah', 
    ar: [
      'الرقة', 'رقة', 'رقي', 'الرقة', 'رقة', 'رقي'
    ] 
  },
  { 
    en: 'Tartus', 
    ar: [
      'طرطوس', 'طرطوسي', 'طرطوس', 'طرطوسي', 'طرطوس'
    ] 
  }
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
    // CRITICAL: If "صالون" (salon/living room) is mentioned, add 1 room to the count
    const hasSalon = query.includes('صالون') || query.includes('صالة') || query.includes('صاله');
    
    if (extractedParams.bedrooms === null) {
      const arabicBedroomPatterns = [
        /(?:غرفتين|غرفتان|غرفتين|غرفتين)/, // 2 rooms
        /(?:غرفة|غرفة واحدة)/, // 1 room
        /(?:ثلاث غرف|ثلاثة غرف)/, // 3 rooms
        /(?:أ?ر?ب?ع? غرف|أ?ر?ب?ع?ة غرف)/, // 4 rooms (flexible with hamza variations)
        /(?:خمس غرف|خمسة غرف)/, // 5 rooms
        /([٠-٩\d]+)\s*(?:غرفة|غرف)/, // Number (Arabic or Latin) + room(s)
        /(?:غرف|غرفة)\s*([٠-٩\d]+)/ // room(s) + number (Arabic or Latin)
      ];

      for (const pattern of arabicBedroomPatterns) {
        const match = query.match(pattern);
        if (match) {
          let bedroomCount = null;
          
          // Check for numeric patterns first (Arabic or Latin) - highest priority
          if (match[1] && /[٠-٩\d]/.test(match[1])) {
            const num = extractNumber(match[1]);
            if (num !== null && num > 0) {
              bedroomCount = num;
            }
          } else if (query.includes('غرفتين') || query.includes('غرفتان')) {
            bedroomCount = 2;
          } else if (query.includes('غرفة') && !query.includes('غرفتين') && !query.includes('ثلاث') && !query.includes('أربع') && !query.includes('اربع') && !query.includes('خمس') && !query.match(/[٠-٩\d]+\s*غرف/)) {
            bedroomCount = 1;
          } else if (query.includes('ثلاث غرف') || query.includes('ثلاثة غرف')) {
            bedroomCount = 3;
          } else if (query.includes('أربع غرف') || query.includes('أربعة غرف') || query.includes('اربع غرف') || query.includes('اربع غرف') || query.match(/اربع\s*ة?\s*غرف/)) {
            bedroomCount = 4;
          } else if (query.includes('خمس غرف') || query.includes('خمسة غرف')) {
            bedroomCount = 5;
          }
          
          // If salon is mentioned, add 1 room to the count
          if (bedroomCount !== null) {
            if (hasSalon) {
              extractedParams.bedrooms = bedroomCount + 1;
              logger.info(`✅ Found ${bedroomCount} rooms + salon = ${bedroomCount + 1} total rooms`);
            } else {
              extractedParams.bedrooms = bedroomCount;
            }
            break;
          }
        }
      }
      
      // Special case: if only "صالون" is mentioned without specific room count
      // Assume it's "غرفة وصالون" = 2 rooms
      if (extractedParams.bedrooms === null && hasSalon && !query.match(/\d+\s*(?:غرفة|غرف)/) && !query.includes('غرفتين') && !query.includes('ثلاث') && !query.includes('أربع')) {
        extractedParams.bedrooms = 2; // غرفة واحدة + صالون = 2
        logger.info('✅ Found salon only, assuming 1 room + salon = 2 total rooms');
      }
    } else {
      // If bedrooms were already extracted from English patterns, add salon if mentioned
      if (hasSalon && extractedParams.bedrooms !== null) {
        extractedParams.bedrooms = extractedParams.bedrooms + 1;
        logger.info(`✅ Adding salon to existing room count: ${extractedParams.bedrooms - 1} + 1 = ${extractedParams.bedrooms}`);
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

    // Extract bathrooms from Arabic (حمام واحد = 1, حمامين = 2, ثلاث حمامات = 3, etc.)
    if (extractedParams.bathrooms === null) {
      const arabicBathroomPatterns = [
        /(?:حمامين|حمامان)/, // 2 bathrooms (check this first to avoid matching "حمام" in "حمامين")
        /(?:ثلاث حمامات|ثلاثة حمامات)/, // 3 bathrooms
        /(?:أ?ر?ب?ع? حمامات|أ?ر?ب?ع?ة حمامات|اربع حمامات|اربع حمامات)/, // 4 bathrooms (flexible with hamza variations)
        /(?:خمس حمامات|خمسة حمامات)/, // 5 bathrooms
        /(?:حمام واحد|حمام واحد)/, // 1 bathroom (explicit)
        /([٠-٩\d]+)\s*(?:حمام|حمامات)/, // Number (Arabic or Latin) + bathroom(s)
        /(?:حمام|حمامات)\s*([٠-٩\d]+)/, // bathroom(s) + number (Arabic or Latin)
        /(?:حمام|حمامات)(?!\w)/ // Just "حمام" or "حمامات" alone (1 bathroom by default)
      ];

      for (const pattern of arabicBathroomPatterns) {
        const match = query.match(pattern);
        if (match) {
          let bathroomCount = null;
          
          // Check for 2 bathrooms first (to avoid matching "حمام" in "حمامين")
          if (query.includes('حمامين') || query.includes('حمامان')) {
            bathroomCount = 2;
          } else if (query.includes('ثلاث حمامات') || query.includes('ثلاثة حمامات')) {
            bathroomCount = 3;
          } else if (query.includes('أربع حمامات') || query.includes('أربعة حمامات') || query.includes('اربع حمامات') || query.includes('اربع حمامات')) {
            bathroomCount = 4;
          } else if (query.includes('خمس حمامات') || query.includes('خمسة حمامات')) {
            bathroomCount = 5;
          } else if (query.includes('حمام واحد')) {
            bathroomCount = 1;
          } else if (match[1]) {
            // Number + bathroom(s) or bathroom(s) + number (supports Arabic numerals)
            const num = extractNumber(match[1]);
            if (num !== null && num > 0) {
              bathroomCount = num;
            }
          } else if (pattern.source.includes('(?!\\w)')) {
            // Just "حمام" or "حمامات" alone (not part of "حمامين" or other compound words)
            // Make sure it's not part of "حمامين" or "حمامات" with numbers
            if (query.includes('حمام') && !query.includes('حمامين') && !query.includes('حمامان') && 
                !query.includes('ثلاث') && !query.includes('أربع') && !query.includes('اربع') && !query.includes('خمس') &&
                !query.match(/[٠-٩\d]+\s*حمام/)) {
              bathroomCount = 1;
            }
          }
          
          if (bathroomCount !== null) {
            extractedParams.bathrooms = bathroomCount;
            logger.info(`✅ Found ${bathroomCount} bathroom(s) from Arabic query`);
            break;
          }
        }
      }
    }

    // Extract city/location
    // CRITICAL: Check for "شام" first as it's a common alternative for Damascus
    if (query.includes('شام') || query.includes('الشام')) {
      extractedParams.city = 'Damascus';
      logger.info('✅ Found "شام" or "الشام", mapping to Damascus');
    } else {
      // Check other cities
      // CRITICAL: Avoid false positives - don't match city names that are part of bathroom words
      const bathroomWords = ['حمام', 'حمامين', 'حمامان', 'حمامات', 'منتفعات', 'منافع'];
      const isBathroomWord = (text, cityName) => {
        // Check if the city name appears as part of a bathroom-related word
        for (const bw of bathroomWords) {
          if (bw.includes(cityName) && text.includes(bw)) {
            return true;
          }
        }
        return false;
      };

      for (const city of SYRIAN_CITIES) {
        const cityLower = city.en.toLowerCase();
        // Check English name
        if (normalizedQuery.includes(cityLower)) {
          extractedParams.city = city.en;
          break;
        }
        // Check Arabic names - but avoid matching if it's part of a bathroom word
        for (const arName of city.ar) {
          if (query.includes(arName) && !isBathroomWord(query, arName)) {
            extractedParams.city = city.en;
            logger.info(`✅ Found city "${arName}" (${city.en}), not part of bathroom word`);
            break;
          }
        }
        if (extractedParams.city) break; // Exit loop if city found
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
    if (query.includes('صالون') || query.includes('صالة') || query.includes('صاله')) {
      extractedParams.keywords.push('salon', 'living room', 'صالون');
    }
    
    // CRITICAL: "منتفعات" or "منافع" means bathrooms exist (not kitchen - kitchen is implicit)
    // If mentioned, assume bathrooms exist and add to keywords
    if (query.includes('منتفعات') || query.includes('منافع') || query.includes('منفعة')) {
      extractedParams.keywords.push('bathrooms', 'حمامات', 'منتفعات');
      // "منتفعات" means bathrooms exist - ensure bathrooms are set (if not already specified)
      if (extractedParams.bathrooms === null) {
        // Assume at least 1 bathroom if "منتفعات" is mentioned (منتفعات = bathrooms only)
        extractedParams.bathrooms = 1;
        logger.info('✅ Found "منتفعات", assuming bathrooms exist (at least 1 bathroom)');
      }
    }
    
    // Also check for direct mention of kitchen (separate from منتفعات)
    if (query.includes('مطبخ') || query.includes('مطابخ')) {
      extractedParams.keywords.push('kitchen', 'مطبخ');
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
 * Convert Arabic-Indic numerals to regular numbers
 * ٠١٢٣٤٥٦٧٨٩ -> 0123456789
 */
const convertArabicNumerals = (str) => {
  const arabicToLatin = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return str.split('').map(char => arabicToLatin[char] || char).join('');
};

/**
 * Extract number from string (handles both Arabic and Latin numerals)
 */
const extractNumber = (str) => {
  if (!str) return null;
  // Convert Arabic numerals to Latin
  const converted = convertArabicNumerals(str);
  // Extract number
  const match = converted.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
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

