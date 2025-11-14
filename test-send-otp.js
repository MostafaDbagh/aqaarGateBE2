/**
 * Test script for sendOTP endpoint
 * Tests both localhost and production endpoints
 */

const axios = require('axios');

const testEmail = process.argv[2] || 'test@example.com';
const testType = process.argv[3] || 'signup';

const endpoints = [
  { name: 'Localhost', url: 'http://localhost:5500/api/auth/send-otp' },
  { name: 'Production', url: 'https://aqaargatebe2.onrender.com/api/auth/send-otp' }
];

async function testSendOTP(endpoint) {
  console.log(`\n🧪 Testing ${endpoint.name}...`);
  console.log(`   URL: ${endpoint.url}`);
  console.log(`   Email: ${testEmail}`);
  console.log(`   Type: ${testType}`);
  
  try {
    const startTime = Date.now();
    const response = await axios.post(
      endpoint.url,
      { email: testEmail, type: testType },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // 10 seconds timeout
      }
    );
    const responseTime = Date.now() - startTime;
    
    console.log(`   ✅ Response received in ${responseTime}ms`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Message: ${response.data.message}`);
    
    if (response.data.otp && process.env.NODE_ENV !== 'production') {
      console.log(`   📧 OTP (dev only): ${response.data.otp}`);
    }
    
    return { success: true, responseTime, data: response.data };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('📧 SendOTP Endpoint Test');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testSendOTP(endpoint);
    results.push({ endpoint: endpoint.name, ...result });
    
    // Wait a bit between tests
    if (endpoint.name === 'Localhost') {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    console.log(`\n${result.endpoint}:`);
    if (result.success) {
      console.log(`  ✅ Success - Response time: ${result.responseTime}ms`);
    } else {
      console.log(`  ❌ Failed - ${result.error}`);
    }
  });
  
  console.log('\n💡 Note: Check server logs to verify email was actually sent');
  console.log('   Look for [EMAIL_SUCCESS] or Failed to send OTP email messages');
}

// Run tests
runTests().catch(console.error);

