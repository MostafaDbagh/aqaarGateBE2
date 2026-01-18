/**
 * Test script for new dashboard analytics endpoints
 * Run with: node test-dashboard-endpoints.js
 * 
 * Note: This requires a valid JWT token from an authenticated agent user
 * You can get a token by logging in via the API
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5500/api';
const TOKEN = process.env.TEST_TOKEN || ''; // Set your auth token here

// Test helper function
async function testEndpoint(name, url, params = {}) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`   ✅ Success: ${response.data.message}`);
      console.log(`   📊 Data structure:`, Object.keys(response.data.data || {}));
      return { success: true, data: response.data.data };
    } else {
      console.log(`   ❌ Failed: ${response.data.message}`);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    if (error.response) {
      console.log(`   ❌ Error ${error.response.status}: ${error.response.data?.message || error.message}`);
      return { success: false, error: error.response.data?.message || error.message, status: error.response.status };
    } else {
      console.log(`   ❌ Network Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Dashboard Endpoints Tests\n');
  console.log('=' .repeat(60));

  if (!TOKEN) {
    console.log('⚠️  WARNING: No token provided. Set TEST_TOKEN environment variable or update TOKEN in this script.');
    console.log('   Tests will likely fail with 401 Unauthorized.\n');
  }

  const results = {};

  // Test 1: Conversion Rates
  results.conversionRates = await testEndpoint(
    'Conversion Rates (30d)',
    `${BASE_URL}/dashboard/conversion-rates`,
    { period: '30d' }
  );

  // Test 2: Top Performing Properties
  results.topProperties = await testEndpoint(
    'Top Performing Properties',
    `${BASE_URL}/dashboard/top-properties`,
    { limit: 5, sortBy: 'visits' }
  );

  // Test 3: Stats Comparison (MoM)
  results.statsComparisonMoM = await testEndpoint(
    'Stats Comparison (Month over Month)',
    `${BASE_URL}/dashboard/stats-comparison`,
    { type: 'mom' }
  );

  // Test 4: Stats Comparison (YoY)
  results.statsComparisonYoY = await testEndpoint(
    'Stats Comparison (Year over Year)',
    `${BASE_URL}/dashboard/stats-comparison`,
    { type: 'yoy' }
  );

  // Test 5: Health Scores
  results.healthScores = await testEndpoint(
    'Listing Health Scores',
    `${BASE_URL}/dashboard/health-scores`
  );

  // Test 6: Lead Pipeline
  results.leadPipeline = await testEndpoint(
    'Lead Pipeline',
    `${BASE_URL}/dashboard/lead-pipeline`
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Test Summary:\n');

  const passed = Object.values(results).filter(r => r.success).length;
  const failed = Object.values(results).filter(r => !r.success).length;
  const total = Object.keys(results).length;

  console.log(`   Total Tests: ${total}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n   🎉 All tests passed!');
  } else {
    console.log('\n   ⚠️  Some tests failed. Check the errors above.');
  }

  return results;
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ Test execution completed.\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testEndpoint };

