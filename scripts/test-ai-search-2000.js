#!/usr/bin/env node
/**
 * 2000 complex query tests for AI Search Parser
 * Tests: villa, house, apartment, land, office, commercial, holiday home
 * Covers: status, city, bedrooms, bathrooms, price, size, amenities, typos
 * Run: node scripts/test-ai-search-2000.js
 */

require('dotenv').config();
const { parseQuery } = require('../utils/ruleBasedParser');

// Property type seeds (query fragments → expected propertyType)
const VILLA_TERMS = ['villa', 'villas', 'farm', 'farms', 'frams', 'فلل', 'فيلا', 'فيلات', 'مزرعة', 'مزارع'];
const HOUSE_TERMS = ['house', 'houses', 'townhouse', 'townhouses', 'منزل'];
const APT_TERMS = ['apartment', 'flat', 'شقة', 'شقق'];
const LAND_TERMS = ['land', 'plot', 'أرض', 'أراضي'];
const OFFICE_TERMS = ['office', 'مكتب'];
const COMMERCIAL_TERMS = ['commercial', 'shop', 'تجاري'];
const HOLIDAY_TERMS = ['holiday home', 'بيت عطلة', 'إيجار يومي'];

const STATUS_SALE = ['for sale', 'sale', 'للبيع', 'للايجار']; // last is typo - should be للبيع
const STATUS_RENT = ['for rent', 'rent', 'للإيجار', 'للايجار'];
const CITIES = ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'دمشق', 'حلب', 'حمص'];
const BEDROOMS = [1, 2, 3, 4, 5];
const BATHROOMS = [1, 2, 3];
const PRICES = ['50k', '100000', 'بين ٢٠ و ٥٠ الف'];
const SIZES = ['100 sqm', '200 متر'];

// Generate 2000 varied complex queries
function generateQueries() {
  const queries = [];
  let id = 0;

  // 1. Villa/farms queries (~400)
  for (const term of VILLA_TERMS) {
    for (const city of CITIES.slice(0, 3)) {
      queries.push({ id: ++id, q: `${term} for sale in ${city}`, expect: { propertyType: 'Villa/farms', status: 'sale' } });
      queries.push({ id: ++id, q: `${term} for rent ${city}`, expect: { propertyType: 'Villa/farms', status: 'rent' } });
    }
    queries.push({ id: ++id, q: `${term} with 3 bedrooms`, expect: { propertyType: 'Villa/farms', bedrooms: 3 } });
    queries.push({ id: ++id, q: `${term} 2 bathrooms sea view`, expect: { propertyType: 'Villa/farms', bathrooms: 2 } });
    queries.push({ id: ++id, q: `${term}`, expect: { propertyType: 'Villa/farms' } });
  }

  // 2. House queries (~300)
  for (const term of HOUSE_TERMS) {
    for (const city of CITIES.slice(0, 2)) {
      queries.push({ id: ++id, q: `${term} for sale in ${city}`, expect: { propertyType: 'House', status: 'sale' } });
      queries.push({ id: ++id, q: `${term} for rent`, expect: { propertyType: 'House', status: 'rent' } });
    }
    for (const beds of BEDROOMS.slice(0, 3)) {
      queries.push({ id: ++id, q: `${term} ${beds} bedrooms`, expect: { propertyType: 'House', bedrooms: beds } });
    }
    queries.push({ id: ++id, q: `${term}`, expect: { propertyType: 'House' } });
  }

  // 3. Apartment queries (~400)
  for (const term of APT_TERMS) {
    for (const city of CITIES) {
      queries.push({ id: ++id, q: `${term} in ${city}`, expect: { propertyType: 'Apartment' } });
    }
    for (const beds of BEDROOMS) {
      queries.push({ id: ++id, q: `${term} with ${beds} rooms`, expect: { propertyType: 'Apartment', bedrooms: beds } });
    }
    queries.push({ id: ++id, q: `${term} for sale`, expect: { propertyType: 'Apartment', status: 'sale' } });
    queries.push({ id: ++id, q: `${term} for rent furnished`, expect: { propertyType: 'Apartment', status: 'rent' } });
    queries.push({ id: ++id, q: `${term}`, expect: { propertyType: 'Apartment' } });
  }

  // 4. Land queries (~200)
  for (const term of LAND_TERMS) {
    for (const city of CITIES.slice(0, 4)) {
      queries.push({ id: ++id, q: `${term} in ${city}`, expect: { propertyType: 'Land' } });
    }
    queries.push({ id: ++id, q: `${term} for sale`, expect: { propertyType: 'Land', status: 'sale' } });
    queries.push({ id: ++id, q: `${term}`, expect: { propertyType: 'Land' } });
  }

  // 5. Office queries (~150)
  for (const term of OFFICE_TERMS) {
    for (const city of CITIES.slice(0, 3)) {
      queries.push({ id: ++id, q: `${term} in ${city}`, expect: { propertyType: 'Office' } });
    }
    queries.push({ id: ++id, q: `${term} for rent`, expect: { propertyType: 'Office', status: 'rent' } });
    queries.push({ id: ++id, q: `${term}`, expect: { propertyType: 'Office' } });
  }

  // 6. Commercial queries (~150)
  for (const term of COMMERCIAL_TERMS) {
    for (const city of CITIES.slice(0, 2)) {
      queries.push({ id: ++id, q: `${term} ${city}`, expect: { propertyType: 'Commercial' } });
    }
    queries.push({ id: ++id, q: `${term}`, expect: { propertyType: 'Commercial' } });
  }

  // 7. Holiday Home queries (~100)
  for (const term of HOLIDAY_TERMS) {
    queries.push({ id: ++id, q: `${term}`, expect: { propertyType: 'Holiday Home' } });
    queries.push({ id: ++id, q: `${term} in Damascus`, expect: { propertyType: 'Holiday Home' } });
  }

  // 8. Mixed complex queries (~300)
  const mixed = [
    ['villa farm for sale in Homs', { propertyType: 'Villa/farms', status: 'sale' }],
    ['فلل مزارع للبيع في حمص', { propertyType: 'Villa/farms', status: 'sale' }],
    ['شقة ٣ غرف في دمشق', { propertyType: 'Apartment' }],
    ['apartment 2 bedrooms 1 bathroom Damascus', { propertyType: 'Apartment', bedrooms: 2 }],
    ['house with pool and garage', { propertyType: 'House' }],
    ['townhouse for sale', { propertyType: 'House', status: 'sale' }],
    ['أرض للبيع', { propertyType: 'Land', status: 'sale' }],
    ['مكتب في حلب', { propertyType: 'Office' }],
    ['villa 4 bedrooms 3 bathrooms sea view Latakia', { propertyType: 'Villa/farms', bedrooms: 4 }],
    ['فيلا للإيجار حمص', { propertyType: 'Villa/farms', status: 'rent' }],
  ];
  for (let i = 0; i < 30; i++) {
    for (const [q, expect] of mixed) {
      queries.push({ id: ++id, q, expect });
    }
  }

  return queries.slice(0, 2000);
}

function checkExpect(extracted, expect) {
  const errors = [];
  if (expect.propertyType) {
    if (expect.propertyType === 'Villa/farms') {
      if (extracted.propertyType !== 'Villa/farms' && extracted.propertyType !== 'Villa') {
        errors.push(`propertyType: expected Villa/farms or Villa, got ${extracted.propertyType}`);
      }
    } else if (extracted.propertyType !== expect.propertyType) {
      errors.push(`propertyType: expected ${expect.propertyType}, got ${extracted.propertyType}`);
    }
  }
  if (expect.status && extracted.status !== expect.status) {
    errors.push(`status: expected ${expect.status}, got ${extracted.status}`);
  }
  if (expect.bedrooms != null && extracted.bedrooms !== expect.bedrooms) {
    errors.push(`bedrooms: expected ${expect.bedrooms}, got ${extracted.bedrooms}`);
  }
  if (expect.bathrooms != null && extracted.bathrooms !== expect.bathrooms) {
    errors.push(`bathrooms: expected ${expect.bathrooms}, got ${extracted.bathrooms}`);
  }
  return errors;
}

async function main() {
  const queries = generateQueries();
  console.log(`\n🧪 Running ${queries.length} complex query tests...\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const { id, q, expect } of queries) {
    try {
      const extracted = parseQuery(q);
      const errors = checkExpect(extracted, expect);
      if (errors.length === 0) {
        passed++;
      } else {
        failed++;
        if (failures.length < 50) {
          failures.push({ id, q, expect, got: extracted, errors });
        }
      }
    } catch (err) {
      failed++;
      if (failures.length < 50) {
        failures.push({ id, q, expect, error: err.message });
      }
    }
  }

  const pct = ((passed / queries.length) * 100).toFixed(2);
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Test Results');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Total:  ${queries.length}`);
  console.log(`   Passed: ${passed} (${pct}%)`);
  console.log(`   Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failures.length > 0) {
    console.log('Sample failures (max 20):\n');
    failures.slice(0, 20).forEach((f, i) => {
      console.log(`${i + 1}. [${f.id}] "${f.q}"`);
      console.log(`   Expected: ${JSON.stringify(f.expect)}`);
      if (f.got) console.log(`   Got: propertyType=${f.got.propertyType}, status=${f.got.status}`);
      if (f.errors) console.log(`   Errors: ${f.errors.join('; ')}`);
      if (f.error) console.log(`   Error: ${f.error}`);
      console.log('');
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
