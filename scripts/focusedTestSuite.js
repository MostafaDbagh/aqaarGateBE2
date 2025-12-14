/**
 * Focused Test Suite - Tests Price, Size, Cities, and Status (rent/sale)
 */

const { parseQuery } = require('../utils/ruleBasedParser');

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

// Cities (English and Arabic)
const cities = [
  { en: 'Damascus', ar: ['دمشق', 'شام', 'الشام'] },
  { en: 'Aleppo', ar: ['حلب'] },
  { en: 'Latakia', ar: ['اللاذقية', 'لاذقية'] },
  { en: 'Homs', ar: ['حمص'] },
  { en: 'Hama', ar: ['حماة', 'حما'] },
  { en: 'Tartus', ar: ['طرطوس'] },
  { en: 'Deir ez-Zur', ar: ['دير الزور', 'ديرالزور'] },
  { en: 'Daraa', ar: ['درعا'] },
  { en: 'Idlib', ar: ['إدلب', 'ادلب'] },
  { en: 'As-Suwayda', ar: ['السويداء', 'سويداء'] },
  { en: 'Raqqah', ar: ['الرقة', 'رقة'] }
];

// Statuses
const statuses = [
  { en: 'sale', ar: ['للبيع', 'بيع', 'شراء'] },
  { en: 'rent', ar: ['للإيجار', 'للايجار', 'إيجار', 'ايجار'] }
];

// Test function
function testQuery(query, expected, testName) {
  totalTests++;
  try {
    const result = parseQuery(query);
    let passed = true;
    const errors = [];

    // Check status
    if (expected.status !== undefined && result.status !== expected.status) {
      passed = false;
      errors.push(`status: expected "${expected.status}", got "${result.status}"`);
    }

    // Check city
    if (expected.city !== undefined && result.city !== expected.city) {
      passed = false;
      errors.push(`city: expected "${expected.city}", got "${result.city}"`);
    }

    // Check priceMin
    if (expected.priceMin !== undefined && result.priceMin !== expected.priceMin) {
      passed = false;
      errors.push(`priceMin: expected ${expected.priceMin}, got ${result.priceMin}`);
    }

    // Check priceMax
    if (expected.priceMax !== undefined && result.priceMax !== expected.priceMax) {
      passed = false;
      errors.push(`priceMax: expected ${expected.priceMax}, got ${result.priceMax}`);
    }

    // Check sizeMin
    if (expected.sizeMin !== undefined && result.sizeMin !== expected.sizeMin) {
      passed = false;
      errors.push(`sizeMin: expected ${expected.sizeMin}, got ${result.sizeMin}`);
    }

    // Check sizeMax
    if (expected.sizeMax !== undefined && result.sizeMax !== expected.sizeMax) {
      passed = false;
      errors.push(`sizeMax: expected ${expected.sizeMax}, got ${result.sizeMax}`);
    }

    if (passed) {
      passedTests++;
    } else {
      failedTests++;
      failures.push({
        test: testName || query,
        query,
        expected,
        result,
        errors
      });
    }
  } catch (error) {
    failedTests++;
    failures.push({
      test: testName || query,
      query,
      error: error.message
    });
  }
}

console.log('\n🧪 Starting Focused Test Suite (Price, Size, Cities, Status)...\n');
const startTime = Date.now();

// ============================================
// CATEGORY 1: PRICE TESTS
// ============================================
console.log('📋 Category 1: Price Tests...');

// Price range: "بين X و Y"
const priceRangeTests = [
  { query: 'شقة بين 20 و 50 الف دولار', expected: { priceMin: 20000, priceMax: 50000 } },
  { query: 'شقة بين 50 و 100 الف دولار', expected: { priceMin: 50000, priceMax: 100000 } },
  { query: 'شقة بين 100 و 200 الف دولار', expected: { priceMin: 100000, priceMax: 200000 } },
  { query: 'شقة سعر بين 20 و 50 الف دولار', expected: { priceMin: 20000, priceMax: 50000 } },
  { query: 'شقة سعره بين 20 و 50 الف دولار', expected: { priceMin: 20000, priceMax: 50000 } },
  { query: 'شقة سعرها بين 20 و 50 الف دولار', expected: { priceMin: 20000, priceMax: 50000 } },
  { query: 'شقة بين ٢٠ و ٥٠ الف دولار', expected: { priceMin: 20000, priceMax: 50000 } },
  { query: 'شقة بين 20 و 50 الف ليرة', expected: { priceMin: 20000, priceMax: 50000 } },
  { query: 'شقة بين 20 و 50 الف ل.س', expected: { priceMin: 20000, priceMax: 50000 } },
  { query: 'شقة بين مليون و مليونين دولار', expected: { priceMin: 1000000, priceMax: 2000000 } }
];

priceRangeTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Price Range ${index + 1} - ${test.query}`);
});

// Price less than: "اقل من X"
const priceLessThanTests = [
  { query: 'شقة اقل من 50 الف دولار', expected: { priceMax: 50000 } },
  { query: 'شقة اقل من 100 الف دولار', expected: { priceMax: 100000 } },
  { query: 'شقة اقل من 200 الف دولار', expected: { priceMax: 200000 } },
  { query: 'شقة سعر اقل من 50 الف دولار', expected: { priceMax: 50000 } },
  { query: 'شقة سعره اقل من 50 الف دولار', expected: { priceMax: 50000 } },
  { query: 'شقة سعرها اقل من 50 الف دولار', expected: { priceMax: 50000 } },
  { query: 'شقة اقل من ٥٠ الف دولار', expected: { priceMax: 50000 } },
  { query: 'عقار سعره اقل من ٥٠ الف دولار', expected: { priceMax: 50000 } }
];

priceLessThanTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Price Less Than ${index + 1} - ${test.query}`);
});

// Price more than: "اعلى من X"
const priceMoreThanTests = [
  { query: 'شقة اعلى من 50 الف دولار', expected: { priceMin: 50000 } },
  { query: 'شقة اعلى من 100 الف دولار', expected: { priceMin: 100000 } },
  { query: 'شقة اعلى من 200 الف دولار', expected: { priceMin: 200000 } },
  { query: 'شقة سعر اعلى من 50 الف دولار', expected: { priceMin: 50000 } },
  { query: 'شقة سعره اعلى من 50 الف دولار', expected: { priceMin: 50000 } },
  { query: 'شقة سعرها اعلى من 50 الف دولار', expected: { priceMin: 50000 } }
];

priceMoreThanTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Price More Than ${index + 1} - ${test.query}`);
});

// Price around: "بحدود X" or "بحوالي X"
const priceAroundTests = [
  { query: 'شقة بحدود 50 الف دولار', expected: { priceMax: 50000, priceMin: null } },
  { query: 'شقة بحدود 100 الف دولار', expected: { priceMax: 100000, priceMin: null } },
  { query: 'شقة بحدود 200 الف دولار', expected: { priceMax: 200000, priceMin: null } },
  { query: 'شقة بحوالي 50 الف دولار', expected: { priceMax: 50000, priceMin: null } },
  { query: 'شقة حوالي 50 الف دولار', expected: { priceMax: 50000, priceMin: null } },
  { query: 'شقة حدود 50 الف دولار', expected: { priceMax: 50000, priceMin: null } },
  { query: 'شقة سعره بحدود 50 الف دولار', expected: { priceMax: 50000, priceMin: null } },
  { query: 'شقة سعره بحوالي 50 الف دولار', expected: { priceMax: 50000, priceMin: null } },
  { query: 'عقار سعره بحوالي ال٥٠ الف دولار', expected: { priceMax: 50000, priceMin: null } },
  { query: 'عقار سعره بحدود 50 الف دولار', expected: { priceMax: 50000, priceMin: null } },
  { query: 'فلل للبيع في مدينة اللاذقية بحدود ٢٠٠ الف دولار', expected: { priceMax: 200000, priceMin: null } }
];

priceAroundTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Price Around ${index + 1} - ${test.query}`);
});

// Direct price: "سعر X"
const directPriceTests = [
  { query: 'شقة سعر 50 الف دولار', expected: { priceMax: 50000 } },
  { query: 'شقة سعر 100 الف دولار', expected: { priceMax: 100000 } },
  { query: 'شقة سعر 200 الف دولار', expected: { priceMax: 200000 } },
  { query: 'شقة سعر 50 الف ليرة', expected: { priceMax: 50000 } },
  { query: 'شقة سعر 50 الف ل.س', expected: { priceMax: 50000 } }
];

directPriceTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Direct Price ${index + 1} - ${test.query}`);
});

// ============================================
// CATEGORY 2: SIZE TESTS
// ============================================
console.log('📋 Category 2: Size Tests...');

// Size range: "مساحة بين X و Y"
const sizeRangeTests = [
  { query: 'شقة مساحة بين 50 و 100 متر', expected: { sizeMin: 50, sizeMax: 100 } },
  { query: 'شقة مساحة بين 100 و 200 متر', expected: { sizeMin: 100, sizeMax: 200 } },
  { query: 'شقة مساحة بين 200 و 500 متر', expected: { sizeMin: 200, sizeMax: 500 } },
  { query: 'شقة مساحة بين ٥٠ و ١٠٠ متر', expected: { sizeMin: 50, sizeMax: 100 } },
  { query: 'شقة مساحة من 50 الى 100 متر', expected: { sizeMin: 50, sizeMax: 100 } },
  { query: 'شقة مساحة من 50 إلى 100 متر', expected: { sizeMin: 50, sizeMax: 100 } }
];

sizeRangeTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Size Range ${index + 1} - ${test.query}`);
});

// Size less than: "مساحة اقل من X"
const sizeLessThanTests = [
  { query: 'شقة مساحة اقل من 100 متر', expected: { sizeMax: 100 } },
  { query: 'شقة مساحة اقل من 200 متر', expected: { sizeMax: 200 } },
  { query: 'شقة مساحة اقل من 500 متر', expected: { sizeMax: 500 } },
  { query: 'شقة مساحة اقل من ١٠٠ متر', expected: { sizeMax: 100 } }
];

sizeLessThanTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Size Less Than ${index + 1} - ${test.query}`);
});

// Size more than: "مساحة اكبر من X"
const sizeMoreThanTests = [
  { query: 'شقة مساحة اكبر من 100 متر', expected: { sizeMin: 100 } },
  { query: 'شقة مساحة اكبر من 200 متر', expected: { sizeMin: 200 } },
  { query: 'شقة مساحة اكبر من 500 متر', expected: { sizeMin: 500 } },
  { query: 'شقة مساحة اكبر من ١٠٠ متر', expected: { sizeMin: 100 } }
];

sizeMoreThanTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Size More Than ${index + 1} - ${test.query}`);
});

// Direct size: "مساحة X"
const directSizeTests = [
  { query: 'شقة مساحة 100 متر', expected: { sizeMin: 100, sizeMax: 100 } },
  { query: 'شقة مساحة 150 متر', expected: { sizeMin: 150, sizeMax: 150 } },
  { query: 'شقة مساحة 200 متر', expected: { sizeMin: 200, sizeMax: 200 } },
  { query: 'شقة مساحة ١٠٠ متر', expected: { sizeMin: 100, sizeMax: 100 } },
  { query: 'شقة 100 متر', expected: { sizeMin: 100, sizeMax: 100 } },
  { query: 'شقة 150 متر مربع', expected: { sizeMin: 150, sizeMax: 150 } }
];

directSizeTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Direct Size ${index + 1} - ${test.query}`);
});

// ============================================
// CATEGORY 3: CITY TESTS
// ============================================
console.log('📋 Category 3: City Tests...');

cities.forEach(city => {
  city.ar.forEach(arCity => {
    // Test with "في"
    testQuery(`شقة في ${arCity}`, { city: city.en }, `City - في ${arCity}`);
    
    // Test with "في مدينة"
    testQuery(`شقة في مدينة ${arCity}`, { city: city.en }, `City - في مدينة ${arCity}`);
    
    // Test with "في بلدة"
    testQuery(`شقة في بلدة ${arCity}`, { city: city.en }, `City - في بلدة ${arCity}`);
    
    // Test with "في قرية"
    testQuery(`شقة في قرية ${arCity}`, { city: city.en }, `City - في قرية ${arCity}`);
    
    // Test with status
    statuses.forEach(status => {
      testQuery(`شقة ${status.ar[0]} في ${arCity}`, { 
        city: city.en, 
        status: status.en 
      }, `City + Status - ${arCity} ${status.ar[0]}`);
    });
  });
});

// Test Syria (should clear city filter)
testQuery('عقارات في سوريا', { city: null }, 'Syria - should clear city');
testQuery('عقارات في سورية', { city: null }, 'Syria - should clear city');
testQuery('properties in Syria', { city: null }, 'Syria - should clear city');

// ============================================
// CATEGORY 4: STATUS TESTS
// ============================================
console.log('📋 Category 4: Status Tests...');

// Sale variations
const saleTests = [
  { query: 'شقة للبيع', expected: { status: 'sale' } },
  { query: 'شقة بيع', expected: { status: 'sale' } },
  { query: 'شقة شراء', expected: { status: 'sale' } },
  { query: 'شقة للشراء', expected: { status: 'sale' } },
  { query: 'apartment for sale', expected: { status: 'sale' } },
  { query: 'apartment sale', expected: { status: 'sale' } },
  { query: 'apartment buy', expected: { status: 'sale' } }
];

saleTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Sale ${index + 1} - ${test.query}`);
});

// Rent variations
const rentTests = [
  { query: 'شقة للإيجار', expected: { status: 'rent' } },
  { query: 'شقة للايجار', expected: { status: 'rent' } },
  { query: 'شقة إيجار', expected: { status: 'rent' } },
  { query: 'شقة ايجار', expected: { status: 'rent' } },
  { query: 'apartment for rent', expected: { status: 'rent' } },
  { query: 'apartment rent', expected: { status: 'rent' } },
  { query: 'apartment rental', expected: { status: 'rent' } }
];

rentTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Rent ${index + 1} - ${test.query}`);
});

// ============================================
// CATEGORY 5: COMBINED TESTS
// ============================================
console.log('📋 Category 5: Combined Tests (Price + Size + City + Status)...');

const combinedTests = [
  {
    query: 'شقة للبيع في دمشق سعر بين 50 و 100 الف دولار مساحة 150 متر',
    expected: {
      status: 'sale',
      city: 'Damascus',
      priceMin: 50000,
      priceMax: 100000,
      sizeMin: 150,
      sizeMax: 150
    }
  },
  {
    query: 'شقة للإيجار في حلب سعر اقل من 50 الف دولار مساحة اكبر من 100 متر',
    expected: {
      status: 'rent',
      city: 'Aleppo',
      priceMax: 50000,
      sizeMin: 100
    }
  },
  {
    query: 'فلل للبيع في اللاذقية بحدود 200 الف دولار',
    expected: {
      status: 'sale',
      city: 'Latakia',
      priceMax: 200000,
      priceMin: null
    }
  },
  {
    query: 'شقة للبيع في مدينة حمص سعر بين 20 و 50 الف دولار مساحة بين 100 و 200 متر',
    expected: {
      status: 'sale',
      city: 'Homs',
      priceMin: 20000,
      priceMax: 50000,
      sizeMin: 100,
      sizeMax: 200
    }
  },
  {
    query: 'شقة للإيجار في طرطوس سعر اعلى من 30 الف دولار مساحة اقل من 150 متر',
    expected: {
      status: 'rent',
      city: 'Tartus',
      priceMin: 30000,
      sizeMax: 150
    }
  },
  {
    query: 'عقار سعره اقل من ٥٠ الف دولار',
    expected: {
      priceMax: 50000
    }
  },
  {
    query: 'عقار سعره بحوالي ال٥٠ الف دولار',
    expected: {
      priceMax: 50000,
      priceMin: null
    }
  },
  {
    query: 'شقة مساحة 150 متر سعر اقل من 100 الف دولار',
    expected: {
      sizeMin: 150,
      sizeMax: 150,
      priceMax: 100000
    }
  }
];

combinedTests.forEach((test, index) => {
  testQuery(test.query, test.expected, `Combined ${index + 1} - ${test.query}`);
});

// Calculate duration
const endTime = Date.now();
const duration = ((endTime - startTime) / 1000).toFixed(2);

// Print results
console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(2)}%)`);
console.log(`❌ Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(2)}%)`);
console.log(`⏱️  Duration: ${duration}s`);
console.log('═══════════════════════════════════════════════════════\n');

// Print failures (limit to first 30)
if (failures.length > 0) {
  console.log('❌ FAILURES (showing first 30):\n');
  failures.slice(0, 30).forEach((failure, index) => {
    console.log(`${index + 1}. ${failure.test}`);
    console.log(`   Query: "${failure.query}"`);
    if (failure.errors) {
      failure.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    } else if (failure.error) {
      console.log(`   - Error: ${failure.error}`);
    }
    console.log('');
  });
  
  if (failures.length > 30) {
    console.log(`... and ${failures.length - 30} more failures\n`);
  }
}

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);

