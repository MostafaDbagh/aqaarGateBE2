/**
 * Comprehensive Test Suite
 * 100 Arabic queries + 100 English queries
 * Run: node test-comprehensive.js
 */

require('dotenv').config();

const { parseQuery } = require('./utils/ruleBasedParser');

// Arabic test queries
const arabicQueries = [
  // Basic property types
  "شقة في حلب",
  "فيلا في دمشق",
  "مكتب في اللاذقية",
  "محل في حمص",
  "أرض في طرطوس",
  
  // With bedrooms
  "شقة غرفتين في حلب",
  "فيلا ثلاث غرف في دمشق",
  "شقة غرفة واحدة في اللاذقية",
  "فيلا أربع غرف في حمص",
  "شقة خمس غرف في طرطوس",
  
  // With bathrooms
  "شقة غرفتين وحمامين في حلب",
  "فيلا ثلاث غرف وحمام في دمشق",
  "شقة غرفة وحمام في اللاذقية",
  
  // Rent/Sale
  "شقة للايجار في حلب",
  "فيلا للبيع في دمشق",
  "مكتب للايجار في اللاذقية",
  "محل للبيع في حمص",
  "أرض للبيع في طرطوس",
  
  // With amenities
  "شقة مع موقف سيارات في حلب",
  "فيلا مع مسبح في دمشق",
  "شقة مع مصعد في اللاذقية",
  "فيلا مع جيم في حمص",
  "شقة مع تكييف في طرطوس",
  
  // With price
  "شقة بخمسين الف دولار في حلب",
  "فيلا بمئة الف دولار في دمشق",
  "شقة بعشرين الف دولار في اللاذقية",
  "مكتب بثلاثين الف دولار في حمص",
  "محل بأربعين الف دولار في طرطوس",
  
  // Complex queries
  "شقة غرفتين وصالون في حلب للايجار",
  "فيلا ثلاث غرف مع مسبح في دمشق للبيع",
  "شقة غرفة واحدة مع موقف سيارات في اللاذقية",
  "مكتب مع تكييف في حمص للايجار",
  "محل في حي الجميلية في طرطوس",
  
  // With neighborhoods
  "شقة في حي العزيزية في حلب",
  "فيلا في حي الصالحية في دمشق",
  "شقة في حي الميدان في اللاذقية",
  "مكتب في حي الشهباء في حمص",
  
  // With keywords
  "شقة جديدة في حلب",
  "فيلا فاخرة في دمشق",
  "شقة جميلة في اللاذقية",
  "مكتب حديث في حمص",
  "محل واسع في طرطوس",
  
  // With view
  "شقة مع إطلالة على البحر في اللاذقية",
  "فيلا مع إطلالة على الجبل في دمشق",
  "شقة مع إطلالة مفتوحة في حلب",
  
  // Furnished
  "شقة مفروشة في حلب",
  "فيلا غير مفروشة في دمشق",
  "شقة مفروشة بالكامل في اللاذقية",
  
  // Size
  "شقة 100 متر مربع في حلب",
  "فيلا 200 متر مربع في دمشق",
  "مكتب 50 متر مربع في اللاذقية",
  
  // Multiple criteria
  "شقة غرفتين وصالون مع موقف سيارات في حلب للايجار بخمسين الف دولار",
  "فيلا ثلاث غرف مع مسبح في دمشق للبيع بمئة الف دولار",
  "شقة غرفة واحدة مع تكييف في اللاذقية للايجار",
  "مكتب مع مصعد في حمص للبيع",
  "محل في حي الجميلية في طرطوس للبيع",
  
  // Title deed
  "شقة طابو اخضر في حلب",
  "فيلا طابو اخضر في دمشق",
  "أرض طابو اخضر في اللاذقية",
  
  // New building
  "شقة في بناء جديد في حلب",
  "فيلا في بناء حديث في دمشق",
  "شقة في عمارة جديدة في اللاذقية",
  
  // More complex
  "اريد شقة غرفتين وصالون مع موقف سيارات في حي العزيزية في حلب للايجار",
  "ابحث عن فيلا ثلاث غرف مع مسبح في دمشق للبيع",
  "اريد مكتب مع تكييف ومصعد في اللاذقية",
  "ابحث عن محل في حي الجميلية في حمص للبيع",
  "اريد أرض طابو اخضر في طرطوس",
  
  // Variations
  "شقق للايجار في حلب",
  "فلل للبيع في دمشق",
  "مكاتب للايجار في اللاذقية",
  "محلات للبيع في حمص",
  "أراضي للبيع في طرطوس",
  
  // Price ranges
  "شقة تحت خمسين الف دولار في حلب",
  "فيلا فوق مئة الف دولار في دمشق",
  "شقة بين عشرين وثلاثين الف دولار في اللاذقية",
  
  // More amenities
  "شقة مع انترنت في حلب",
  "فيلا مع كاميرات مراقبة في دمشق",
  "شقة مع شرفة في اللاذقية",
  "فيلا مع نظام طاقة شمسية في حمص",
  
  // Status variations
  "شقة للايجار الشهري في حلب",
  "فيلا للبيع الفوري في دمشق",
  "مكتب للايجار طويل الأمد في اللاذقية",
  
  // Location variations
  "شقة في وسط حلب",
  "فيلا في ضواحي دمشق",
  "مكتب في مركز اللاذقية",
  "محل في شارع رئيسي في حمص",
  
  // More bedrooms variations
  "شقة بغرفتين وصالون في حلب",
  "فيلا بثلاث غرف وصالونين في دمشق",
  "شقة بغرفة وصالون في اللاذقية",
  
  // Combined
  "شقة غرفتين وصالون مع موقف سيارات ومصعد في حي العزيزية في حلب للايجار بخمسين الف دولار",
  "فيلا ثلاث غرف مع مسبح وجيم في دمشق للبيع بمئة الف دولار",
  "شقة جديدة غرفتين مع تكييف في اللاذقية للايجار",
  "مكتب حديث مع انترنت في حمص للبيع",
  "محل واسع في حي الجميلية في طرطوس للبيع",
  
  // Additional 6 queries to reach 100
  "شقة غرفتين مع شرفة في حلب",
  "فيلا مع حديقة في دمشق",
  "مكتب مع موقف سيارات في اللاذقية",
  "محل مع تكييف في حمص",
  "أرض سكنية في طرطوس",
  "شقة استوديو في حلب"
];

// English test queries
const englishQueries = [
  // Basic property types
  "apartment in Aleppo",
  "villa in Damascus",
  "office in Latakia",
  "commercial space in Homs",
  "land in Tartus",
  
  // With bedrooms
  "apartment with 2 bedrooms in Aleppo",
  "villa with 3 bedrooms in Damascus",
  "apartment with 1 bedroom in Latakia",
  "villa with 4 bedrooms in Homs",
  "apartment with 5 bedrooms in Tartus",
  
  // With bathrooms
  "apartment with 2 bedrooms and 2 bathrooms in Aleppo",
  "villa with 3 bedrooms and 2 bathrooms in Damascus",
  "apartment with 1 bedroom and 1 bathroom in Latakia",
  
  // Rent/Sale
  "apartment for rent in Aleppo",
  "villa for sale in Damascus",
  "office for rent in Latakia",
  "commercial for sale in Homs",
  "land for sale in Tartus",
  
  // With amenities
  "apartment with parking in Aleppo",
  "villa with swimming pool in Damascus",
  "apartment with lift in Latakia",
  "villa with gym in Homs",
  "apartment with A/C in Tartus",
  
  // With price
  "apartment under 50000 USD in Aleppo",
  "villa over 100000 USD in Damascus",
  "apartment around 20000 USD in Latakia",
  "office under 30000 USD in Homs",
  "commercial under 40000 USD in Tartus",
  
  // Complex queries
  "apartment with 2 bedrooms and salon in Aleppo for rent",
  "villa with 3 bedrooms and pool in Damascus for sale",
  "apartment with 1 bedroom and parking in Latakia",
  "office with A/C in Homs for rent",
  "commercial in Al-Jamiliyah neighborhood in Tartus",
  
  // With neighborhoods
  "apartment in Al-Aziziyah neighborhood in Aleppo",
  "villa in Al-Salihiyah neighborhood in Damascus",
  "apartment in Al-Midan neighborhood in Latakia",
  "office in Al-Shahba neighborhood in Homs",
  
  // With keywords
  "new apartment in Aleppo",
  "luxury villa in Damascus",
  "beautiful apartment in Latakia",
  "modern office in Homs",
  "spacious commercial in Tartus",
  
  // With view
  "apartment with sea view in Latakia",
  "villa with mountain view in Damascus",
  "apartment with open view in Aleppo",
  
  // Furnished
  "furnished apartment in Aleppo",
  "unfurnished villa in Damascus",
  "fully furnished apartment in Latakia",
  
  // Size
  "apartment 100 square feet in Aleppo",
  "villa 200 square feet in Damascus",
  "office 50 square feet in Latakia",
  
  // Multiple criteria
  "apartment with 2 bedrooms and salon with parking in Aleppo for rent under 50000 USD",
  "villa with 3 bedrooms and pool in Damascus for sale over 100000 USD",
  "apartment with 1 bedroom and A/C in Latakia for rent",
  "office with lift in Homs for sale",
  "commercial in Al-Jamiliyah neighborhood in Tartus for sale",
  
  // Title deed
  "apartment with green title deed in Aleppo",
  "villa with green title deed in Damascus",
  "land with green title deed in Latakia",
  
  // New building
  "apartment in new building in Aleppo",
  "villa in modern building in Damascus",
  "apartment in new construction in Latakia",
  
  // More complex
  "I want apartment with 2 bedrooms and salon with parking in Al-Aziziyah neighborhood in Aleppo for rent",
  "looking for villa with 3 bedrooms and pool in Damascus for sale",
  "I need office with A/C and lift in Latakia",
  "searching for commercial in Al-Jamiliyah neighborhood in Homs for sale",
  "I want land with green title deed in Tartus",
  
  // Variations
  "apartments for rent in Aleppo",
  "villas for sale in Damascus",
  "offices for rent in Latakia",
  "commercial spaces for sale in Homs",
  "lands for sale in Tartus",
  
  // Price ranges
  "apartment under 50000 dollars in Aleppo",
  "villa over 100000 dollars in Damascus",
  "apartment between 20000 and 30000 USD in Latakia",
  
  // More amenities
  "apartment with internet in Aleppo",
  "villa with security cameras in Damascus",
  "apartment with balcony in Latakia",
  "villa with solar energy system in Homs",
  
  // Status variations
  "apartment for monthly rent in Aleppo",
  "villa for immediate sale in Damascus",
  "office for long term rent in Latakia",
  
  // Location variations
  "apartment in downtown Aleppo",
  "villa in suburbs of Damascus",
  "office in city center of Latakia",
  "commercial on main street in Homs",
  
  // More bedrooms variations
  "apartment with 2 rooms and salon in Aleppo",
  "villa with 3 rooms and 2 salons in Damascus",
  "apartment with 1 room and salon in Latakia",
  
  // Combined
  "apartment with 2 bedrooms and salon with parking and lift in Al-Aziziyah neighborhood in Aleppo for rent under 50000 USD",
  "villa with 3 bedrooms with pool and gym in Damascus for sale over 100000 USD",
  "new apartment with 2 bedrooms with A/C in Latakia for rent",
  "modern office with internet in Homs for sale",
  "spacious commercial in Al-Jamiliyah neighborhood in Tartus for sale",
  
  // Additional 6 queries to reach 100
  "apartment with 2 bedrooms with balcony in Aleppo",
  "villa with garden in Damascus",
  "office with parking in Latakia",
  "commercial with A/C in Homs",
  "residential land in Tartus",
  "studio apartment in Aleppo"
];

// Test function
function testQueries(queries, language) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing ${queries.length} ${language} Queries`);
  console.log('='.repeat(80));
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  queries.forEach((query, index) => {
    try {
      const result = parseQuery(query);
      const extractedCount = Object.values(result).filter(v => 
        v !== null && v !== undefined && 
        (Array.isArray(v) ? v.length > 0 : true) &&
        v !== ''
      ).length;
      
      if (extractedCount > 0) {
        passed++;
        results.push({ query, result, status: 'passed', extractedCount });
      } else {
        failed++;
        results.push({ query, result, status: 'failed', extractedCount });
      }
      
      // Progress indicator
      if ((index + 1) % 10 === 0) {
        process.stdout.write(`\r   Progress: ${index + 1}/${queries.length} queries tested...`);
      }
    } catch (error) {
      failed++;
      results.push({ query, error: error.message, status: 'error' });
    }
  });
  
  console.log(`\r   Progress: ${queries.length}/${queries.length} queries tested... ✓`);
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / queries.length) * 100).toFixed(2)}%`);
  
  // Show failed queries
  if (failed > 0) {
    console.log(`\n⚠️  Failed Queries (${failed}):`);
    results.filter(r => r.status === 'failed' || r.status === 'error').slice(0, 10).forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.query}"`);
      if (r.error) console.log(`      Error: ${r.error}`);
      else console.log(`      Extracted: ${r.extractedCount} parameters`);
    });
    if (failed > 10) {
      console.log(`   ... and ${failed - 10} more`);
    }
  }
  
  // Show sample successful extractions
  console.log(`\n✅ Sample Successful Extractions (first 5):`);
  results.filter(r => r.status === 'passed').slice(0, 5).forEach((r, i) => {
    const params = [];
    if (r.result.propertyType) params.push(`Type: ${r.result.propertyType}`);
    if (r.result.bedrooms !== null) params.push(`Bedrooms: ${r.result.bedrooms}`);
    if (r.result.city) params.push(`City: ${r.result.city}`);
    if (r.result.status) params.push(`Status: ${r.result.status}`);
    console.log(`   ${i + 1}. "${r.query.substring(0, 50)}..."`);
    console.log(`      → ${params.join(', ')}`);
  });
  
  return { passed, failed, results };
}

// Main test execution
console.log('🚀 Starting Comprehensive Test Suite');
console.log(`   Arabic Queries: ${arabicQueries.length}`);
console.log(`   English Queries: ${englishQueries.length}`);
console.log(`   Total: ${arabicQueries.length + englishQueries.length}`);

const arabicResults = testQueries(arabicQueries, 'Arabic');
const englishResults = testQueries(englishQueries, 'English');

// Final summary
console.log(`\n${'='.repeat(80)}`);
console.log('📊 FINAL SUMMARY');
console.log('='.repeat(80));
console.log(`\n🇸🇾 Arabic Tests:`);
console.log(`   ✅ Passed: ${arabicResults.passed}/${arabicQueries.length}`);
console.log(`   ❌ Failed: ${arabicResults.failed}/${arabicQueries.length}`);
console.log(`   📈 Success Rate: ${((arabicResults.passed / arabicQueries.length) * 100).toFixed(2)}%`);

console.log(`\n🇬🇧 English Tests:`);
console.log(`   ✅ Passed: ${englishResults.passed}/${englishQueries.length}`);
console.log(`   ❌ Failed: ${englishResults.failed}/${englishQueries.length}`);
console.log(`   📈 Success Rate: ${((englishResults.passed / englishQueries.length) * 100).toFixed(2)}%`);

console.log(`\n📊 Overall:`);
const totalPassed = arabicResults.passed + englishResults.passed;
const totalFailed = arabicResults.failed + englishResults.failed;
const totalQueries = arabicQueries.length + englishQueries.length;
console.log(`   ✅ Passed: ${totalPassed}/${totalQueries}`);
console.log(`   ❌ Failed: ${totalFailed}/${totalQueries}`);
console.log(`   📈 Success Rate: ${((totalPassed / totalQueries) * 100).toFixed(2)}%`);

console.log(`\n✅ Test Suite Completed!\n`);

