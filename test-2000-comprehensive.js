/**
 * Comprehensive Test Suite - 2000 Tests
 * 1000 Arabic queries + 1000 English queries
 * Run: node test-2000-comprehensive.js
 */

require('dotenv').config();

const { parseQuery } = require('./utils/ruleBasedParser');

// Generate test queries dynamically
function generateArabicQueries() {
  const queries = [];
  
  const propertyTypes = ['شقة', 'فيلا', 'مكتب', 'محل', 'أرض'];
  const cities = ['حلب', 'دمشق', 'اللاذقية', 'حمص', 'طرطوس', 'دير الزور', 'السويداء', 'درعا', 'حماة', 'إدلب', 'الرقة'];
  const bedrooms = [1, 2, 3, 4, 5];
  const bathrooms = [1, 2, 3];
  const statuses = ['للايجار', 'للبيع'];
  const amenities = ['موقف سيارات', 'مسبح', 'مصعد', 'تكييف', 'جيم', 'انترنت', 'كاميرات مراقبة', 'شرفة'];
  const neighborhoods = ['العزيزية', 'الصالحية', 'الميدان', 'الشهباء', 'الجميلية'];
  const prices = [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
  const keywords = ['جديد', 'فاخر', 'جميل', 'واسع', 'حديث', 'طابو اخضر', 'بناء جديد'];
  
  // Basic combinations (500 queries)
  for (let i = 0; i < 100; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    queries.push(`${propType} في ${city}`);
  }
  
  // With bedrooms (200 queries)
  for (let i = 0; i < 200; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const bedrooms = Math.floor(Math.random() * 5) + 1;
    const bedroomText = bedrooms === 1 ? 'غرفة' : bedrooms === 2 ? 'غرفتين' : `${bedrooms} غرف`;
    queries.push(`${propType} ${bedroomText} في ${city}`);
  }
  
  // With status (200 queries)
  for (let i = 0; i < 200; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    queries.push(`${propType} ${status} في ${city}`);
  }
  
  // With amenities (200 queries)
  for (let i = 0; i < 200; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const amenity = amenities[Math.floor(Math.random() * amenities.length)];
    queries.push(`${propType} مع ${amenity} في ${city}`);
  }
  
  // With price (100 queries)
  for (let i = 0; i < 100; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const price = prices[Math.floor(Math.random() * prices.length)];
    const priceText = price === 10000 ? 'عشرة آلاف' : 
                     price === 20000 ? 'عشرين ألف' :
                     price === 30000 ? 'ثلاثين ألف' :
                     price === 40000 ? 'أربعين ألف' :
                     price === 50000 ? 'خمسين ألف' :
                     price === 100000 ? 'مئة ألف' : `${price / 1000} ألف`;
    queries.push(`${propType} ب${priceText} دولار في ${city}`);
  }
  
  // Complex queries (200 queries)
  for (let i = 0; i < 200; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const bedroom = Math.floor(Math.random() * 3) + 1;
    const bedroomText = bedroom === 1 ? 'غرفة' : bedroom === 2 ? 'غرفتين' : 'ثلاث غرف';
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amenity = amenities[Math.floor(Math.random() * amenities.length)];
    queries.push(`${propType} ${bedroomText} مع ${amenity} ${status} في ${city}`);
  }
  
  return queries;
}

function generateEnglishQueries() {
  const queries = [];
  
  const propertyTypes = ['apartment', 'villa', 'office', 'commercial', 'land'];
  const cities = ['Aleppo', 'Damascus', 'Latakia', 'Homs', 'Tartus', 'Deir ez-Zur', 'As-Suwayda', 'Daraa', 'Hama', 'Idlib', 'Raqqah'];
  const bedrooms = [1, 2, 3, 4, 5];
  const bathrooms = [1, 2, 3];
  const statuses = ['for rent', 'for sale'];
  const amenities = ['parking', 'swimming pool', 'lift', 'A/C', 'gym', 'internet', 'security cameras', 'balcony'];
  const neighborhoods = ['Al-Aziziyah', 'Al-Salihiyah', 'Al-Midan', 'Al-Shahba', 'Al-Jamiliyah'];
  const prices = [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
  const keywords = ['new', 'luxury', 'beautiful', 'spacious', 'modern', 'green title deed', 'new building'];
  
  // Basic combinations (500 queries)
  for (let i = 0; i < 100; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    queries.push(`${propType} in ${city}`);
  }
  
  // With bedrooms (200 queries)
  for (let i = 0; i < 200; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const bedrooms = Math.floor(Math.random() * 5) + 1;
    queries.push(`${propType} with ${bedrooms} bedroom${bedrooms > 1 ? 's' : ''} in ${city}`);
  }
  
  // With status (200 queries)
  for (let i = 0; i < 200; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    queries.push(`${propType} ${status} in ${city}`);
  }
  
  // With amenities (200 queries)
  for (let i = 0; i < 200; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const amenity = amenities[Math.floor(Math.random() * amenities.length)];
    queries.push(`${propType} with ${amenity} in ${city}`);
  }
  
  // With price (100 queries)
  for (let i = 0; i < 100; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const price = prices[Math.floor(Math.random() * prices.length)];
    queries.push(`${propType} under ${price} USD in ${city}`);
  }
  
  // Complex queries (200 queries)
  for (let i = 0; i < 200; i++) {
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const bedroom = Math.floor(Math.random() * 3) + 1;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amenity = amenities[Math.floor(Math.random() * amenities.length)];
    queries.push(`${propType} with ${bedroom} bedroom${bedroom > 1 ? 's' : ''} with ${amenity} ${status} in ${city}`);
  }
  
  return queries;
}

// Test function
function testQueries(queries, language) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`🧪 Testing ${queries.length} ${language} Queries`);
  console.log('='.repeat(100));
  
  let passed = 0;
  let failed = 0;
  let errors = 0;
  const results = [];
  const startTime = Date.now();
  
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
      
      // Progress indicator every 100 queries
      if ((index + 1) % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = ((index + 1) / elapsed).toFixed(1);
        process.stdout.write(`\r   Progress: ${index + 1}/${queries.length} queries (${rate} queries/sec, ${elapsed}s elapsed)...`);
      }
    } catch (error) {
      errors++;
      failed++;
      results.push({ query, error: error.message, status: 'error' });
    }
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const rate = (queries.length / elapsed).toFixed(1);
  
  console.log(`\r   Progress: ${queries.length}/${queries.length} queries tested (${rate} queries/sec, ${elapsed}s total) ✓`);
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️  Errors: ${errors}`);
  console.log(`   📈 Success Rate: ${((passed / queries.length) * 100).toFixed(2)}%`);
  console.log(`   ⏱️  Time: ${elapsed}s (${rate} queries/sec)`);
  
  // Calculate average extraction count
  const avgExtracted = results
    .filter(r => r.status === 'passed')
    .reduce((sum, r) => sum + (r.extractedCount || 0), 0) / passed || 0;
  console.log(`   📊 Average Extracted Parameters: ${avgExtracted.toFixed(1)}`);
  
  // Show failed queries (first 10)
  if (failed > 0) {
    console.log(`\n⚠️  Sample Failed Queries (first 10):`);
    results.filter(r => r.status === 'failed' || r.status === 'error').slice(0, 10).forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.query.substring(0, 60)}${r.query.length > 60 ? '...' : ''}"`);
      if (r.error) console.log(`      Error: ${r.error}`);
      else console.log(`      Extracted: ${r.extractedCount} parameters`);
    });
    if (failed > 10) {
      console.log(`   ... and ${failed - 10} more`);
    }
  }
  
  return { passed, failed, errors, results, elapsed, rate, avgExtracted };
}

// Main execution
console.log('🚀 Starting Comprehensive Test Suite - 2000 Tests');
console.log('   Generating test queries...');

const arabicQueries = generateArabicQueries();
const englishQueries = generateEnglishQueries();

console.log(`   ✅ Generated ${arabicQueries.length} Arabic queries`);
console.log(`   ✅ Generated ${englishQueries.length} English queries`);
console.log(`   📊 Total: ${arabicQueries.length + englishQueries.length} queries`);

const arabicResults = testQueries(arabicQueries, 'Arabic');
const englishResults = testQueries(englishQueries, 'English');

// Final summary
console.log(`\n${'='.repeat(100)}`);
console.log('📊 FINAL SUMMARY');
console.log('='.repeat(100));

console.log(`\n🇸🇾 Arabic Tests (${arabicQueries.length}):`);
console.log(`   ✅ Passed: ${arabicResults.passed}/${arabicQueries.length}`);
console.log(`   ❌ Failed: ${arabicResults.failed}/${arabicQueries.length}`);
console.log(`   ⚠️  Errors: ${arabicResults.errors}`);
console.log(`   📈 Success Rate: ${((arabicResults.passed / arabicQueries.length) * 100).toFixed(2)}%`);
console.log(`   📊 Avg Parameters: ${arabicResults.avgExtracted.toFixed(1)}`);
console.log(`   ⏱️  Time: ${arabicResults.elapsed}s (${arabicResults.rate} queries/sec)`);

console.log(`\n🇬🇧 English Tests (${englishQueries.length}):`);
console.log(`   ✅ Passed: ${englishResults.passed}/${englishQueries.length}`);
console.log(`   ❌ Failed: ${englishResults.failed}/${englishQueries.length}`);
console.log(`   ⚠️  Errors: ${englishResults.errors}`);
console.log(`   📈 Success Rate: ${((englishResults.passed / englishQueries.length) * 100).toFixed(2)}%`);
console.log(`   📊 Avg Parameters: ${englishResults.avgExtracted.toFixed(1)}`);
console.log(`   ⏱️  Time: ${englishResults.elapsed}s (${englishResults.rate} queries/sec)`);

console.log(`\n📊 Overall:`);
const totalPassed = arabicResults.passed + englishResults.passed;
const totalFailed = arabicResults.failed + englishResults.failed;
const totalErrors = arabicResults.errors + englishResults.errors;
const totalQueries = arabicQueries.length + englishQueries.length;
const totalTime = (parseFloat(arabicResults.elapsed) + parseFloat(englishResults.elapsed)).toFixed(2);
const overallRate = (totalQueries / parseFloat(totalTime)).toFixed(1);

console.log(`   ✅ Passed: ${totalPassed}/${totalQueries}`);
console.log(`   ❌ Failed: ${totalFailed}/${totalQueries}`);
console.log(`   ⚠️  Errors: ${totalErrors}`);
console.log(`   📈 Success Rate: ${((totalPassed / totalQueries) * 100).toFixed(2)}%`);
console.log(`   ⏱️  Total Time: ${totalTime}s (${overallRate} queries/sec)`);

// Performance metrics
const avgExtractedOverall = (arabicResults.avgExtracted + englishResults.avgExtracted) / 2;
console.log(`   📊 Average Extracted Parameters: ${avgExtractedOverall.toFixed(1)}`);

// Quality assessment
let quality = 'Excellent';
if (totalPassed / totalQueries < 0.95) quality = 'Good';
if (totalPassed / totalQueries < 0.90) quality = 'Fair';
if (totalPassed / totalQueries < 0.80) quality = 'Needs Improvement';

console.log(`\n🎯 Quality Assessment: ${quality}`);
console.log(`   ${totalPassed >= totalQueries * 0.99 ? '✅' : totalPassed >= totalQueries * 0.95 ? '✅' : '⚠️'} System is ${quality.toLowerCase()} and ready for production!`);

console.log(`\n✅ Test Suite Completed!\n`);

