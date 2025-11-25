const { i18next, getTranslator } = require('../i18n');

/**
 * i18n Middleware
 * Detects language from Accept-Language header and sets req.language and req.t
 * 
 * Language Detection Priority:
 * 1. Accept-Language header (e.g., "ar", "en", "ar,en;q=0.9")
 * 2. Default: 'en'
 * 3. Fallback: 'en'
 */
function i18nMiddleware(req, res, next) {
  // Get Accept-Language header
  const acceptLanguage = req.headers['accept-language'] || '';
  
  // Extract language code (e.g., "ar" from "ar,en;q=0.9" or "ar-SY,ar;q=0.9")
  let language = 'en'; // Default language
  
  if (acceptLanguage) {
    // Parse Accept-Language header
    // Format: "ar,en;q=0.9" or "ar-SY,ar;q=0.9,en;q=0.8"
    // Handle simple format like "ar" or "en" directly
    const simpleLang = acceptLanguage.trim().toLowerCase().split(',')[0].split('-')[0].split(';')[0];
    
    if (simpleLang === 'ar' || simpleLang === 'en') {
      language = simpleLang;
    } else {
      // Parse full Accept-Language header format
      const languages = acceptLanguage
        .split(',')
        .map(lang => {
          const [code, q] = lang.trim().split(';');
          const quality = q ? parseFloat(q.replace('q=', '')) : 1.0;
          return { code: code.split('-')[0].toLowerCase(), quality };
        })
        .sort((a, b) => b.quality - a.quality);
      
      // Find first supported language
      const supportedLngs = ['en', 'ar'];
      const matchedLang = languages.find(lang => supportedLngs.includes(lang.code));
      
      if (matchedLang) {
        language = matchedLang.code;
      }
    }
  }
  
  // Set language on request object
  req.language = language;
  
  // Get translator function for this language
  // Use getFixedT which creates a bound translation function for the specified language
  // This will use the language specified, not the current i18next language
  req.t = i18next.getFixedT(language, 'translation');
  
  next();
}

module.exports = i18nMiddleware;
