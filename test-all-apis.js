/**
 * Comprehensive API Testing Script
 * Tests all API endpoints to ensure they're working correctly
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5500/api';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test results
const results = {
  passed: [],
  failed: [],
  total: 0
};

// Helper function to make API calls
async function testEndpoint(name, method, url, data = null, headers = {}) {
  results.total++;
  const startTime = Date.now();
  
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: TEST_TIMEOUT
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    results.passed.push({
      name,
      method,
      url,
      status: response.status,
      duration: `${duration}ms`
    });
    
    console.log(`✅ PASS: ${name} - ${method} ${url} (${response.status}) - ${duration}ms`);
    return { success: true, response };
  } catch (error) {
    const duration = Date.now() - startTime;
    const status = error.response?.status || 'NO RESPONSE';
    const message = error.response?.data?.message || error.message || 'Unknown error';
    
    results.failed.push({
      name,
      method,
      url,
      status,
      error: message,
      duration: `${duration}ms`
    });
    
    console.log(`❌ FAIL: ${name} - ${method} ${url} (${status}) - ${message} - ${duration}ms`);
    return { success: false, error };
  }
}

// Test all endpoints
async function runAllTests() {
  console.log('\n🚀 Starting API Tests...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log('='.repeat(80));

  // ==================== AUTH ENDPOINTS ====================
  console.log('\n📋 Testing Auth Endpoints...\n');
  
  await testEndpoint('Health Check', 'GET', '/health');
  await testEndpoint('CORS Test', 'GET', '/cors-test');
  
  // Auth endpoints (some may fail without proper data, that's expected)
  await testEndpoint('Signup (without data)', 'POST', '/auth/signup', {});
  await testEndpoint('Signin (without data)', 'POST', '/auth/signin', {});
  await testEndpoint('Send OTP (without data)', 'POST', '/auth/send-otp', {});
  await testEndpoint('Get Agents', 'GET', '/auth/agents');
  await testEndpoint('Get Agent by ID (invalid)', 'GET', '/auth/agents/invalid-id');

  // ==================== LISTING ENDPOINTS ====================
  console.log('\n📋 Testing Listing Endpoints...\n');
  
  await testEndpoint('Search Listings', 'GET', '/listing/search');
  await testEndpoint('Search Listings with params', 'GET', '/listing/search?limit=5&sort=newest');
  await testEndpoint('Get State Count', 'GET', '/listing/stateCount');
  await testEndpoint('Get Listing by ID (invalid)', 'GET', '/listing/invalid-id');
  await testEndpoint('Get Listing Images (invalid)', 'GET', '/listing/invalid-id/images');
  await testEndpoint('Get Listings by Agent (invalid)', 'GET', '/listing/agent/invalid-id');
  await testEndpoint('Get Most Visited Listings', 'GET', '/listing/agent/invalid-id/mostVisited');

  // ==================== CATEGORY ENDPOINTS ====================
  console.log('\n📋 Testing Category Endpoints...\n');
  
  await testEndpoint('Get Category Stats', 'GET', '/categories');
  await testEndpoint('Get Category Details (apartment)', 'GET', '/categories/apartment');
  await testEndpoint('Get Category Details (villa)', 'GET', '/categories/villa');

  // ==================== CITY ENDPOINTS ====================
  console.log('\n📋 Testing City Endpoints...\n');
  
  await testEndpoint('Get City Stats', 'GET', '/cities');
  await testEndpoint('Get City Details (Damascus)', 'GET', '/cities/Damascus');
  await testEndpoint('Get City Details (Aleppo)', 'GET', '/cities/Aleppo');

  // ==================== USER ENDPOINTS ====================
  console.log('\n📋 Testing User Endpoints...\n');
  
  await testEndpoint('Get User Profile (no auth)', 'GET', '/user/profile');
  await testEndpoint('Update User Profile (no auth)', 'PUT', '/user/profile', {});

  // ==================== REVIEW ENDPOINTS ====================
  console.log('\n📋 Testing Review Endpoints...\n');
  
  await testEndpoint('Get Reviews for Property', 'GET', '/review/property/invalid-id');
  await testEndpoint('Create Review (no auth)', 'POST', '/review', {});

  // ==================== CONTACT ENDPOINTS ====================
  console.log('\n📋 Testing Contact Endpoints...\n');
  
  await testEndpoint('Get Contacts (no auth)', 'GET', '/contacts');
  await testEndpoint('Create Contact', 'POST', '/contacts', {
    name: 'Test User',
    email: 'test@example.com',
    message: 'Test message'
  });

  // ==================== FAVORITE ENDPOINTS ====================
  console.log('\n📋 Testing Favorite Endpoints...\n');
  
  await testEndpoint('Get Favorites (no auth)', 'GET', '/favorites');
  await testEndpoint('Add Favorite (no auth)', 'POST', '/favorites', {});

  // ==================== AGENT ENDPOINTS ====================
  console.log('\n📋 Testing Agent Endpoints...\n');
  
  await testEndpoint('Get All Agents', 'GET', '/agents');
  await testEndpoint('Get Agent by ID (invalid)', 'GET', '/agents/invalid-id');

  // ==================== POINT ENDPOINTS ====================
  console.log('\n📋 Testing Point Endpoints...\n');
  
  await testEndpoint('Get Points (no auth)', 'GET', '/points');
  await testEndpoint('Get Point History (no auth)', 'GET', '/points/history');

  // ==================== MESSAGE ENDPOINTS ====================
  console.log('\n📋 Testing Message Endpoints...\n');
  
  await testEndpoint('Get Messages (no auth)', 'GET', '/message');
  await testEndpoint('Send Message (no auth)', 'POST', '/message', {});

  // ==================== NEWSLETTER ENDPOINTS ====================
  console.log('\n📋 Testing Newsletter Endpoints...\n');
  
  await testEndpoint('Subscribe to Newsletter', 'POST', '/newsletter/subscribe', {
    email: 'test@example.com'
  });
  await testEndpoint('Get Newsletter Subscribers (no auth)', 'GET', '/newsletter/subscribers');

  // ==================== BLOG ENDPOINTS ====================
  console.log('\n📋 Testing Blog Endpoints...\n');
  
  await testEndpoint('Get All Blogs', 'GET', '/blog');
  await testEndpoint('Get Blog by ID (invalid)', 'GET', '/blog/invalid-id');

  // ==================== DASHBOARD ENDPOINTS ====================
  console.log('\n📋 Testing Dashboard Endpoints...\n');
  
  await testEndpoint('Get Dashboard Stats (no auth)', 'GET', '/dashboard/stats');
  await testEndpoint('Get Dashboard Data (no auth)', 'GET', '/dashboard');

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`Success Rate: ${((results.passed.length / results.total) * 100).toFixed(2)}%\n`);

  if (results.failed.length > 0) {
    console.log('❌ FAILED TESTS:\n');
    results.failed.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}`);
      console.log(`   ${test.method} ${test.url}`);
      console.log(`   Status: ${test.status}`);
      console.log(`   Error: ${test.error}`);
      console.log(`   Duration: ${test.duration}\n`);
    });
  }

  if (results.passed.length > 0) {
    console.log('\n✅ PASSED TESTS:\n');
    results.passed.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name} - ${test.method} ${test.url} (${test.status}) - ${test.duration}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✨ Testing Complete!\n');

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n💥 Fatal Error:', error.message);
  process.exit(1);
});

