const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5500/api';

let createdRequestId = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCreate() {
  log('\n📝 TEST 1: CREATE Property Rental Request', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const testData = {
    ownerName: "Test Owner",
    ownerEmail: "test@example.com",
    ownerPhone: "+963999123456",
    propertyType: "apartment",
    propertySize: 1200,
    bedrooms: 3,
    bathrooms: 2,
    location: "Damascus, Al-Mazzeh",
    features: "Furnished, parking, garden",
    additionalDetails: "Test request for CRUD operations"
  };

  try {
    const response = await axios.post(`${BASE_URL}/property-rental`, testData);
    createdRequestId = response.data.data._id || response.data.data.id;
    
    log('✅ CREATE SUCCESS', 'green');
    log(`   Status: ${response.status}`, 'green');
    log(`   ID: ${createdRequestId}`, 'green');
    log(`   Status: ${response.data.data.status}`, 'green');
    return true;
  } catch (error) {
    log('❌ CREATE FAILED', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function testGetAll() {
  log('\n📋 TEST 2: GET ALL Property Rental Requests', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const response = await axios.get(`${BASE_URL}/property-rental`);
    
    log('✅ GET ALL SUCCESS', 'green');
    log(`   Status: ${response.status}`, 'green');
    log(`   Total Requests: ${response.data.pagination?.total || response.data.data?.length || 0}`, 'green');
    log(`   Current Page: ${response.data.pagination?.page || 1}`, 'green');
    return true;
  } catch (error) {
    log('❌ GET ALL FAILED', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function testGetAllWithFilters() {
  log('\n🔍 TEST 3: GET ALL with Filters (status=pending)', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const response = await axios.get(`${BASE_URL}/property-rental?status=pending&limit=5`);
    
    log('✅ GET ALL WITH FILTERS SUCCESS', 'green');
    log(`   Status: ${response.status}`, 'green');
    log(`   Filtered Results: ${response.data.data?.length || 0}`, 'green');
    return true;
  } catch (error) {
    log('❌ GET ALL WITH FILTERS FAILED', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function testGetById() {
  log('\n🔎 TEST 4: GET Property Rental Request by ID', 'cyan');
  log('='.repeat(60), 'cyan');

  if (!createdRequestId) {
    log('⚠️  Skipped: No request ID available', 'yellow');
    return false;
  }

  try {
    const response = await axios.get(`${BASE_URL}/property-rental/${createdRequestId}`);
    
    log('✅ GET BY ID SUCCESS', 'green');
    log(`   Status: ${response.status}`, 'green');
    log(`   Owner: ${response.data.data.ownerName}`, 'green');
    log(`   Email: ${response.data.data.ownerEmail}`, 'green');
    log(`   Property Type: ${response.data.data.propertyType}`, 'green');
    return true;
  } catch (error) {
    log('❌ GET BY ID FAILED', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function testUpdate() {
  log('\n✏️  TEST 5: UPDATE Property Rental Request', 'cyan');
  log('='.repeat(60), 'cyan');

  if (!createdRequestId) {
    log('⚠️  Skipped: No request ID available', 'yellow');
    return false;
  }

  const updateData = {
    status: 'under_review',
    notes: 'Updated via CRUD test',
    inspectionDate: new Date().toISOString(),
  };

  try {
    const response = await axios.put(`${BASE_URL}/property-rental/${createdRequestId}`, updateData);
    
    log('✅ UPDATE SUCCESS', 'green');
    log(`   Status: ${response.status}`, 'green');
    log(`   Updated Status: ${response.data.data.status}`, 'green');
    log(`   Has Notes: ${response.data.data.notes ? 'Yes' : 'No'}`, 'green');
    return true;
  } catch (error) {
    log('❌ UPDATE FAILED', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function testDelete() {
  log('\n🗑️  TEST 6: DELETE Property Rental Request', 'cyan');
  log('='.repeat(60), 'cyan');

  if (!createdRequestId) {
    log('⚠️  Skipped: No request ID available', 'yellow');
    return false;
  }

  try {
    const response = await axios.delete(`${BASE_URL}/property-rental/${createdRequestId}`);
    
    log('✅ DELETE SUCCESS', 'green');
    log(`   Status: ${response.status}`, 'green');
    log(`   Message: ${response.data.message}`, 'green');
    
    // Verify deletion
    try {
      await axios.get(`${BASE_URL}/property-rental/${createdRequestId}`);
      log('⚠️  WARNING: Request still exists after deletion', 'yellow');
    } catch (error) {
      if (error.response?.status === 404) {
        log('✅ Deletion verified: Request not found', 'green');
      }
    }
    
    return true;
  } catch (error) {
    log('❌ DELETE FAILED', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function testValidationErrors() {
  log('\n⚠️  TEST 7: Validation Errors', 'cyan');
  log('='.repeat(60), 'cyan');

  const tests = [
    {
      name: 'Missing required fields',
      data: { ownerName: 'Test' },
      expectedStatus: 400,
    },
    {
      name: 'Invalid property size (0)',
      data: {
        ownerName: "Test",
        ownerEmail: "test@test.com",
        ownerPhone: "+963999123456",
        propertyType: "apartment",
        propertySize: 0,
        bedrooms: 1,
        bathrooms: 1,
        location: "Test",
        features: "Test"
      },
      expectedStatus: 400,
    },
    {
      name: 'Invalid status',
      id: createdRequestId,
      data: { status: 'invalid_status' },
      expectedStatus: 400,
    },
  ];

  let passed = 0;
  for (const test of tests) {
    try {
      if (test.id) {
        await axios.put(`${BASE_URL}/property-rental/${test.id}`, test.data);
      } else {
        await axios.post(`${BASE_URL}/property-rental`, test.data);
      }
      log(`❌ ${test.name}: Should have failed`, 'red');
    } catch (error) {
      if (error.response?.status === test.expectedStatus) {
        log(`✅ ${test.name}: Validation working`, 'green');
        passed++;
      } else {
        log(`❌ ${test.name}: Wrong status code (got ${error.response?.status}, expected ${test.expectedStatus})`, 'red');
      }
    }
  }
  return passed === tests.length;
}

async function runAllTests() {
  log('\n🚀 Starting Property Rental CRUD API Tests', 'blue');
  log('='.repeat(60), 'blue');
  log(`Base URL: ${BASE_URL}\n`, 'blue');

  const results = {
    create: false,
    getAll: false,
    getAllFilters: false,
    getById: false,
    update: false,
    delete: false,
    validation: false,
  };

  // Run tests in sequence
  results.create = await testCreate();
  results.getAll = await testGetAll();
  results.getAllFilters = await testGetAllWithFilters();
  results.getById = await testGetById();
  results.update = await testUpdate();
  results.validation = await testValidationErrors();
  results.delete = await testDelete();

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('📊 TEST SUMMARY', 'blue');
  log('='.repeat(60), 'blue');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  
  log(`\nTotal Tests: ${total}`, 'blue');
  log(`Passed: ${passed}`, passed === total ? 'green' : 'yellow');
  log(`Failed: ${total - passed}`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('\n✅ ALL TESTS PASSED!', 'green');
    process.exit(0);
  } else {
    log('\n❌ SOME TESTS FAILED', 'red');
    process.exit(1);
  }
}

// Check if server is running
axios.get(`${BASE_URL.replace('/api', '')}/health`).catch(() => {
  log('\n⚠️  Warning: Server health check failed. Make sure the server is running.', 'yellow');
  log('   Starting tests anyway...\n', 'yellow');
});

runAllTests().catch(error => {
  log(`\n💥 Fatal Error: ${error.message}`, 'red');
  if (error.code === 'ECONNREFUSED') {
    log('\n💡 Make sure the server is running:', 'yellow');
    log('   cd api && npm start', 'yellow');
  }
  process.exit(1);
});

