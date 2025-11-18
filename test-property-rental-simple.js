/**
 * Simple Property Rental API Test
 * Run this when the server is running: node test-property-rental-simple.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5500';
const API_ENDPOINT = `${BASE_URL}/api/property-rental`;

// Valid test data
const validTestData = {
  ownerName: "Ahmed Al-Mahmoud",
  ownerEmail: "ahmed.test@example.com",
  ownerPhone: "+963999123456",
  propertyType: "apartment",
  propertySize: 1200,
  bedrooms: 3,
  bathrooms: 2,
  location: "Damascus, Al-Mazzeh, Main Street",
  features: "Furnished, parking, garden, balcony, AC",
  additionalDetails: "Property is in excellent condition and ready for rental"
};

async function testAPI() {
  console.log('🧪 Testing Property Rental Service API\n');
  console.log(`📍 Endpoint: ${API_ENDPOINT}\n`);
  console.log('='.repeat(80));

  try {
    console.log('\n📋 Test 1: Valid Request with All Fields');
    console.log('   Sending POST request...');
    
    const response = await axios.post(API_ENDPOINT, validTestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`   ✅ SUCCESS - Status: ${response.status}`);
    console.log(`   ✅ Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data?.id) {
      console.log(`   ✅ Request ID: ${response.data.data.id}`);
      console.log(`   ✅ Status: ${response.data.data.status}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ API Test Passed! The endpoint is working correctly.\n');
    
    return true;
  } catch (error) {
    console.log('\n❌ API Test Failed!\n');
    
    if (error.response) {
      // Server responded with error status
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 404) {
        console.log('\n   ⚠️  Route not found. Please check:');
        console.log('   1. Is the server running?');
        console.log('   2. Is the route registered in api/index.js?');
        console.log('   3. Is the route path correct?');
      } else if (error.response.status === 400) {
        console.log('\n   ⚠️  Validation error. This might be expected for invalid data.');
      } else if (error.response.status === 500) {
        console.log('\n   ⚠️  Server error. Check server logs for details.');
      }
    } else if (error.request) {
      // Request made but no response
      console.log(`   ⚠️  No response received from server.`);
      console.log(`   ⚠️  Is the server running at ${BASE_URL}?`);
      console.log(`   ⚠️  Start the server with: npm start or node index.js`);
    } else {
      // Error setting up request
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80));
    return false;
  }
}

// Run test
testAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});

