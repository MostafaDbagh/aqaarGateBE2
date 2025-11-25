# i18n Testing Guide

## Quick Test Commands

### Test with curl

#### 1. Listing Search API
```bash
# English
curl -H "Accept-Language: en" http://localhost:5500/api/listing/search?limit=5

# Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/listing/search?limit=5
```

#### 2. Get Single Listing
```bash
# Replace LISTING_ID with actual ID from your database
# English
curl -H "Accept-Language: en" http://localhost:5500/api/listing/LISTING_ID

# Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/listing/LISTING_ID
```

#### 3. Cities API
```bash
# English
curl -H "Accept-Language: en" http://localhost:5500/api/cities

# Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/cities
```

#### 4. City Details API
```bash
# English
curl -H "Accept-Language: en" http://localhost:5500/api/cities/Damascus

# Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/cities/Damascus
```

#### 5. Categories API
```bash
# English
curl -H "Accept-Language: en" http://localhost:5500/api/categories

# Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/categories
```

#### 6. Category Details API
```bash
# English
curl -H "Accept-Language: en" http://localhost:5500/api/categories/Apartment

# Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/categories/Apartment
```

#### 7. Agents API
```bash
# English
curl -H "Accept-Language: en" http://localhost:5500/api/agents

# Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/agents
```

#### 8. Get Single Agent
```bash
# Replace AGENT_ID with actual ID from your database
# English
curl -H "Accept-Language: en" http://localhost:5500/api/agents/AGENT_ID

# Arabic
curl -H "Accept-Language: ar" http://localhost:5500/api/agents/AGENT_ID
```

## Automated Testing Script

### Run the test script:

```bash
cd api
node test-i18n.js
```

### Before running:
1. Make sure your server is running on `http://localhost:5500`
2. Update `LISTING_ID` and `AGENT_ID` in `test-i18n.js` with valid IDs from your database
3. The script will test all endpoints with both English and Arabic headers

## Testing with Postman/Thunder Client

1. **Create a new request**
2. **Set the URL** (e.g., `http://localhost:5500/api/listing/search`)
3. **Add Header:**
   - Key: `Accept-Language`
   - Value: `ar` (for Arabic) or `en` (for English)
4. **Send the request**
5. **Check the response** - Look for `message` field with translated text

## Expected Results

### English Response Example:
```json
{
  "success": true,
  "message": "Listings retrieved successfully",
  "data": [...]
}
```

### Arabic Response Example:
```json
{
  "success": true,
  "message": "تم جلب القوائم بنجاح",
  "data": [...]
}
```

## What to Check

1. ✅ **Language Detection**: Response message changes based on `Accept-Language` header
2. ✅ **Default Language**: Without header or unsupported language, defaults to English
3. ✅ **Error Messages**: 404 errors show translated messages (e.g., "Listing not found" vs "القائمة غير موجودة")
4. ✅ **Success Messages**: All success responses include translated messages
5. ✅ **Fallback**: Missing translations fallback to English

## Common Issues

### Issue: No translation in response
**Solution**: Check that:
- `Accept-Language` header is set correctly
- i18n middleware is applied to the route
- Translation key exists in both `en` and `ar` files

### Issue: Server error
**Solution**: 
- Check server logs
- Verify i18n.js is loaded before routes
- Ensure translation files are in correct location

### Issue: Wrong language detected
**Solution**:
- Check `Accept-Language` header format
- Verify middleware is parsing header correctly
- Test with explicit language: `Accept-Language: ar`

## Manual Testing Checklist

- [ ] Test listing search with English header
- [ ] Test listing search with Arabic header
- [ ] Test get single listing (with valid ID) - English
- [ ] Test get single listing (with valid ID) - Arabic
- [ ] Test get single listing (with invalid ID) - English (should show "Listing not found")
- [ ] Test get single listing (with invalid ID) - Arabic (should show "القائمة غير موجودة")
- [ ] Test cities API - English
- [ ] Test cities API - Arabic
- [ ] Test city details - English
- [ ] Test city details - Arabic
- [ ] Test categories API - English
- [ ] Test categories API - Arabic
- [ ] Test category details - English
- [ ] Test category details - Arabic
- [ ] Test agents API - English
- [ ] Test agents API - Arabic
- [ ] Test get single agent (with valid ID) - English
- [ ] Test get single agent (with valid ID) - Arabic
- [ ] Test get single agent (with invalid ID) - English (should show "Agent not found")
- [ ] Test get single agent (with invalid ID) - Arabic (should show "الوكيل غير موجود")
- [ ] Test without Accept-Language header (should default to English)
- [ ] Test with unsupported language (should default to English)

## Getting Valid IDs for Testing

### Get a Listing ID:
```bash
curl http://localhost:5500/api/listing/search?limit=1
# Copy the _id from the response
```

### Get an Agent ID:
```bash
curl http://localhost:5500/api/agents
# Copy the _id from the first agent in the response
```

## Performance Testing

Test that i18n doesn't slow down responses:

```bash
# Time the request
time curl -H "Accept-Language: ar" http://localhost:5500/api/listing/search
```

The overhead should be minimal (< 10ms).


