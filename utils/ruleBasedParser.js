const logger = require('./logger');

// Available property types in the system
const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'House',
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
      } else if (normalizedQuery.match(/\bvilla\b/)) {
        extractedParams.propertyType = 'Villa';
      } else if (normalizedQuery.match(/\bhouse\b/)) {
        extractedParams.propertyType = 'House';
      } else if (normalizedQuery.match(/\bhome\b/)) {
        extractedParams.propertyType = 'Villa';
      } else if (normalizedQuery.match(/\b(office|commercial|shop|store)\b/)) {
        extractedParams.propertyType = 'Commercial';
      } else if (normalizedQuery.match(/\b(land|plot|piece)\b/)) {
        extractedParams.propertyType = 'Land';
      }
    }

    // Handle Arabic property types
    if (!extractedParams.propertyType) {
      if (query.includes('شقة') || query.includes('شقق') || 
          query.includes('شقة سكنية') || query.includes('شقق سكنية') ||
          query.includes('عقار سكني') || query.includes('عقار سكني') ||
          query.includes('منزل') || query.includes('منازل') ||
          query.includes('بيت') || query.includes('بيوت')) {
        extractedParams.propertyType = 'Apartment';
      } else if (query.includes('فيلا')) {
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
    const hasSalon = query.includes('صالون') || query.includes('صالة') || query.includes('صاله') || 
                     normalizedQuery.match(/\b(with|has|includes)\s+(?:a\s+)?(?:salon|living room)\b/i);
    
    if (extractedParams.bedrooms === null) {
      const arabicBedroomPatterns = [
        /(?:غرفتين|غرفتان|غرفتين|غرفتين)/, // 2 rooms
        /(?:غرفة|غرفة واحدة)/, // 1 room
        /(?:ثلاث غرف|ثلاثة غرف)/, // 3 rooms
        /(?:أ?ر?ب?ع? غرف|أ?ر?ب?ع?ة غرف)/, // 4 rooms (flexible with hamza variations)
        /(?:خمس غرف|خمسة غرف)/, // 5 rooms
        /([٠-٩\d]+)\s*(?:غرفة|غرف)(?!\s*(?:مساحة|المساحة|حجم|size|area))/, // Number (Arabic or Latin) + room(s) - but not if followed by size words
        /(?:غرف|غرفة)\s*([٠-٩\d]+)/ // room(s) + number (Arabic or Latin)
      ];

      for (const pattern of arabicBedroomPatterns) {
        const match = query.match(pattern);
        if (match) {
          let bedroomCount = null;
          
          // Check for numeric patterns first (Arabic or Latin) - highest priority
          // BUT: Skip if this number is part of a size pattern (e.g., "مساحة اقل من ٨٠")
          if (match[1] && /[٠-٩\d]/.test(match[1])) {
            const num = extractNumber(match[1]);
            if (num !== null && num > 0) {
              // Check if this number is part of a size pattern by looking before the match
              const matchIndex = query.indexOf(match[1]);
              if (matchIndex > 0) {
                const beforeMatch = query.substring(Math.max(0, matchIndex - 30), matchIndex);
                if (!beforeMatch.match(/مساحة.*[٠-٩\d]*$/)) {
                  bedroomCount = num;
                }
              } else {
                bedroomCount = num;
              }
            }
          } else if (query.includes('غرفتين') || query.includes('غرفتان')) {
            bedroomCount = 2;
          } else if (query.includes('غرفة واحدة')) {
            // "غرفة واحدة" explicitly means 1 room
            bedroomCount = 1;
          } else if (query.includes('غرفة') && !query.includes('غرفتين') && !query.includes('ثلاث') && !query.includes('أربع') && !query.includes('اربع') && !query.includes('خمس') && !query.match(/[٠-٩\d]+\s*غرف/)) {
            // Make sure "غرفة" is not part of a size pattern (e.g., "مساحة اقل من ٨٠")
            // Check if there's a size pattern before "غرفة" that might have matched the number
            const roomIndex = query.indexOf('غرفة');
            if (roomIndex > 0) {
              const beforeRoom = query.substring(Math.max(0, roomIndex - 30), roomIndex);
              // Only skip if there's a size number immediately before "غرفة"
              if (!beforeRoom.match(/مساحة.*[٠-٩\d]+\s*$/)) {
                bedroomCount = 1;
              }
            } else {
              bedroomCount = 1;
            }
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

    // Extract price range - Arabic patterns first
    // Arabic: "سعر اقل من" = price less than (priceMax), "سعر اعلى من" = price more than (priceMin)
    const arabicPricePatterns = [
      /(?:سعر|ميزانية)\s*(?:اقل|أقل|أصغر|اصغر)\s*(?:من)?\s*([٠-٩\d,]+)/, // Price less than (priceMax)
      /(?:سعر|ميزانية)\s*(?:اعلى|أعلى|اكثر|أكثر|أكبر|اكبر)\s*(?:من)?\s*([٠-٩\d,]+)/, // Price more than (priceMin)
      /(?:سعر|ميزانية)\s*(?:بين|من)\s*([٠-٩\d,]+)\s*(?:الى|إلى|و)\s*([٠-٩\d,]+)/, // Price range
    ];
    
    for (const pattern of arabicPricePatterns) {
      const match = query.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          // Range: "سعر بين X و Y"
          const num1 = extractNumber(match[1].replace(/,/g, ''));
          const num2 = extractNumber(match[2].replace(/,/g, ''));
          if (num1 !== null && num2 !== null && num1 > 0 && num2 > 0) {
            extractedParams.priceMin = Math.min(num1, num2);
            extractedParams.priceMax = Math.max(num1, num2);
            logger.info(`✅ Found Arabic price range: ${extractedParams.priceMin} - ${extractedParams.priceMax}`);
            break;
          }
        } else if (match[1]) {
          const num = extractNumber(match[1].replace(/,/g, ''));
          if (num !== null && num > 0) {
            if (pattern.source.includes('اقل|أقل|أصغر|اصغر')) {
              // "سعر اقل من X" = priceMax
              extractedParams.priceMax = num;
              logger.info(`✅ Found Arabic price max: ${extractedParams.priceMax}`);
            } else if (pattern.source.includes('اعلى|أعلى|اكثر|أكثر|أكبر|اكبر')) {
              // "سعر اعلى من X" = priceMin
              extractedParams.priceMin = num;
              logger.info(`✅ Found Arabic price min: ${extractedParams.priceMin}`);
            }
            break;
          }
        }
      }
    }

    // Extract price range - English patterns
    // Check for "price between X and Y" first (before generic patterns)
    const priceBetweenPattern = /(?:price|cost)\s+between\s+(\d+[,\d]*)\s+(?:and|to|-)\s+(\d+[,\d]*)/i;
    const priceBetweenMatch = normalizedQuery.match(priceBetweenPattern);
    if (priceBetweenMatch && !extractedParams.priceMin && !extractedParams.priceMax) {
      const num1 = parseInt(priceBetweenMatch[1].replace(/,/g, ''));
      const num2 = parseInt(priceBetweenMatch[2].replace(/,/g, ''));
      if (!isNaN(num1) && !isNaN(num2) && num1 > 0 && num2 > 0) {
        extractedParams.priceMin = Math.min(num1, num2);
        extractedParams.priceMax = Math.max(num1, num2);
        logger.info(`✅ Found English price range: ${extractedParams.priceMin} - ${extractedParams.priceMax}`);
      }
    }
    
    const pricePatterns = [
      /(?:price|cost)\s+(?:under|below|less than|max|maximum)\s+(\d+[,\d]*)/i, // "price under X" - check this first
      /(?:price|cost)\s+(?:over|above|more than|min|minimum|at least)\s+(\d+[,\d]*)/i, // "price over X" - check this first
      /(?:under|below|less than|max|maximum)\s*\$?\s*(\d+[,\d]*)\s*(?:usd|dollar|dollars)?/i,
      /(?:over|above|more than|min|minimum|at least)\s*\$?\s*(\d+[,\d]*)\s*(?:usd|dollar|dollars)?/i,
      /\$?\s*(\d+[,\d]*)\s*(?:to|-|and)\s*\$?\s*(\d+[,\d]*)\s*(?:usd|dollar|dollars)?/i,
      /(?:price|cost)\s*(?:is|of|around|about)?\s*\$?\s*(\d+[,\d]*)/i
    ];

    for (const pattern of pricePatterns) {
      const match = normalizedQuery.match(pattern);
      if (match && match.index !== undefined) {
        // Skip if price range is already set from "price between" pattern
        if (extractedParams.priceMin && extractedParams.priceMax) {
          break; // Already have price range, don't override
        }
        
        // Skip if this looks like a size pattern (to avoid matching "size under 100" as price)
        const beforeMatch = normalizedQuery.substring(Math.max(0, match.index - 30), match.index);
        if (beforeMatch.match(/\b(size|area|sqft|sq ft|square feet|square foot)\s+(?:under|below|less than|over|above|more than|greater than)\s*$/i)) {
          continue; // Skip this match, it's likely a size pattern
        }
        
        if (match[1] && match[2]) {
          // Range
          extractedParams.priceMin = parseInt(match[1].replace(/,/g, ''));
          extractedParams.priceMax = parseInt(match[2].replace(/,/g, ''));
        } else if (normalizedQuery.match(/(?:price|cost)\s+(?:under|below|less than|max|maximum)/i)) {
          // "price under X" = priceMax
          if (!extractedParams.priceMax) {
            extractedParams.priceMax = parseInt(match[1].replace(/,/g, ''));
          }
        } else if (normalizedQuery.match(/(?:price|cost)\s+(?:over|above|more than|min|minimum|at least)/i)) {
          // "price over X" = priceMin
          if (!extractedParams.priceMin) {
            extractedParams.priceMin = parseInt(match[1].replace(/,/g, ''));
          }
        } else if (normalizedQuery.match(/\b(under|below|less than|max|maximum)\b/) && !normalizedQuery.match(/\b(size|area)\s+(?:under|below|less than)/i)) {
          // Maximum (but not if it's part of a size pattern)
          if (!extractedParams.priceMax) { // Don't override if already set
            extractedParams.priceMax = parseInt(match[1].replace(/,/g, ''));
          }
        } else if (normalizedQuery.match(/\b(over|above|more than|min|minimum|at least)\b/) && !normalizedQuery.match(/\b(size|area)\s+(?:over|above|more than|greater than)/i)) {
          // Minimum (but not if it's part of a size pattern)
          if (!extractedParams.priceMin) { // Don't override if already set
            extractedParams.priceMin = parseInt(match[1].replace(/,/g, ''));
          }
        } else {
          // Single price (use as max) - but only if not part of size pattern
          if (!normalizedQuery.match(/\b(size|area)\s+(?:under|below|less than|over|above|more than|greater than)\s*(\d+)/i) && !extractedParams.priceMax) {
            extractedParams.priceMax = parseInt(match[1].replace(/,/g, ''));
          }
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

    // Extract size - Arabic patterns first
    // Arabic: "مساحة اكبر من" = size greater than (sizeMin), "مساحة اقل من" = size less than (sizeMax)
    const arabicSizePatterns = [
      /(?:مساحة|المساحة|حجم)\s*(?:اكبر|أكبر|أكثر|اكثر)\s*(?:من)?\s*([٠-٩\d,]+)/, // Size greater than (sizeMin)
      /(?:مساحة|المساحة|حجم)\s*(?:اقل|أقل|أصغر|اصغر)\s*(?:من)?\s*([٠-٩\d,]+)/, // Size less than (sizeMax)
      /(?:مساحة|المساحة|حجم)\s*(?:بين|من)\s*([٠-٩\d,]+)\s*(?:الى|إلى|و)\s*([٠-٩\d,]+)/, // Size range
    ];
    
    for (const pattern of arabicSizePatterns) {
      const match = query.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          // Range: "مساحة بين X و Y"
          const num1 = extractNumber(match[1].replace(/,/g, ''));
          const num2 = extractNumber(match[2].replace(/,/g, ''));
          if (num1 !== null && num2 !== null && num1 > 0 && num2 > 0) {
            extractedParams.sizeMin = Math.min(num1, num2);
            extractedParams.sizeMax = Math.max(num1, num2);
            logger.info(`✅ Found Arabic size range: ${extractedParams.sizeMin} - ${extractedParams.sizeMax}`);
            break;
          }
        } else if (match[1]) {
          const num = extractNumber(match[1].replace(/,/g, ''));
          if (num !== null && num > 0) {
            if (pattern.source.includes('اكبر|أكبر|أكثر|اكثر')) {
              // "مساحة اكبر من X" = sizeMin
              extractedParams.sizeMin = num;
              logger.info(`✅ Found Arabic size min: ${extractedParams.sizeMin}`);
            } else if (pattern.source.includes('اقل|أقل|أصغر|اصغر')) {
              // "مساحة اقل من X" = sizeMax
              extractedParams.sizeMax = num;
              logger.info(`✅ Found Arabic size max: ${extractedParams.sizeMax}`);
            }
            break;
          }
        }
      }
    }

    // Extract size - English patterns
    // Check for "size between X and Y" first (before generic patterns)
    const sizeBetweenPattern = /(?:size|area|sqft|sq ft|square feet|square foot)\s+between\s+(\d+[,\d]*)\s+(?:and|to|-)\s+(\d+[,\d]*)/i;
    const sizeBetweenMatch = normalizedQuery.match(sizeBetweenPattern);
    if (sizeBetweenMatch && !extractedParams.sizeMin && !extractedParams.sizeMax) {
      const num1 = parseInt(sizeBetweenMatch[1].replace(/,/g, ''));
      const num2 = parseInt(sizeBetweenMatch[2].replace(/,/g, ''));
      if (!isNaN(num1) && !isNaN(num2) && num1 > 0 && num2 > 0) {
        extractedParams.sizeMin = Math.min(num1, num2);
        extractedParams.sizeMax = Math.max(num1, num2);
        logger.info(`✅ Found English size range: ${extractedParams.sizeMin} - ${extractedParams.sizeMax}`);
      }
    }
    
    // Check for "size greater than/over/above X" and "size less than/under/below X"
    if (!extractedParams.sizeMin && !extractedParams.sizeMax) {
      const sizeGreaterPattern = /(?:size|area|sqft|sq ft|square feet|square foot)\s+(?:greater than|over|above|more than)\s+(\d+[,\d]*)/i;
      const sizeLessPattern = /(?:size|area|sqft|sq ft|square feet|square foot)\s+(?:less than|under|below|smaller than)\s+(\d+[,\d]*)/i;
      
      const sizeGreaterMatch = normalizedQuery.match(sizeGreaterPattern);
      const sizeLessMatch = normalizedQuery.match(sizeLessPattern);
      
      if (sizeGreaterMatch) {
        const num = parseInt(sizeGreaterMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          extractedParams.sizeMin = num;
          logger.info(`✅ Found English size min: ${extractedParams.sizeMin}`);
        }
      }
      
      if (sizeLessMatch) {
        const num = parseInt(sizeLessMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          extractedParams.sizeMax = num;
          logger.info(`✅ Found English size max: ${extractedParams.sizeMax}`);
        }
      }
    }
    
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
      'wi-fi': 'Basic internet',
      'fiber': 'Fiber internet',
      'fiber internet': 'Fiber internet',
      'fiber wifi': 'Fiber internet',
      'fiber wi-fi': 'Fiber internet',
      'starlink': 'Star link internet',
      'star link': 'Star link internet',
      'starlink internet': 'Star link internet',
      'starlink wifi': 'Star link internet',
      'starlink wi-fi': 'Star link internet',
      'solar': 'Solar energy system',
      'furnished': null, // Special handling
      'unfurnished': null // Special handling
    };
    
    // Arabic amenity keywords
    const arabicAmenityKeywords = {
      'بلكونة': 'Balcony',
      'بلكون': 'Balcony',
      'شرفة': 'Balcony',
      'شرفات': 'Balcony',
      'طاقة شمسية': 'Solar energy system',
      'طاقةالشمسية': 'Solar energy system',
      'طاقةالشمس': 'Solar energy system',
      'نظام طاقة شمسية': 'Solar energy system',
      'مصعد': 'Lift',
      'أسانسير': 'Lift',
      'اصانصير': 'Lift',
      'اسانسير': 'Lift',
      'موقف': 'Parking',
      'كراج': 'Parking',
      'جراج': 'Parking',
      'مسبح': 'Swimming pool',
      'حوض سباحة': 'Swimming pool',
      'جيم': 'Gym',
      'نادي رياضي': 'Gym',
      'كاميرات': 'Security cameras',
      'كاميرا': 'Security cameras',
      'أمن': 'Security cameras',
      // Star link internet (check longer phrases first to avoid partial matches)
      'ستار لينك واي فاي': 'Star link internet',
      'ستار لينك ويفي': 'Star link internet',
      'ستار لينك انترنت': 'Star link internet',
      'ستار لينك نت': 'Star link internet',
      'ستارلينك واي فاي': 'Star link internet',
      'ستارلينك ويفي': 'Star link internet',
      'ستارلينك انترنت': 'Star link internet',
      'ستارلينك نت': 'Star link internet',
      'ستار لينك': 'Star link internet',
      'ستارلينك': 'Star link internet',
      // Fiber internet (check longer phrases first)
      'فايبر واي فاي': 'Fiber internet',
      'فايبر ويفي': 'Fiber internet',
      'فايبر انترنت': 'Fiber internet',
      'فايبرإنترنت': 'Fiber internet',
      'فايبر نت': 'Fiber internet',
      'فايبرنت': 'Fiber internet',
      'فايبر': 'Fiber internet',
      // Basic internet (check longer phrases first)
      'واي فاي عادي': 'Basic internet',
      'ويفي عادي': 'Basic internet',
      'انترنت عادي': 'Basic internet',
      'إنترنت عادي': 'Basic internet',
      'نت عادي': 'Basic internet',
      'نت منزلي': 'Basic internet',
      'واي فاي': 'Basic internet',
      'ويفي': 'Basic internet',
      'إنترنت': 'Basic internet',
      'انترنت': 'Basic internet',
      'مكيف': 'A/C',
      'تكييف': 'A/C'
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
    
    // Check Arabic amenity keywords
    for (const [keyword, amenity] of Object.entries(arabicAmenityKeywords)) {
      if (query.includes(keyword)) {
        if (!extractedParams.amenities.includes(amenity)) {
          extractedParams.amenities.push(amenity);
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
      extractedParams.keywords.push('nice view', 'view', 'منظر جميل', 'إطلالة جميلة', 'إطلالة');
    }

    // Extract other keywords (English)
    const keywordPatterns = [
      /\b(residential|sunny|ventilated|airy|well-ventilated|spacious|comfortable|cozy|quiet|peaceful|calm|modern|contemporary|traditional|classic|small|compact|large|wide|luxury|luxurious|shaded|shady|nice|beautiful|good|great|amazing|new|old|south-facing|east-facing|west-facing|bright|view|open view|sea view|mountain view|doublex|super doublex|standard finishing|stone finishing|shares|green title deed)\b/gi
    ];

    for (const pattern of keywordPatterns) {
      const matches = normalizedQuery.match(pattern);
      if (matches) {
        extractedParams.keywords.push(...matches.map(m => m.toLowerCase()));
      }
    }
    
    // Check for "with salon" in English
    if (normalizedQuery.match(/\b(with|has|includes)\s+(?:a\s+)?(?:salon|living room)\b/i)) {
      extractedParams.keywords.push('salon', 'living room');
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
    if (query.includes('فاخر') || query.includes('فاخرة') || query.includes('راقي') || query.includes('راقية')) {
      extractedParams.keywords.push('luxury', 'luxurious', 'premium', 'فاخر', 'فاخرة', 'راقي', 'راقية');
    }
    
    // NOTE: "شقة" = "شقة سكنية" by default, so "سكنية" is not a separate keyword/tag
    // It's part of the property type definition, not a characteristic keyword
    if (query.includes('مهوية') || query.includes('مهوى') || query.includes('تهوية')) {
      extractedParams.keywords.push('ventilated', 'airy', 'well-ventilated', 'مهوية', 'مهوى', 'تهوية');
    }
    if (query.includes('مشمسة') || query.includes('مشمس') || query.includes('مشمسه')) {
      extractedParams.keywords.push('sunny', 'sunlit', 'bright', 'مشمسة', 'مشمس', 'مشمسه');
    }
    if (query.includes('مظللة') || query.includes('مظلل') || query.includes('ظل')) {
      extractedParams.keywords.push('shaded', 'shady', 'مظللة', 'مظلل', 'ظل');
    }
    if (query.includes('هادئة') || query.includes('هادئ') || query.includes('ساكنة')) {
      extractedParams.keywords.push('quiet', 'peaceful', 'calm', 'هادئة', 'هادئ', 'ساكنة');
    }
    if (query.includes('مريحة') || query.includes('مريح') || query.includes('راحة')) {
      extractedParams.keywords.push('comfortable', 'cozy', 'مريحة', 'مريح', 'راحة');
    }
    if (query.includes('واسعة') || query.includes('واسع') || query.includes('كبيرة')) {
      extractedParams.keywords.push('spacious', 'large', 'wide', 'واسعة', 'واسع', 'كبيرة');
    }
    if (query.includes('صغيرة') || query.includes('صغير')) {
      extractedParams.keywords.push('small', 'compact', 'صغيرة', 'صغير');
    }
    if (query.includes('عصرية') || query.includes('عصري') || query.includes('حديثة')) {
      extractedParams.keywords.push('modern', 'contemporary', 'عصرية', 'عصري', 'حديثة');
    }
    if (query.includes('تقليدية') || query.includes('تقليدي') || query.includes('كلاسيكية')) {
      extractedParams.keywords.push('traditional', 'classic', 'تقليدية', 'تقليدي', 'كلاسيكية');
    }
    
    // Extract direction/orientation keywords (South-facing, East-facing, West-facing)
    // English
    if (normalizedQuery.match(/\b(south-facing|south facing|southern|south)\s+(?:house|apartment|property|unit)\b/i) ||
        normalizedQuery.match(/\b(house|apartment|property|unit)\s+(?:facing|oriented)\s+(?:south|southern)\b/i)) {
      extractedParams.keywords.push('south-facing', 'south-facing house', 'southern');
    }
    if (normalizedQuery.match(/\b(east-facing|east facing|eastern|east)\s+(?:house|apartment|property|unit)\b/i) ||
        normalizedQuery.match(/\b(house|apartment|property|unit)\s+(?:facing|oriented)\s+(?:east|eastern)\b/i)) {
      extractedParams.keywords.push('east-facing', 'eastern');
    }
    if (normalizedQuery.match(/\b(west-facing|west facing|western|west)\s+(?:house|apartment|property|unit)\b/i) ||
        normalizedQuery.match(/\b(house|apartment|property|unit)\s+(?:facing|oriented)\s+(?:west|western)\b/i)) {
      extractedParams.keywords.push('west-facing', 'western');
    }
    
    // Arabic - South-facing (جنوبي، جنوبية، باتجاه الجنوب، جنوب)
    if (query.includes('جنوبي') || query.includes('جنوبية') || query.includes('جنوب') || 
        query.includes('باتجاه الجنوب') || query.includes('ناحية الجنوب') ||
        query.includes('جنوبي') || query.includes('جنوبيه')) {
      extractedParams.keywords.push('south-facing', 'south-facing house', 'southern', 'جنوبي', 'جنوبية', 'جنوب');
    }
    
    // Arabic - East-facing (شرقي، شرقية، باتجاه الشرق، شرق)
    if (query.includes('شرقي') || query.includes('شرقية') || query.includes('شرق') ||
        query.includes('باتجاه الشرق') || query.includes('ناحية الشرق') ||
        query.includes('شرقي') || query.includes('شرقيه')) {
      extractedParams.keywords.push('east-facing', 'eastern', 'شرقي', 'شرقية', 'شرق');
    }
    
    // Arabic - West-facing (غربي، غربية، باتجاه الغرب، غرب)
    if (query.includes('غربي') || query.includes('غربية') || query.includes('غرب') ||
        query.includes('باتجاه الغرب') || query.includes('ناحية الغرب') ||
        query.includes('غربي') || query.includes('غربيه')) {
      extractedParams.keywords.push('west-facing', 'western', 'غربي', 'غربية', 'غرب');
    }
    
    // Extract "Bright" keyword (already handled but adding more variations)
    if (normalizedQuery.match(/\b(bright|brightly lit|well-lit|light|sunny)\b/i)) {
      extractedParams.keywords.push('bright', 'sunny', 'sunlit');
    }
    
    // Arabic - Bright (مضيئة، مضيء، مشرقة، مشرق، مشمسة، مشمس)
    if (query.includes('مضيئة') || query.includes('مضيء') || query.includes('مشرقة') || 
        query.includes('مشرق') || query.includes('مضيئه') || query.includes('مشرقه')) {
      extractedParams.keywords.push('bright', 'sunny', 'sunlit', 'مضيئة', 'مضيء', 'مشرقة', 'مشرق');
    }
    
    // Extract "View" keywords
    if (normalizedQuery.match(/\b(view|views|panoramic view|nice view|beautiful view)\b/i)) {
      extractedParams.keywords.push('view', 'nice view');
    }
    
    // Arabic - View (منظر، إطلالة، مشهد)
    // "nice view" = "إطلالة" or "إطلالة جميلة" or "منظر جميل"
    if (query.includes('منظر') || query.includes('إطلالة') || query.includes('اطلالة') || 
        query.includes('مشهد') || query.includes('منظر جميل') || query.includes('إطلالة جميلة') ||
        query.includes('منظر حلو') || query.includes('إطلالة حلوة') || query.includes('اطلالة جميلة') ||
        query.includes('اطلالة حلوة') || query.includes('منظر جميل') || query.includes('منظر حلو')) {
      extractedParams.keywords.push('view', 'nice view', 'منظر', 'إطلالة', 'مشهد', 'منظر جميل', 'إطلالة جميلة');
    }
    
    // Also check for standalone "إطلالة" or "اطلالة" (means nice view)
    if (query.match(/\b(إطلالة|اطلالة)\b/) && !query.includes('بحرية') && !query.includes('جبلية') && !query.includes('مفتوحة')) {
      extractedParams.keywords.push('view', 'nice view', 'إطلالة', 'اطلالة', 'منظر جميل', 'إطلالة جميلة');
    }
    
    // Extract "Open view" (إطلالة مفتوحة، منظر مفتوح)
    if (normalizedQuery.match(/\b(open view|unobstructed view|clear view)\b/i)) {
      if (!extractedParams.viewType) {
        extractedParams.viewType = 'open view';
      }
      extractedParams.keywords.push('open view', 'unobstructed view');
    }
    if (query.includes('إطلالة مفتوحة') || query.includes('اطلالة مفتوحة') || 
        query.includes('منظر مفتوح') || query.includes('منظر مفتوح')) {
      if (!extractedParams.viewType) {
        extractedParams.viewType = 'open view';
      }
      extractedParams.keywords.push('open view', 'إطلالة مفتوحة', 'منظر مفتوح');
    }
    
    // Extract "Sea view" (إطلالة بحرية، منظر بحري، بحر)
    if (normalizedQuery.match(/\b(sea view|ocean view|water view|coastal view)\b/i)) {
      extractedParams.viewType = 'sea view';
      extractedParams.keywords.push('sea view', 'ocean view');
    }
    if (query.includes('إطلالة بحرية') || query.includes('اطلالة بحرية') || 
        query.includes('منظر بحري') || query.includes('بحر') ||
        query.includes('إطلالة على البحر') || query.includes('اطلالة على البحر')) {
      extractedParams.viewType = 'sea view';
      extractedParams.keywords.push('sea view', 'ocean view', 'إطلالة بحرية', 'منظر بحري', 'بحر');
    }
    
    // Extract "Mountain view" (إطلالة جبلية، منظر جبلي، جبل)
    if (normalizedQuery.match(/\b(mountain view|hill view|mountainous view)\b/i)) {
      extractedParams.viewType = 'mountain view';
      extractedParams.keywords.push('mountain view', 'hill view');
    }
    if (query.includes('إطلالة جبلية') || query.includes('اطلالة جبلية') || 
        query.includes('منظر جبلي') || query.includes('جبل') ||
        query.includes('إطلالة على الجبل') || query.includes('اطلالة على الجبل')) {
      extractedParams.viewType = 'mountain view';
      extractedParams.keywords.push('mountain view', 'hill view', 'إطلالة جبلية', 'منظر جبلي', 'جبل');
    }
    
    // Extract "Luxury" (already handled, but adding more variations)
    if (normalizedQuery.match(/\b(luxury|luxurious|premium|high-end|deluxe)\b/i)) {
      extractedParams.keywords.push('luxury', 'luxurious', 'premium');
    }
    // Arabic - Luxury (فاخر، فاخرة، فخم، فخمة، راقي، راقية)
    if (query.includes('فاخر') || query.includes('فاخرة') || query.includes('فخم') || 
        query.includes('فخمة') || query.includes('راقي') || query.includes('راقية') ||
        query.includes('فاخره') || query.includes('فخمه') || query.includes('راقيه')) {
      extractedParams.keywords.push('luxury', 'luxurious', 'premium', 'فاخر', 'فاخرة', 'فخم', 'فخمة', 'راقي', 'راقية');
    }
    
    // Extract "Doublex finishing" (تشطيب دوبلكس، دوبلكس)
    if (normalizedQuery.match(/\b(doublex|duplex|double x)\s+(?:finishing|finish)\b/i)) {
      extractedParams.keywords.push('doublex finishing', 'duplex finishing');
    }
    if (query.includes('دوبلكس') || query.includes('دوبلكس') || 
        query.includes('تشطيب دوبلكس') || query.includes('دبل اكس') ||
        query.includes('دوبلكس') || query.includes('دوبلكس')) {
      extractedParams.keywords.push('doublex finishing', 'duplex finishing', 'دوبلكس', 'تشطيب دوبلكس');
    }
    
    // Extract "Super doublex finishing" (تشطيب سوبر دوبلكس، سوبر دوبلكس)
    if (normalizedQuery.match(/\b(super\s+doublex|super\s+duplex|super\s+double\s+x)\s+(?:finishing|finish)\b/i)) {
      extractedParams.keywords.push('super doublex finishing', 'super duplex finishing');
    }
    if (query.includes('سوبر دوبلكس') || query.includes('سوبر دوبلكس') ||
        query.includes('تشطيب سوبر دوبلكس') || query.includes('سوبر دبل اكس')) {
      extractedParams.keywords.push('super doublex finishing', 'super duplex finishing', 'سوبر دوبلكس', 'تشطيب سوبر دوبلكس');
    }
    
    // Extract "Standard finishing" (تشطيب عادي، عادي، قياسي، تجهيز، اكساء، مكسي)
    if (normalizedQuery.match(/\b(standard|normal|regular)\s+(?:finishing|finish)\b/i)) {
      extractedParams.keywords.push('standard finishing', 'normal finishing');
    }
    if (query.includes('تشطيب عادي') || query.includes('عادي') || 
        query.includes('قياسي') || query.includes('تشطيب قياسي') ||
        query.includes('عادي') || query.includes('عاديه') ||
        query.includes('تجهيز') || query.includes('اكساء') || query.includes('أكساء') ||
        query.includes('مكسي') || query.includes('مكسو') || query.includes('مكسية')) {
      extractedParams.keywords.push('standard finishing', 'normal finishing', 'تشطيب عادي', 'عادي', 'قياسي', 'تجهيز', 'اكساء', 'أكساء', 'مكسي', 'مكسو', 'مكسية');
    }
    
    // Extract "Stone finishing" (تشطيب حجري، حجري، حجر)
    if (normalizedQuery.match(/\b(stone|rock)\s+(?:finishing|finish|work)\b/i)) {
      extractedParams.keywords.push('stone finishing', 'rock finishing');
    }
    if (query.includes('تشطيب حجري') || query.includes('حجري') || 
        query.includes('حجر') || query.includes('تشطيب بالحجر') ||
        query.includes('حجري') || query.includes('حجريه')) {
      extractedParams.keywords.push('stone finishing', 'rock finishing', 'تشطيب حجري', 'حجري', 'حجر');
    }
    
    // Extract "Shares" (أسهم، سهم)
    if (normalizedQuery.match(/\b(\d+[,.]?\d*)\s*(?:shares|share)\b/i)) {
      const shareMatch = normalizedQuery.match(/\b(\d+[,.]?\d*)\s*(?:shares|share)\b/i);
      if (shareMatch) {
        extractedParams.keywords.push(`${shareMatch[1]} shares`, 'shares');
      }
    }
    if (query.match(/(\d+[,.]?\d*)\s*(?:سهم|أسهم|سهم)/)) {
      const shareMatch = query.match(/(\d+[,.]?\d*)\s*(?:سهم|أسهم|سهم)/);
      if (shareMatch) {
        extractedParams.keywords.push(`${shareMatch[1]} shares`, 'أسهم', 'سهم');
      }
    }
    // Also check for "2,400 shares" format
    if (query.includes('٢٤٠٠ سهم') || query.includes('2400 سهم') || 
        query.includes('ألفان وأربعمائة سهم') || query.includes('ألفان واربعمائة سهم')) {
      extractedParams.keywords.push('2,400 shares', '2400 shares', 'أسهم', 'سهم');
    }
    
    // Extract "Green Title Deed" (طابو أخضر، طابو اخضر، صك أخضر)
    // Already handled above, but adding more variations
    if (normalizedQuery.match(/\b(green\s+title\s+deed|green\s+deed|green\s+title)\b/i)) {
      extractedParams.keywords.push('green title deed', 'green deed');
    }
    if (query.includes('طابو أخضر') || query.includes('طابو اخضر') || 
        query.includes('صك أخضر') || query.includes('صك اخضر') ||
        query.includes('طابو اخضر') || query.includes('طابو أخضر')) {
      extractedParams.keywords.push('green title deed', 'green deed', 'طابو أخضر', 'طابو اخضر', 'صك أخضر');
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

