/**
 * Translation Utility for API Responses
 * 
 * This utility translates data values in API responses based on the language
 */

/**
 * Translate a listing object
 * @param {Object} listing - Listing object from database
 * @param {Function} t - Translation function from req.t
 * @returns {Object} Translated listing object
 */
function translateListing(listing, t) {
  if (!listing || !t) return listing;

  const translated = { ...listing };

  // Translate property type
  if (translated.propertyType) {
    const propertyTypeKey = `propertyType.${translated.propertyType}`;
    const translatedType = t(propertyTypeKey);
    // Only use translation if it exists (not the key itself)
    if (translatedType && translatedType !== propertyTypeKey) {
      translated.propertyType = translatedType;
      translated.propertyTypeOriginal = listing.propertyType; // Keep original for filtering
    }
  }

  // Translate status
  if (translated.status) {
    const statusKey = `status.${translated.status}`;
    const translatedStatus = t(statusKey);
    if (translatedStatus && translatedStatus !== statusKey) {
      translated.status = translatedStatus;
      translated.statusOriginal = listing.status; // Keep original for filtering
    }
  }

  // Translate rent type
  if (translated.rentType) {
    const rentTypeKey = `rentType.${translated.rentType}`;
    const translatedRentType = t(rentTypeKey);
    if (translatedRentType && translatedRentType !== rentTypeKey) {
      translated.rentType = translatedRentType;
      translated.rentTypeOriginal = listing.rentType; // Keep original for filtering
    }
  }

  // Don't translate currency - keep currency codes as-is (USD, SYP, etc.)
  // Currency symbols ($, €, ₺) are handled in the frontend
  // This ensures currency codes remain consistent for API filtering
  if (translated.currency) {
    translated.currencyOriginal = listing.currency; // Keep original for reference
    // Keep currency code as-is, don't translate
  }

  // Translate city
  if (translated.city) {
    const cityKey = `cities.${translated.city}`;
    const translatedCity = t(cityKey);
    if (translatedCity && translatedCity !== cityKey) {
      translated.city = translatedCity;
      translated.cityOriginal = listing.city; // Keep original for filtering
    }
  }

  // Translate state (if different from city)
  if (translated.state && translated.state !== translated.city) {
    const stateKey = `cities.${translated.state}`;
    const translatedState = t(stateKey);
    if (translatedState && translatedState !== stateKey) {
      translated.state = translatedState;
      translated.stateOriginal = listing.state; // Keep original for filtering
    }
  }

  // Don't translate approvalStatus - keep it as-is for filtering
  // Approval status is an internal field and should not be translated
  // This ensures filtering works correctly regardless of language
  if (translated.approvalStatus) {
    translated.approvalStatusOriginal = listing.approvalStatus; // Keep original for reference
    // Keep approvalStatus as-is (don't translate)
  }

  return translated;
}

/**
 * Translate an array of listings
 * @param {Array} listings - Array of listing objects
 * @param {Function} t - Translation function from req.t
 * @returns {Array} Array of translated listing objects
 */
function translateListings(listings, t) {
  if (!Array.isArray(listings) || !t) return listings;
  return listings.map(listing => translateListing(listing, t));
}

/**
 * Translate category object
 * @param {Object} category - Category object
 * @param {Function} t - Translation function from req.t
 * @returns {Object} Translated category object
 */
function translateCategory(category, t) {
  if (!category || !t) return category;

  const translated = { ...category };

  // Translate category name
  if (translated.name) {
    // Try exact match first
    let categoryKey = `propertyType.${translated.name}`;
    let translatedName = t(categoryKey);
    
    // If exact match fails, try case-insensitive variations
    if (!translatedName || translatedName === categoryKey) {
      // Try different case variations
      const name = translated.name;
      const variations = [
        name, // Original
        name.toLowerCase(), // All lowercase
        name.replace(/\/Farms/i, '/farms'), // Normalize Farms to farms
        name.replace(/\/farms/i, '/Farms'), // Try with capital F
      ];
      
      for (const variation of variations) {
        categoryKey = `propertyType.${variation}`;
        translatedName = t(categoryKey);
        if (translatedName && translatedName !== categoryKey) {
          break;
        }
      }
    }
    
    // If we found a translation, use it
    if (translatedName && translatedName !== categoryKey) {
      translated.name = translatedName;
      translated.nameOriginal = category.name; // Keep original
      translated.displayName = translatedName;
    }
  }

  return translated;
}

/**
 * Translate an array of categories
 * @param {Array} categories - Array of category objects
 * @param {Function} t - Translation function from req.t
 * @returns {Array} Array of translated category objects
 */
function translateCategories(categories, t) {
  if (!Array.isArray(categories) || !t) return categories;
  return categories.map(category => translateCategory(category, t));
}

/**
 * Translate city object
 * @param {Object} city - City object
 * @param {Function} t - Translation function from req.t
 * @returns {Object} Translated city object
 */
function translateCity(city, t) {
  if (!city || !t) return city;

  const translated = { ...city };

  // Translate city name
  if (translated.city) {
    // Normalize city name variations to match translation keys
    const cityNameMap = {
      'Tartous': 'Tartus',
      'tartous': 'Tartus',
      'Tartus': 'Tartus',
      'Deir ez-Zor': 'Der El Zor',
      'deir ez-zor': 'Der El Zor',
      'Deir ez Zor': 'Der El Zor',
      'deir ez zor': 'Der El Zor',
      'Deir-ez-Zor': 'Der El Zor',
      'deir-ez-zor': 'Der El Zor',
      'Der El Zor': 'Der El Zor',
      'der el zor': 'Der El Zor'
    };
    
    // Get normalized city name for translation key lookup
    const normalizedCityName = cityNameMap[translated.city] || translated.city;
    
    // Try multiple translation key formats
    const translationKeys = [
      `cities.${normalizedCityName}`,
      `cities.${translated.city}`,
      `cities.${translated.city.toLowerCase()}`,
      `cities.${translated.city.toUpperCase()}`
    ];
    
    let translatedCityName = null;
    for (const key of translationKeys) {
      const result = t(key);
      if (result && result !== key) {
        translatedCityName = result;
        break;
      }
    }
    
    // If translation found, use it
    if (translatedCityName) {
      translated.city = translatedCityName;
      translated.cityOriginal = city.city; // Keep original
      translated.displayName = translatedCityName;
    } else {
      // Log for debugging if translation not found
      console.log(`[translateCity] No translation found for city: "${translated.city}", tried keys: ${translationKeys.join(', ')}`);
    }
  }

  return translated;
}

/**
 * Translate an array of cities
 * @param {Array} cities - Array of city objects
 * @param {Function} t - Translation function from req.t
 * @returns {Array} Array of translated city objects
 */
function translateCities(cities, t) {
  if (!Array.isArray(cities) || !t) return cities;
  return cities.map(city => translateCity(city, t));
}

module.exports = {
  translateListing,
  translateListings,
  translateCategory,
  translateCategories,
  translateCity,
  translateCities,
};

