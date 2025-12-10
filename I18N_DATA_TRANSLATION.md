# i18n Data Translation Guide

## Overview
The API now translates **both messages AND data values** in responses based on the `Accept-Language` header.

## Translated Data Fields

### Listing Data
When you fetch listings, the following fields are translated:

| Field | English Example | Arabic Example |
|-------|----------------|----------------|
| `propertyType` | "Apartment" | "شقة" |
| `status` | "For Sale" | "للبيع" |
| `rentType` | "Monthly" | "شهري" |
| `currency` | "USD" | "دولار" |
| `city` | "Damascus" | "دمشق" |
| `state` | "Damascus" | "دمشق" |
| `approvalStatus` | "Approved" | "موافق عليه" |

**Note:** Original values are preserved in fields like `propertyTypeOriginal`, `statusOriginal`, etc. for filtering purposes.

### Category Data
When you fetch categories, the following fields are translated:

| Field | English Example | Arabic Example |
|-------|----------------|----------------|
| `name` | "Apartment" | "شقة" |
| `displayName` | "Apartment" | "شقة" |

**Note:** Original value is preserved in `nameOriginal`.

### City Data
When you fetch cities, the following fields are translated:

| Field | English Example | Arabic Example |
|-------|----------------|----------------|
| `city` | "Damascus" | "دمشق" |
| `displayName` | "Damascus" | "دمشق" |

**Note:** Original value is preserved in `cityOriginal`.

## Example Responses

### English Response (GET /api/listing/search)
```json
{
  "_id": "...",
  "propertyType": "Apartment",
  "status": "For Sale",
  "rentType": "Monthly",
  "currency": "USD",
  "city": "Damascus",
  "propertyTypeOriginal": "Apartment",
  "statusOriginal": "sale",
  "cityOriginal": "Damascus"
}
```

### Arabic Response (GET /api/listing/search with Accept-Language: ar)
```json
{
  "_id": "...",
  "propertyType": "شقة",
  "status": "للبيع",
  "rentType": "شهري",
  "currency": "دولار",
  "city": "دمشق",
  "propertyTypeOriginal": "Apartment",
  "statusOriginal": "sale",
  "cityOriginal": "Damascus"
}
```

## Property Type Translations

| English | Arabic |
|---------|--------|
| Apartment | شقة |
| Villa/farms | فيلا/مزرعة |
| Villa | فيلا |
| Office | مكتب |
| Commercial | تجاري |
| Land | أرض |
| Holiday Home | بيت عطلة |

## Status Translations

| English | Arabic |
|---------|--------|
| For Sale | للبيع |
| For Rent | للإيجار |

## Rent Type Translations

| English | Arabic |
|---------|--------|
| Monthly | شهري |
| Three Months | ثلاثة أشهر |
| Six Months | ستة أشهر |
| One Year | سنة واحدة |
| Yearly | سنوي |
| Weekly | أسبوعي |
| Daily | يومي |
| One Week | أسبوع واحد |
| Two Weeks | أسبوعان |

## Currency Translations

| Code | English | Arabic |
|------|---------|--------|
| USD | USD | دولار |
| SYP | SYP | ليرة سورية |
| TRY | TRY | ليرة تركية |
| EUR | EUR | يورو |

## City Translations

| English | Arabic |
|---------|--------|
| Damascus | دمشق |
| Aleppo | حلب |
| Homs | حمص |
| Latakia | اللاذقية |
| Tartus | طرطوس |
| Daraa | درعا |
| Hama | حماة |
| Idlib | إدلب |
| Der El Zor | دير الزور |

## Approval Status Translations

| English | Arabic |
|---------|--------|
| Pending | قيد الانتظار |
| Approved | موافق عليه |
| Rejected | مرفوض |

## Important Notes

1. **Original Values Preserved**: All original values are kept in fields ending with `Original` (e.g., `propertyTypeOriginal`, `cityOriginal`) to allow filtering and searching.

2. **Filtering**: When filtering, use the original values. The frontend should use `propertyTypeOriginal`, `statusOriginal`, etc. for API calls.

3. **Backward Compatibility**: If translation function is not available, original values are returned.

4. **Missing Translations**: If a translation key is missing, the original value is returned.

## Testing

### Test with curl:

```bash
# English - see English values
curl -H "Accept-Language: en" http://localhost:5500/api/listing/search?limit=1

# Arabic - see Arabic values
curl -H "Accept-Language: ar" http://localhost:5500/api/listing/search?limit=1
```

### Expected Results:

**English Response:**
- `propertyType`: "Apartment"
- `status`: "For Sale"
- `city`: "Damascus"

**Arabic Response:**
- `propertyType`: "شقة"
- `status`: "للبيع"
- `city`: "دمشق"
- `propertyTypeOriginal`: "Apartment" (for filtering)
- `statusOriginal`: "sale" (for filtering)
- `cityOriginal`: "Damascus" (for filtering)

## Adding More Translations

To add more translations:

1. **Add to English file** (`locales/en/translation.json`):
```json
{
  "propertyType": {
    "New Type": "New Type"
  }
}
```

2. **Add to Arabic file** (`locales/ar/translation.json`):
```json
{
  "propertyType": {
    "New Type": "نوع جديد"
  }
}
```

3. The translation utility will automatically pick it up!





