require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:5500';

// Helper function to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 5500,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test functions
async function testHealth() {
  console.log('\n🔍 Testing Health Endpoint...');
  try {
    const response = await makeRequest('/api/health');
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Response:`, JSON.stringify(response.data, null, 2));
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function testCategories() {
  console.log('\n🔍 Testing Categories API...');
  try {
    const startTime = Date.now();
    const response = await makeRequest('/api/categories');
    const duration = Date.now() - startTime;
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Response Time: ${duration}ms`);
    console.log(`✅ Cache Header: ${response.headers['x-cache'] || 'N/A'}`);
    
    if (response.data && response.data.categories) {
      console.log(`✅ Categories Count: ${response.data.categories.length}`);
      if (response.data.categories.length > 0) {
        console.log(`✅ Sample Category:`, JSON.stringify(response.data.categories[0], null, 2));
      }
    } else {
      console.log(`⚠️  Response:`, JSON.stringify(response.data, null, 2));
    }
    
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function testCities() {
  console.log('\n🔍 Testing Cities API...');
  try {
    const startTime = Date.now();
    const response = await makeRequest('/api/cities');
    const duration = Date.now() - startTime;
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Response Time: ${duration}ms`);
    console.log(`✅ Cache Header: ${response.headers['x-cache'] || 'N/A'}`);
    
    if (response.data && response.data.cities) {
      console.log(`✅ Cities Count: ${response.data.cities.length}`);
      if (response.data.cities.length > 0) {
        console.log(`✅ Sample City:`, JSON.stringify(response.data.cities[0], null, 2));
      }
    } else {
      console.log(`⚠️  Response:`, JSON.stringify(response.data, null, 2));
    }
    
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function testSearch() {
  console.log('\n🔍 Testing Search/Listings API...');
  try {
    const startTime = Date.now();
    const response = await makeRequest('/api/listing/search?limit=3');
    const duration = Date.now() - startTime;
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Response Time: ${duration}ms`);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Listings Count: ${response.data.length}`);
      if (response.data.length > 0) {
        console.log(`✅ Sample Listing ID: ${response.data[0]._id || response.data[0].propertyId || 'N/A'}`);
      }
    } else if (response.data && response.data.listings) {
      console.log(`✅ Listings Count: ${response.data.listings.length}`);
    } else {
      console.log(`⚠️  Response:`, JSON.stringify(response.data, null, 2));
    }
    
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 API Testing Suite');
  console.log('═══════════════════════════════════════════════════════');
  
  // Wait a bit for server to be ready
  console.log('\n⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const results = {
    health: await testHealth(),
    categories: await testCategories(),
    cities: await testCities(),
    search: await testSearch()
  };
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Test Results Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Categories API: ${results.categories ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Cities API: ${results.cities ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Search API: ${results.search ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

