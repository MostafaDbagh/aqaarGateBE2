const { parseQuery } = require('../utils/ruleBasedParser');
const logger = require('../utils/logger');

// Disable logging for cleaner test output
const originalInfo = logger.info;
const originalDebug = logger.debug;
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
          passed = false;
          mismatches.push(`${key}: expected null, got ${actualValue}`);
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
 * Test Property Types
 */
function testPropertyTypes() {
  console.log('\n🏠 Testing Property Types...');
  
  // Apartment variations
  testCase('Apartment - شقة', 'شقة للبيع', { propertyType: 'Apartment', status: 'sale' }, 'Property Types');
  testCase('Apartment - شقق', 'شقق للإيجار', { propertyType: 'Apartment', status: 'rent' }, 'Property Types');
  testCase('Apartment - شقة سكنية', 'شقة سكنية', { propertyType: 'Apartment' }, 'Property Types');
  testCase('Apartment - منزل', 'منزل للبيع', { propertyType: 'Apartment', status: 'sale' }, 'Property Types');
  testCase('Apartment - بيت', 'بيت للإيجار', { propertyType: 'Apartment', status: 'rent' }, 'Property Types');
  testCase('Apartment - وحدة سكنية', 'وحدة سكنية', { propertyType: 'Apartment' }, 'Property Types');
  
  // Villa/farms variations
  testCase('Villa/farms - فيلا', 'فيلا للبيع', { propertyType: 'Villa/farms', status: 'sale' }, 'Property Types');
  testCase('Villa/farms - فلل', 'فلل للإيجار', { propertyType: 'Villa/farms', status: 'rent' }, 'Property Types');
  testCase('Villa/farms - مزرعة', 'مزرعة للبيع', { propertyType: 'Villa/farms', status: 'sale' }, 'Property Types');
  testCase('Villa/farms - مزارع', 'مزارع', { propertyType: 'Villa/farms' }, 'Property Types');
  testCase('Villa/farms - قصر', 'قصر للبيع', { propertyType: 'Villa/farms', status: 'sale' }, 'Property Types');
  
  // House variations
  testCase('House - house', 'house for sale', { propertyType: 'House', status: 'sale' }, 'Property Types');
  testCase('House - residential house', 'residential house', { propertyType: 'House' }, 'Property Types');
  
  // Office variations
  testCase('Office - مكتب', 'مكتب للإيجار', { propertyType: 'Office', status: 'rent' }, 'Property Types');
  testCase('Office - مكاتب', 'مكاتب تجارية', { propertyType: 'Office' }, 'Property Types');
  testCase('Office - مكتب عمل', 'مكتب عمل', { propertyType: 'Office' }, 'Property Types');
  
  // Commercial variations
  testCase('Commercial - محل', 'محل للبيع', { propertyType: 'Commercial', status: 'sale' }, 'Property Types');
  testCase('Commercial - متجر', 'متجر تجاري', { propertyType: 'Commercial' }, 'Property Types');
  testCase('Commercial - مول', 'مول للإيجار', { propertyType: 'Commercial', status: 'rent' }, 'Property Types');
  testCase('Commercial - معرض', 'معرض للبيع', { propertyType: 'Commercial', status: 'sale' }, 'Property Types');
  
  // Land variations
  testCase('Land - أرض', 'أرض للبيع', { propertyType: 'Land', status: 'sale' }, 'Property Types');
  testCase('Land - اراضي', 'اراضي', { propertyType: 'Land' }, 'Property Types');
  testCase('Land - قطعة أرض', 'قطعة أرض', { propertyType: 'Land' }, 'Property Types');
  testCase('Land - قطعة ارض', 'قطعة ارض للبيع', { propertyType: 'Land', status: 'sale' }, 'Property Types');
  testCase('Land - أرض بناء', 'أرض بناء', { propertyType: 'Land' }, 'Property Types');
  
  // Holiday Home variations
  testCase('Holiday Home - بيت عطلة', 'بيت عطلة', { propertyType: 'Holiday Home' }, 'Property Types');
  testCase('Holiday Home - بيوت عطلات', 'بيوت عطلات للإيجار', { propertyType: 'Holiday Home', status: 'rent' }, 'Property Types');
  testCase('Holiday Home - بيت إيجار يومي', 'بيت إيجار يومي', { propertyType: 'Holiday Home' }, 'Property Types');
  testCase('Holiday Home - بيت سياحي', 'بيت سياحي', { propertyType: 'Holiday Home' }, 'Property Types');
  testCase('Holiday Home - فيلا سياحية', 'فيلا سياحية', { propertyType: 'Holiday Home' }, 'Property Types');
  
  // Critical: بيت alone should be Apartment, not Holiday Home
  testCase('Apartment - بيت alone (not holiday)', 'بيت للبيع', { propertyType: 'Apartment', status: 'sale' }, 'Property Types');
  testCase('Apartment - منزل alone (not holiday)', 'منزل للإيجار', { propertyType: 'Apartment', status: 'rent' }, 'Property Types');
}

/**
 * Test Status (Rent/Sale)
 */
function testStatus() {
  console.log('\n💰 Testing Status (Rent/Sale)...');
  
  // Rent variations
  testCase('Rent - للإيجار', 'شقة للإيجار', { status: 'rent' }, 'Status');
  testCase('Rent - لايجار', 'شقة لايجار', { status: 'rent' }, 'Status');
  testCase('Rent - إيجار', 'شقة إيجار', { status: 'rent' }, 'Status');
  testCase('Rent - ايجار', 'شقة ايجار', { status: 'rent' }, 'Status');
  testCase('Rent - استئجار', 'شقة استئجار', { status: 'rent' }, 'Status');
  testCase('Rent - تأجير', 'شقة تأجير', { status: 'rent' }, 'Status');
  testCase('Rent - للاستئجار', 'شقة للاستئجار', { status: 'rent' }, 'Status');
  
  // Sale variations
  testCase('Sale - للبيع', 'شقة للبيع', { status: 'sale' }, 'Status');
  testCase('Sale - بيع', 'شقة بيع', { status: 'sale' }, 'Status');
  testCase('Sale - شراء', 'شقة شراء', { status: 'sale' }, 'Status');
  testCase('Sale - مباع', 'شقة مباع', { status: 'sale' }, 'Status');
  testCase('Sale - للشراء', 'شقة للشراء', { status: 'sale' }, 'Status');
}

/**
 * Test Bedrooms
 */
function testBedrooms() {
  console.log('\n🛏️ Testing Bedrooms...');
  
  testCase('Bedrooms - غرفة', 'شقة غرفة', { bedrooms: 1 }, 'Bedrooms');
  testCase('Bedrooms - غرفة واحدة', 'شقة غرفة واحدة', { bedrooms: 1 }, 'Bedrooms');
  testCase('Bedrooms - غرفتين', 'شقة غرفتين', { bedrooms: 2 }, 'Bedrooms');
  testCase('Bedrooms - ثلاث غرف', 'شقة ثلاث غرف', { bedrooms: 3 }, 'Bedrooms');
  testCase('Bedrooms - ثلاثة غرف', 'شقة ثلاثة غرف', { bedrooms: 3 }, 'Bedrooms');
  testCase('Bedrooms - أربع غرف', 'شقة أربع غرف', { bedrooms: 4 }, 'Bedrooms');
  testCase('Bedrooms - اربع غرف', 'شقة اربع غرف', { bedrooms: 4 }, 'Bedrooms');
  testCase('Bedrooms - خمس غرف', 'شقة خمس غرف', { bedrooms: 5 }, 'Bedrooms');
  testCase('Bedrooms - ست غرف', 'شقة ست غرف', { bedrooms: 6 }, 'Bedrooms');
  testCase('Bedrooms - سبع غرف', 'شقة سبع غرف', { bedrooms: 7 }, 'Bedrooms');
  testCase('Bedrooms - ثمان غرف', 'شقة ثمان غرف', { bedrooms: 8 }, 'Bedrooms');
  testCase('Bedrooms - تسع غرف', 'شقة تسع غرف', { bedrooms: 9 }, 'Bedrooms');
  testCase('Bedrooms - عشر غرف', 'شقة عشر غرف', { bedrooms: 10 }, 'Bedrooms');
  testCase('Bedrooms - 3 غرف', 'شقة 3 غرف', { bedrooms: 3 }, 'Bedrooms');
  testCase('Bedrooms - صالون', 'شقة غرفتين وصالون', { bedrooms: 3 }, 'Bedrooms');
}

/**
 * Test Bathrooms
 */
function testBathrooms() {
  console.log('\n🚿 Testing Bathrooms...');
  
  testCase('Bathrooms - حمام', 'شقة حمام', { bathrooms: 1 }, 'Bathrooms');
  testCase('Bathrooms - حمام واحد', 'شقة حمام واحد', { bathrooms: 1 }, 'Bathrooms');
  testCase('Bathrooms - حمامين', 'شقة حمامين', { bathrooms: 2 }, 'Bathrooms');
  testCase('Bathrooms - ثلاث حمامات', 'شقة ثلاث حمامات', { bathrooms: 3 }, 'Bathrooms');
  testCase('Bathrooms - أربع حمامات', 'شقة أربع حمامات', { bathrooms: 4 }, 'Bathrooms');
  testCase('Bathrooms - خمس حمامات', 'شقة خمس حمامات', { bathrooms: 5 }, 'Bathrooms');
  testCase('Bathrooms - ست حمامات', 'شقة ست حمامات', { bathrooms: 6 }, 'Bathrooms');
  testCase('Bathrooms - سبع حمامات', 'شقة سبع حمامات', { bathrooms: 7 }, 'Bathrooms');
  testCase('Bathrooms - ثمان حمامات', 'شقة ثمان حمامات', { bathrooms: 8 }, 'Bathrooms');
  testCase('Bathrooms - 2 حمامات', 'شقة 2 حمامات', { bathrooms: 2 }, 'Bathrooms');
}

/**
 * Test Price
 */
function testPrice() {
  console.log('\n💵 Testing Price...');
  
  // Dollar variations
  testCase('Price - 50 الف دولار', 'شقة 50 الف دولار', { priceMax: 50000 }, 'Price');
  testCase('Price - 50 الف دولر', 'شقة 50 الف دولر', { priceMax: 50000 }, 'Price');
  testCase('Price - 50 الف دولار أميركي', 'شقة 50 الف دولار أميركي', { priceMax: 50000 }, 'Price');
  testCase('Price - 50 الف دولار اميركي', 'شقة 50 الف دولار اميركي', { priceMax: 50000 }, 'Price');
  testCase('Price - مليون دولار', 'شقة مليون دولار', { priceMax: 1000000 }, 'Price');
  
  // Lira variations
  testCase('Price - 100 الف ليرة', 'شقة 100 الف ليرة', { priceMax: 100000 }, 'Price');
  testCase('Price - 100 الف ل.س', 'شقة 100 الف ل.س', { priceMax: 100000 }, 'Price');
  testCase('Price - مليون ليرة', 'شقة مليون ليرة', { priceMax: 1000000 }, 'Price');
  
  // Price range
  testCase('Price - سعر بين 50 و 100 الف', 'شقة سعر بين 50 و 100 الف', { priceMin: 50000, priceMax: 100000 }, 'Price');
  testCase('Price - سعر اقل من 100 الف', 'شقة سعر اقل من 100 الف', { priceMax: 100000 }, 'Price');
  testCase('Price - سعر اعلى من 50 الف', 'شقة سعر اعلى من 50 الف', { priceMin: 50000 }, 'Price');
  
  // Arabic number words
  testCase('Price - خمسين ألف دولار', 'شقة خمسين ألف دولار', { priceMax: 50000 }, 'Price');
  testCase('Price - عشرين ألف ليرة', 'شقة عشرين ألف ليرة', { priceMax: 20000 }, 'Price');
}

/**
 * Test Size/Area
 */
function testSize() {
  console.log('\n📐 Testing Size/Area...');
  
  testCase('Size - مساحة 100 متر', 'شقة مساحة 100 متر', { sizeMin: 100, sizeMax: 100 }, 'Size');
  testCase('Size - مساحة اكبر من 100 متر', 'شقة مساحة اكبر من 100 متر', { sizeMin: 100 }, 'Size');
  testCase('Size - مساحة اقل من 200 متر', 'شقة مساحة اقل من 200 متر', { sizeMax: 200 }, 'Size');
  testCase('Size - مساحة بين 100 و 200 متر', 'شقة مساحة بين 100 و 200 متر', { sizeMin: 100, sizeMax: 200 }, 'Size');
  testCase('Size - 150 متر مربع', 'شقة 150 متر مربع', { sizeMin: 150, sizeMax: 150 }, 'Size');
}

/**
 * Test Furnished/Unfurnished
 */
function testFurnished() {
  console.log('\n🪑 Testing Furnished/Unfurnished...');
  
  // Furnished
  testCase('Furnished - مفروش', 'شقة مفروش', { furnished: true }, 'Furnished');
  testCase('Furnished - مفروشة', 'شقة مفروشة', { furnished: true }, 'Furnished');
  testCase('Furnished - مجهز', 'شقة مجهز', { furnished: true }, 'Furnished');
  testCase('Furnished - مع أثاث', 'شقة مع أثاث', { furnished: true }, 'Furnished');
  testCase('Furnished - مكتمل الأثاث', 'شقة مكتمل الأثاث', { furnished: true }, 'Furnished');
  
  // Unfurnished
  testCase('Unfurnished - غير مفروش', 'شقة غير مفروش', { furnished: false }, 'Furnished');
  testCase('Unfurnished - بدون أثاث', 'شقة بدون أثاث', { furnished: false }, 'Furnished');
  testCase('Unfurnished - خالي', 'شقة خالي', { furnished: false }, 'Furnished');
  testCase('Unfurnished - فارغ', 'شقة فارغ', { furnished: false }, 'Furnished');
}

/**
 * Test Garages
 */
function testGarages() {
  console.log('\n🚗 Testing Garages...');
  
  testCase('Garages - كراج', 'شقة كراج', { garages: true }, 'Garages');
  testCase('Garages - جراج', 'شقة جراج', { garages: true }, 'Garages');
  testCase('Garages - موقف سيارات', 'شقة موقف سيارات', { garages: true }, 'Garages');
  testCase('Garages - مواقف سيارات', 'شقة مواقف سيارات', { garages: true }, 'Garages');
  testCase('Garages - موقف للسيارات', 'شقة موقف للسيارات', { garages: true }, 'Garages');
}

/**
 * Test View Types
 */
function testViewTypes() {
  console.log('\n🌊 Testing View Types...');
  
  testCase('View - إطلالة بحرية', 'شقة إطلالة بحرية', { viewType: 'sea view' }, 'View Types');
  testCase('View - منظر بحري', 'شقة منظر بحري', { viewType: 'sea view' }, 'View Types');
  testCase('View - إطلالة جبلية', 'شقة إطلالة جبلية', { viewType: 'mountain view' }, 'View Types');
  testCase('View - منظر جبلي', 'شقة منظر جبلي', { viewType: 'mountain view' }, 'View Types');
  testCase('View - إطلالة مفتوحة', 'شقة إطلالة مفتوحة', { viewType: 'open view' }, 'View Types');
}

/**
 * Test Cities
 */
function testCities() {
  console.log('\n🏙️ Testing Cities...');
  
  testCase('City - دمشق', 'شقة في دمشق', { city: 'Damascus' }, 'Cities');
  testCase('City - حلب', 'شقة في حلب', { city: 'Aleppo' }, 'Cities');
  testCase('City - اللاذقية', 'شقة في اللاذقية', { city: 'Latakia' }, 'Cities');
  testCase('City - طرطوس', 'شقة في طرطوس', { city: 'Tartus' }, 'Cities');
  testCase('City - حمص', 'شقة في حمص', { city: 'Homs' }, 'Cities');
}

/**
 * Test Complex Combinations
 */
function testComplexCombinations() {
  console.log('\n🔗 Testing Complex Combinations...');
  
  testCase('Complex - شقة 3 غرف 2 حمامات للبيع في دمشق', 
    'شقة 3 غرف 2 حمامات للبيع في دمشق', 
    { propertyType: 'Apartment', bedrooms: 3, bathrooms: 2, status: 'sale', city: 'Damascus' }, 
    'Complex');
  
  testCase('Complex - فيلا 4 غرف مع صالون للبيع', 
    'فيلا 4 غرف مع صالون للبيع', 
    { propertyType: 'Villa/farms', bedrooms: 5, status: 'sale' }, 
    'Complex');
  
  testCase('Complex - شقة مفروش 2 غرف للإيجار', 
    'شقة مفروش 2 غرف للإيجار', 
    { propertyType: 'Apartment', furnished: true, bedrooms: 2, status: 'rent' }, 
    'Complex');
  
  testCase('Complex - شقة مساحة 150 متر سعر اقل من 100 الف دولار', 
    'شقة مساحة 150 متر سعر اقل من 100 الف دولار', 
    { propertyType: 'Apartment', sizeMin: 150, sizeMax: 150, priceMax: 100000 }, 
    'Complex');
  
  testCase('Complex - بيت عطلة 2 غرف للإيجار', 
    'بيت عطلة 2 غرف للإيجار', 
    { propertyType: 'Holiday Home', bedrooms: 2, status: 'rent' }, 
    'Complex');
}

/**
 * Generate thousands of test cases
 */
function generateMassiveTests() {
  console.log('\n📊 Generating Massive Test Suite...');
  
  const propertyTypes = ['شقة', 'فيلا', 'مكتب', 'محل', 'أرض', 'بيت عطلة'];
  const statuses = ['للإيجار', 'للايجار', 'للبيع', 'بيع'];
  const bedrooms = ['غرفة', 'غرفتين', 'ثلاث غرف', 'أربع غرف', 'خمس غرف'];
  const bathrooms = ['حمام', 'حمامين', 'ثلاث حمامات'];
  const cities = ['دمشق', 'حلب', 'اللاذقية', 'طرطوس'];
  
  let generated = 0;
  
  // Generate combinations
  for (const prop of propertyTypes) {
    for (const stat of statuses) {
      for (const bed of bedrooms) {
        for (const bath of bathrooms) {
          for (const city of cities) {
            if (generated >= 1000) break; // Limit to 1000 combinations
            
            const query = `${prop} ${bed} ${bath} ${stat} في ${city}`;
            const expected = {
              propertyType: prop.includes('فيلا') ? 'Villa/farms' : 
                           prop.includes('مكتب') ? 'Office' :
                           prop.includes('محل') ? 'Commercial' :
                           prop.includes('أرض') ? 'Land' :
                           prop.includes('عطلة') ? 'Holiday Home' : 'Apartment',
              status: stat.includes('إيجار') || stat.includes('ايجار') ? 'rent' : 'sale',
              city: city === 'دمشق' ? 'Damascus' :
                    city === 'حلب' ? 'Aleppo' :
                    city === 'اللاذقية' ? 'Latakia' :
                    city === 'طرطوس' ? 'Tartus' : null
            };
            
            // Extract bedrooms
            if (bed.includes('غرفتين')) expected.bedrooms = 2;
            else if (bed.includes('ثلاث')) expected.bedrooms = 3;
            else if (bed.includes('أربع')) expected.bedrooms = 4;
            else if (bed.includes('خمس')) expected.bedrooms = 5;
            else expected.bedrooms = 1;
            
            // Extract bathrooms
            if (bath.includes('حمامين')) expected.bathrooms = 2;
            else if (bath.includes('ثلاث')) expected.bathrooms = 3;
            else expected.bathrooms = 1;
            
            testCase(`Generated - ${query}`, query, expected, 'Generated');
            generated++;
          }
          if (generated >= 1000) break;
        }
        if (generated >= 1000) break;
      }
      if (generated >= 1000) break;
    }
    if (generated >= 1000) break;
  }
  
  console.log(`\n✅ Generated ${generated} test cases`);
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🧪 Starting Comprehensive Arabic Parser Tests...\n');
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  // Run all test suites
  testPropertyTypes();
  testStatus();
  testBedrooms();
  testBathrooms();
  testPrice();
  testSize();
  testFurnished();
  testGarages();
  testViewTypes();
  testCities();
  testComplexCombinations();
  generateMassiveTests();
  
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

