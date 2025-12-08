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

Your task is to extract structured search parameters from the user's query. Return ONLY a valid JSON object with the following structure:
{
  "propertyType": "Apartment" | "Villa" | "Office" | "Land" | "Commercial" | "Holiday Home" | null,
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
5. For city, match to one of the Syrian cities (case-insensitive, handle variations)
6. For amenities, extract and map to available amenities
7. For "view" mentions, extract view type if specified (sea, mountain, open, or just "view")
8. For status, look for "rent", "rental", "for rent", "sale", "buy", "for sale"
9. Set null for fields that cannot be determined from the query
10. For keywords, extract descriptive words that might be in property descriptions (e.g., "nice view", "spacious", "modern")
11. Return ONLY the JSON object, no additional text or explanation

Examples:
Query: "I want one apartment 2 room 1 bedroom with nice view"
Response: {"propertyType": "Apartment", "bedrooms": 1, "bathrooms": 2, "amenities": [], "keywords": ["nice view"], "viewType": null, "status": null, "city": null, "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}

Query: "Show me a villa with 3 bedrooms and sea view in Aleppo"
Response: {"propertyType": "Villa", "bedrooms": 3, "bathrooms": null, "amenities": [], "keywords": ["sea view"], "viewType": "sea view", "status": null, "city": "Aleppo", "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}

Query: "Find apartments for rent in Damascus with 2 bathrooms"
Response: {"propertyType": "Apartment", "bedrooms": null, "bathrooms": 2, "amenities": [], "keywords": [], "viewType": null, "status": "rent", "city": "Damascus", "neighborhood": null, "furnished": null, "garages": null, "sizeMin": null, "sizeMax": null, "priceMin": null, "priceMax": null}`;

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
    const propType = params.propertyType.trim();
    const matched = PROPERTY_TYPES.find(
      pt => pt.toLowerCase() === propType.toLowerCase()
    );
    if (matched) {
      normalized.propertyType = matched;
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

