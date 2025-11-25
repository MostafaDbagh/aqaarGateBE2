/**
 * i18n Testing Script
 * 
 * This script tests all i18n-enabled GET endpoints with both English and Arabic headers
 * 
 * Usage:
 *   node test-i18n.js
 * 
 * Make sure your server is running on http://localhost:5500 (or update BASE_URL)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5500';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
};

/**
 * Make HTTP request with language header
 */
async function testEndpoint(name, method, url, lang = 'en', expectedKeys = []) {
  results.total++;
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: {
        'Accept-Language': lang,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const status = response.status;

    // Check if response has expected structure
    let passed = true;
    let message = '';

    if (status >= 200 && status < 300) {
      // Check for translation keys in response
      if (expectedKeys.length > 0) {
        const hasMessage = data.message || data.success !== undefined;
        if (hasMessage) {
          message = `✓ Response includes message/translation`;
        } else {
          passed = false;
          message = `✗ Response missing message/translation`;
        }
      } else {
        message = `✓ Status ${status}`;
      }
    } else {
      passed = false;
      message = `✗ Status ${status}: ${data.message || 'Error'}`;
    }

    if (passed) {
      results.passed++;
      console.log(`${colors.green}✓${colors.reset} [${lang.toUpperCase()}] ${name}`);
      if (data.message) {
        console.log(`  Message: ${colors.cyan}${data.message}${colors.reset}`);
      }
    } else {
      results.failed++;
      console.log(`${colors.red}✗${colors.reset} [${lang.toUpperCase()}] ${name}`);
      console.log(`  ${colors.red}${message}${colors.reset}`);
      if (data.message) {
        console.log(`  Response: ${JSON.stringify(data, null, 2)}`);
      }
    }

    return { passed, data, status };
  } catch (error) {
    results.failed++;
    console.log(`${colors.red}✗${colors.reset} [${lang.toUpperCase()}] ${name}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    return { passed: false, error: error.message };
  }
}

/**
 * Test all endpoints
 */
async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  i18n API Testing Script${colors.reset}`);
  console.log(`${colors.blue}  Testing endpoints with English and Arabic headers${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  // Test 1: Listing Search
  console.log(`${colors.yellow}1. Testing Listing Search API${colors.reset}`);
  await testEndpoint('GET /api/listing/search', 'GET', '/api/listing/search?limit=5', 'en', ['message']);
  await testEndpoint('GET /api/listing/search', 'GET', '/api/listing/search?limit=5', 'ar', ['message']);
  console.log('');

  // Test 2: Get Single Listing (you'll need a valid listing ID)
  console.log(`${colors.yellow}2. Testing Get Single Listing API${colors.reset}`);
  console.log(`${colors.yellow}   Note: Update LISTING_ID with a valid ID from your database${colors.reset}`);
  const LISTING_ID = 'YOUR_LISTING_ID_HERE'; // Update this
  if (LISTING_ID !== 'YOUR_LISTING_ID_HERE') {
    await testEndpoint('GET /api/listing/:id', 'GET', `/api/listing/${LISTING_ID}`, 'en', []);
    await testEndpoint('GET /api/listing/:id', 'GET', `/api/listing/${LISTING_ID}`, 'ar', []);
  } else {
    console.log(`${colors.yellow}   ⚠ Skipped (no listing ID provided)${colors.reset}`);
  }
  console.log('');

  // Test 3: Get All Cities
  console.log(`${colors.yellow}3. Testing Cities API${colors.reset}`);
  await testEndpoint('GET /api/cities', 'GET', '/api/cities', 'en', ['message']);
  await testEndpoint('GET /api/cities', 'GET', '/api/cities', 'ar', ['message']);
  console.log('');

  // Test 4: Get City Details
  console.log(`${colors.yellow}4. Testing City Details API${colors.reset}`);
  await testEndpoint('GET /api/cities/Damascus', 'GET', '/api/cities/Damascus', 'en', ['message']);
  await testEndpoint('GET /api/cities/Damascus', 'GET', '/api/cities/Damascus', 'ar', ['message']);
  console.log('');

  // Test 5: Get All Categories
  console.log(`${colors.yellow}5. Testing Categories API${colors.reset}`);
  await testEndpoint('GET /api/categories', 'GET', '/api/categories', 'en', ['message']);
  await testEndpoint('GET /api/categories', 'GET', '/api/categories', 'ar', ['message']);
  console.log('');

  // Test 6: Get Category Details
  console.log(`${colors.yellow}6. Testing Category Details API${colors.reset}`);
  await testEndpoint('GET /api/categories/Apartment', 'GET', '/api/categories/Apartment', 'en', ['message']);
  await testEndpoint('GET /api/categories/Apartment', 'GET', '/api/categories/Apartment', 'ar', ['message']);
  console.log('');

  // Test 7: Get All Agents
  console.log(`${colors.yellow}7. Testing Agents API${colors.reset}`);
  await testEndpoint('GET /api/agents', 'GET', '/api/agents', 'en', ['message']);
  await testEndpoint('GET /api/agents', 'GET', '/api/agents', 'ar', ['message']);
  console.log('');

  // Test 8: Get Single Agent (you'll need a valid agent ID)
  console.log(`${colors.yellow}8. Testing Get Single Agent API${colors.reset}`);
  console.log(`${colors.yellow}   Note: Update AGENT_ID with a valid ID from your database${colors.reset}`);
  const AGENT_ID = 'YOUR_AGENT_ID_HERE'; // Update this
  if (AGENT_ID !== 'YOUR_AGENT_ID_HERE') {
    await testEndpoint('GET /api/agents/:id', 'GET', `/api/agents/${AGENT_ID}`, 'en', ['message']);
    await testEndpoint('GET /api/agents/:id', 'GET', `/api/agents/${AGENT_ID}`, 'ar', ['message']);
  } else {
    console.log(`${colors.yellow}   ⚠ Skipped (no agent ID provided)${colors.reset}`);
  }
  console.log('');

  // Summary
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('Error: This script requires Node.js 18+ or install node-fetch');
  console.error('Run: npm install node-fetch');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test execution failed:${colors.reset}`, error);
  process.exit(1);
});


