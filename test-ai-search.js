/**
 * Test script for AI Search (Rule-Based Parser)
 * Run: node test-ai-search.js
 */

// Load environment variables
require('dotenv').config();

const { parseQuery } = require('./utils/ruleBasedParser');

// Test queries
const testQueries = [
  "I want one apartment 2 room 1 bedroom with nice view",
  "Show me a villa with 3 bedrooms and sea view in Aleppo",
  "Find apartments for rent in Damascus with 2 bathrooms",
  "I need an apartment under 1000 USD with 2 bedrooms",
  "Apartment in Latakia, 2 bedrooms, furnished, with parking",
  "Villa with 4 bedrooms and swimming pool",
  "Office space in Damascus",
  "Apartment for sale in Aleppo with 3 bedrooms and 2 bathrooms"
];

console.log('🧪 Testing Rule-Based Parser\n');
console.log('='.repeat(80));

testQueries.forEach((query, index) => {
  console.log(`\n📝 Test ${index + 1}: "${query}"`);
  console.log('-'.repeat(80));
  
  try {
    const result = parseQuery(query);
    
    console.log('✅ Extracted Parameters:');
    console.log(JSON.stringify(result, null, 2));
    
    // Show what was extracted
    const extracted = [];
    if (result.propertyType) extracted.push(`Type: ${result.propertyType}`);
    if (result.bedrooms !== null) extracted.push(`Bedrooms: ${result.bedrooms}`);
    if (result.bathrooms !== null) extracted.push(`Bathrooms: ${result.bathrooms}`);
    if (result.city) extracted.push(`City: ${result.city}`);
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
    
    if (extracted.length > 0) {
      console.log('\n📊 Summary:', extracted.join(' | '));
    } else {
      console.log('\n⚠️  No parameters extracted');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('-'.repeat(80));
});

console.log('\n✅ All tests completed!\n');

