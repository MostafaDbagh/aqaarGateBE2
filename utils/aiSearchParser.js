const OpenAI = require('openai');
const logger = require('./logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available property types in the system
const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Villa/farms',
  'Office',
  'Land',
  'Commercial',
  'Holiday Home',
  'Building'
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

// Syrian provinces/cities
const SYRIAN_CITIES = [
  'Aleppo',
  'As-Suwayda',
  'Damascus',
  'Daraa',
  'Deir ez-Zur',
  'Hama',
  'Homs',
  'Idlib',
  'Latakia',
  'Raqqah',
  'Tartus'
];

/**
 * Map natural language amenities to system amenities
 */
const mapAmenityToSystem = (amenityText) => {
  const lowerText = amenityText.toLowerCase();
  
  // View-related mappings
  if (lowerText.includes('view') || lowerText.includes('nice view') || lowerText.includes('beautiful view')) {
    return ['View']; // We'll handle view as a keyword search
  }
  if (lowerText.includes('sea view') || lowerText.includes('ocean view')) {
    return ['Sea view'];
  }
  if (lowerText.includes('mountain view')) {
    return ['Mountain view'];
  }
  if (lowerText.includes('open view')) {
    return ['Open view'];
  }
  
  // Other amenity mappings
  const amenityMap = {
    'parking': 'Parking',
    'garage': 'Parking',
    'elevator': 'Lift',
    'lift': 'Lift',
    'air conditioning': 'A/C',
    'ac': 'A/C',
    'gym': 'Gym',
    'fitness': 'Gym',
    'pool': 'Swimming pool',
    'swimming': 'Swimming pool',
    'security': 'Security cameras',
    'camera': 'Security cameras',
    'balcony': 'Balcony',
    'internet': 'Basic internet',
    'wifi': 'Basic internet',
    'fiber': 'Fiber internet',
    'solar': 'Solar energy system'
  };
  
  for (const [key, value] of Object.entries(amenityMap)) {
    if (lowerText.includes(key)) {
      return [value];
    }
  }
  
  return [];
};

/**
 * Parse natural language query using OpenAI
 * @param {string} query - User's natural language query
 * @returns {Promise<Object>} Extracted search parameters
 */
const parseAIQuery = async (query) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured');
      throw new Error('AI search is not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query is required and must be a non-empty string');
    }

    // Limit query length to prevent abuse
    if (query.length > 500) {
      throw new Error('Query is too long. Please keep it under 500 characters.');
    }

    const systemPrompt = `You are an AI assistant that helps extract property search parameters from natural language queries.

Available Property Types: ${PROPERTY_TYPES.join(', ')}
Available Amenities: ${AMENITIES.join(', ')}
Available Cities: ${SYRIAN_CITIES.join(', ')}

IMPORTANT PROPERTY TYPE MAPPING:
- "villa", "villas", "farm", "farms", "frams" (typo) (English) → "Villa/farms"
- "فيلا", "فيلات", "فلل", "مزرعة", "مزارع" (Arabic) → "Villa/farms"
All these terms mean the same thing and should map to "Villa/farms"

- "apartment", "apartments", "apt", "apts", "flat", "flats", "unit", "units", "residential unit", "residential units", "condo", "condos", "condominium", "condominiums", "residence", "residences", "dwelling", "dwellings" (English) → "Apartment"
- "شقة", "شقق", "شقة سكنية", "شقق سكنية", "عقار سكني", "عقارات سكنية", "وحدة سكنية", "وحدات سكنية", "سكن", "مساكن", "منزل", "منازل", "بيت", "بيوت", "مسكن", "مساكن", "سكني", "سكنية" (Arabic) → "Apartment"
CRITICAL: "بيت" or "منزل" alone (without holiday/tourist context) → "Apartment", NOT "Holiday Home"

- "house", "houses", "residential house", "residential houses", "family house", "family houses", "townhouse", "townhouses" (English) → "House"
- "منزل", "منازل", "بيت", "بيوت" (when context suggests standalone house, not apartment) (Arabic) → "House"

- "office", "offices", "business office", "business offices", "workspace", "workspaces", "workplace", "workplaces", "professional office", "professional offices", "office space", "office spaces" (English) → "Office"
- "مكتب", "مكاتب", "مكتب تجاري", "مكاتب تجارية", "مكتب عمل", "مكاتب عمل", "مساحة مكتبية", "مساحات مكتبية", "مكتب إداري", "مكاتب إدارية", "مكتب مهني", "مكاتب مهنية" (Arabic) → "Office"

- "commercial", "commercial property", "commercial properties", "shop", "shops", "store", "stores", "retail", "retail space", "retail spaces", "business", "businesses", "business space", "business spaces", "storefront", "storefronts", "marketplace", "marketplaces", "mall", "malls", "boutique", "boutiques", "showroom", "showrooms" (English) → "Commercial"
- "تجاري", "تجارية", "محل", "محلات", "متجر", "متاجر", "محل تجاري", "محلات تجارية", "متجر تجاري", "متاجر تجارية", "محل بيع", "محلات بيع", "محل إيجار", "محلات إيجار", "مساحة تجارية", "مساحات تجارية", "عقار تجاري", "عقارات تجارية", "مول", "مولات", "سوق", "أسواق", "بوتيك", "بوتيكات", "معرض", "معارض" (Arabic) → "Commercial"

- "land", "lands", "plot", "plots", "piece of land", "parcel", "parcels", "lot", "lots", "terrain", "terrains", "acre", "acres", "field", "fields", "ground", "grounds", "estate", "estates", "land plot", "land plots", "building plot", "building plots", "construction land", "construction lands" (English) → "Land"
- "أرض", "أراضي", "ارض", "اراضي", "قطعة أرض", "قطعة ارض", "قطعة الأرض", "قطعة الارض", "قطعة", "قطع", "حقل", "حقول", "عقار", "عقارات", "مساحة", "مساحات", "قطعة أرضية", "قطعة ارضية", "أرض سكنية", "ارض سكنية", "أرض زراعية", "ارض زراعية", "أرض تجارية", "ارض تجارية", "أرض بناء", "ارض بناء", "أرض للبناء", "ارض للبناء", "قطعة بناء", "قطع بناء" (Arabic) → "Land"
All these terms mean land/plot and should map to "Land"

- "holiday home", "holiday homes", "vacation home", "vacation homes", "short-term rental", "short term rental", "daily rental", "weekly rental", "tourist house", "tourist houses", "rental house", "rental houses", "vacation rental", "vacation rentals", "holiday rental", "holiday rentals", "temporary rental", "temporary rentals" (English) → "Holiday Home"
- "بيوت عطلات", "بيوت عطلة", "بيت عطلة", "بيت عطلات", "بيت اجار قصير", "بيت إيجار قصير", "بيت إيجار يومي", "بيت اجار يومي", "بيت إيجار أسبوعي", "بيت اجار اسبوعي", "بيت سياحي", "بيوت سياحية", "منزل سياحي", "منازل سياحية", "فيلا سياحية", "فيلات سياحية", "بيت للإيجار اليومي", "بيت للايجار اليومي", "بيت للإيجار الأسبوعي", "بيت للايجار الاسبوعي", "بيت للإيجار القصير", "بيت للايجار القصير", "إيجار قصير", "ايجار قصير", "إيجار يومي", "ايجار يومي", "إيجار أسبوعي", "ايجار اسبوعي" (Arabic) → "Holiday Home"
CRITICAL: "بيت" or "منزل" alone (without holiday/tourist context) → "Apartment", NOT "Holiday Home"

- "building", "buildings", "whole building", "entire building", "full building", "complete building", "multi-story building", "multi-storey building", "apartment building", "residential building", "tower", "towers", "block", "blocks" (English) → "Building"
- "بناء كامل", "بناء كامله", "مبنى", "مباني", "عمارة", "عمارات", "برج", "أبراج", "مبنى سكني", "مباني سكنية", "عمارة سكنية", "عمارات سكنية", "بناء للبيع", "بناء للإيجار", "بناء للايجار" (Arabic) → "Building"
CRITICAL: "building plot", "construction land", "أرض بناء", "قطعة بناء" → "Land", NOT "Building"
Only when combined with "عطلة", "عطلات", "سياحي", "إيجار قصير", "إيجار يومي", "إيجار أسبوعي" → "Holiday Home"

Your task is to extract structured search parameters from the user's query. Return ONLY a valid JSON object with the following structure:
{
  "propertyType": "Apartment" | "Villa" | "Villa/farms" | "Office" | "Land" | "Commercial" | "Holiday Home" | "Building" | null,
  "bedrooms": number | null,
  "bathrooms": number | null,
  "sizeMin": number | null,
  "sizeMax": number | null,
  "priceMin": number | null,
  "priceMax": number | null,
  "status": "rent" | "sale" | null,
  "city": string | null,
  "neighborhood": string | null,
  "amenities": string[],
  "furnished": boolean | null,
  "garages": boolean | null,
  "keywords": string[],
  "viewType": "sea view" | "mountain view" | "open view" | null
}

Rules:
1. Extract numbers for bedrooms, bathrooms, size, and price from the query
2. If user says "room" or "rooms", it usually means bedrooms
3. If user mentions "bathroom" or "bath", extract as bathrooms
4. For property type, match to one of the available types (case-insensitive)
   - CRITICAL: "villa", "villas", "farm", "farms" (English) OR "فيلا", "فيلات", "فلل", "مزرعة", "مزارع" (Arabic) → MUST map to "Villa/farms"
   - CRITICAL: "land", "lands", "plot", "plots", "piece of land", "parcel", "parcels", "lot", "lots", "terrain", "terrains", "acre", "acres", "field", "fields", "ground", "grounds", "estate", "estates" (English) OR "أرض", "أراضي", "ارض", "اراضي", "قطعة أرض", "قطعة ارض", "قطعة الأرض", "قطعة الارض", "قطعة", "قطع", "حقل", "حقول", "عقار", "عقارات", "مساحة", "مساحات", "قطعة أرضية", "قطعة ارضية", "أرض سكنية", "ارض سكنية", "أرض زراعية", "ارض زراعية", "أرض تجارية", "ارض تجارية" (Arabic) → MUST map to "Land"
   - CRITICAL: "holiday home", "holiday homes", "vacation home", "vacation homes", "short-term rental", "short term rental", "daily rental", "weekly rental", "tourist house", "tourist houses", "rental house", "rental houses" (English) OR "بيوت عطلات", "بيوت عطلة", "بيت عطلة", "بيت عطلات", "بيت اجار قصير", "بيت إيجار قصير", "بيت إيجار يومي", "بيت اجار يومي", "بيت إيجار أسبوعي", "بيت اجار اسبوعي", "بيت سياحي", "بيوت سياحية", "منزل سياحي", "منازل سياحية", "فيلا سياحية", "فيلات سياحية", "بيت للإيجار اليومي", "بيت للايجار اليومي", "بيت للإيجار الأسبوعي", "بيت للايجار الاسبوعي", "بيت للإيجار القصير", "بيت للايجار القصير", "إيجار قصير", "ايجار قصير", "إيجار يومي", "ايجار يومي", "إيجار أسبوعي", "ايجار اسبوعي" (Arabic) → MUST map to "Holiday Home"
   - CRITICAL DISTINCTION: "بيت" or "منزل" alone (without holiday/tourist context) → "Apartment", NOT "Holiday Home". Only when combined with "عطلة", "عطلات", "سياحي", "إيجار قصير", "إيجار يومي", "إيجار أسبوعي" → "Holiday Home"
5. For city, match to one of the Syrian cities (case-insensitive, handle variations)
6. For amenities, extract and map to available amenities
7. For "view" mentions, extract view type if specified (sea, mountain, open, or just "view")
8. For status: "rent"/"rental"/"for rent"/"للإيجار"/"للايجار" → "rent"; "sale"/"buy"/"for sale"/"للبيع" → "sale"
9. Set null for fields that cannot be determined from the query
10. For keywords, extract descriptive words that might be in property descriptions (e.g., "nice view", "spacious", "modern")
11. Return ONLY the JSON object, no additional text or explanation

Examples:
Query: "I want one apartment 2 room 1 bedroom with nice view"
Response: {"propertyType": "Apartment", "bedrooms": 1, "bathrooms": 2, "amenities": [], "keywords": ["nice view"], "viewType": null, "status": null, "city": null, "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}

Query: "Show me a villa with 3 bedrooms and sea view in Aleppo"
Response: {"propertyType": "Villa", "bedrooms": 3, "bathrooms": null, "amenities": [], "keywords": ["sea view"], "viewType": "sea view", "status": null, "city": "Aleppo", "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}

Query: "Find apartments for rent in Damascus with 2 bathrooms"
Response: {"propertyType": "Apartment", "bedrooms": null, "bathrooms": 2, "amenities": [], "keywords": [], "viewType": null, "status": "rent", "city": "Damascus", "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}

Query: "villa for sale in homs"
Response: {"propertyType": "Villa/farms", "bedrooms": null, "bathrooms": null, "amenities": [], "keywords": [], "viewType": null, "status": "sale", "city": "Homs", "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}

Query: "villa farms"
Response: {"propertyType": "Villa/farms", "bedrooms": null, "bathrooms": null, "amenities": [], "keywords": [], "viewType": null, "status": null, "city": null, "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}

Query: "فلل مزارع مزرعة"
Response: {"propertyType": "Villa/farms", "bedrooms": null, "bathrooms": null, "amenities": [], "keywords": [], "viewType": null, "status": null, "city": null, "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}`;

    logger.info(`🤖 Parsing AI query: "${query}"`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3, // Lower temperature for more consistent, structured output
      max_tokens: 500,
      response_format: { type: 'json_object' } // Force JSON response
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI service');
    }

    logger.debug(`🤖 AI raw response: ${responseText}`);

    // Parse JSON response
    let extractedParams;
    try {
      extractedParams = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('Failed to parse AI response as JSON:', responseText);
      throw new Error('Invalid response format from AI service');
    }

    // Validate and normalize the extracted parameters
    const normalizedParams = normalizeExtractedParams(extractedParams);

    logger.info(`✅ Extracted parameters:`, normalizedParams);

    return normalizedParams;
  } catch (error) {
    logger.error('Error parsing AI query:', error);
    
    // If it's an OpenAI API error, provide more context
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('OpenAI API service error. Please try again later.');
      }
    }
    
    throw error;
  }
};

/**
 * Normalize and validate extracted parameters
 */
const normalizeExtractedParams = (params) => {
  const normalized = {
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

  // Normalize property type
  if (params.propertyType) {
    const propType = params.propertyType.trim().toLowerCase();
    
    // Map villa/farm variations to Villa/farms
    if (propType === 'villa' || propType === 'villas' || propType === 'farm' || propType === 'farms' || propType === 'frams' ||
        propType === 'farmhouse' || propType === 'farmhouses' ||
        propType === 'فيلا' || propType === 'فيلات' || propType === 'فلل' ||
        propType === 'مزرعة' || propType === 'مزارع' ||
        propType === 'قصر' || propType === 'قصور' ||
        propType === 'منزل ريفي' || propType === 'منازل ريفية' ||
        propType === 'بيت ريفي' || propType === 'بيوت ريفية') {
      normalized.propertyType = 'Villa/farms';
    } 
    // Map apartment variations to Apartment
    else if (propType === 'apartment' || propType === 'apartments' || propType === 'apt' || propType === 'apts' ||
             propType === 'flat' || propType === 'flats' || propType === 'unit' || propType === 'units' ||
             propType === 'residential unit' || propType === 'residential units' || propType === 'condo' || propType === 'condos' ||
             propType === 'condominium' || propType === 'condominiums' || propType === 'residence' || propType === 'residences' ||
             propType === 'dwelling' || propType === 'dwellings' ||
             propType === 'شقة' || propType === 'شقق' || propType === 'شقة سكنية' || propType === 'شقق سكنية' ||
             propType === 'عقار سكني' || propType === 'عقارات سكنية' || propType === 'وحدة سكنية' || propType === 'وحدات سكنية' ||
             propType === 'سكن' || propType === 'مساكن' || propType === 'منزل' || propType === 'منازل' ||
             propType === 'بيت' || propType === 'بيوت' || propType === 'مسكن' || propType === 'مساكن' ||
             propType === 'سكني' || propType === 'سكنية') {
      normalized.propertyType = 'Apartment';
    }
    // Map house variations to House
    else if (propType === 'house' || propType === 'houses' || propType === 'residential house' || propType === 'residential houses' ||
             propType === 'family house' || propType === 'family houses' || propType === 'townhouse' || propType === 'townhouses') {
      normalized.propertyType = 'House';
    }
    // Map office variations to Office
    else if (propType === 'office' || propType === 'offices' || propType === 'business office' || propType === 'business offices' ||
             propType === 'workspace' || propType === 'workspaces' || propType === 'workplace' || propType === 'workplaces' ||
             propType === 'professional office' || propType === 'professional offices' || propType === 'office space' || propType === 'office spaces' ||
             propType === 'مكتب' || propType === 'مكاتب' || propType === 'مكتب تجاري' || propType === 'مكاتب تجارية' ||
             propType === 'مكتب عمل' || propType === 'مكاتب عمل' || propType === 'مساحة مكتبية' || propType === 'مساحات مكتبية' ||
             propType === 'مكتب إداري' || propType === 'مكاتب إدارية' || propType === 'مكتب مهني' || propType === 'مكاتب مهنية') {
      normalized.propertyType = 'Office';
    }
    // Map commercial variations to Commercial
    else if (propType === 'commercial' || propType === 'commercial property' || propType === 'commercial properties' ||
             propType === 'shop' || propType === 'shops' || propType === 'store' || propType === 'stores' ||
             propType === 'retail' || propType === 'retail space' || propType === 'retail spaces' ||
             propType === 'business' || propType === 'businesses' || propType === 'business space' || propType === 'business spaces' ||
             propType === 'storefront' || propType === 'storefronts' || propType === 'marketplace' || propType === 'marketplaces' ||
             propType === 'mall' || propType === 'malls' || propType === 'boutique' || propType === 'boutiques' ||
             propType === 'showroom' || propType === 'showrooms' ||
             propType === 'تجاري' || propType === 'تجارية' || propType === 'محل' || propType === 'محلات' ||
             propType === 'متجر' || propType === 'متاجر' || propType === 'محل تجاري' || propType === 'محلات تجارية' ||
             propType === 'متجر تجاري' || propType === 'متاجر تجارية' || propType === 'محل بيع' || propType === 'محلات بيع' ||
             propType === 'محل إيجار' || propType === 'محلات إيجار' || propType === 'مساحة تجارية' || propType === 'مساحات تجارية' ||
             propType === 'عقار تجاري' || propType === 'عقارات تجارية' || propType === 'مول' || propType === 'مولات' ||
             propType === 'سوق' || propType === 'أسواق' || propType === 'بوتيك' || propType === 'بوتيكات' ||
             propType === 'معرض' || propType === 'معارض') {
      normalized.propertyType = 'Commercial';
    }
    // Map land variations to Land
    else if (propType === 'land' || propType === 'lands' || propType === 'plot' || propType === 'plots' ||
             propType === 'piece of land' || propType === 'parcel' || propType === 'parcels' ||
             propType === 'lot' || propType === 'lots' || propType === 'terrain' || propType === 'terrains' ||
             propType === 'acre' || propType === 'acres' || propType === 'field' || propType === 'fields' ||
             propType === 'ground' || propType === 'grounds' || propType === 'estate' || propType === 'estates' ||
             propType === 'land plot' || propType === 'land plots' || propType === 'building plot' || propType === 'building plots' ||
             propType === 'construction land' || propType === 'construction lands' ||
             propType === 'أرض' || propType === 'أراضي' || propType === 'ارض' || propType === 'اراضي' ||
             propType === 'قطعة أرض' || propType === 'قطعة ارض' || propType === 'قطعة الأرض' || propType === 'قطعة الارض' ||
             propType === 'قطعة' || propType === 'قطع' ||
             propType === 'حقل' || propType === 'حقول' ||
             propType === 'عقار' || propType === 'عقارات' ||
             propType === 'مساحة' || propType === 'مساحات' ||
             propType === 'قطعة أرضية' || propType === 'قطعة ارضية' ||
             propType === 'أرض سكنية' || propType === 'ارض سكنية' ||
             propType === 'أرض زراعية' || propType === 'ارض زراعية' ||
             propType === 'أرض تجارية' || propType === 'ارض تجارية' ||
             propType === 'أرض بناء' || propType === 'ارض بناء' ||
             propType === 'أرض للبناء' || propType === 'ارض للبناء' ||
             propType === 'قطعة بناء' || propType === 'قطع بناء') {
      normalized.propertyType = 'Land';
    }
    // Map building (whole building) to Building - must come after Land so "building plot" stays Land
    else if (propType === 'building' || propType === 'buildings' || propType === 'whole building' || propType === 'entire building' ||
             propType === 'multi-floor building' || propType === 'multi storey' || propType === 'multi storey building' ||
             propType === 'بناء كامل' || propType === 'بناء' || propType === 'مبنى' || propType === 'مباني' ||
             propType === 'عمارة' || propType === 'عمارات') {
      normalized.propertyType = 'Building';
    } else {
      // Try exact match
      const matched = PROPERTY_TYPES.find(
        pt => pt.toLowerCase() === propType
      );
      if (matched) {
        normalized.propertyType = matched;
      }
    }
  }

  // Normalize numeric fields
  if (params.bedrooms !== null && params.bedrooms !== undefined) {
    const bedrooms = parseInt(params.bedrooms);
    if (!isNaN(bedrooms) && bedrooms >= 0) {
      normalized.bedrooms = bedrooms;
    }
  }

  if (params.bathrooms !== null && params.bathrooms !== undefined) {
    const bathrooms = parseInt(params.bathrooms);
    if (!isNaN(bathrooms) && bathrooms >= 0) {
      normalized.bathrooms = bathrooms;
    }
  }

  if (params.sizeMin !== null && params.sizeMin !== undefined) {
    const sizeMin = parseInt(params.sizeMin);
    if (!isNaN(sizeMin) && sizeMin >= 0) {
      normalized.sizeMin = sizeMin;
    }
  }

  if (params.sizeMax !== null && params.sizeMax !== undefined) {
    const sizeMax = parseInt(params.sizeMax);
    if (!isNaN(sizeMax) && sizeMax >= 0) {
      normalized.sizeMax = sizeMax;
    }
  }

  if (params.priceMin !== null && params.priceMin !== undefined) {
    const priceMin = parseFloat(params.priceMin);
    if (!isNaN(priceMin) && priceMin >= 0) {
      normalized.priceMin = priceMin;
    }
  }

  if (params.priceMax !== null && params.priceMax !== undefined) {
    const priceMax = parseFloat(params.priceMax);
    if (!isNaN(priceMax) && priceMax >= 0) {
      normalized.priceMax = priceMax;
    }
  }

  // Normalize status
  if (params.status) {
    const status = params.status.toLowerCase().trim();
    if (status === 'rent' || status === 'rental') {
      normalized.status = 'rent';
    } else if (status === 'sale' || status === 'buy') {
      normalized.status = 'sale';
    }
  }

  // Normalize city
  if (params.city) {
    const city = params.city.trim();
    const matched = SYRIAN_CITIES.find(
      c => c.toLowerCase() === city.toLowerCase()
    );
    if (matched) {
      normalized.city = matched;
    } else {
      // Try partial match
      const partialMatch = SYRIAN_CITIES.find(
        c => c.toLowerCase().includes(city.toLowerCase()) || 
             city.toLowerCase().includes(c.toLowerCase())
      );
      if (partialMatch) {
        normalized.city = partialMatch;
      }
    }
  }

  // Normalize neighborhood (keep as-is, will be used for regex search)
  if (params.neighborhood) {
    normalized.neighborhood = params.neighborhood.trim();
  }

  // Normalize amenities
  if (Array.isArray(params.amenities)) {
    normalized.amenities = params.amenities
      .map(a => {
        const matched = AMENITIES.find(
          am => am.toLowerCase() === a.toLowerCase()
        );
        return matched || null;
      })
      .filter(Boolean);
  }

  // Normalize boolean fields
  if (params.furnished !== null && params.furnished !== undefined) {
    normalized.furnished = Boolean(params.furnished);
  }

  if (params.garages !== null && params.garages !== undefined) {
    normalized.garages = Boolean(params.garages);
  }

  // Normalize keywords
  if (Array.isArray(params.keywords)) {
    normalized.keywords = params.keywords
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }

  // Normalize view type
  if (params.viewType) {
    const viewType = params.viewType.toLowerCase().trim();
    if (viewType.includes('sea') || viewType.includes('ocean')) {
      normalized.viewType = 'sea view';
    } else if (viewType.includes('mountain')) {
      normalized.viewType = 'mountain view';
    } else if (viewType.includes('open')) {
      normalized.viewType = 'open view';
    } else if (viewType.includes('view')) {
      normalized.viewType = 'view';
    }
  }

  return normalized;
};

module.exports = {
  parseAIQuery,
  mapAmenityToSystem,
  PROPERTY_TYPES,
  AMENITIES,
  SYRIAN_CITIES
};



