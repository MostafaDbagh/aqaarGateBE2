/**
 * Complex Test Queries - 5 Very Complex Queries
 * Run: node test-complex-queries.js
 */

require('dotenv').config();

const { parseQuery } = require('./utils/ruleBasedParser');

// 5 Very Complex Queries
const complexQueries = [
  // Arabic Complex Query 1
  "اريد شقة غرفتين وصالون مع موقف سيارات ومصعد وتكييف في حي العزيزية في مدينة حلب للايجار الشهري ميزانية خمسين الف دولار طابو اخضر بناء جديد",
  
  // Arabic Complex Query 2
  "ابحث عن فيلا ثلاث غرف وصالونين مع مسبح وجيم وكاميرات مراقبة في حي الصالحية في دمشق للبيع بمئة وخمسين الف دولار مع حديقة واسعة",
  
  // English Complex Query 1
  "I want an apartment with 2 bedrooms and salon with parking, lift, A/C, and internet in Al-Aziziyah neighborhood in Aleppo city for monthly rent under 50000 USD with green title deed in new building",
  
  // English Complex Query 2
  "Looking for a villa with 3 bedrooms and 2 salons with swimming pool, gym, security cameras in Al-Salihiyah neighborhood in Damascus for sale over 150000 USD with large garden",
  
  // Mixed Arabic-English Complex Query
  "اريد office مع 2 bedrooms و 3 bathrooms مع parking و lift في Latakia للايجار بخمسين الف دولار مع internet و A/C"
];

console.log('🧪 Testing 5 Very Complex Queries\n');
console.log('='.repeat(100));

complexQueries.forEach((query, index) => {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`📝 Complex Test ${index + 1}:`);
  console.log(`   "${query}"`);
  console.log('-'.repeat(100));
  
  try {
    const result = parseQuery(query);
    
    console.log('\n✅ Extracted Parameters:');
    console.log(JSON.stringify(result, null, 2));
    
    // Detailed analysis
    console.log('\n📊 Detailed Analysis:');
    const analysis = [];
    
    if (result.propertyType) {
      analysis.push(`✅ Property Type: ${result.propertyType}`);
    } else {
      analysis.push(`❌ Property Type: NOT EXTRACTED`);
    }
    
    if (result.bedrooms !== null) {
      analysis.push(`✅ Bedrooms: ${result.bedrooms}`);
    } else {
      analysis.push(`⚠️  Bedrooms: NOT EXTRACTED`);
    }
    
    if (result.bathrooms !== null) {
      analysis.push(`✅ Bathrooms: ${result.bathrooms}`);
    } else {
      analysis.push(`⚠️  Bathrooms: NOT EXTRACTED`);
    }
    
    if (result.city) {
      analysis.push(`✅ City: ${result.city}`);
    } else {
      analysis.push(`❌ City: NOT EXTRACTED`);
    }
    
    if (result.neighborhood) {
      analysis.push(`✅ Neighborhood: ${result.neighborhood}`);
    } else {
      analysis.push(`⚠️  Neighborhood: NOT EXTRACTED`);
    }
    
    if (result.status) {
      analysis.push(`✅ Status: ${result.status}`);
    } else {
      analysis.push(`⚠️  Status: NOT EXTRACTED`);
    }
    
    if (result.priceMin || result.priceMax) {
      const priceInfo = [];
      if (result.priceMin) priceInfo.push(`Min: $${result.priceMin}`);
      if (result.priceMax) priceInfo.push(`Max: $${result.priceMax}`);
      analysis.push(`✅ Price: ${priceInfo.join(', ')}`);
    } else {
      analysis.push(`⚠️  Price: NOT EXTRACTED`);
    }
    
    if (result.amenities.length > 0) {
      analysis.push(`✅ Amenities (${result.amenities.length}): ${result.amenities.join(', ')}`);
    } else {
      analysis.push(`⚠️  Amenities: NOT EXTRACTED`);
    }
    
    if (result.keywords.length > 0) {
      analysis.push(`✅ Keywords (${result.keywords.length}): ${result.keywords.slice(0, 5).join(', ')}${result.keywords.length > 5 ? '...' : ''}`);
    } else {
      analysis.push(`⚠️  Keywords: NOT EXTRACTED`);
    }
    
    if (result.furnished !== null) {
      analysis.push(`✅ Furnished: ${result.furnished}`);
    } else {
      analysis.push(`⚠️  Furnished: NOT EXTRACTED`);
    }
    
    if (result.garages !== null) {
      analysis.push(`✅ Garages: ${result.garages}`);
    } else {
      analysis.push(`⚠️  Garages: NOT EXTRACTED`);
    }
    
    analysis.forEach(item => console.log(`   ${item}`));
    
    // Count extracted parameters
    const extractedCount = Object.values(result).filter(v => 
      v !== null && v !== undefined && 
      (Array.isArray(v) ? v.length > 0 : true) &&
      v !== ''
    ).length;
    
    const totalParams = Object.keys(result).length;
    const extractionRate = ((extractedCount / totalParams) * 100).toFixed(1);
    
    console.log(`\n📈 Extraction Rate: ${extractedCount}/${totalParams} parameters (${extractionRate}%)`);
    
    // Expected vs Actual comparison
    console.log('\n🎯 Expected vs Actual:');
    
    // Check what should be extracted from the query
    const expected = {
      propertyType: query.includes('شقة') || query.includes('apartment') ? 'Apartment' : 
                    query.includes('فيلا') || query.includes('villa') ? 'Villa' :
                    query.includes('مكتب') || query.includes('office') ? 'Office' : null,
      bedrooms: query.includes('غرفتين') || query.match(/2\s*(?:bedroom|room)/i) ? 2 :
               query.includes('ثلاث غرف') || query.match(/3\s*(?:bedroom|room)/i) ? 3 : null,
      city: query.includes('حلب') || query.includes('Aleppo') ? 'Aleppo' :
            query.includes('دمشق') || query.includes('Damascus') ? 'Damascus' :
            query.includes('اللاذقية') || query.includes('Latakia') ? 'Latakia' : null,
      status: query.includes('للايجار') || query.includes('للإيجار') || query.includes('rent') ? 'rent' :
              query.includes('للبيع') || query.includes('sale') ? 'sale' : null,
      priceMax: query.includes('خمسين الف') || query.includes('50000') ? 50000 :
                query.includes('مئة وخمسين') || query.includes('150000') ? 150000 : null
    };
    
    Object.entries(expected).forEach(([key, expectedValue]) => {
      if (expectedValue !== null) {
        const actualValue = result[key];
        if (actualValue === expectedValue) {
          console.log(`   ✅ ${key}: ${expectedValue} (CORRECT)`);
        } else {
          console.log(`   ❌ ${key}: Expected ${expectedValue}, Got ${actualValue || 'null'}`);
        }
      }
    });
    
  } catch (error) {
    console.error(`\n❌ Error parsing query: ${error.message}`);
    console.error(error.stack);
  }
  
  console.log('-'.repeat(100));
});

console.log(`\n${'='.repeat(100)}`);
console.log('✅ All 5 Complex Tests Completed!\n');

