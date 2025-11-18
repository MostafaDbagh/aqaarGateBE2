const axios = require('axios');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5500';
const API_ENDPOINT = `${BASE_URL}/api/property-rental`;

// Test data
const testData = {
  ownerName: "Test Owner",
  ownerEmail: "test@example.com",
  ownerPhone: "+963999123456",
  propertyType: "apartment",
  propertySize: 1200,
  bedrooms: 3,
  bathrooms: 2,
  location: "Damascus, Al-Mazzeh, Main Street",
  features: "Furnished, parking, garden, balcony",
  additionalDetails: "This is a test property rental request"
};

// Test cases
const testCases = [
  {
    name: "Valid Request - All Required Fields",
    data: testData,
    expectedStatus: 201
  },
  {
    name: "Valid Request - Without Additional Details",
    data: {
      ...testData,
      additionalDetails: ""
    },
    expectedStatus: 201
  },
  {
    name: "Missing Required Field - ownerName",
    data: {
      ...testData,
      ownerName: ""
    },
    expectedStatus: 400
  },
  {
    name: "Missing Required Field - ownerEmail",
    data: {
      ...testData,
      ownerEmail: ""
    },
    expectedStatus: 400
  },
  {
    name: "Invalid Email Format",
    data: {
      ...testData,
      ownerEmail: "invalid-email"
    },
    expectedStatus: 400
  },
  {
    name: "Missing Required Field - propertyType",
    data: {
      ...testData,
      propertyType: ""
    },
    expectedStatus: 400
  },
  {
    name: "Invalid Property Size (zero)",
    data: {
      ...testData,
      propertySize: 0
    },
    expectedStatus: 400
  },
  {
    name: "Invalid Property Size (negative)",
    data: {
      ...testData,
      propertySize: -100
    },
    expectedStatus: 400
  },
  {
    name: "Invalid Bedrooms (negative)",
    data: {
      ...testData,
      bedrooms: -1
    },
    expectedStatus: 400
  },
  {
    name: "Invalid Bathrooms (negative)",
    data: {
      ...testData,
      bathrooms: -1
    },
    expectedStatus: 400
  },
  {
    name: "Missing Required Field - location",
    data: {
      ...testData,
      location: ""
    },
    expectedStatus: 400
  },
  {
    name: "Missing Required Field - features",
    data: {
      ...testData,
      features: ""
    },
    expectedStatus: 400
  },
  {
    name: "Valid Request - Different Property Types",
    data: {
      ...testData,
      propertyType: "villa",
      propertySize: 2500,
      bedrooms: 5,
      bathrooms: 4
    },
    expectedStatus: 201
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Testing Property Rental Service API\n');
  console.log(`📍 Endpoint: ${API_ENDPOINT}\n`);
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 Test: ${testCase.name}`);
      console.log(`   Data:`, JSON.stringify(testCase.data, null, 2).split('\n').slice(0, 5).join('\n') + '...');

      const response = await axios.post(API_ENDPOINT, testCase.data, {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on any status code
      });

      const statusMatch = response.status === testCase.expectedStatus;
      const hasSuccess = response.data?.success !== undefined;

      if (statusMatch) {
        console.log(`   ✅ PASSED - Status: ${response.status} (Expected: ${testCase.expectedStatus})`);
        if (response.data?.success) {
          console.log(`   ✅ Response: ${response.data.message || 'Success'}`);
          if (response.data.data?.id) {
            console.log(`   ✅ Request ID: ${response.data.data.id}`);
          }
        } else {
          console.log(`   ⚠️  Response: ${response.data?.message || 'No message'}`);
        }
        passed++;
      } else {
        console.log(`   ❌ FAILED - Status: ${response.status} (Expected: ${testCase.expectedStatus})`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.log(`   ⚠️  No response received. Is the server running at ${BASE_URL}?`);
      }
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${testCases.length}`);
  console.log(`   📊 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});

