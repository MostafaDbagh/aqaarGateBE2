const { parseQuery } = require('./utils/ruleBasedParser');

/**
 * Comprehensive test for Arabic room and bathroom detection
 * Tests that "rooms" and "bedrooms" are treated the same
 * Tests Arabic bathroom detection with various patterns
 */

const testCases = [
  // ===== BASIC ROOM PATTERNS (Arabic words) =====
  { query: 'شقة غرفة واحدة', expected: { bedrooms: 1, bathrooms: null }, description: 'One room (word)' },
  { query: 'شقة غرفتين', expected: { bedrooms: 2, bathrooms: null }, description: 'Two rooms (word)' },
  { query: 'شقة ثلاث غرف', expected: { bedrooms: 3, bathrooms: null }, description: 'Three rooms (word)' },
  { query: 'شقة اربع غرف', expected: { bedrooms: 4, bathrooms: null }, description: 'Four rooms (word, no hamza)' },
  { query: 'شقة أربع غرف', expected: { bedrooms: 4, bathrooms: null }, description: 'Four rooms (word, with hamza)' },
  { query: 'شقة خمس غرف', expected: { bedrooms: 5, bathrooms: null }, description: 'Five rooms (word)' },
  
  // ===== BASIC ROOM PATTERNS (Arabic numerals) =====
  { query: 'شقة ١ غرفة', expected: { bedrooms: 1, bathrooms: null }, description: 'One room (Arabic numeral)' },
  { query: 'شقة ٢ غرف', expected: { bedrooms: 2, bathrooms: null }, description: 'Two rooms (Arabic numeral)' },
  { query: 'شقة ٣ غرف', expected: { bedrooms: 3, bathrooms: null }, description: 'Three rooms (Arabic numeral)' },
  { query: 'شقة ٤ غرف', expected: { bedrooms: 4, bathrooms: null }, description: 'Four rooms (Arabic numeral)' },
  { query: 'شقة ٥ غرف', expected: { bedrooms: 5, bathrooms: null }, description: 'Five rooms (Arabic numeral)' },
  
  // ===== BASIC ROOM PATTERNS (Latin numerals) =====
  { query: 'شقة 1 غرفة', expected: { bedrooms: 1, bathrooms: null }, description: 'One room (Latin numeral)' },
  { query: 'شقة 2 غرف', expected: { bedrooms: 2, bathrooms: null }, description: 'Two rooms (Latin numeral)' },
  { query: 'شقة 3 غرف', expected: { bedrooms: 3, bathrooms: null }, description: 'Three rooms (Latin numeral)' },
  { query: 'شقة 4 غرف', expected: { bedrooms: 4, bathrooms: null }, description: 'Four rooms (Latin numeral)' },
  { query: 'شقة 5 غرف', expected: { bedrooms: 5, bathrooms: null }, description: 'Five rooms (Latin numeral)' },
  
  // ===== BASIC BATHROOM PATTERNS (Arabic words) =====
  { query: 'شقة حمام واحد', expected: { bedrooms: null, bathrooms: 1 }, description: 'One bathroom (word)' },
  { query: 'شقة حمامين', expected: { bedrooms: null, bathrooms: 2 }, description: 'Two bathrooms (word)' },
  { query: 'شقة ثلاث حمامات', expected: { bedrooms: null, bathrooms: 3 }, description: 'Three bathrooms (word)' },
  { query: 'شقة اربع حمامات', expected: { bedrooms: null, bathrooms: 4 }, description: 'Four bathrooms (word, no hamza)' },
  { query: 'شقة أربع حمامات', expected: { bedrooms: null, bathrooms: 4 }, description: 'Four bathrooms (word, with hamza)' },
  { query: 'شقة خمس حمامات', expected: { bedrooms: null, bathrooms: 5 }, description: 'Five bathrooms (word)' },
  
  // ===== BASIC BATHROOM PATTERNS (Arabic numerals) =====
  { query: 'شقة ١ حمام', expected: { bedrooms: null, bathrooms: 1 }, description: 'One bathroom (Arabic numeral)' },
  { query: 'شقة ٢ حمام', expected: { bedrooms: null, bathrooms: 2 }, description: 'Two bathrooms (Arabic numeral)' },
  { query: 'شقة ٣ حمامات', expected: { bedrooms: null, bathrooms: 3 }, description: 'Three bathrooms (Arabic numeral)' },
  { query: 'شقة ٤ حمامات', expected: { bedrooms: null, bathrooms: 4 }, description: 'Four bathrooms (Arabic numeral)' },
  { query: 'شقة ٥ حمامات', expected: { bedrooms: null, bathrooms: 5 }, description: 'Five bathrooms (Arabic numeral)' },
  
  // ===== BASIC BATHROOM PATTERNS (Latin numerals) =====
  { query: 'شقة 1 حمام', expected: { bedrooms: null, bathrooms: 1 }, description: 'One bathroom (Latin numeral)' },
  { query: 'شقة 2 حمام', expected: { bedrooms: null, bathrooms: 2 }, description: 'Two bathrooms (Latin numeral)' },
  { query: 'شقة 3 حمامات', expected: { bedrooms: null, bathrooms: 3 }, description: 'Three bathrooms (Latin numeral)' },
  { query: 'شقة 4 حمامات', expected: { bedrooms: null, bathrooms: 4 }, description: 'Four bathrooms (Latin numeral)' },
  { query: 'شقة 5 حمامات', expected: { bedrooms: null, bathrooms: 5 }, description: 'Five bathrooms (Latin numeral)' },
  
  // ===== COMBINED PATTERNS (words) =====
  { query: 'شقة غرفتين حمامين', expected: { bedrooms: 2, bathrooms: 2 }, description: 'Two rooms + two bathrooms (words)' },
  { query: 'شقة ثلاث غرف ثلاث حمامات', expected: { bedrooms: 3, bathrooms: 3 }, description: 'Three rooms + three bathrooms (words)' },
  { query: 'شقة اربع غرف اربع حمامات', expected: { bedrooms: 4, bathrooms: 4 }, description: 'Four rooms + four bathrooms (words, no hamza)' },
  { query: 'شقة أربع غرف أربع حمامات', expected: { bedrooms: 4, bathrooms: 4 }, description: 'Four rooms + four bathrooms (words, with hamza)' },
  { query: 'اريد شقة من اربعة غرف وثلاث حمامات', expected: { bedrooms: 4, bathrooms: 3 }, description: 'Four rooms + three bathrooms (words, full sentence)' },
  { query: 'اريد شقة من اربع غرف وحمامين', expected: { bedrooms: 4, bathrooms: 2 }, description: 'Four rooms + two bathrooms (words, full sentence)' },
  
  // ===== COMBINED PATTERNS (Arabic numerals) =====
  { query: 'شقة ٢ غرف ٢ حمام', expected: { bedrooms: 2, bathrooms: 2 }, description: 'Two rooms + two bathrooms (Arabic numerals)' },
  { query: 'شقة ٣ غرف ٣ حمامات', expected: { bedrooms: 3, bathrooms: 3 }, description: 'Three rooms + three bathrooms (Arabic numerals)' },
  { query: 'اريد ٤ غرف و٣ حمامات', expected: { bedrooms: 4, bathrooms: 3 }, description: 'Four rooms + three bathrooms (Arabic numerals)' },
  { query: 'اريد ٢ غرف و١ حمام', expected: { bedrooms: 2, bathrooms: 1 }, description: 'Two rooms + one bathroom (Arabic numerals)' },
  { query: 'شقة ٥ غرف ٤ حمامات', expected: { bedrooms: 5, bathrooms: 4 }, description: 'Five rooms + four bathrooms (Arabic numerals)' },
  
  // ===== COMBINED PATTERNS (Latin numerals) =====
  { query: 'شقة 2 غرف 2 حمام', expected: { bedrooms: 2, bathrooms: 2 }, description: 'Two rooms + two bathrooms (Latin numerals)' },
  { query: 'شقة 3 غرف 3 حمامات', expected: { bedrooms: 3, bathrooms: 3 }, description: 'Three rooms + three bathrooms (Latin numerals)' },
  { query: 'اريد 4 غرف و3 حمامات', expected: { bedrooms: 4, bathrooms: 3 }, description: 'Four rooms + three bathrooms (Latin numerals)' },
  { query: 'اريد 2 غرف و1 حمام', expected: { bedrooms: 2, bathrooms: 1 }, description: 'Two rooms + one bathroom (Latin numerals)' },
  { query: 'شقة 5 غرف 4 حمامات', expected: { bedrooms: 5, bathrooms: 4 }, description: 'Five rooms + four bathrooms (Latin numerals)' },
  
  // ===== MIXED PATTERNS (Arabic + Latin numerals) =====
  { query: 'شقة ٢ غرف 2 حمام', expected: { bedrooms: 2, bathrooms: 2 }, description: 'Two rooms (Arabic) + two bathrooms (Latin)' },
  { query: 'شقة 3 غرف ٣ حمامات', expected: { bedrooms: 3, bathrooms: 3 }, description: 'Three rooms (Latin) + three bathrooms (Arabic)' },
  
  // ===== WITH SALON (should add 1 to bedrooms) =====
  { query: 'شقة غرفتين وصالون', expected: { bedrooms: 3, bathrooms: null }, description: 'Two rooms + salon = 3 total' },
  { query: 'شقة ثلاث غرف وصالون', expected: { bedrooms: 4, bathrooms: null }, description: 'Three rooms + salon = 4 total' },
  { query: 'شقة اربع غرف وصالون', expected: { bedrooms: 5, bathrooms: null }, description: 'Four rooms + salon = 5 total' },
  { query: 'شقة غرفتين وصالون حمامين', expected: { bedrooms: 3, bathrooms: 2 }, description: 'Two rooms + salon + two bathrooms = 3 bedrooms, 2 bathrooms' },
  
  // ===== EDGE CASES =====
  { query: 'حمام', expected: { bedrooms: null, bathrooms: 1 }, description: 'Just "bathroom" = 1 bathroom' },
  { query: 'شقة حمام', expected: { bedrooms: null, bathrooms: 1 }, description: 'Apartment + bathroom = 1 bathroom' },
  { query: 'شقة غرفة', expected: { bedrooms: 1, bathrooms: null }, description: 'Apartment + room = 1 bedroom' },
  { query: 'اريد شقة', expected: { bedrooms: null, bathrooms: null }, description: 'Just "I want apartment" = no rooms/baths' },
  
  // ===== WITH OTHER DETAILS =====
  { query: 'شقة غرفتين حمامين في حلب', expected: { bedrooms: 2, bathrooms: 2 }, description: 'Two rooms + two bathrooms + city' },
  { query: 'شقة ثلاث غرف ثلاث حمامات للايجار', expected: { bedrooms: 3, bathrooms: 3 }, description: 'Three rooms + three bathrooms + rent status' },
  { query: 'فيلا اربع غرف اربع حمامات في دمشق', expected: { bedrooms: 4, bathrooms: 4 }, description: 'Villa + four rooms + four bathrooms + city' },
];

console.log('🧪 Comprehensive Test: Arabic Rooms & Bathrooms Detection\n');
console.log(`Total test cases: ${testCases.length}\n`);

let passed = 0;
let failed = 0;
const failures = [];

testCases.forEach((testCase, index) => {
  const result = parseQuery(testCase.query);
  
  const bedroomsMatch = testCase.expected.bedrooms === null 
    ? result.bedrooms === null 
    : result.bedrooms === testCase.expected.bedrooms;
  
  const bathroomsMatch = testCase.expected.bathrooms === null 
    ? result.bathrooms === null 
    : result.bathrooms === testCase.expected.bathrooms;
  
  const allMatch = bedroomsMatch && bathroomsMatch;
  
  if (allMatch) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
  } else {
    failed++;
    failures.push({
      index: index + 1,
      query: testCase.query,
      description: testCase.description,
      expected: testCase.expected,
      actual: { bedrooms: result.bedrooms, bathrooms: result.bathrooms }
    });
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log(`   Expected: bedrooms=${testCase.expected.bedrooms}, bathrooms=${testCase.expected.bathrooms}`);
    console.log(`   Actual: bedrooms=${result.bedrooms}, bathrooms=${result.bathrooms}`);
  }
});

console.log(`\n📊 Test Results:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);

if (failures.length > 0) {
  console.log(`\n❌ Failed Tests Details:`);
  failures.forEach(f => {
    console.log(`\n  Test ${f.index}: ${f.description}`);
    console.log(`    Query: "${f.query}"`);
    console.log(`    Expected: bedrooms=${f.expected.bedrooms}, bathrooms=${f.expected.bathrooms}`);
    console.log(`    Actual: bedrooms=${f.actual.bedrooms}, bathrooms=${f.actual.bathrooms}`);
  });
}

console.log('\n✅ Test completed!');

