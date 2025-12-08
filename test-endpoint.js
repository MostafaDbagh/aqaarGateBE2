/**
 * Test the full AI Search API endpoint
 * Make sure your server is running first: npm run dev
 * Then run: node test-endpoint.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5500';
const ENDPOINT = `${BASE_URL}/api/listing/ai-search`;

const testQueries = [
  {
    name: "Basic apartment search",
    query: "I want one apartment 2 room 1 bedroom with nice view",
    page: 1,
    limit: 12
  },
  {
    name: "Villa with location",
    query: "Show me a villa with 3 bedrooms and sea view in Aleppo",
    page: 1,
    limit: 12
  },
  {
    name: "Rental search",
    query: "Find apartments for rent in Damascus with 2 bathrooms",
    page: 1,
    limit: 12
  }
];

async function testEndpoint() {
  console.log('🧪 Testing AI Search API Endpoint\n');
  console.log(`📍 Endpoint: ${ENDPOINT}`);
  console.log('='.repeat(80));
  console.log('');

  // Test server connection first
  try {
    const healthCheck = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running!\n');
  } catch (error) {
    console.error('❌ Server is not running!');
    console.error('Please start your server first:');
    console.error('  cd /Users/mostafa/Desktop/aqaarGate/api');
    console.error('  npm run dev\n');
    process.exit(1);
  }

  // Test each query
  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`📝 Test ${i + 1}: ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    console.log('-'.repeat(80));

    try {
      const response = await axios.post(ENDPOINT, {
        query: test.query
      }, {
        params: {
          page: test.page,
          limit: test.limit
        }
      });

      const { success, data, extractedParams, pagination } = response.data;

      if (success) {
        console.log('✅ Request successful!\n');
        
        console.log('📊 Extracted Parameters:');
        console.log(JSON.stringify(extractedParams, null, 2));
        console.log('');

        console.log('📈 Results:');
        console.log(`   Found ${data.length} properties`);
        console.log(`   Total: ${pagination.total}`);
        console.log(`   Page: ${pagination.page} of ${pagination.totalPages}`);
        console.log('');

        if (data.length > 0) {
          console.log('🏠 Sample Property:');
          const sample = data[0];
          console.log(`   Type: ${sample.propertyType}`);
          console.log(`   Bedrooms: ${sample.bedrooms}`);
          console.log(`   Bathrooms: ${sample.bathrooms}`);
          console.log(`   Price: $${sample.propertyPrice}`);
          console.log(`   City: ${sample.city}`);
          console.log(`   Address: ${sample.address}`);
          console.log('');
        } else {
          console.log('⚠️  No properties found matching the criteria');
          console.log('');
        }
      } else {
        console.log('❌ Request failed:', response.data);
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Response:', error.response.data);
      }
    }

    console.log('-'.repeat(80));
    console.log('');
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('✅ All endpoint tests completed!\n');
}

// Run tests
testEndpoint().catch(console.error);

