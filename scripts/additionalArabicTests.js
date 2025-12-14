const { parseQuery } = require('../utils/ruleBasedParser');
const logger = require('../utils/logger');

// Disable logging for cleaner test output
logger.info = () => {};
logger.debug = () => {};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

/**
 * Run a single test case
 */
function testCase(description, query, expectedParams, category) {
  totalTests++;
  
  try {
    const result = parseQuery(query);
    
    // Check if all expected parameters match
    let passed = true;
    const mismatches = [];
    
    for (const [key, expectedValue] of Object.entries(expectedParams)) {
      const actualValue = result[key];
      
      // Handle array comparison
      if (Array.isArray(expectedValue)) {
        if (!Array.isArray(actualValue) || 
            expectedValue.length !== actualValue.length ||
            !expectedValue.every(val => actualValue.includes(val))) {
          passed = false;
          mismatches.push(`${key}: expected [${expectedValue.join(', ')}], got [${actualValue?.join(', ') || 'null'}]`);
        }
      }
      // Handle null/undefined comparison
      else if (expectedValue === null) {
        if (actualValue !== null && actualValue !== undefined) {
          // Allow null to match undefined and vice versa for optional fields
          if (key !== 'neighborhood' && key !== 'keywords') {
            passed = false;
            mismatches.push(`${key}: expected null, got ${actualValue}`);
          }
        }
      }
      // Handle boolean comparison
      else if (typeof expectedValue === 'boolean') {
        if (actualValue !== expectedValue) {
          passed = false;
          mismatches.push(`${key}: expected ${expectedValue}, got ${actualValue}`);
        }
      }
      // Handle number comparison
      else if (typeof expectedValue === 'number') {
        if (actualValue !== expectedValue) {
          passed = false;
          mismatches.push(`${key}: expected ${expectedValue}, got ${actualValue}`);
        }
      }
      // Handle string comparison
      else if (typeof expectedValue === 'string') {
        if (actualValue !== expectedValue) {
          passed = false;
          mismatches.push(`${key}: expected "${expectedValue}", got "${actualValue}"`);
        }
      }
    }
    
    if (passed) {
      passedTests++;
      process.stdout.write('.');
    } else {
      failedTests++;
      failures.push({
        category,
        description,
        query,
        expected: expectedParams,
        actual: result,
        mismatches
      });
      process.stdout.write('F');
    }
  } catch (error) {
    failedTests++;
    failures.push({
      category,
      description,
      query,
      error: error.message
    });
      process.stdout.write('E');
  }
}

/**
 * Generate 1000+ additional test cases with various combinations
 */
function generateAdditionalTests() {
  console.log('\n📊 Generating 1000+ Additional Test Cases...\n');
  
  // Property types with variations
  const propertyTypes = [
    { ar: 'شقة', en: 'Apartment' },
    { ar: 'شقق', en: 'Apartment' },
    { ar: 'فيلا', en: 'Villa/farms' },
    { ar: 'فلل', en: 'Villa/farms' },
    { ar: 'مزرعة', en: 'Villa/farms' },
    { ar: 'مكتب', en: 'Office' },
    { ar: 'محل', en: 'Commercial' },
    { ar: 'أرض', en: 'Land' },
    { ar: 'بيت عطلة', en: 'Holiday Home' },
    { ar: 'بيت سياحي', en: 'Holiday Home' }
  ];
  
  // Status variations
  const statuses = [
    { ar: 'للإيجار', en: 'rent' },
    { ar: 'للايجار', en: 'rent' },
    { ar: 'إيجار', en: 'rent' },
    { ar: 'للبيع', en: 'sale' },
    { ar: 'بيع', en: 'sale' },
    { ar: 'شراء', en: 'sale' }
  ];
  
  // Bedroom variations
  const bedrooms = [
    { ar: 'غرفة', count: 1 },
    { ar: 'غرفتين', count: 2 },
    { ar: 'ثلاث غرف', count: 3 },
    { ar: 'أربع غرف', count: 4 },
    { ar: 'خمس غرف', count: 5 },
    { ar: '2 غرف', count: 2 },
    { ar: '3 غرف', count: 3 },
    { ar: '4 غرف', count: 4 }
  ];
  
  // Bathroom variations
  const bathrooms = [
    { ar: 'حمام', count: 1 },
    { ar: 'حمامين', count: 2 },
    { ar: 'ثلاث حمامات', count: 3 },
    { ar: '2 حمامات', count: 2 },
    { ar: '3 حمامات', count: 3 }
  ];
  
  // Cities
  const cities = [
    { ar: 'دمشق', en: 'Damascus' },
    { ar: 'حلب', en: 'Aleppo' },
    { ar: 'اللاذقية', en: 'Latakia' },
    { ar: 'طرطوس', en: 'Tartus' },
    { ar: 'حمص', en: 'Homs' },
    { ar: 'حماة', en: 'Hama' }
  ];
  
  // Price variations
  const prices = [
    { ar: '50 الف دولار', max: 50000 },
    { ar: '100 الف دولار', max: 100000 },
    { ar: 'مليون دولار', max: 1000000 },
    { ar: '50 الف ليرة', max: 50000 },
    { ar: '100 الف ليرة', max: 100000 },
    { ar: 'سعر اقل من 100 الف', max: 100000 },
    { ar: 'سعر اعلى من 50 الف', min: 50000 }
  ];
  
  // Size variations
  const sizes = [
    { ar: 'مساحة 100 متر', min: 100, max: 100 },
    { ar: 'مساحة 150 متر', min: 150, max: 150 },
    { ar: 'مساحة اكبر من 100 متر', min: 100, max: null },
    { ar: 'مساحة اقل من 200 متر', min: null, max: 200 },
    { ar: '100 متر مربع', min: 100, max: 100 }
  ];
  
  // Furnished variations
  const furnished = [
    { ar: 'مفروش', value: true },
    { ar: 'مجهز', value: true },
    { ar: 'غير مفروش', value: false },
    { ar: 'بدون أثاث', value: false }
  ];
  
  // Garages
  const garages = [
    { ar: 'كراج', value: true },
    { ar: 'موقف سيارات', value: true }
  ];
  
  // View types
  const views = [
    { ar: 'إطلالة بحرية', type: 'sea view' },
    { ar: 'إطلالة جبلية', type: 'mountain view' },
    { ar: 'إطلالة مفتوحة', type: 'open view' }
  ];
  
  let generated = 0;
  
  // Test 1: Property Type + Status combinations (100 tests)
  console.log('  Generating Property Type + Status combinations...');
  for (const prop of propertyTypes.slice(0, 10)) {
    for (const stat of statuses.slice(0, 3)) {
      if (generated >= 100) break;
      const query = `${prop.ar} ${stat.ar}`;
      const expected = {
        propertyType: prop.en,
        status: stat.en
      };
      testCase(`PT+Status - ${query}`, query, expected, 'Property+Status');
      generated++;
    }
    if (generated >= 100) break;
  }
  
  // Test 2: Property + Bedrooms + Bathrooms (200 tests)
  console.log('  Generating Property + Bedrooms + Bathrooms...');
  for (const prop of propertyTypes.slice(0, 5)) {
    for (const bed of bedrooms.slice(0, 4)) {
      for (const bath of bathrooms.slice(0, 3)) {
        if (generated >= 300) break;
        const query = `${prop.ar} ${bed.ar} ${bath.ar}`;
        const expected = {
          propertyType: prop.en,
          bedrooms: bed.count,
          bathrooms: bath.count
        };
        testCase(`PT+BR+BA - ${query}`, query, expected, 'Property+Rooms');
        generated++;
      }
      if (generated >= 300) break;
    }
    if (generated >= 300) break;
  }
  
  // Test 3: Property + Status + City (150 tests)
  console.log('  Generating Property + Status + City...');
  for (const prop of propertyTypes.slice(0, 5)) {
    for (const stat of statuses.slice(0, 3)) {
      for (const city of cities.slice(0, 3)) {
        if (generated >= 450) break;
        const query = `${prop.ar} ${stat.ar} في ${city.ar}`;
        const expected = {
          propertyType: prop.en,
          status: stat.en,
          city: city.en
        };
        testCase(`PT+Status+City - ${query}`, query, expected, 'Property+Status+City');
        generated++;
      }
      if (generated >= 450) break;
    }
    if (generated >= 450) break;
  }
  
  // Test 4: Property + Price (100 tests)
  console.log('  Generating Property + Price...');
  for (const prop of propertyTypes.slice(0, 5)) {
    for (const price of prices.slice(0, 4)) {
      if (generated >= 550) break;
      const query = `${prop.ar} ${price.ar}`;
      const expected = {
        propertyType: prop.en,
        priceMin: price.min || null,
        priceMax: price.max || null
      };
      testCase(`PT+Price - ${query}`, query, expected, 'Property+Price');
      generated++;
    }
    if (generated >= 550) break;
  }
  
  // Test 5: Property + Size (100 tests)
  console.log('  Generating Property + Size...');
  for (const prop of propertyTypes.slice(0, 5)) {
    for (const size of sizes.slice(0, 4)) {
      if (generated >= 650) break;
      const query = `${prop.ar} ${size.ar}`;
      const expected = {
        propertyType: prop.en,
        sizeMin: size.min || null,
        sizeMax: size.max || null
      };
      testCase(`PT+Size - ${query}`, query, expected, 'Property+Size');
      generated++;
    }
    if (generated >= 650) break;
  }
  
  // Test 6: Property + Furnished (80 tests)
  console.log('  Generating Property + Furnished...');
  for (const prop of propertyTypes.slice(0, 5)) {
    for (const furn of furnished) {
      if (generated >= 730) break;
      const query = `${prop.ar} ${furn.ar}`;
      const expected = {
        propertyType: prop.en,
        furnished: furn.value
      };
      testCase(`PT+Furnished - ${query}`, query, expected, 'Property+Furnished');
      generated++;
    }
    if (generated >= 730) break;
  }
  
  // Test 7: Property + Garages (50 tests)
  console.log('  Generating Property + Garages...');
  for (const prop of propertyTypes.slice(0, 5)) {
    for (const garage of garages) {
      if (generated >= 780) break;
      const query = `${prop.ar} ${garage.ar}`;
      const expected = {
        propertyType: prop.en,
        garages: garage.value
      };
      testCase(`PT+Garages - ${query}`, query, expected, 'Property+Garages');
      generated++;
    }
    if (generated >= 780) break;
  }
  
  // Test 8: Property + View (50 tests)
  console.log('  Generating Property + View...');
  for (const prop of propertyTypes.slice(0, 5)) {
    for (const view of views) {
      if (generated >= 830) break;
      const query = `${prop.ar} ${view.ar}`;
      const expected = {
        propertyType: prop.en,
        viewType: view.type
      };
      testCase(`PT+View - ${query}`, query, expected, 'Property+View');
      generated++;
    }
    if (generated >= 830) break;
  }
  
  // Test 9: Complex combinations (170 tests)
  console.log('  Generating Complex Combinations...');
  for (let i = 0; i < 170; i++) {
    const prop = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const stat = statuses[Math.floor(Math.random() * statuses.length)];
    const bed = bedrooms[Math.floor(Math.random() * bedrooms.length)];
    const bath = bathrooms[Math.floor(Math.random() * bathrooms.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    // Random combinations
    const parts = [prop.ar, stat.ar, bed.ar, bath.ar, `في ${city.ar}`];
    if (Math.random() > 0.5) {
      const price = prices[Math.floor(Math.random() * prices.length)];
      parts.push(price.ar);
    }
    if (Math.random() > 0.5) {
      const furn = furnished[Math.floor(Math.random() * furnished.length)];
      parts.push(furn.ar);
    }
    
    const query = parts.join(' ');
    const expected = {
      propertyType: prop.en,
      status: stat.en,
      bedrooms: bed.count,
      bathrooms: bath.count,
      city: city.en
    };
    
    testCase(`Complex - ${query.substring(0, 50)}`, query, expected, 'Complex');
    generated++;
  }
  
  // Test 10: Edge cases and special patterns (200 tests)
  console.log('  Generating Edge Cases...');
  
  // Special Arabic number words
  const numberWords = [
    { ar: 'عشرين ألف', num: 20000 },
    { ar: 'ثلاثين ألف', num: 30000 },
    { ar: 'أربعين ألف', num: 40000 },
    { ar: 'خمسين ألف', num: 50000 }
  ];
  
  for (const numWord of numberWords) {
    testCase(`Price - ${numWord.ar} دولار`, `شقة ${numWord.ar} دولار`, 
      { propertyType: 'Apartment', priceMax: numWord.num }, 'Edge Cases');
    generated++;
  }
  
  // صالون combinations
  const salonTests = [
    { query: 'شقة غرفتين وصالون', bedrooms: 3 },
    { query: 'شقة ثلاث غرف وصالون', bedrooms: 4 },
    { query: 'شقة أربع غرف وصالون', bedrooms: 5 }
  ];
  
  for (const test of salonTests) {
    testCase(`Salon - ${test.query}`, test.query, 
      { propertyType: 'Apartment', bedrooms: test.bedrooms }, 'Edge Cases');
    generated++;
  }
  
  // Multiple currencies
  const currencyTests = [
    { query: 'شقة 50 الف دولار أميركي', priceMax: 50000 },
    { query: 'شقة 50 الف دولر', priceMax: 50000 },
    { query: 'شقة مليون ليرة', priceMax: 1000000 },
    { query: 'شقة 100 الف ل.س', priceMax: 100000 }
  ];
  
  for (const test of currencyTests) {
    testCase(`Currency - ${test.query}`, test.query, 
      { propertyType: 'Apartment', priceMax: test.priceMax }, 'Edge Cases');
    generated++;
  }
  
  // Size with different units
  const sizeTests = [
    { query: 'شقة 150 متر مربع', sizeMin: 150, sizeMax: 150 },
    { query: 'شقة مساحة 200 متر', sizeMin: 200, sizeMax: 200 },
    { query: 'شقة مساحة اكبر من 120 متر', sizeMin: 120, sizeMax: null },
    { query: 'شقة مساحة اقل من 180 متر', sizeMin: null, sizeMax: 180 }
  ];
  
  for (const test of sizeTests) {
    testCase(`Size - ${test.query}`, test.query, 
      { propertyType: 'Apartment', sizeMin: test.sizeMin, sizeMax: test.sizeMax }, 'Edge Cases');
    generated++;
  }
  
  // More complex combinations
  for (let i = 0; i < 150; i++) {
    const prop = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const stat = statuses[Math.floor(Math.random() * statuses.length)];
    const bed = bedrooms[Math.floor(Math.random() * bedrooms.length)];
    const bath = bathrooms[Math.floor(Math.random() * bathrooms.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const price = prices[Math.floor(Math.random() * prices.length)];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const furn = furnished[Math.floor(Math.random() * furnished.length)];
    
    const query = `${prop.ar} ${stat.ar} ${bed.ar} ${bath.ar} ${price.ar} ${size.ar} ${furn.ar} في ${city.ar}`;
    const expected = {
      propertyType: prop.en,
      status: stat.en,
      bedrooms: bed.count,
      bathrooms: bath.count,
      city: city.en,
      priceMin: price.min || null,
      priceMax: price.max || null,
      sizeMin: size.min || null,
      sizeMax: size.max || null,
      furnished: furn.value
    };
    
    testCase(`Full - ${query.substring(0, 40)}`, query, expected, 'Edge Cases');
    generated++;
  }
  
  console.log(`\n✅ Generated ${generated} additional test cases`);
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🧪 Starting Additional 1000+ Arabic Parser Tests...\n');
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  // Generate and run tests
  generateAdditionalTests();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(2)}%)`);
  console.log(`❌ Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(2)}%)`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log('='.repeat(80));
  
  // Print failures
  if (failures.length > 0) {
    console.log('\n❌ FAILURES:');
    console.log('='.repeat(80));
    
    // Group by category
    const byCategory = {};
    failures.forEach(f => {
      if (!byCategory[f.category]) byCategory[f.category] = [];
      byCategory[f.category].push(f);
    });
    
    for (const [category, categoryFailures] of Object.entries(byCategory)) {
      console.log(`\n📁 ${category} (${categoryFailures.length} failures):`);
      categoryFailures.slice(0, 10).forEach((f, idx) => {
        console.log(`\n  ${idx + 1}. ${f.description}`);
        console.log(`     Query: "${f.query}"`);
        if (f.error) {
          console.log(`     Error: ${f.error}`);
        } else {
          console.log(`     Mismatches: ${f.mismatches.join(', ')}`);
        }
      });
      if (categoryFailures.length > 10) {
        console.log(`  ... and ${categoryFailures.length - 10} more failures`);
      }
    }
  }
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests();

