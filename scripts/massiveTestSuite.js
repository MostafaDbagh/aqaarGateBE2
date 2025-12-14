/**
 * Massive Test Suite - 2000 English + 2000 Arabic tests
 * Comprehensive testing of all price, size, city, and status patterns
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

// Property types
const propertyTypes = [
  { en: 'Apartment', ar: ['شقة', 'شقق'] },
  { en: 'Villa/farms', ar: ['فيلا', 'فيلات', 'فلل'] },
  { en: 'House', ar: ['منزل', 'منازل'] },
  { en: 'Office', ar: ['مكتب', 'مكاتب'] },
  { en: 'Commercial', ar: ['تجاري', 'تجارية'] },
  { en: 'Land', ar: ['أرض', 'أراضي'] },
  { en: 'Holiday Home', ar: ['بيت عطلة', 'بيوت عطلات'] }
];

// Statuses
const statuses = [
  { en: 'sale', ar: ['للبيع', 'بيع'] },
  { en: 'rent', ar: ['للإيجار', 'للايجار'] }
];

// Price values (in thousands)
const priceValues = [20, 30, 50, 100, 150, 200, 250, 300, 400, 500];
const priceWords = {
  ar: ['مائة', 'مية', 'مئتان', 'مئتين', 'مليون', 'مليونان', 'مليونين', 'ثلاث ملايين'],
  en: ['hundred', 'two hundred', 'three hundred', 'thousand', 'k', 'K']
};

// Size values
const sizeValues = [50, 75, 100, 150, 200, 250, 300, 400, 500];

// Test function
function testQuery(query, expected, testName) {
  totalTests++;
  try {
    const result = parseQuery(query);
    let passed = true;
    const errors = [];

    // Check property type
    if (expected.propertyType !== undefined && result.propertyType !== expected.propertyType) {
      passed = false;
      errors.push(`propertyType: expected "${expected.propertyType}", got "${result.propertyType}"`);
    }

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

console.log('\n🧪 Starting Massive Test Suite (2000 English + 2000 Arabic tests)...\n');
const startTime = Date.now();

// ============================================
// ENGLISH TESTS (2000 tests)
// ============================================
console.log('📋 English Tests (2000 tests)...');

// Category 1: Basic property types with status (7 types × 2 statuses = 14)
propertyTypes.forEach(pt => {
  statuses.forEach(status => {
    testQuery(`${pt.en} ${status.en === 'sale' ? 'for sale' : 'for rent'}`, {
      propertyType: pt.en,
      status: status.en
    }, `EN Basic - ${pt.en} ${status.en}`);
  });
});

// Category 2: Property + City + Status (7 types × 11 cities × 2 statuses = 154)
propertyTypes.forEach(pt => {
  cities.forEach(city => {
    statuses.forEach(status => {
      testQuery(`${pt.en} ${status.en === 'sale' ? 'for sale' : 'for rent'} in ${city.en}`, {
        propertyType: pt.en,
        status: status.en,
        city: city.en
      }, `EN Property+City+Status - ${pt.en} ${status.en} in ${city.en}`);
    });
  });
});

// Category 3: Price patterns - between (10 values × 10 values = 100)
for (let i = 0; i < 100; i++) {
  const min = priceValues[Math.floor(Math.random() * priceValues.length)];
  const max = priceValues[Math.floor(Math.random() * priceValues.length)];
  if (min < max) {
    testQuery(`apartment price between ${min} and ${max} thousand dollars`, {
      priceMin: min * 1000,
      priceMax: max * 1000
    }, `EN Price Between ${i + 1} - ${min}k-${max}k`);
  }
}

// Category 4: Price patterns - less than (10 values = 10)
priceValues.forEach(val => {
  testQuery(`apartment less than ${val} thousand dollars`, {
    priceMax: val * 1000
  }, `EN Price Less Than - ${val}k`);
});

// Category 5: Price patterns - more than (10 values = 10)
priceValues.forEach(val => {
  testQuery(`apartment more than ${val} thousand dollars`, {
    priceMin: val * 1000
  }, `EN Price More Than - ${val}k`);
});

// Category 6: Price patterns - around (10 values = 10)
priceValues.forEach(val => {
  testQuery(`apartment around ${val} thousand dollars`, {
    priceMax: val * 1000,
    priceMin: null
  }, `EN Price Around - ${val}k`);
});

// Category 7: Price patterns - direct (10 values = 10)
priceValues.forEach(val => {
  testQuery(`apartment price ${val} thousand dollars`, {
    priceMax: val * 1000
  }, `EN Price Direct - ${val}k`);
});

// Category 8: Size patterns - between (9 values × 9 values = 81)
for (let i = 0; i < 81; i++) {
  const min = sizeValues[Math.floor(Math.random() * sizeValues.length)];
  const max = sizeValues[Math.floor(Math.random() * sizeValues.length)];
  if (min < max) {
    testQuery(`apartment size between ${min} and ${max} square meters`, {
      sizeMin: min,
      sizeMax: max
    }, `EN Size Between ${i + 1} - ${min}-${max}m²`);
  }
}

// Category 9: Size patterns - less than (9 values = 9)
sizeValues.forEach(val => {
  testQuery(`apartment size less than ${val} square meters`, {
    sizeMax: val
  }, `EN Size Less Than - ${val}m²`);
});

// Category 10: Size patterns - more than (9 values = 9)
sizeValues.forEach(val => {
  testQuery(`apartment size more than ${val} square meters`, {
    sizeMin: val
  }, `EN Size More Than - ${val}m²`);
});

// Category 11: Combined - Property + City + Price (7 types × 11 cities × 10 prices = 770)
propertyTypes.forEach(pt => {
  cities.forEach(city => {
    priceValues.slice(0, 10).forEach(price => {
      testQuery(`${pt.en} in ${city.en} price less than ${price} thousand dollars`, {
        propertyType: pt.en,
        city: city.en,
        priceMax: price * 1000
      }, `EN Combined ${pt.en} ${city.en} ${price}k`);
    });
  });
});

// Category 12: Combined - Property + Status + Price + Size (7 types × 2 statuses × 5 prices × 5 sizes = 350)
propertyTypes.forEach(pt => {
  statuses.forEach(status => {
    priceValues.slice(0, 5).forEach(price => {
      sizeValues.slice(0, 5).forEach(size => {
        testQuery(`${pt.en} ${status.en === 'sale' ? 'for sale' : 'for rent'} price ${price} thousand dollars size ${size} square meters`, {
          propertyType: pt.en,
          status: status.en,
          priceMax: price * 1000,
          sizeMin: size,
          sizeMax: size
        }, `EN Full ${pt.en} ${status.en} ${price}k ${size}m²`);
      });
    });
  });
});

// Category 13: Random complex combinations (500 tests)
for (let i = 0; i < 500; i++) {
  const pt = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const price = priceValues[Math.floor(Math.random() * priceValues.length)];
  const size = sizeValues[Math.floor(Math.random() * sizeValues.length)];
  
  const patterns = [
    `${pt.en} ${status.en === 'sale' ? 'for sale' : 'for rent'} in ${city.en} price around ${price} thousand dollars`,
    `${pt.en} in ${city.en} less than ${price} thousand dollars size ${size} square meters`,
    `${pt.en} ${status.en === 'sale' ? 'for sale' : 'for rent'} more than ${price} thousand dollars`,
    `${pt.en} price between ${price} and ${price * 2} thousand dollars in ${city.en}`,
    `${pt.en} size ${size} square meters price ${price} thousand dollars`
  ];
  
  const query = patterns[Math.floor(Math.random() * patterns.length)];
  testQuery(query, {
    propertyType: pt.en
  }, `EN Random ${i + 1}`);
}

// ============================================
// ARABIC TESTS (2000 tests)
// ============================================
console.log('📋 Arabic Tests (2000 tests)...');

// Category 1: Basic property types with status (7 types × 2 statuses = 14)
propertyTypes.forEach(pt => {
  statuses.forEach(status => {
    pt.ar.slice(0, 1).forEach(arType => {
      testQuery(`${arType} ${status.ar[0]}`, {
        propertyType: pt.en,
        status: status.en
      }, `AR Basic - ${arType} ${status.ar[0]}`);
    });
  });
});

// Category 2: Property + City + Status (7 types × 11 cities × 2 statuses = 154)
propertyTypes.forEach(pt => {
  cities.forEach(city => {
    statuses.forEach(status => {
      pt.ar.slice(0, 1).forEach(arType => {
        city.ar.slice(0, 1).forEach(arCity => {
          testQuery(`${arType} ${status.ar[0]} في ${arCity}`, {
            propertyType: pt.en,
            status: status.en,
            city: city.en
          }, `AR Property+City+Status - ${arType} ${status.ar[0]} في ${arCity}`);
        });
      });
    });
  });
});

// Category 3: Price patterns - between (100 tests)
for (let i = 0; i < 100; i++) {
  const min = priceValues[Math.floor(Math.random() * priceValues.length)];
  const max = priceValues[Math.floor(Math.random() * priceValues.length)];
  if (min < max) {
    testQuery(`شقة سعر بين ${min} و ${max} الف دولار`, {
      priceMin: min * 1000,
      priceMax: max * 1000
    }, `AR Price Between ${i + 1} - ${min}k-${max}k`);
  }
}

// Category 4: Price patterns - less than (10 values = 10)
priceValues.forEach(val => {
  testQuery(`شقة اقل من ${val} الف دولار`, {
    priceMax: val * 1000
  }, `AR Price Less Than - ${val}k`);
});

// Category 5: Price patterns - more than (10 values = 10)
priceValues.forEach(val => {
  testQuery(`شقة اعلى من ${val} الف دولار`, {
    priceMin: val * 1000
  }, `AR Price More Than - ${val}k`);
});

// Category 6: Price patterns - around (10 values = 10)
priceValues.forEach(val => {
  testQuery(`شقة بحدود ${val} الف دولار`, {
    priceMax: val * 1000,
    priceMin: null
  }, `AR Price Around - ${val}k`);
});

// Category 7: Price patterns - direct (10 values = 10)
priceValues.forEach(val => {
  testQuery(`شقة سعر ${val} الف دولار`, {
    priceMax: val * 1000
  }, `AR Price Direct - ${val}k`);
});

// Category 8: Price patterns - Arabic words (8 words = 8)
const arabicPriceWords = ['مائة', 'مية', 'مئتان', 'مئتين', 'مليون', 'مليونان', 'مليونين', 'ثلاث ملايين'];
arabicPriceWords.forEach(word => {
  let expectedPrice = null;
  if (word === 'مائة' || word === 'مية') expectedPrice = 100000;
  else if (word === 'مئتان' || word === 'مئتين') expectedPrice = 200000;
  else if (word === 'مليون') expectedPrice = 1000000;
  else if (word === 'مليونان' || word === 'مليونين') expectedPrice = 2000000;
  else if (word === 'ثلاث ملايين') expectedPrice = 3000000;
  
  if (expectedPrice) {
    testQuery(`شقة بحدود ${word} الف دولار`, {
      priceMax: expectedPrice,
      priceMin: null
    }, `AR Price Word - ${word}`);
  }
});

// Category 9: Size patterns - between (81 tests)
for (let i = 0; i < 81; i++) {
  const min = sizeValues[Math.floor(Math.random() * sizeValues.length)];
  const max = sizeValues[Math.floor(Math.random() * sizeValues.length)];
  if (min < max) {
    testQuery(`شقة مساحة بين ${min} و ${max} متر`, {
      sizeMin: min,
      sizeMax: max
    }, `AR Size Between ${i + 1} - ${min}-${max}m²`);
  }
}

// Category 10: Size patterns - less than (9 values = 9)
sizeValues.forEach(val => {
  testQuery(`شقة مساحة اقل من ${val} متر`, {
    sizeMax: val
  }, `AR Size Less Than - ${val}m²`);
});

// Category 11: Size patterns - more than (9 values = 9)
sizeValues.forEach(val => {
  testQuery(`شقة مساحة اكبر من ${val} متر`, {
    sizeMin: val
  }, `AR Size More Than - ${val}m²`);
});

// Category 12: Size patterns - direct (9 values = 9)
sizeValues.forEach(val => {
  testQuery(`شقة مساحة ${val} متر`, {
    sizeMin: val,
    sizeMax: val
  }, `AR Size Direct - ${val}m²`);
});

// Category 13: Combined - Property + City + Price (7 types × 11 cities × 10 prices = 770)
propertyTypes.forEach(pt => {
  cities.forEach(city => {
    priceValues.slice(0, 10).forEach(price => {
      pt.ar.slice(0, 1).forEach(arType => {
        city.ar.slice(0, 1).forEach(arCity => {
          testQuery(`${arType} في ${arCity} سعر اقل من ${price} الف دولار`, {
            propertyType: pt.en,
            city: city.en,
            priceMax: price * 1000
          }, `AR Combined ${arType} ${arCity} ${price}k`);
        });
      });
    });
  });
});

// Category 14: Combined - Property + Status + Price + Size (7 types × 2 statuses × 5 prices × 5 sizes = 350)
propertyTypes.forEach(pt => {
  statuses.forEach(status => {
    priceValues.slice(0, 5).forEach(price => {
      sizeValues.slice(0, 5).forEach(size => {
        pt.ar.slice(0, 1).forEach(arType => {
          testQuery(`${arType} ${status.ar[0]} سعر ${price} الف دولار مساحة ${size} متر`, {
            propertyType: pt.en,
            status: status.en,
            priceMax: price * 1000,
            sizeMin: size,
            sizeMax: size
          }, `AR Full ${arType} ${status.ar[0]} ${price}k ${size}m²`);
        });
      });
    });
  });
});

// Category 15: Random complex combinations (500 tests)
for (let i = 0; i < 500; i++) {
  const pt = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const price = priceValues[Math.floor(Math.random() * priceValues.length)];
  const size = sizeValues[Math.floor(Math.random() * sizeValues.length)];
  
  const patterns = [
    `${pt.ar[0]} ${status.ar[0]} في ${city.ar[0]} بحدود ${price} الف دولار`,
    `${pt.ar[0]} في ${city.ar[0]} اقل من ${price} الف دولار مساحة ${size} متر`,
    `${pt.ar[0]} ${status.ar[0]} اعلى من ${price} الف دولار`,
    `${pt.ar[0]} سعر بين ${price} و ${price * 2} الف دولار في ${city.ar[0]}`,
    `${pt.ar[0]} مساحة ${size} متر سعر ${price} الف دولار`
  ];
  
  const query = patterns[Math.floor(Math.random() * patterns.length)];
  testQuery(query, {
    propertyType: pt.en
  }, `AR Random ${i + 1}`);
}

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

// Print failures (limit to first 50)
if (failures.length > 0) {
  console.log('❌ FAILURES (showing first 50):\n');
  failures.slice(0, 50).forEach((failure, index) => {
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
  
  if (failures.length > 50) {
    console.log(`... and ${failures.length - 50} more failures\n`);
  }
}

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);

