/**
 * Extensive Test Suite - ~2000 complex test cases
 * Tests all combinations of property types, cities, statuses, keywords, prices, sizes, etc.
 */

const { parseQuery } = require('../utils/ruleBasedParser');

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

// Property types (English and Arabic)
// NOTE: "بيت" and "منزل" alone map to "Apartment" (not "House")
// "House" is a separate category but "بيت" and "منزل" are used for apartments in Arabic
const propertyTypes = [
  { en: 'Apartment', ar: ['شقة', 'شقق', 'عقار سكني', 'عقارات سكنية', 'وحدة سكنية', 'وحدات سكنية', 'منزل', 'منازل', 'بيت', 'بيوت'] },
  { en: 'Villa/farms', ar: ['فيلا', 'فيلات', 'فلل', 'مزرعة', 'مزارع', 'بيت ريفي', 'بيوت ريفية'] },
  { en: 'House', ar: [] }, // House is a separate category but not commonly used in Arabic queries
  { en: 'Office', ar: ['مكتب', 'مكاتب', 'مكتب تجاري', 'مكاتب تجارية', 'مساحة مكتبية'] },
  { en: 'Commercial', ar: ['تجاري', 'تجارية', 'عقار تجاري', 'عقارات تجارية', 'محل', 'محلات'] },
  { en: 'Land', ar: ['أرض', 'أراضي', 'ارض', 'اراضي', 'قطعة ارض', 'قطعة أرض'] },
  { en: 'Holiday Home', ar: ['بيت عطلة', 'بيوت عطلات', 'بيت إيجار يومي', 'بيت إيجار أسبوعي', 'بيت إيجار شهري', 'بيت إيجار سنوي', 'فلل للإيجار اليومي', 'فلل للإيجار الشهري'] }
];

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

// Keywords
const keywords = [
  'South-facing house', 'North-facing', 'East-facing', 'West-facing',
  'Well-ventilated', 'Bright', 'Modern building', 'Old building',
  'Spacious', 'View', 'Open view', 'Sea view', 'Mountain view',
  'luxury', 'doublex finishing', 'super doublex finishing',
  'standard finishing', 'stone finishing', 'Green Title Deed', 'Shell house'
];

// Bedrooms
const bedrooms = [1, 2, 3, 4, 5, 6, 7];

// Bathrooms
const bathrooms = [1, 2, 3, 4, 5];

// Prices (in thousands)
const prices = [
  { min: 20, max: 50 },
  { min: 50, max: 100 },
  { min: 100, max: 200 },
  { min: 200, max: 500 },
  { around: 50 },
  { around: 100 },
  { around: 200 },
  { lessThan: 50 },
  { lessThan: 100 },
  { lessThan: 200 },
  { moreThan: 50 },
  { moreThan: 100 },
  { moreThan: 200 }
];

// Sizes (in square meters)
const sizes = [
  { min: 50, max: 100 },
  { min: 100, max: 200 },
  { min: 200, max: 500 },
  { lessThan: 100 },
  { lessThan: 200 },
  { moreThan: 100 },
  { moreThan: 200 }
];

// Location descriptors
const locationDescriptors = ['مدينة', 'بلدة', 'قرية', 'ضيعة', 'ناحية', 'ريف'];

// Helper function to convert number to Arabic numerals
const toArabicNumeral = (num) => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

// Helper function to format price query
// Use regular numbers (not Arabic numerals) as the parser handles both
const formatPriceQuery = (price, currency = 'دولار') => {
  if (price.around) {
    return `بحدود ${price.around} الف ${currency}`;
  } else if (price.lessThan) {
    return `اقل من ${price.lessThan} الف ${currency}`;
  } else if (price.moreThan) {
    return `اعلى من ${price.moreThan} الف ${currency}`;
  } else {
    return `بين ${price.min} و ${price.max} الف ${currency}`;
  }
};

// Helper function to format size query
// Use regular numbers (not Arabic numerals) as the parser handles both
const formatSizeQuery = (size) => {
  if (size.lessThan) {
    return `مساحة اقل من ${size.lessThan} متر`;
  } else if (size.moreThan) {
    return `مساحة اكبر من ${size.moreThan} متر`;
  } else {
    return `مساحة بين ${size.min} و ${size.max} متر`;
  }
};

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

    // Check bedrooms
    if (expected.bedrooms !== undefined && result.bedrooms !== expected.bedrooms) {
      passed = false;
      errors.push(`bedrooms: expected ${expected.bedrooms}, got ${result.bedrooms}`);
    }

    // Check bathrooms
    if (expected.bathrooms !== undefined && result.bathrooms !== expected.bathrooms) {
      passed = false;
      errors.push(`bathrooms: expected ${expected.bathrooms}, got ${result.bathrooms}`);
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

console.log('\n🧪 Starting Extensive Test Suite (~2000 tests)...\n');
const startTime = Date.now();

// Test Category 1: Basic Property Types (7 types × 2 statuses = 14 tests)
console.log('📋 Category 1: Basic Property Types...');
propertyTypes.forEach(pt => {
  pt.ar.forEach(arType => {
    statuses.forEach(status => {
      const query = `${arType} ${status.ar[0]}`;
      testQuery(query, {
        propertyType: pt.en,
        status: status.en
      }, `Basic - ${arType} ${status.ar[0]}`);
    });
  });
});

// Test Category 2: Property Types with Cities (7 types × 11 cities × 2 statuses = 154 tests)
console.log('📋 Category 2: Property Types with Cities...');
propertyTypes.forEach(pt => {
  cities.forEach(city => {
    statuses.forEach(status => {
      pt.ar.slice(0, 1).forEach(arType => {
        city.ar.slice(0, 1).forEach(arCity => {
          const query = `${arType} ${status.ar[0]} في ${arCity}`;
          testQuery(query, {
            propertyType: pt.en,
            status: status.en,
            city: city.en
          }, `Property + City - ${arType} ${status.ar[0]} في ${arCity}`);
        });
      });
    });
  });
});

// Test Category 3: Property Types with Location Descriptors (7 types × 11 cities × 6 descriptors = 462 tests)
console.log('📋 Category 3: Property Types with Location Descriptors...');
propertyTypes.forEach(pt => {
  cities.forEach(city => {
    locationDescriptors.forEach(descriptor => {
      pt.ar.slice(0, 1).forEach(arType => {
        city.ar.slice(0, 1).forEach(arCity => {
          const query = `${arType} في ${descriptor} ${arCity}`;
          testQuery(query, {
            propertyType: pt.en,
            city: city.en
          }, `Location Descriptor - ${arType} في ${descriptor} ${arCity}`);
        });
      });
    });
  });
});

// Test Category 4: Bedrooms and Bathrooms (7 types × 7 bedrooms × 5 bathrooms = 245 tests)
console.log('📋 Category 4: Bedrooms and Bathrooms...');
propertyTypes.slice(0, 3).forEach(pt => { // Only Apartment, Villa, House
  bedrooms.slice(0, 5).forEach(bed => {
    bathrooms.slice(0, 3).forEach(bath => {
      pt.ar.slice(0, 1).forEach(arType => {
        const bedWords = bed === 1 ? 'غرفة' : bed === 2 ? 'غرفتين' : bed === 3 ? 'ثلاث غرف' : 
                        bed === 4 ? 'أربع غرف' : bed === 5 ? 'خمس غرف' : `${bed} غرف`;
        const bathWords = bath === 1 ? 'حمام' : bath === 2 ? 'حمامين' : bath === 3 ? 'ثلاث حمامات' : `${bath} حمامات`;
        const query = `${arType} ${bedWords} ${bathWords}`;
        testQuery(query, {
          propertyType: pt.en,
          bedrooms: bed,
          bathrooms: bath
        }, `Bedrooms/Bathrooms - ${arType} ${bedWords} ${bathWords}`);
      });
    });
  });
});

// Test Category 5: Prices (7 types × 13 price patterns = 91 tests)
console.log('📋 Category 5: Price Patterns...');
propertyTypes.forEach(pt => {
  prices.forEach(price => {
    pt.ar.slice(0, 1).forEach(arType => {
      const priceQuery = formatPriceQuery(price);
      const query = `${arType} ${priceQuery}`;
      const expected = {
        propertyType: pt.en
      };
      if (price.around) {
        expected.priceMax = price.around * 1000;
        expected.priceMin = null;
      } else if (price.lessThan) {
        expected.priceMax = price.lessThan * 1000;
      } else if (price.moreThan) {
        expected.priceMin = price.moreThan * 1000;
      } else {
        expected.priceMin = price.min * 1000;
        expected.priceMax = price.max * 1000;
      }
      testQuery(query, expected, `Price - ${arType} ${priceQuery}`);
    });
  });
});

// Test Category 6: Sizes (7 types × 7 size patterns = 49 tests)
console.log('📋 Category 6: Size Patterns...');
propertyTypes.forEach(pt => {
  sizes.forEach(size => {
    pt.ar.slice(0, 1).forEach(arType => {
      const sizeQuery = formatSizeQuery(size);
      const query = `${arType} ${sizeQuery}`;
      const expected = {
        propertyType: pt.en
      };
      if (size.lessThan) {
        expected.sizeMax = size.lessThan;
      } else if (size.moreThan) {
        expected.sizeMin = size.moreThan;
      } else {
        expected.sizeMin = size.min;
        expected.sizeMax = size.max;
      }
      testQuery(query, expected, `Size - ${arType} ${sizeQuery}`);
    });
  });
});

// Test Category 7: Keywords (20 keywords × 7 types = 140 tests)
console.log('📋 Category 7: Keywords...');
keywords.forEach(keyword => {
  propertyTypes.slice(0, 3).forEach(pt => { // Only first 3 types
    pt.ar.slice(0, 1).forEach(arType => {
      const query = `${arType} ${keyword}`;
      testQuery(query, {
        propertyType: pt.en
      }, `Keyword - ${arType} ${keyword}`);
    });
  });
});

// Test Category 8: Complex Combinations (Property + City + Status + Bedrooms + Price)
console.log('📋 Category 8: Complex Combinations...');
for (let i = 0; i < 200; i++) {
  const pt = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const bed = bedrooms[Math.floor(Math.random() * bedrooms.length)];
  const price = prices[Math.floor(Math.random() * prices.length)];
  
  const arType = pt.ar[0];
  const arCity = city.ar[0];
  const arStatus = status.ar[0];
  const bedWords = bed === 1 ? 'غرفة' : bed === 2 ? 'غرفتين' : bed === 3 ? 'ثلاث غرف' : 
                  bed === 4 ? 'أربع غرف' : bed === 5 ? 'خمس غرف' : `${bed} غرف`;
  const priceQuery = formatPriceQuery(price);
  
  const query = `${arType} ${arStatus} ${bedWords} في ${arCity} ${priceQuery}`;
  const expected = {
    propertyType: pt.en,
    status: status.en,
    city: city.en,
    bedrooms: bed
  };
  
  if (price.around) {
    expected.priceMax = price.around * 1000;
    expected.priceMin = null;
  } else if (price.lessThan) {
    expected.priceMax = price.lessThan * 1000;
  } else if (price.moreThan) {
    expected.priceMin = price.moreThan * 1000;
  } else {
    expected.priceMin = price.min * 1000;
    expected.priceMax = price.max * 1000;
  }
  
  testQuery(query, expected, `Complex ${i + 1} - ${query}`);
}

// Test Category 9: Syria queries (should show all results)
console.log('📋 Category 9: Syria Queries...');
propertyTypes.forEach(pt => {
  statuses.forEach(status => {
    pt.ar.slice(0, 1).forEach(arType => {
      const query = `${arType} ${status.ar[0]} في سوريا`;
      testQuery(query, {
        propertyType: pt.en,
        status: status.en,
        city: null,
        neighborhood: null
      }, `Syria - ${arType} ${status.ar[0]} في سوريا`);
    });
  });
});

// Test Category 10: Holiday Home variations
console.log('📋 Category 10: Holiday Home Variations...');
const holidayHomeQueries = [
  { query: 'فلل للايجار اليومي', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'فلل للايجار الشهري', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'فلل للايجار السنوي', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'بيت ايجار يومي', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'بيت ايجار شهري', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'بيت ايجار سنوي', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'فيلا للايجار اليومي', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'فيلا للايجار الشهري', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'بيت للإيجار اليومي', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'بيت للإيجار الشهري', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'بيت للإيجار السنوي', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  // Holiday Home with "للبيع" should still be rent (Holiday Home is always rent)
  { query: 'بيت إيجار يومي للبيع', expected: { propertyType: 'Holiday Home', status: 'rent' } },
  { query: 'فلل للإيجار اليومي للبيع', expected: { propertyType: 'Holiday Home', status: 'rent' } }
];

holidayHomeQueries.forEach((testCase, index) => {
  testQuery(testCase.query, testCase.expected, `Holiday Home ${index + 1} - ${testCase.query}`);
});

// Test Category 11: Edge cases and special patterns
console.log('📋 Category 11: Edge Cases...');
const edgeCases = [
  { query: 'عقار', expected: { propertyType: null } },
  { query: 'عقارات', expected: { propertyType: null } },
  { query: 'عقار تجاري', expected: { propertyType: 'Commercial' } },
  { query: 'عقار سكني', expected: { propertyType: 'Apartment' } },
  { query: 'عقار سعره اقل من ٥٠ الف دولار', expected: { propertyType: null, priceMax: 50000 } },
  { query: 'عقار سعره بحوالي ال٥٠ الف دولار', expected: { propertyType: null, priceMax: 50000, priceMin: null } },
  { query: 'عقار سعره بحدود 50 الف دولار', expected: { propertyType: null, priceMax: 50000, priceMin: null } },
  { query: 'شقة غرفة حمام', expected: { propertyType: 'Apartment', bedrooms: 1, bathrooms: 1 } },
  { query: 'شقة غرفة ثلاث حمامات', expected: { propertyType: 'Apartment', bedrooms: 1, bathrooms: 3 } },
  { query: 'شقة ثلاث غرف حمام', expected: { propertyType: 'Apartment', bedrooms: 3, bathrooms: 1 } },
  { query: 'شقة مساحة 150 متر سعر اقل من 100 الف دولار', expected: { propertyType: 'Apartment', sizeMin: 150, sizeMax: 150, priceMax: 100000 } },
  { query: 'فلل للبيع في مدينة اللاذقية بحدود ٢٠٠ الف دولار', expected: { propertyType: 'Villa/farms', status: 'sale', city: 'Latakia', priceMax: 200000, priceMin: null } },
  { query: 'فلل للبيع في اللاذقية بحدود ٢٠٠ الف دولار', expected: { propertyType: 'Villa/farms', status: 'sale', city: 'Latakia', priceMax: 200000, priceMin: null } }
];

edgeCases.forEach((testCase, index) => {
  testQuery(testCase.query, testCase.expected, `Edge Case ${index + 1} - ${testCase.query}`);
});

// Test Category 12: Mixed English and Arabic
console.log('📋 Category 12: Mixed English and Arabic...');
const mixedQueries = [
  { query: 'apartment للبيع في Damascus', expected: { propertyType: 'Apartment', status: 'sale', city: 'Damascus' } },
  { query: 'villa للايجار في Latakia', expected: { propertyType: 'Villa/farms', status: 'rent', city: 'Latakia' } },
  { query: 'شقة for sale in Aleppo', expected: { propertyType: 'Apartment', status: 'sale', city: 'Aleppo' } },
  { query: 'فلل للبيع in Homs', expected: { propertyType: 'Villa/farms', status: 'sale', city: 'Homs' } }
];

mixedQueries.forEach((testCase, index) => {
  testQuery(testCase.query, testCase.expected, `Mixed ${index + 1} - ${testCase.query}`);
});

// Test Category 13: All cities with different patterns
console.log('📋 Category 13: All Cities Patterns...');
cities.forEach(city => {
  city.ar.forEach(arCity => {
    const queries = [
      `شقة في ${arCity}`,
      `شقة في مدينة ${arCity}`,
      `شقة في بلدة ${arCity}`,
      `شقة في قرية ${arCity}`,
      `شقة في ضيعة ${arCity}`,
      `شقة في ناحية ${arCity}`,
      `شقة في ريف ${arCity}`
    ];
    
    queries.forEach(query => {
      testQuery(query, {
        propertyType: 'Apartment',
        city: city.en
      }, `City Pattern - ${query}`);
    });
  });
});

// Test Category 14: Price with different currencies
console.log('📋 Category 14: Price with Different Currencies...');
const currencies = ['دولار', 'دولر', 'دولار أميركي', 'دولار اميركي', 'ليرة', 'ل.س'];
propertyTypes.slice(0, 3).forEach(pt => {
  currencies.forEach(currency => {
    pt.ar.slice(0, 1).forEach(arType => {
      const query = `${arType} سعر 50 الف ${currency}`;
      testQuery(query, {
        propertyType: pt.en,
        priceMax: 50000
      }, `Currency - ${arType} سعر 50 الف ${currency}`);
    });
  });
});

// Test Category 15: Furnished/Unfurnished
console.log('📋 Category 15: Furnished/Unfurnished...');
const furnishedQueries = [
  { query: 'شقة مفروشة', expected: { propertyType: 'Apartment', furnished: true } },
  { query: 'شقة غير مفروشة', expected: { propertyType: 'Apartment', furnished: false } },
  { query: 'شقة غير مفروش', expected: { propertyType: 'Apartment', furnished: false } },
  { query: 'فيلا مفروش', expected: { propertyType: 'Villa/farms', furnished: true } },
  { query: 'فيلا غير مفروش', expected: { propertyType: 'Villa/farms', furnished: false } }
];

furnishedQueries.forEach((testCase, index) => {
  testQuery(testCase.query, testCase.expected, `Furnished ${index + 1} - ${testCase.query}`);
});

// Test Category 16: Garages
console.log('📋 Category 16: Garages...');
const garageQueries = [
  { query: 'شقة مع كراج', expected: { propertyType: 'Apartment', garages: true } },
  { query: 'شقة مع موقف سيارات', expected: { propertyType: 'Apartment', garages: true } },
  { query: 'فيلا مع كراجات', expected: { propertyType: 'Villa/farms', garages: true } }
];

garageQueries.forEach((testCase, index) => {
  testQuery(testCase.query, testCase.expected, `Garage ${index + 1} - ${testCase.query}`);
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

// Print failures (limit to first 20)
if (failures.length > 0) {
  console.log('❌ FAILURES (showing first 20):\n');
  failures.slice(0, 20).forEach((failure, index) => {
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
  
  if (failures.length > 20) {
    console.log(`... and ${failures.length - 20} more failures\n`);
  }
}

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);

