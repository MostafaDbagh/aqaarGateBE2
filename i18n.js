const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

// Initialize i18next with file system backend
// Set initImmediate to false to load translations synchronously
i18next
  .use(Backend)
  .init({
    // Language detection settings
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback language if translation is missing
    
    // Supported languages
    supportedLngs: ['en', 'ar'],
    
    // Backend configuration - where to load translations from
    backend: {
      loadPath: path.join(__dirname, 'locales', '{{lng}}', '{{ns}}.json'),
    },
    
    // Namespace (default is 'translation')
    defaultNS: 'translation',
    ns: ['translation'],
    
    // Options
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Load all languages immediately
    initImmediate: false,
    preload: ['en', 'ar'], // Preload all supported languages
    
    // Debug mode (set to false in production)
    debug: false,
  });

/**
 * Get translation function for a specific language
 * @param {string} lng - Language code (e.g., 'en', 'ar')
 * @returns {Function} Translation function
 */
function getTranslator(lng = 'en') {
  // Use getFixedT with namespace to ensure correct translations
  return i18next.getFixedT(lng, 'translation');
}

/**
 * Change language for i18next instance
 * @param {string} lng - Language code
 */
function changeLanguage(lng) {
  return i18next.changeLanguage(lng);
}

/**
 * HOW TO ADD MORE LANGUAGES:
 * 
 * 1. Create a new folder in locales/ with the language code (e.g., locales/fr/)
 * 2. Create translation.json file inside that folder with all keys
 * 3. Add the language code to supportedLngs array above (e.g., supportedLngs: ['en', 'ar', 'fr'])
 * 4. The middleware will automatically detect it from Accept-Language header
 * 
 * HOW TO ADD MORE TRANSLATION KEYS:
 * 
 * 1. Add the key-value pair to all language files (en, ar, etc.)
 * 2. Use it in your controller: req.t('listing.your_key')
 * 
 * Example:
 * - Add to en/translation.json: { "listing": { "approved": "Listing approved" } }
 * - Add to ar/translation.json: { "listing": { "approved": "تمت الموافقة على القائمة" } }
 * - Use: req.t('listing.approved')
 */

module.exports = {
  i18next,
  getTranslator,
  changeLanguage,
};
