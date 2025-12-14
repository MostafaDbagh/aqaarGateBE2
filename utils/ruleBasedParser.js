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
      rentType: null, // monthly, weekly, daily, three-month, six-month, yearly
      city: null,
      neighborhood: null,
      amenities: [],
      furnished: null,
      garages: null,
      keywords: [],
      viewType: null
    };

    // Extract property type
    // First check for "Holiday Home" variations (before checking بيت/منزل alone)
    // This ensures "بيت عطلة" maps to Holiday Home, not Apartment
    // IMPORTANT: Villas with daily/weekly rent are still Villa/farms, not Holiday Home
    // Only "بيت" (house/apartment) with daily/weekly rent are Holiday Homes
    if (normalizedQuery.match(/\b(holiday home|holiday homes|vacation home|vacation homes|short-term rental|short term rental|daily rental|weekly rental|tourist house|tourist houses|rental house|rental houses)\b/) ||
        query.includes('بيوت عطلات') || query.includes('بيوت عطلة') ||
        query.includes('بيت عطلة') || query.includes('بيت عطلات') ||
        query.includes('بيت اجار قصير') || query.includes('بيت إيجار قصير') ||
        query.includes('بيت إيجار يومي') || query.includes('بيت اجار يومي') ||
        query.includes('بيت إيجار أسبوعي') || query.includes('بيت اجار اسبوعي') ||
        query.includes('بيت سياحي') || query.includes('بيوت سياحية') ||
        query.includes('منزل سياحي') || query.includes('منازل سياحية') ||
        query.includes('فيلا سياحية') || query.includes('فيلات سياحية') ||
        query.includes('بيت للإيجار اليومي') || query.includes('بيت للايجار اليومي') ||
        query.includes('بيت للإيجار الأسبوعي') || query.includes('بيت للايجار الاسبوعي') ||
        query.includes('بيت للإيجار القصير') || query.includes('بيت للايجار القصير') ||
        query.includes('بيت إيجار يومي') || query.includes('بيت اجار يومي') ||
        query.includes('إيجار قصير') || query.includes('ايجار قصير') ||
        // Note: "فلل للإيجار اليومي" and "فيلا للإيجار اليومي" are NOT Holiday Homes - they are Villa/farms with daily rent
        // Note: "إيجار يومي" and "إيجار أسبوعي" alone (without villa/fila) are Holiday Homes
        (query.includes('إيجار يومي') && !query.includes('فيلا') && !query.includes('فيلات') && !query.includes('فلل')) ||
        (query.includes('إيجار أسبوعي') && !query.includes('فيلا') && !query.includes('فيلات') && !query.includes('فلل'))) {
      extractedParams.propertyType = 'Holiday Home';
    }
    // Then check for "Villa/farms" variations (before checking individual "Villa")
    else if (normalizedQuery.match(/\b(villa|villas|farm|farms)\b/) || 
        query.includes('فيلا') || query.includes('فيلات') || query.includes('فلل') ||
        query.includes('مزرعة') || query.includes('مزارع')) {
      extractedParams.propertyType = 'Villa/farms';
    }
    // Then check for "House" variations (before Apartment to prioritize "منزل" as House)
    else if (normalizedQuery.match(/\b(house|houses|residential house|residential houses|family house|family houses)\b/) ||
             query.includes('منزل') || query.includes('منازل')) {
      extractedParams.propertyType = 'House';
    }
    // Then check for "Apartment" variations (before Land to avoid "مساحة" matching Land when "شقة" is present)
    else if (normalizedQuery.match(/\b(apt|apartment|apartments|flat|flats|unit|units|residential unit|residential units|condo|condos|condominium|condominiums|residence|residences|dwelling|dwellings)\b/) ||
             query.includes('شقة') || query.includes('شقق') ||
             query.includes('شقة سكنية') || query.includes('شقق سكنية') ||
             query.includes('عقار سكني') || query.includes('عقارات سكنية') ||
             query.includes('وحدة سكنية') || query.includes('وحدات سكنية') ||
             query.includes('سكن') || query.includes('مساكن') ||
             query.includes('بيت') || query.includes('بيوت') ||
             query.includes('مسكن') || query.includes('مساكن') ||
             query.includes('سكني') || query.includes('سكنية')) {
      extractedParams.propertyType = 'Apartment';
    }
    // Then check for "Land" variations
    // NOTE: "مساحة" (area) is NOT included here because it's used for size, not property type
    // Only include "مساحة" when it's clearly about land (e.g., "مساحة أرض" = land area)
    // IMPORTANT: "عقار" or "عقارات" alone (without context) should NOT set propertyType to Land
    // This allows "عقار" to show all property types when used alone
    else if (normalizedQuery.match(/\b(land|lands|plot|plots|piece of land|parcel|parcels|lot|lots|terrain|terrains|acre|acres|field|fields|ground|grounds|estate|estates)\b/) ||
             query.includes('أرض') || query.includes('أراضي') || query.includes('ارض') || query.includes('اراضي') ||
             query.includes('قطعة أرض') || query.includes('قطعة ارض') || query.includes('قطعة الأرض') || query.includes('قطعة الارض') ||
             query.includes('قطعة') || query.includes('قطع') ||
             query.includes('حقل') || query.includes('حقول') ||
             (query.includes('مساحة') && (query.includes('أرض') || query.includes('ارض') || query.includes('قطعة'))) ||
             query.includes('قطعة أرضية') || query.includes('قطعة ارضية') ||
             query.includes('أرض سكنية') || query.includes('ارض سكنية') ||
             query.includes('أرض زراعية') || query.includes('ارض زراعية') ||
             query.includes('أرض تجارية') || query.includes('ارض تجارية')) {
      extractedParams.propertyType = 'Land';
    }
    // Handle common variations (English) - Check BEFORE the generic loop to prioritize specific patterns
    if (!extractedParams.propertyType) {
      // Office variations - Check BEFORE House to avoid "Office" being matched as "House"
      if (normalizedQuery.match(/\b(office|offices|business office|business offices|workspace|workspaces|workplace|workplaces|professional office|professional offices|office space|office spaces)\b/)) {
        extractedParams.propertyType = 'Office';
      }
      // Apartment variations
      else if (normalizedQuery.match(/\b(apt|apartment|apartments|flat|flats|unit|units|residential unit|residential units|condo|condos|condominium|condominiums|residence|residences|dwelling|dwellings)\b/)) {
        extractedParams.propertyType = 'Apartment';
      } 
      // Villa/farms variations
      else if (normalizedQuery.match(/\b(villa|villas|farm|farms|farmhouse|farmhouses)\b/)) {
        extractedParams.propertyType = 'Villa/farms';
      } 
      // House variations
      else if (normalizedQuery.match(/\b(house|houses|residential house|residential houses|family house|family houses)\b/)) {
        extractedParams.propertyType = 'House';
      } 
      // Commercial variations
      else if (normalizedQuery.match(/\b(commercial|commercial property|commercial properties|shop|shops|store|stores|retail|retail space|retail spaces|business|businesses|business space|business spaces|storefront|storefronts|marketplace|marketplaces|mall|malls|boutique|boutiques|showroom|showrooms)\b/)) {
        extractedParams.propertyType = 'Commercial';
      } 
      // Land variations
      else if (normalizedQuery.match(/\b(land|lands|plot|plots|piece of land|parcel|parcels|lot|lots|terrain|terrains|acre|acres|field|fields|ground|grounds|estate|estates|land plot|land plots|building plot|building plots|construction land|construction lands)\b/)) {
        extractedParams.propertyType = 'Land';
      } 
      // Holiday Home variations
      else if (normalizedQuery.match(/\b(holiday home|holiday homes|vacation home|vacation homes|short-term rental|short term rental|daily rental|weekly rental|tourist house|tourist houses|rental house|rental houses|vacation rental|vacation rentals|holiday rental|holiday rentals|temporary rental|temporary rentals)\b/)) {
        extractedParams.propertyType = 'Holiday Home';
      }
      // Generic "home" without context defaults to Villa/farms
      else if (normalizedQuery.match(/\bhome\b/) && !normalizedQuery.match(/\b(holiday|vacation|rental|tourist)\b/)) {
        extractedParams.propertyType = 'Villa/farms';
      }
    }

    // Handle Arabic property types
    // IMPORTANT: Check for specific compound terms FIRST (before generic terms)
    // This ensures "عقار سكني" → Apartment, "عقار تجاري" → Commercial, "عقار" alone → null (all types)
    if (!extractedParams.propertyType) {
      // Check for "عقار سكني" and "عقار تجاري" FIRST (before checking generic "عقار")
      if (query.includes('عقار سكني') || query.includes('عقارات سكنية')) {
        extractedParams.propertyType = 'Apartment';
      }
      else if (query.includes('عقار تجاري') || query.includes('عقارات تجارية')) {
        extractedParams.propertyType = 'Commercial';
      }
      // Holiday Home variations (check these first to avoid matching "بيت" alone)
      else if (query.includes('بيوت عطلات') || query.includes('بيوت عطلة') ||
          query.includes('بيت عطلة') || query.includes('بيت عطلات') ||
          query.includes('بيت اجار قصير') || query.includes('بيت إيجار قصير') ||
          query.includes('بيت إيجار يومي') || query.includes('بيت اجار يومي') ||
          query.includes('بيت إيجار أسبوعي') || query.includes('بيت اجار اسبوعي') ||
          query.includes('بيت سياحي') || query.includes('بيوت سياحية') ||
          query.includes('منزل سياحي') || query.includes('منازل سياحية') ||
          query.includes('فيلا سياحية') || query.includes('فيلات سياحية') ||
          query.includes('بيت للإيجار اليومي') || query.includes('بيت للايجار اليومي') ||
          query.includes('بيت للإيجار الأسبوعي') || query.includes('بيت للايجار الاسبوعي') ||
          query.includes('بيت للإيجار القصير') || query.includes('بيت للايجار القصير') ||
          query.includes('بيت إيجار يومي') || query.includes('بيت اجار يومي') ||
          query.includes('بيت إيجار شهري') || query.includes('بيت اجار شهري') ||
          query.includes('بيت إيجار سنوي') || query.includes('بيت اجار سنوي') ||
          query.includes('فلل للإيجار اليومي') || query.includes('فلل للايجار اليومي') ||
          query.includes('فلل للإيجار الشهري') || query.includes('فلل للايجار الشهري') ||
          query.includes('فلل للإيجار السنوي') || query.includes('فلل للايجار السنوي') ||
          query.includes('فيلا للإيجار اليومي') || query.includes('فيلا للايجار اليومي') ||
          query.includes('فيلا للإيجار الشهري') || query.includes('فيلا للايجار الشهري') ||
          query.includes('إيجار قصير') || query.includes('ايجار قصير') ||
          query.includes('إيجار يومي') || query.includes('ايجار يومي') ||
          query.includes('إيجار أسبوعي') || query.includes('ايجار اسبوعي') ||
          query.includes('إيجار شهري') || query.includes('ايجار شهري') ||
          query.includes('إيجار سنوي') || query.includes('ايجار سنوي')) {
        extractedParams.propertyType = 'Holiday Home';
      }
      // Villa/farms variations (check BEFORE Apartment to catch "بيت ريفي" correctly)
      // IMPORTANT: Check "بيت ريفي" and "منزل ريفي" BEFORE checking generic "بيت" and "منزل"
      else if (query.includes('منزل ريفي') || query.includes('منازل ريفية') ||
                 query.includes('بيت ريفي') || query.includes('بيوت ريفية') ||
                 query.includes('فيلا') || query.includes('فيلات') || query.includes('فلل') ||
                 query.includes('مزرعة') || query.includes('مزارع') ||
                 query.includes('قصر') || query.includes('قصور')) {
        extractedParams.propertyType = 'Villa/farms';
      }
      // Apartment variations (بيت/منزل alone, without holiday/tourist/rustic context)
      // NOTE: "عقار سكني" already checked above, so we don't need to check it again here
      // NOTE: "بيت ريفي" and "منزل ريفي" already checked above, so they won't match here
      else if (query.includes('شقة') || query.includes('شقق') || 
          query.includes('شقة سكنية') || query.includes('شقق سكنية') ||
          query.includes('شقق سكنية') || query.includes('شقة سكنية') ||
          query.includes('عقار سكني') || query.includes('عقارات سكنية') ||
          query.includes('وحدة سكنية') || query.includes('وحدات سكنية') ||
          query.includes('سكن') || query.includes('مساكن') ||
          query.includes('منزل') || query.includes('منازل') ||
          query.includes('بيت') || query.includes('بيوت') ||
          query.includes('مسكن') || query.includes('مساكن') ||
          query.includes('سكني') || query.includes('سكنية')) {
        extractedParams.propertyType = 'Apartment';
      } 
      // Office variations
      else if (query.includes('مكتب') || query.includes('مكاتب') ||
                 query.includes('مكتب تجاري') || query.includes('مكاتب تجارية') ||
                 query.includes('مكتب عمل') || query.includes('مكاتب عمل') ||
                 query.includes('مساحة مكتبية') || query.includes('مساحات مكتبية') ||
                 query.includes('مكتب إداري') || query.includes('مكاتب إدارية') ||
                 query.includes('مكتب مهني') || query.includes('مكاتب مهنية')) {
        extractedParams.propertyType = 'Office';
      } 
      // Land variations
      // NOTE: "مساحة" (area) is NOT included here because it's used for size, not property type
      // Only include "مساحة" when it's clearly about land (e.g., "مساحة أرض" = land area)
      // IMPORTANT: "عقار" or "عقارات" alone (without context) should NOT set propertyType to Land
      // This allows "عقار" to show all property types when used alone
      else if (query.includes('أرض') || query.includes('أراضي') || query.includes('ارض') || query.includes('اراضي') ||
                 query.includes('قطعة أرض') || query.includes('قطعة ارض') || query.includes('قطعة الأرض') || query.includes('قطعة الارض') ||
                 query.includes('قطعة') || query.includes('قطع') ||
                 query.includes('حقل') || query.includes('حقول') ||
                 (query.includes('مساحة') && (query.includes('أرض') || query.includes('ارض') || query.includes('قطعة'))) ||
                 query.includes('قطعة أرضية') || query.includes('قطعة ارضية') ||
                 query.includes('أرض سكنية') || query.includes('ارض سكنية') ||
                 query.includes('أرض زراعية') || query.includes('ارض زراعية') ||
                 query.includes('أرض تجارية') || query.includes('ارض تجارية') ||
                 query.includes('أرض بناء') || query.includes('ارض بناء') ||
                 query.includes('أرض للبناء') || query.includes('ارض للبناء') ||
                 query.includes('قطعة بناء') || query.includes('قطع بناء')) {
        extractedParams.propertyType = 'Land';
      } 
      // Commercial variations
      // NOTE: "عقار تجاري" already checked above, so we don't need to check it again here
      else if (query.includes('تجاري') || query.includes('تجارية') ||
                 query.includes('محل') || query.includes('محلات') ||
                 query.includes('متجر') || query.includes('متاجر') ||
                 query.includes('محل تجاري') || query.includes('محلات تجارية') ||
                 query.includes('متجر تجاري') || query.includes('متاجر تجارية') ||
                 query.includes('محل بيع') || query.includes('محلات بيع') ||
                 query.includes('محل إيجار') || query.includes('محلات إيجار') ||
                 query.includes('مساحة تجارية') || query.includes('مساحات تجارية') ||
                 query.includes('عقار تجاري') || query.includes('عقارات تجارية') ||
                 query.includes('مول') || query.includes('مولات') ||
                 query.includes('سوق') || query.includes('أسواق') ||
                 query.includes('بوتيك') || query.includes('بوتيكات') ||
                 query.includes('معرض') || query.includes('معارض')) {
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
        /(?:ست غرف|ستة غرف)/, // 6 rooms
        /(?:سبع غرف|سبعة غرف)/, // 7 rooms
        /(?:ثمان غرف|ثمانية غرف)/, // 8 rooms
        /(?:تسع غرف|تسعة غرف)/, // 9 rooms
        /(?:عشر غرف|عشرة غرف)/, // 10 rooms
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
          } else if (query.includes('غرفة') && !query.includes('غرفتين') && 
                     !query.includes('ثلاث غرف') && !query.includes('ثلاثة غرف') &&
                     !query.includes('أربع غرف') && !query.includes('أربعة غرف') && 
                     !query.includes('اربع غرف') && !query.includes('اربع غرف') &&
                     !query.includes('خمس غرف') && !query.includes('خمسة غرف') &&
                     !query.match(/[٠-٩\d]+\s*غرف/)) {
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
          } else if (query.includes('ست غرف') || query.includes('ستة غرف')) {
            bedroomCount = 6;
          } else if (query.includes('سبع غرف') || query.includes('سبعة غرف')) {
            bedroomCount = 7;
          } else if (query.includes('ثمان غرف') || query.includes('ثمانية غرف')) {
            bedroomCount = 8;
          } else if (query.includes('تسع غرف') || query.includes('تسعة غرف')) {
            bedroomCount = 9;
          } else if (query.includes('عشر غرف') || query.includes('عشرة غرف')) {
            bedroomCount = 10;
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
        /(?:ست حمامات|ستة حمامات)/, // 6 bathrooms
        /(?:سبع حمامات|سبعة حمامات)/, // 7 bathrooms
        /(?:ثمان حمامات|ثمانية حمامات)/, // 8 bathrooms
        /(?:حمام واحد|حمام واحد)/, // 1 bathroom (explicit)
        /([٠-٩\d]+)\s*(?:حمام|حمامات)(?!\s*(?:ألف|الف|دولار|دولر|ليرة|ل\.س))/, // Number (Arabic or Latin) + bathroom(s) - but NOT if followed by price words
        /(?:حمام|حمامات)\s*([٠-٩\d]+)(?!\s*(?:ألف|الف|دولار|دولر|ليرة|ل\.س))/, // bathroom(s) + number (Arabic or Latin) - but NOT if followed by price words
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
          } else if (query.includes('ست حمامات') || query.includes('ستة حمامات')) {
            bathroomCount = 6;
          } else if (query.includes('سبع حمامات') || query.includes('سبعة حمامات')) {
            bathroomCount = 7;
          } else if (query.includes('ثمان حمامات') || query.includes('ثمانية حمامات')) {
            bathroomCount = 8;
          } else if (query.includes('حمام واحد')) {
            bathroomCount = 1;
          } else if (match[1]) {
            // Number + bathroom(s) or bathroom(s) + number (supports Arabic numerals)
            // But check if this number is part of a price pattern (e.g., "50 الف دولار")
            const num = extractNumber(match[1]);
            if (num !== null && num > 0) {
              // Check if this number is part of a price by looking before and after the match
              const matchIndex = query.indexOf(match[0]);
              if (matchIndex >= 0) {
                const beforeMatch = query.substring(Math.max(0, matchIndex - 10), matchIndex);
                const afterMatch = query.substring(matchIndex + match[0].length, matchIndex + match[0].length + 20);
                // If followed by price words OR preceded by price context, skip this match
                if (afterMatch.match(/^\s*(?:ألف|الف|دولار|دولر|ليرة|ل\.س)/) ||
                    beforeMatch.match(/(?:ألف|الف|دولار|دولر|ليرة|ل\.س|سعر|ميزانية)\s*$/)) {
                  continue; // Skip, this is part of a price
                }
                // Also check if this is a substring of a larger number (e.g., "5" from "50")
                const fullMatch = query.substring(Math.max(0, matchIndex - 5), matchIndex + match[0].length + 5);
                if (fullMatch.match(/\d+[٠-٩]*\s*(?:ألف|الف|دولار|دولر|ليرة|ل\.س)/) && 
                    fullMatch.replace(match[0], '').match(/\d+[٠-٩]*/)) {
                  continue; // Skip, this number is part of a larger price number
                }
              }
              bathroomCount = num;
            }
          } else if (pattern.source.includes('(?!\\w)')) {
            // Just "حمام" or "حمامات" alone (not part of "حمامين" or other compound words)
            // Make sure it's not part of "حمامين" or "حمامات" with numbers
            // But allow "حمام" after "غرف" (e.g., "ثلاث غرف حمام" = 3 rooms, 1 bathroom)
            if (query.includes('حمام') && !query.includes('حمامين') && !query.includes('حمامان') && 
                !query.includes('ثلاث حمامات') && !query.includes('ثلاثة حمامات') &&
                !query.includes('أربع حمامات') && !query.includes('أربعة حمامات') && 
                !query.includes('اربع حمامات') && !query.includes('خمس حمامات') && 
                !query.includes('خمسة حمامات') &&
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
    // CRITICAL: Check for "سوريا" (Syria) first - if found, don't set city filter (show all results)
    // Check both Arabic (سوريا, سورية) and English (syria) variations - use word boundary for English
    const hasSyria = query.includes('سوريا') || query.includes('سورية') || 
                     normalizedQuery.match(/\bsyria\b/i);
    if (hasSyria) {
      // When "سوريا" or "Syria" is mentioned, don't filter by city - show all results from Syria
      extractedParams.city = null; // Explicitly set to null to show all cities
      logger.info('✅ Found "سوريا" or "Syria" - will show all results (no city filter)');
    }
    // CRITICAL: Check for "شام" first as it's a common alternative for Damascus
    else if (query.includes('شام') || query.includes('الشام')) {
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
        // Normalize query by removing extra spaces for better matching
        const normalizedQueryForCity = query.replace(/\s+/g, ' ').trim();
        for (const arName of city.ar) {
          // Normalize Arabic city name by removing spaces for comparison
          const normalizedArName = arName.replace(/\s+/g, '').trim();
          const normalizedQueryNoSpaces = normalizedQueryForCity.replace(/\s+/g, '');
          
          // Check both with and without spaces
          if ((query.includes(arName) || normalizedQueryNoSpaces.includes(normalizedArName)) && !isBathroomWord(query, arName)) {
            extractedParams.city = city.en;
            logger.info(`✅ Found city "${arName}" (${city.en}), not part of bathroom word`);
            break;
          }
        }
        if (extractedParams.city) break; // Exit loop if city found
      }
    }

    // CRITICAL: If "سوريا" (Syria) was found, clear neighborhood to show all results
    // This ensures that when user searches "عقارات في سوريا" or "properties in Syria", we show all properties from all cities
    // Must be done AFTER neighborhood extraction to override any "سوريا" or "Syria" that was set
    const hasSyriaForNeighborhood = query.includes('سوريا') || query.includes('سورية') || 
                                    normalizedQuery.match(/\bsyria\b/i);
    if (hasSyriaForNeighborhood) {
      extractedParams.neighborhood = null; // Clear neighborhood to show all results
      logger.info('✅ Cleared neighborhood filter for "سوريا"/"Syria" - will show all results');
    }

    // Extract status (rent/sale) - English
    if (normalizedQuery.match(/\b(rent|rental|for rent|renting|to rent)\b/)) {
      extractedParams.status = 'rent';
    } else if (normalizedQuery.match(/\b(sale|sell|buy|for sale|purchase|buying)\b/)) {
      extractedParams.status = 'sale';
    }

    // Extract status from Arabic (للإيجار = rent, للبيع = sale)
    if (!extractedParams.status) {
      // Rent variations
      if (query.includes('للإيجار') || query.includes('للايجار') || 
          query.includes('إيجار') || query.includes('ايجار') ||
          query.includes('استئجار') || query.includes('استاجار') ||
          query.includes('تأجير') || query.includes('تاجير') ||
          query.includes('للاستئجار') || query.includes('للاستاجار') ||
          query.includes('للتأجير') || query.includes('للتاجير') ||
          query.includes('مؤجر') || query.includes('مؤجرة') ||
          query.includes('للتأجير') || query.includes('للتاجير')) {
        extractedParams.status = 'rent';
      } 
      // Sale variations
      else if (query.includes('للبيع') || query.includes('بيع') || 
               query.includes('شراء') || query.includes('مباع') ||
               query.includes('مباعة') || query.includes('للشراء') ||
               query.includes('مبيع') || query.includes('مبيعة')) {
        extractedParams.status = 'sale';
      }
    }

    // Extract rent type (only if status is rent)
    // Supported types: daily, weekly, monthly, yearly only
    // English patterns
    if (extractedParams.status === 'rent') {
      // Daily rent
      if (normalizedQuery.match(/\b(daily|per day|day by day|daily basis|daily rental|daily rent)\b/)) {
        extractedParams.rentType = 'daily';
        logger.info('✅ Found rent type: daily');
      }
      // Weekly rent
      else if (normalizedQuery.match(/\b(weekly|per week|week by week|weekly basis|weekly rental|weekly rent)\b/)) {
        extractedParams.rentType = 'weekly';
        logger.info('✅ Found rent type: weekly');
      }
      // Monthly rent
      else if (normalizedQuery.match(/\b(monthly|per month|month by month|monthly basis|monthly rental|monthly rent)\b/)) {
        extractedParams.rentType = 'monthly';
        logger.info('✅ Found rent type: monthly');
      }
      // Yearly/One-year rent
      else if (normalizedQuery.match(/\b(yearly|per year|year by year|annual|annually|one-year|one year|1-year|1 year|yearly basis|yearly rental|yearly rent)\b/)) {
        extractedParams.rentType = 'yearly';
        logger.info('✅ Found rent type: yearly');
      }
      
      // Arabic patterns for rent type
      // Daily: إيجار يومي, ايجار يومي, يومي, يوميا, بشكل يومي, للايجار اليومي
      if (!extractedParams.rentType) {
        if (query.includes('إيجار يومي') || query.includes('ايجار يومي') || 
            query.includes('للايجار اليومي') || query.includes('للإيجار اليومي') ||
            query.includes('بشكل يومي') || query.includes('بشكل يومي') ||
            query.includes('يوميا') || query.includes('يومياً') ||
            (query.includes('يومي') && (query.includes('إيجار') || query.includes('ايجار') || query.includes('للايجار') || query.includes('للإيجار')))) {
          extractedParams.rentType = 'daily';
          logger.info('✅ Found rent type: daily (Arabic)');
        }
        // Weekly: إيجار أسبوعي, ايجار اسبوعي, أسبوعي, أسبوعيا, بشكل أسبوعي
        else if (query.includes('إيجار أسبوعي') || query.includes('ايجار اسبوعي') || 
                 query.includes('للايجار الاسبوعي') || query.includes('للإيجار الأسبوعي') ||
                 query.includes('بشكل أسبوعي') || query.includes('بشكل اسبوعي') ||
                 query.includes('أسبوعيا') || query.includes('اسبوعيا') ||
                 (query.includes('أسبوعي') && (query.includes('إيجار') || query.includes('ايجار') || query.includes('للايجار') || query.includes('للإيجار')))) {
          extractedParams.rentType = 'weekly';
          logger.info('✅ Found rent type: weekly (Arabic)');
        }
        // Monthly: إيجار شهري, ايجار شهري, شهري, شهريا, بشكل شهري, للايجار الشهري
        else if (query.includes('إيجار شهري') || query.includes('ايجار شهري') || 
                 query.includes('للايجار الشهري') || query.includes('للإيجار الشهري') ||
                 query.includes('بشكل شهري') || query.includes('بشكل شهري') ||
                 query.includes('شهريا') || query.includes('شهرياً') ||
                 (query.includes('شهري') && (query.includes('إيجار') || query.includes('ايجار') || query.includes('للايجار') || query.includes('للإيجار')))) {
          extractedParams.rentType = 'monthly';
          logger.info('✅ Found rent type: monthly (Arabic)');
        }
        // Yearly: إيجار سنوي, ايجار سنوي, سنوي, سنويا, بشكل سنوي, سنة, للايجار السنوي
        else if (query.includes('إيجار سنوي') || query.includes('ايجار سنوي') || 
                 query.includes('للايجار السنوي') || query.includes('للإيجار السنوي') ||
                 query.includes('بشكل سنوي') || query.includes('بشكل سنوي') ||
                 query.includes('سنويا') || query.includes('سنوياً') ||
                 (query.includes('سنة') && (query.includes('إيجار') || query.includes('ايجار') || query.includes('للايجار') || query.includes('للإيجار'))) ||
                 (query.includes('سنوي') && (query.includes('إيجار') || query.includes('ايجار') || query.includes('للايجار') || query.includes('للإيجار')))) {
          extractedParams.rentType = 'yearly';
          logger.info('✅ Found rent type: yearly (Arabic)');
        }
      }
    }

    // Extract price range - Arabic patterns first
    // Arabic: "سعر اقل من" = price less than (priceMax), "سعر اعلى من" = price more than (priceMin)
    // Support "سعره" (his price), "سعرها" (her price), "أسعار" (prices)
      // Support "بحوالي" (around) and "بحدود" (around/approximately) - means priceMax = value, priceMin = ~80-90% of value
      // IMPORTANT: "بحدود" and "بحوالي" can appear without "سعر" (e.g., "بحدود ٢٠٠ الف دولار")
      // IMPORTANT: "بين" and "اعلى" and "اقل" can also appear without "سعر" (e.g., "شقة بين 20 و 50 الف دولار")
      const arabicPricePatterns = [
        /(?:سعر|سعره|سعرها|أسعار|ميزانية|ثمن|قيمة|تكلفة)\s*(?:بين|من)\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?\s*(?:الى|إلى|و)\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?/, // Price range with ألف/million (supports "مليون", "مليونان", "مليونين", "ثلاث ملايين", "مائة", "مية", "مئتان", "مئتين")
        /(?:بين|من)\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?\s*(?:الى|إلى|و)\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?\s*(?:دولار|دولر|دولار أميركي|دولار اميركي|دولار أمريكي|دولار امريكي|ليرة|ل\.س|ل\.س\.|ليرة سورية)/, // "بين X و Y" without "سعر" (supports "مليون", "مليونان", "مليونين", "ثلاث ملايين", "مائة", "مية", "مئتان", "مئتين" without numbers)
        /(?:سعر|سعره|سعرها|أسعار|ميزانية|ثمن|قيمة|تكلفة)?\s*(?:بحوالي|بحدود|حوالي|حدود|تقريباً|تقريبا)\s*(?:ال)?\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?\s*(?:دولار|دولر|دولار أميركي|دولار اميركي|دولار أمريكي|دولار امريكي|ليرة|ل.س|ل.س.|ليرة سورية)?/, // Price around/approximately (priceMax = value, priceMin = null) - "سعر" is optional (order matters: ثلاث ملايين before مليونان before مليون before مئتان before مائة)
        /(?:سعر|سعره|سعرها|أسعار|ميزانية|ثمن|قيمة|تكلفة)\s*(?:اقل|أقل|أصغر|اصغر|أدنى|ادنى)\s*(?:من)?\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?/, // Price less than (priceMax) with ألف
        /(?:اقل|أقل|أصغر|اصغر|أدنى|ادنى)\s*(?:من)?\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?\s*(?:دولار|دولر|دولار أميركي|دولار اميركي|دولار أمريكي|دولار امريكي|ليرة|ل\.س|ل\.س\.|ليرة سورية)/, // "اقل من X" without "سعر"
        /(?:سعر|سعره|سعرها|أسعار|ميزانية|ثمن|قيمة|تكلفة)\s*(?:اعلى|أعلى|اكثر|أكثر|أكبر|اكبر|أعظم|اعظم)\s*(?:من)?\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?/, // Price more than (priceMin) with ألف
        /(?:اعلى|أعلى|اكثر|أكثر|أكبر|اكبر|أعظم|اعظم)\s*(?:من)?\s*([٠-٩\d,]+|ثلاث ملايين|ثلاثة ملايين|مليونان|مليونين|مليون|مئتان|مئتين|مائة|مية)?\s*(?:ألف|الف|آلاف|الاف|مليون|مليونان|مليونين|ملايين)?\s*(?:دولار|دولر|دولار أميركي|دولار اميركي|دولار أمريكي|دولار امريكي|ليرة|ل\.س|ل\.س\.|ليرة سورية)/, // "اعلى من X" without "سعر"
        /(?:سعر|سعره|سعرها|أسعار|ميزانية|ثمن|قيمة|تكلفة)\s*(?:بين|من)\s*([٠-٩\d,]+)\s*(?:الى|إلى|و)\s*([٠-٩\d,]+)/, // Price range
        /(?:سعر|سعره|سعرها|أسعار|ميزانية|ثمن|قيمة|تكلفة)\s*(?:اقل|أقل|أصغر|اصغر|أدنى|ادنى)\s*(?:من)?\s*([٠-٩\d,]+)/, // Price less than (priceMax)
        /(?:سعر|سعره|سعرها|أسعار|ميزانية|ثمن|قيمة|تكلفة)\s*(?:اعلى|أعلى|اكثر|أكثر|أكبر|اكبر|أعظم|اعظم)\s*(?:من)?\s*([٠-٩\d,]+)/, // Price more than (priceMin)
        /(?:سعر|سعره|سعرها|أسعار|ميزانية|ثمن|قيمة|تكلفة)\s*([٠-٩\d,]+)\s*(?:دولار|دولر|دولار أميركي|دولار اميركي|دولار أمريكي|دولار امريكي|ليرة|ل.س|ل.س.|ليرة سورية)/, // Direct price with currency
        // Additional patterns for "بحدود" and "بحوالي" without "سعر" (must come after other patterns to avoid false matches)
        /(?:بحوالي|بحدود|حوالي|حدود|تقريباً|تقريبا)\s*(?:ال)?\s*([٠-٩\d,]+)\s*(?:ألف|الف|آلاف|الاف|مليون|مليون|مليونين)?\s*(?:دولار|دولر|دولار أميركي|دولار اميركي|دولار أمريكي|دولار امريكي)/, // "بحدود X الف دولار" without "سعر"
      ];
    
    for (const pattern of arabicPricePatterns) {
      const match = query.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          // Range: "سعر بين X و Y" or "سعر بين X الف و Y الف"
          // Handle "مليون", "مليونان", "مليونين", "ثلاث ملايين", "مائة", "مية", "مئتان", "مئتين" without numbers
          let num1, num2;
          const match1Str = match[1].trim();
          const match2Str = match[2].trim();
          
          // Parse first number
          if (match1Str === 'ثلاث ملايين' || match1Str === 'ثلاثة ملايين' || match1Str.includes('ثلاث ملايين') || match1Str.includes('ثلاثة ملايين')) {
            num1 = 3; // ثلاث ملايين = 3 million
          } else if (match1Str === 'مليونان' || match1Str === 'مليونين' || match1Str.includes('مليونان') || match1Str.includes('مليونين')) {
            num1 = 2; // مليونان/مليونين = 2 million
          } else if (match1Str === 'مليون' || (match1Str.includes('مليون') && !match1Str.includes('مليونان') && !match1Str.includes('مليونين') && !match1Str.includes('ملايين'))) {
            num1 = 1; // مليون = 1 million
          } else if (match1Str === 'مئتان' || match1Str === 'مئتين' || match1Str.includes('مئتان') || match1Str.includes('مئتين')) {
            num1 = 200; // مئتان/مئتين = 200
          } else if (match1Str === 'مائة' || match1Str === 'مية' || match1Str.includes('مائة') || match1Str.includes('مية')) {
            num1 = 100; // مائة/مية = 100
          } else {
            num1 = extractNumber(match1Str.replace(/,/g, ''));
          }
          
          // Parse second number
          if (match2Str === 'ثلاث ملايين' || match2Str === 'ثلاثة ملايين' || match2Str.includes('ثلاث ملايين') || match2Str.includes('ثلاثة ملايين')) {
            num2 = 3; // ثلاث ملايين = 3 million
          } else if (match2Str === 'مليونان' || match2Str === 'مليونين' || match2Str.includes('مليونان') || match2Str.includes('مليونين')) {
            num2 = 2; // مليونان/مليونين = 2 million
          } else if (match2Str === 'مليون' || (match2Str.includes('مليون') && !match2Str.includes('مليونان') && !match2Str.includes('مليونين') && !match2Str.includes('ملايين'))) {
            num2 = 1; // مليون = 1 million
          } else if (match2Str === 'مئتان' || match2Str === 'مئتين' || match2Str.includes('مئتان') || match2Str.includes('مئتين')) {
            num2 = 200; // مئتان/مئتين = 200
          } else if (match2Str === 'مائة' || match2Str === 'مية' || match2Str.includes('مائة') || match2Str.includes('مية')) {
            num2 = 100; // مائة/مية = 100
          } else {
            num2 = extractNumber(match2Str.replace(/,/g, ''));
          }
          
          if (num1 !== null && num2 !== null && num1 > 0 && num2 > 0) {
            // Check if ألف or مليون is mentioned after the numbers
            const matchText = match[0];
            let finalNum1 = num1;
            let finalNum2 = num2;
            
            // Check for million words in the full match text
            if (matchText.includes('مليونين') || matchText.includes('مليونان')) {
              // Handle "مليونين" or "مليونان" (2 million)
              if (matchText.indexOf('مليونين') > matchText.indexOf(match[2]) || matchText.indexOf('مليونان') > matchText.indexOf(match[2])) {
                finalNum1 = num1 * 1000000;
                finalNum2 = 2000000; // مليونين/مليونان = 2 مليون
              } else {
                finalNum1 = 2000000;
                finalNum2 = num2 * 1000000;
              }
            } else if (matchText.includes('ثلاث ملايين') || matchText.includes('ثلاثة ملايين')) {
              // Handle "ثلاث ملايين" (3 million)
              if (matchText.indexOf('ثلاث ملايين') > matchText.indexOf(match[2]) || matchText.indexOf('ثلاثة ملايين') > matchText.indexOf(match[2])) {
                finalNum1 = num1 * 1000000;
                finalNum2 = 3000000; // ثلاث ملايين = 3 مليون
              } else {
                finalNum1 = 3000000;
                finalNum2 = num2 * 1000000;
              }
            } else if (matchText.includes('مليون') || match1Str === 'مليون' || match2Str === 'مليون') {
              finalNum1 = num1 * 1000000;
              finalNum2 = num2 * 1000000;
            } else if (matchText.includes('ألف') || matchText.includes('الف')) {
              // Handle "مائة", "مية", "مئتان", "مئتين" with "ألف"
              if (match1Str === 'مئتان' || match1Str === 'مئتين') {
                finalNum1 = 200 * 1000; // مئتان ألف = 200,000
              } else if (match1Str === 'مائة' || match1Str === 'مية') {
                finalNum1 = 100 * 1000; // مائة ألف = 100,000
              } else {
                finalNum1 = num1 * 1000;
              }
              
              if (match2Str === 'مئتان' || match2Str === 'مئتين') {
                finalNum2 = 200 * 1000; // مئتان ألف = 200,000
              } else if (match2Str === 'مائة' || match2Str === 'مية') {
                finalNum2 = 100 * 1000; // مائة ألف = 100,000
              } else {
                finalNum2 = num2 * 1000;
              }
            }
            
            extractedParams.priceMin = Math.min(finalNum1, finalNum2);
            extractedParams.priceMax = Math.max(finalNum1, finalNum2);
            logger.info(`✅ Found Arabic price range: ${extractedParams.priceMin} - ${extractedParams.priceMax}`);
            break;
          }
        } else if (match[1]) {
          // Handle "مليون", "مليونان", "مليونين", "ثلاث ملايين", "مائة", "مية", "مئتان", "مئتين" without numbers
          const matchStr = match[1].trim();
          let num;
          if (matchStr === 'ثلاث ملايين' || matchStr === 'ثلاثة ملايين' || matchStr.includes('ثلاث ملايين') || matchStr.includes('ثلاثة ملايين')) {
            num = 3; // ثلاث ملايين = 3 million
          } else if (matchStr === 'مليونان' || matchStr === 'مليونين' || matchStr.includes('مليونان') || matchStr.includes('مليونين')) {
            num = 2; // مليونان/مليونين = 2 million
          } else if (matchStr === 'مليون' || (matchStr.includes('مليون') && !matchStr.includes('مليونان') && !matchStr.includes('مليونين') && !matchStr.includes('ملايين'))) {
            num = 1; // مليون = 1 million
          } else if (matchStr === 'مئتان' || matchStr === 'مئتين' || matchStr.includes('مئتان') || matchStr.includes('مئتين')) {
            num = 200; // مئتان/مئتين = 200
          } else if (matchStr === 'مائة' || matchStr === 'مية' || matchStr.includes('مائة') || matchStr.includes('مية')) {
            num = 100; // مائة/مية = 100
          } else {
            num = extractNumber(matchStr.replace(/,/g, ''));
          }
          
          if (num !== null && num > 0) {
            // Check if ألف or مليون is mentioned after the number
            const matchText = match[0];
            let finalNum = num;
            
            // Check for specific million words first (before generic "مليون")
            if (matchText.includes('ثلاث ملايين') || matchText.includes('ثلاثة ملايين') || matchStr === 'ثلاث ملايين' || matchStr === 'ثلاثة ملايين') {
              finalNum = 3000000; // ثلاث ملايين = 3 مليون
            } else if (matchText.includes('مليونين') || matchText.includes('مليونان') || matchStr === 'مليونين' || matchStr === 'مليونان') {
              finalNum = 2000000; // مليونين/مليونان = 2 مليون
            } else if (matchText.includes('مليون') || matchStr === 'مليون') {
              finalNum = num * 1000000;
            } else if (matchText.includes('ألف') || matchText.includes('الف')) {
              finalNum = num * 1000;
            }
            
            // Check for "بحوالي" or "بحدود" (around/approximately)
            if (pattern.source.includes('بحوالي|بحدود|حوالي|حدود|تقريباً|تقريبا')) {
              // "سعر بحوالي X" = priceMax = X, priceMin = null (any price less than or equal to X)
              // This means "around X" = max price is X, but can be less
              extractedParams.priceMax = finalNum;
              extractedParams.priceMin = null; // No minimum, allows any price up to the max
              logger.info(`✅ Found Arabic price around: max ${extractedParams.priceMax} (around ${finalNum}, can be less)`);
            } else if (pattern.source.includes('اقل|أقل|أصغر|اصغر')) {
              // "سعر اقل من X" = priceMax
              extractedParams.priceMax = finalNum;
              logger.info(`✅ Found Arabic price max: ${extractedParams.priceMax}`);
            } else if (pattern.source.includes('اعلى|أعلى|اكثر|أكثر|أكبر|اكبر')) {
              // "سعر اعلى من X" = priceMin
              extractedParams.priceMin = finalNum;
              logger.info(`✅ Found Arabic price min: ${extractedParams.priceMin}`);
            }
            break;
          }
        }
      }
    }

    // Extract price range - English patterns
    // IMPORTANT: Check for SIZE patterns FIRST to avoid matching "size between X and Y" as price
    // Check for "size between X and Y" first (before price patterns)
    const sizeBetweenPattern = /(?:size|area|sqft|sq ft|square feet|square foot)\s+between\s+(\d+[,\d]*)\s+(?:and|to|-)\s+(\d+[,\d]*)\s*(?:square meters?|square metres?|sqm|m²|meters?|metres?)?/i;
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
    
    // Check for "price between X and Y" (but NOT if it's a size pattern)
    const priceBetweenPattern = /(?:price|cost)?\s+between\s+(\d+[,\d]*)\s+(?:thousand|k|K)?\s*(?:and|to|-)\s+(\d+[,\d]*)\s*(?:thousand|k|K)?/i;
    const priceBetweenMatch = normalizedQuery.match(priceBetweenPattern);
    // Skip if this matches a size pattern
    if (priceBetweenMatch && !sizeBetweenMatch && !extractedParams.priceMin && !extractedParams.priceMax) {
      let num1 = parseInt(priceBetweenMatch[1].replace(/,/g, ''));
      let num2 = parseInt(priceBetweenMatch[2].replace(/,/g, ''));
      
      // Check if "thousand" or "k" is mentioned
      const matchText = priceBetweenMatch[0];
      if (matchText.match(/\b(thousand|k|K)\b/i)) {
        num1 = num1 * 1000;
        num2 = num2 * 1000;
      }
      if (!isNaN(num1) && !isNaN(num2) && num1 > 0 && num2 > 0) {
        extractedParams.priceMin = Math.min(num1, num2);
        extractedParams.priceMax = Math.max(num1, num2);
        logger.info(`✅ Found English price range: ${extractedParams.priceMin} - ${extractedParams.priceMax}`);
      }
    }
    
    const pricePatterns = [
      /(?:price|cost)?\s*(?:around|about|approximately)\s+(\d+[,\d]*)\s*(?:thousand|k|K)?\s*(?:usd|dollar|dollars)?/i, // "around X" or "approximately X" - priceMax = X, priceMin = null
      /(?:price|cost)\s+(?:under|below|less than|max|maximum)\s+(\d+[,\d]*)\s*(?:thousand|k|K)?/i, // "price under X" - check this first
      /(?:price|cost)\s+(?:over|above|more than|min|minimum|at least)\s+(\d+[,\d]*)\s*(?:thousand|k|K)?/i, // "price over X" - check this first
      /(?:under|below|less than|max|maximum)\s*\$?\s*(\d+[,\d]*)\s*(?:thousand|k|K)?\s*(?:usd|dollar|dollars)?/i,
      /(?:over|above|more than|min|minimum|at least)\s*\$?\s*(\d+[,\d]*)\s*(?:thousand|k|K)?\s*(?:usd|dollar|dollars)?/i,
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
        if (beforeMatch.match(/\b(size|area|sqft|sq ft|square feet|square foot)\s+(?:under|below|less than|over|above|more than|greater than|between)\s*$/i)) {
          continue; // Skip this match, it's likely a size pattern
        }
        // Also skip if "square meters" or similar appears after the match
        const afterMatch = normalizedQuery.substring(match.index + match[0].length, match.index + match[0].length + 30);
        if (afterMatch.match(/^\s*(?:square meters?|square metres?|sqm|m²|meters?|metres?)/i)) {
          continue; // Skip this match, it's a size pattern
        }
        
        // Check if "thousand" or "k" is mentioned
        const matchText = match[0];
        const hasThousand = matchText.match(/\b(thousand|k|K)\b/i);
        
        if (match[1] && match[2]) {
          // Range
          let num1 = parseInt(match[1].replace(/,/g, ''));
          let num2 = parseInt(match[2].replace(/,/g, ''));
          if (hasThousand) {
            num1 = num1 * 1000;
            num2 = num2 * 1000;
          }
          extractedParams.priceMin = Math.min(num1, num2);
          extractedParams.priceMax = Math.max(num1, num2);
        } else if (pattern.source.includes('around|about|approximately')) {
          // "around X" or "approximately X" = priceMax = X, priceMin = null
          let num = parseInt(match[1].replace(/,/g, ''));
          if (hasThousand) {
            num = num * 1000;
          }
          extractedParams.priceMax = num;
          extractedParams.priceMin = null; // No minimum, allows any price up to the max
        } else if (normalizedQuery.match(/(?:price|cost)\s+(?:under|below|less than|max|maximum)/i)) {
          // "price under X" = priceMax
          if (!extractedParams.priceMax) {
            let num = parseInt(match[1].replace(/,/g, ''));
            if (hasThousand) {
              num = num * 1000;
            }
            extractedParams.priceMax = num;
          }
        } else if (normalizedQuery.match(/(?:price|cost)\s+(?:over|above|more than|min|minimum|at least)/i)) {
          // "price over X" = priceMin
          if (!extractedParams.priceMin) {
            let num = parseInt(match[1].replace(/,/g, ''));
            if (hasThousand) {
              num = num * 1000;
            }
            extractedParams.priceMin = num;
          }
        } else if (normalizedQuery.match(/\b(under|below|less than|max|maximum)\b/) && !normalizedQuery.match(/\b(size|area)\s+(?:under|below|less than)/i)) {
          // Maximum (but not if it's part of a size pattern)
          if (!extractedParams.priceMax) { // Don't override if already set
            let num = parseInt(match[1].replace(/,/g, ''));
            if (hasThousand) {
              num = num * 1000;
            }
            extractedParams.priceMax = num;
          }
        } else if (normalizedQuery.match(/\b(over|above|more than|min|minimum|at least)\b/) && !normalizedQuery.match(/\b(size|area)\s+(?:over|above|more than|greater than)/i)) {
          // Minimum (but not if it's part of a size pattern)
          if (!extractedParams.priceMin) { // Don't override if already set
            let num = parseInt(match[1].replace(/,/g, ''));
            if (hasThousand) {
              num = num * 1000;
            }
            extractedParams.priceMin = num;
          }
        } else {
          // Single price (use as max) - but only if not part of size pattern
          if (!normalizedQuery.match(/\b(size|area)\s+(?:under|below|less than|over|above|more than|greater than)\s*(\d+)/i) && !extractedParams.priceMax) {
            let num = parseInt(match[1].replace(/,/g, ''));
            // Check for "thousand" in the query (not just in the match)
            if (hasThousand || normalizedQuery.match(/\b(\d+)\s*(?:thousand|k|K)\s*(?:usd|dollar|dollars)?/i)) {
              num = num * 1000;
            }
            extractedParams.priceMax = num;
          }
        }
        break;
      }
    }

    // Extract price from Arabic (خمسين الف دولار = 50,000 USD)
    if (extractedParams.priceMax === null && extractedParams.priceMin === null) {
      // Arabic number words to numbers
      const arabicNumbers = {
        'مليون': 1000000, 'مليون': 1000000,
        'خمسين ألف': 50000, 'خمسين الف': 50000, 'خمسين': 50,
        'أربعين ألف': 40000, 'أربعين الف': 40000, 'أربعين': 40,
        'ثلاثين ألف': 30000, 'ثلاثين الف': 30000, 'ثلاثين': 30,
        'عشرين ألف': 20000, 'عشرين الف': 20000, 'عشرين': 20,
        'عشرة آلاف': 10000, 'عشرة الاف': 10000, 'عشرة': 10,
        'مئة ألف': 100000, 'مائة ألف': 100000, 'مئة الف': 100000, 'مائة الف': 100000,
        'مئتي ألف': 200000, 'مائتي الف': 200000,
        'ثلاثمئة ألف': 300000, 'ثلاثمائة الف': 300000,
        'أربعمئة ألف': 400000, 'أربعمائة الف': 400000,
        'خمسمئة ألف': 500000, 'خمسمائة الف': 500000
      };

      // Check for Arabic price patterns
      // Check for dollar variations: دولار، دولر، دولار أميركي، دولار اميركي
      const dollarVariations = ['دولار', 'دولر', 'دولار أميركي', 'دولار اميركي', 'دولار أمريكي', 'دولار امريكي', 'دولار أمريكاني', 'دولار امريكاني'];
      const hasDollar = dollarVariations.some(variation => query.includes(variation));
      const hasLira = query.includes('ليرة') || query.includes('ل.س') || query.includes('ل.س.') || query.includes('ليرة سورية');
      
      for (const [arabicWord, value] of Object.entries(arabicNumbers)) {
        if (query.includes(arabicWord) && (hasDollar || hasLira || query.includes('ميزانية') || query.includes('سعر'))) {
          extractedParams.priceMax = value;
          break;
        }
      }

      // Check for dollar patterns FIRST (e.g., "مليون دولار", "500 الف دولر", "دولار أميركي")
      // This must come before generic patterns to avoid matching "2 غرف" as price
      const dollarPricePattern = /(\d+[,\d]*)\s*(?:ألف|الف|آلاف|الاف|مليون|مليون)?\s*(?:دولار|دولر|دولار أميركي|دولار اميركي|دولار أمريكي|دولار امريكي|دولار أمريكاني|دولار امريكاني)/;
      const dollarPriceMatch = query.match(dollarPricePattern);
      if (dollarPriceMatch && !extractedParams.priceMax) {
        const num = parseInt(dollarPriceMatch[1].replace(/,/g, ''));
        const matchText = dollarPriceMatch[0];
        if (matchText.includes('مليون') || matchText.includes('مليون')) {
          extractedParams.priceMax = num * 1000000;
        } else if (matchText.includes('ألف') || matchText.includes('الف')) {
          extractedParams.priceMax = num * 1000;
        } else {
          extractedParams.priceMax = num;
        }
      }
      
      // Check for "ليرة" or "ل.س" patterns (e.g., "مليون ليرة", "500 الف ليرة")
      const liraPricePattern = /(\d+[,\d]*)\s*(?:ألف|الف|آلاف|الاف|مليون|مليون)?\s*(?:ليرة|ل.س|ل.س.|ليرة سورية)/;
      const liraPriceMatch = query.match(liraPricePattern);
      if (liraPriceMatch && !extractedParams.priceMax) {
        const num = parseInt(liraPriceMatch[1].replace(/,/g, ''));
        const matchText = liraPriceMatch[0];
        if (matchText.includes('مليون') || matchText.includes('مليون')) {
          extractedParams.priceMax = num * 1000000;
        } else if (matchText.includes('ألف') || matchText.includes('الف')) {
          extractedParams.priceMax = num * 1000;
        } else {
          extractedParams.priceMax = num;
        }
      }
      
      // Also check for numeric patterns with Arabic words (e.g., "50 الف دولار", "50 الف دولر", "50 الف ليرة")
      // This is a fallback for patterns without explicit currency
      const arabicPricePattern = /(\d+[,\d]*)\s*(?:ألف|الف|آلاف|الاف|مليون|مليون)\s*(?:ميزانية|سعر)?/;
      const arabicPriceMatch = query.match(arabicPricePattern);
      if (arabicPriceMatch && !extractedParams.priceMax) {
        // Only match if it's clearly a price (has "ألف" or "مليون" and price keywords)
        const matchText = arabicPriceMatch[0];
        if (matchText.includes('ميزانية') || matchText.includes('سعر') || 
            (matchText.includes('ألف') || matchText.includes('الف') || matchText.includes('مليون'))) {
          const num = parseInt(arabicPriceMatch[1].replace(/,/g, ''));
          if (matchText.includes('مليون') || matchText.includes('مليون')) {
            extractedParams.priceMax = num * 1000000;
          } else if (matchText.includes('ألف') || matchText.includes('الف')) {
            extractedParams.priceMax = num * 1000;
          } else {
            extractedParams.priceMax = num;
          }
        }
      }
    }

    // Extract size - Arabic patterns first
    // Arabic: "مساحة اكبر من" = size greater than (sizeMin), "مساحة اقل من" = size less than (sizeMax)
    // IMPORTANT: Check comparison patterns FIRST (اكبر من، اقل من) before direct size patterns
    
    // First check for comparison patterns (اكبر من، اقل من) - these must be checked BEFORE direct size
    const sizeComparisonPatterns = [
      /(?:مساحة|المساحة|حجم|المتر|متر|متر مربع|م²|متر²)\s*(?:اكبر|أكبر|أكثر|اكثر|أعظم|اعظم)\s*(?:من)?\s*([٠-٩\d,]+)/, // Size greater than (sizeMin)
      /(?:مساحة|المساحة|حجم|المتر|متر|متر مربع|م²|متر²)\s*(?:اقل|أقل|أصغر|اصغر|أدنى|ادنى)\s*(?:من)?\s*([٠-٩\d,]+)/, // Size less than (sizeMax)
      /(?:مساحة|المساحة|حجم|المتر|متر|متر مربع|م²|متر²)\s*(?:بين|من)\s*([٠-٩\d,]+)\s*(?:الى|إلى|و)\s*([٠-٩\d,]+)/, // Size range
    ];
    
    let sizeFound = false;
    for (const pattern of sizeComparisonPatterns) {
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
            sizeFound = true;
            break;
          }
        } else if (match[1]) {
          const num = extractNumber(match[1].replace(/,/g, ''));
          if (num !== null && num > 0) {
            if (pattern.source.includes('اكبر|أكبر|أكثر|اكثر')) {
              // "مساحة اكبر من X" = sizeMin
              extractedParams.sizeMin = num;
              logger.info(`✅ Found Arabic size min: ${extractedParams.sizeMin}`);
              sizeFound = true;
              break;
            } else if (pattern.source.includes('اقل|أقل|أصغر|اصغر')) {
              // "مساحة اقل من X" = sizeMax
              extractedParams.sizeMax = num;
              logger.info(`✅ Found Arabic size max: ${extractedParams.sizeMax}`);
              sizeFound = true;
              break;
            }
          }
        }
      }
    }
    
    // Only check for direct size patterns if no comparison pattern was found
    if (!sizeFound) {
      const directSizePatterns = [
        /(?:مساحة|المساحة|حجم)\s*([٠-٩\d,]+)\s*(?:متر|متر مربع|م²|متر²)/, // Direct size with unit: "مساحة 100 متر"
        /([٠-٩\d,]+)\s*(?:متر|متر مربع|م²|متر²)(?!\s*(?:اكبر|أكبر|اقل|أقل|اكثر|أكثر|اصغر|أصغر|من))/, // Direct size: "100 متر" but NOT if followed by comparison words
      ];
      
      for (const pattern of directSizePatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          const num = extractNumber(match[1].replace(/,/g, ''));
          if (num !== null && num > 0) {
            // Direct size: "مساحة 100 متر" or "100 متر"
            extractedParams.sizeMin = num;
            extractedParams.sizeMax = num;
            logger.info(`✅ Found Arabic direct size: ${extractedParams.sizeMin}`);
            break;
          }
        }
      }
    }

    // Extract size - English patterns
    // NOTE: "size between X and Y" is already checked above (before price patterns)
    // Only check for other size patterns here if sizeBetweenMatch was not found
    if (!sizeBetweenMatch) {
      // Check for "size greater than/over/above X" and "size less than/under/below X"
      if (!extractedParams.sizeMin && !extractedParams.sizeMax) {
      const sizeGreaterPattern = /(?:size|area|sqft|sq ft|square feet|square foot)\s+(?:greater than|over|above|more than)\s+(\d+[,\d]*)\s*(?:square meters?|square metres?|sqm|m²|meters?|metres?)?/i;
      const sizeLessPattern = /(?:size|area|sqft|sq ft|square feet|square foot)\s+(?:less than|under|below|smaller than)\s+(\d+[,\d]*)\s*(?:square meters?|square metres?|sqm|m²|meters?|metres?)?/i;
      
      const sizeGreaterMatch = normalizedQuery.match(sizeGreaterPattern);
      const sizeLessMatch = normalizedQuery.match(sizeLessPattern);
      
      if (sizeGreaterMatch) {
        const num = parseInt(sizeGreaterMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          extractedParams.sizeMin = num;
          extractedParams.sizeMax = null; // Clear sizeMax for "more than"
          logger.info(`✅ Found English size min: ${extractedParams.sizeMin}`);
        }
      }
      
      if (sizeLessMatch) {
        const num = parseInt(sizeLessMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          extractedParams.sizeMax = num;
          extractedParams.sizeMin = null; // Clear sizeMin for "less than"
          logger.info(`✅ Found English size max: ${extractedParams.sizeMax}`);
        }
      }
    }
    
      const sizePatterns = [
        /(?:size|area|sqft|sq ft|square feet|square foot)\s*(?:is|of|around|about)?\s*(\d+[,\d]*)\s*(?:square meters?|square metres?|sqm|m²|meters?|metres?)/i,
        /(\d+[,\d]*)\s*(?:sqft|sq ft|square feet|square foot|m2|square meter|square meters?|square metres?|sqm|m²|meters?|metres?)/i
      ];

      for (const pattern of sizePatterns) {
        const match = normalizedQuery.match(pattern);
        if (match) {
          const size = parseInt(match[1].replace(/,/g, ''));
          if (!isNaN(size) && size > 0) {
            // Only set if not already set by comparison patterns
            if (!extractedParams.sizeMin && !extractedParams.sizeMax) {
              extractedParams.sizeMin = size;
              extractedParams.sizeMax = size;
            }
            break;
          }
        }
      }
    } // End of if (!sizeBetweenMatch)

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
    
    // Extract furnished/unfurnished from Arabic
    // IMPORTANT: Check unfurnished FIRST (longer phrases) to avoid matching "مفروش" in "غير مفروش"
    if (extractedParams.furnished === null) {
      // Unfurnished variations (check these FIRST to avoid partial matches)
      if (query.includes('غير مفروش') || query.includes('غير مفروشة') ||
          query.includes('غير مجهز') || query.includes('غير مجهزة') ||
          query.includes('غير مكتمل الأثاث') || query.includes('غير مكتمل الاثاث') ||
          query.includes('غير مكتمل أثاث') || query.includes('غير مكتمل اثاث') ||
          query.includes('بدون أثاث') || query.includes('بدون اثاث') ||
          query.includes('بلا أثاث') || query.includes('بلا اثاث') ||
          query.includes('خالي') || query.includes('خالية') ||
          query.includes('فارغ') || query.includes('فارغة')) {
        extractedParams.furnished = false;
        logger.info('✅ Found unfurnished from Arabic query');
      }
      // Furnished variations (check after unfurnished to avoid conflicts)
      else if (query.includes('مفروش') || query.includes('مفروشة') || 
          query.includes('مجهز') || query.includes('مجهزة') ||
          query.includes('مع أثاث') || query.includes('مع اثاث') ||
          query.includes('بأثاث') || query.includes('باثاث') ||
          query.includes('مع الأثاث') || query.includes('مع الاثاث') ||
          query.includes('مكتمل الأثاث') || query.includes('مكتمل الاثاث') ||
          query.includes('مكتمل أثاث') || query.includes('مكتمل اثاث')) {
        extractedParams.furnished = true;
        logger.info('✅ Found furnished from Arabic query');
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
    
    // Extract garages from Arabic
    if (extractedParams.garages === null) {
      if (query.includes('كراج') || query.includes('جراج') ||
          query.includes('كراجات') || query.includes('جراجات') ||
          query.includes('موقف سيارات') || query.includes('مواقف سيارات') ||
          query.includes('موقف للسيارات') || query.includes('مواقف للسيارات') ||
          query.includes('مكان للسيارة') || query.includes('مكان للسيارات') ||
          query.includes('مكان سيارات') || query.includes('أماكن سيارات')) {
        extractedParams.garages = true;
        logger.info('✅ Found garages from Arabic query');
      }
    }

    // Extract neighborhood (if mentioned) - English
    const neighborhoodPattern = /(?:in|at|near|neighborhood|neighbourhood|area)\s+([A-Za-z\s]+?)(?:\s|,|$)/i;
    const neighborhoodMatch = query.match(neighborhoodPattern);
    if (neighborhoodMatch && neighborhoodMatch[1]) {
      const potentialNeighborhood = neighborhoodMatch[1].trim();
      // CRITICAL: Don't set "Syria" as neighborhood - it's a country, not a neighborhood
      // When "Syria" is mentioned, we want to show all results from all cities
      if (potentialNeighborhood.toLowerCase() === 'syria') {
        // Skip "Syria" - don't set it as neighborhood
      } else {
        // Don't set if it's a city name
        const isCity = SYRIAN_CITIES.some(c => 
          c.en.toLowerCase() === potentialNeighborhood.toLowerCase()
        );
        if (!isCity && potentialNeighborhood.length > 2) {
          extractedParams.neighborhood = potentialNeighborhood;
        }
      }
    }

    // Extract neighborhood from Arabic (حي العزيزية = Al-Aziziyah neighborhood)
    if (!extractedParams.neighborhood) {
      // Check for "حي" pattern
      if (query.includes('حي')) {
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
      // Also check for other Arabic neighborhood patterns
      // Check for "في" (in) or "منطقة" (area) or "منطقه" patterns
      // IMPORTANT: Ignore location descriptor words: "مدينة" (city), "بلدة" (town), "قرية" (village), 
      // "ضيعة" (village), "ناحية" (district), "ريف" (countryside) when they come before a city/neighborhood name
      const locationDescriptors = ['مدينة', 'مدينه', 'بلدة', 'بلده', 'قرية', 'قريه', 'ضيعة', 'ضيعه', 'ناحية', 'ناحيه', 'ريف'];
      const arabicLocationPatterns = [
        /(?:في|منطقة|منطقه|منطق|منطقة)\s+(?:مدينة|مدينه|بلدة|بلده|قرية|قريه|ضيعة|ضيعه|ناحية|ناحيه|ريف\s+)?([^\s،,]+)/, // Support "في مدينة X", "في بلدة X", etc.
        /(?:منطقة|منطقه)\s+([^\s،,]+)/
      ];
      for (const pattern of arabicLocationPatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          const potentialNeighborhood = match[1].trim();
          // Ignore location descriptor words - they're not neighborhoods
          if (locationDescriptors.includes(potentialNeighborhood)) {
            continue; // Skip location descriptors - they're just descriptive words
          }
          // CRITICAL: Don't set "سوريا" or "Syria" as neighborhood - it's a country, not a neighborhood
          // When "سوريا" or "Syria" is mentioned, we want to show all results from all cities
          if (potentialNeighborhood === 'سوريا' || potentialNeighborhood === 'سورية' || 
              potentialNeighborhood.toLowerCase() === 'syria') {
            continue; // Skip "سوريا"/"Syria" - don't set it as neighborhood
          }
          // Don't set if it's a city name or part of a city name
          // Check if potentialNeighborhood is part of any city name in Arabic
          const isCity = SYRIAN_CITIES.some(c => {
            // Check if any Arabic city name contains this potential neighborhood
            return c.ar.some(arName => {
              // Check exact match
              if (arName === potentialNeighborhood) return true;
              // Check if potentialNeighborhood is part of city name (e.g., "دير" is part of "دير الزور")
              if (arName.includes(potentialNeighborhood) && potentialNeighborhood.length >= 3) {
                // Make sure it's not just a common word
                const cityNameNoSpaces = arName.replace(/\s+/g, '');
                const potentialNoSpaces = potentialNeighborhood.replace(/\s+/g, '');
                return cityNameNoSpaces.includes(potentialNoSpaces);
              }
              return false;
            });
          });
          
          // Also check if we already extracted a city and this neighborhood is part of that city name
          if (extractedParams.city) {
            const cityInfo = SYRIAN_CITIES.find(c => c.en === extractedParams.city);
            if (cityInfo) {
              const isPartOfCityName = cityInfo.ar.some(arName => {
                const arNameNoSpaces = arName.replace(/\s+/g, '');
                const potentialNoSpaces = potentialNeighborhood.replace(/\s+/g, '');
                return arNameNoSpaces.includes(potentialNoSpaces) && potentialNoSpaces.length >= 3;
              });
              if (isPartOfCityName) {
                continue; // Skip - it's part of the city name, not a neighborhood
              }
            }
          }
          
          if (!isCity && potentialNeighborhood.length > 2) {
            extractedParams.neighborhood = potentialNeighborhood;
            break;
          }
        }
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

