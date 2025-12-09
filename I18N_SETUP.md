# i18n Setup for Guest GET APIs

## Overview
Internationalization (i18n) has been implemented for public GET endpoints that are available to guests (non-authenticated users).

## Supported Languages
- **English (en)** - Default language
- **Arabic (ar)** - Secondary language

## Translated Endpoints

The following GET endpoints now support translations:

1. **GET /api/listing/search** - Search/filter listings
2. **GET /api/listing/:id** - Get single listing by ID
3. **GET /api/cities** - Get all cities with statistics
4. **GET /api/cities/:cityName** - Get city details
5. **GET /api/categories** - Get all property categories
6. **GET /api/categories/:propertyType** - Get category details
7. **GET /api/agents** - Get all agents
8. **GET /api/agents/:id** - Get single agent by ID

## How It Works

### Language Detection
The i18n middleware automatically detects the language from the `Accept-Language` HTTP header:
- `Accept-Language: ar` → Arabic responses
- `Accept-Language: en` → English responses
- No header or unsupported language → English (default)

### Translation Keys

#### Listing
- `listing.not_found` - "Listing not found" / "القائمة غير موجودة"
- `listing.search_success` - "Listings retrieved successfully" / "تم جلب القوائم بنجاح"
- `listing.fetch_success` - "Listing retrieved successfully" / "تم جلب القائمة بنجاح"

#### Agent
- `agent.not_found` - "Agent not found" / "الوكيل غير موجود"
- `agent.fetch_success` - "Agents retrieved successfully" / "تم جلب الوكلاء بنجاح"
- `agent.fetch_one_success` - "Agent retrieved successfully" / "تم جلب الوكيل بنجاح"

#### City
- `city.fetch_success` - "Cities retrieved successfully" / "تم جلب المدن بنجاح"
- `city.fetch_one_success` - "City details retrieved successfully" / "تم جلب تفاصيل المدينة بنجاح"
- `city.not_found` - "City not found" / "المدينة غير موجودة"

#### Category
- `category.fetch_success` - "Categories retrieved successfully" / "تم جلب الفئات بنجاح"
- `category.fetch_one_success` - "Category details retrieved successfully" / "تم جلب تفاصيل الفئة بنجاح"
- `category.not_found` - "Category not found" / "الفئة غير موجودة"

## Usage in Controllers

Controllers can access the translation function via `req.t`:

```javascript
// Example: In listing.controller.js
const getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).lean();
    if (!listing) {
      const message = req.t ? req.t('listing.not_found') : 'Listing not found!';
      return next(errorHandler(404, message));
    }
    // ... rest of code
  } catch (error) {
    next(error);
  }
};
```

## Testing

### Using curl:

```bash
# Test English
curl -H "Accept-Language: en" http://localhost:5500/api/listing/search

# Test Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/listing/search

# Test single listing
curl -H "Accept-Language: ar" http://localhost:5500/api/listing/123

# Test agents
curl -H "Accept-Language: ar" http://localhost:5500/api/agents

# Test cities
curl -H "Accept-Language: ar" http://localhost:5500/api/cities

# Test categories
curl -H "Accept-Language: ar" http://localhost:5500/api/categories
```

### Using Postman/Thunder Client:

Add header:
- Key: `Accept-Language`
- Value: `ar` (for Arabic) or `en` (for English)

## File Structure

```
api/
├── i18n.js                    # i18next configuration
├── middleware/
│   └── i18n.js               # Language detection middleware
├── locales/
│   ├── en/
│   │   └── translation.json # English translations
│   └── ar/
│       └── translation.json  # Arabic translations
└── controllers/
    ├── listing.controller.js # Updated with translations
    ├── agent.controller.js   # Updated with translations
    ├── city.controller.js    # Updated with translations
    └── category.controller.js # Updated with translations
```

## Adding More Translation Keys

1. **Add to English file** (`locales/en/translation.json`):
```json
{
  "listing": {
    "approved": "Listing approved"
  }
}
```

2. **Add to Arabic file** (`locales/ar/translation.json`):
```json
{
  "listing": {
    "approved": "تمت الموافقة على القائمة"
  }
}
```

3. **Use in controller**:
```javascript
req.t('listing.approved')
```

## Adding More Languages

1. Create a new folder: `locales/fr/` (for French example)
2. Create `translation.json` inside with all keys translated
3. Update `api/i18n.js`:
   - Add `'fr'` to `supportedLngs: ['en', 'ar', 'fr']`
4. Update `api/middleware/i18n.js`:
   - Add `'fr'` to `supportedLngs` array in the middleware

## Notes

- Only GET endpoints for listing, agent, city, and category routes have i18n middleware
- POST, PUT, DELETE endpoints on these routes will also have `req.t` available but won't use translations unless you add them
- The middleware sets `req.language` (current language code) and `req.t` (translation function)
- If a translation key is missing, it will fallback to English
- All error messages and success messages in responses are now translated based on the `Accept-Language` header




