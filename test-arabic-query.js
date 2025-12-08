/**
 * Test Arabic query
 * Run: node test-arabic-query.js
 */

require('dotenv').config();

const { parseQuery } = require('./utils/ruleBasedParser');

// Arabic query from user
const arabicQuery = "ابحث عن شقة في مدينة حلب غرفتين وصالون طابو اخضر في حي العزيزية بناء جديد ميزانية خمسين الف دولار";

console.log('🧪 Testing Arabic Query\n');
console.log('='.repeat(80));
console.log(`📝 Query: "${arabicQuery}"`);
console.log('='.repeat(80));
console.log('');

try {
  const result = parseQuery(arabicQuery);
  
  console.log('✅ Extracted Parameters:');
  console.log(JSON.stringify(result, null, 2));
  console.log('');
  
  // Show what was extracted
  const extracted = [];
  if (result.propertyType) extracted.push(`Type: ${result.propertyType}`);
  if (result.bedrooms !== null) extracted.push(`Bedrooms: ${result.bedrooms}`);
  if (result.bathrooms !== null) extracted.push(`Bathrooms: ${result.bathrooms}`);
  if (result.city) extracted.push(`City: ${result.city}`);
  if (result.neighborhood) extracted.push(`Neighborhood: ${result.neighborhood}`);
  if (result.status) extracted.push(`Status: ${result.status}`);
  if (result.priceMin || result.priceMax) {
    const priceRange = [];
    if (result.priceMin) priceRange.push(`Min: $${result.priceMin}`);
    if (result.priceMax) priceRange.push(`Max: $${result.priceMax}`);
    extracted.push(`Price: ${priceRange.join(', ')}`);
  }
  if (result.amenities.length > 0) extracted.push(`Amenities: ${result.amenities.join(', ')}`);
  if (result.keywords.length > 0) extracted.push(`Keywords: ${result.keywords.join(', ')}`);
  if (result.viewType) extracted.push(`View: ${result.viewType}`);
  if (result.furnished !== null) extracted.push(`Furnished: ${result.furnished}`);
  if (result.garages !== null) extracted.push(`Garages: ${result.garages}`);
  
  console.log('📊 Summary:');
  if (extracted.length > 0) {
    console.log(extracted.join(' | '));
  } else {
    console.log('⚠️  No parameters extracted');
  }
  
  console.log('');
  console.log('='.repeat(80));
  
  // Expected extraction
  console.log('\n🎯 Expected Extraction:');
  console.log('   - Property Type: Apartment (شقة)');
  console.log('   - City: Aleppo (حلب)');
  console.log('   - Bedrooms: 2 (غرفتين)');
  console.log('   - Neighborhood: Al-Aziziyah (العزيزية)');
  console.log('   - Keywords: green title deed (طابو اخضر), new building (بناء جديد)');
  console.log('   - Price: 50,000 USD (خمسين الف دولار)');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

