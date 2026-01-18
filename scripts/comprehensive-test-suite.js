/**
 * Comprehensive Test Suite for All Features
 * 
 * Tests:
 * 1. Notification System
 * 2. Analytics Endpoints
 * 3. Export/Import Functionality
 * 4. Dashboard Stats
 * 5. Property Management
 * 
 * Run with: node scripts/comprehensive-test-suite.js
 * Duration: ~1 hour of comprehensive testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5500/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aqaarGate';

// Test results
const testResults = {
  notifications: { passed: 0, failed: 0, tests: [] },
  analytics: { passed: 0, failed: 0, tests: [] },
  exportImport: { passed: 0, failed: 0, tests: [] },
  dashboard: { passed: 0, failed: 0, tests: [] },
  properties: { passed: 0, failed: 0, tests: [] }
};

let authToken = '';
let agentId = '';

/**
 * Helper: Test API endpoint
 */
async function testEndpoint(name, method, url, data = null, expectedStatus = 200) {
  try {
    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    const passed = response.status === expectedStatus;
    
    return {
      name,
      passed,
      status: response.status,
      data: response.data,
      error: null
    };
  } catch (error) {
    return {
      name,
      passed: false,
      status: error.response?.status || 0,
      data: null,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Login as agent
 */
async function loginAsAgent() {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = require('../models/user.model');
    
    const agent = await User.findOne({ role: 'agent', isBlocked: false });
    if (!agent) {
      throw new Error('No agent found');
    }
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/signin`, {
      email: agent.email,
      password: process.env.TEST_AGENT_PASSWORD || 'password123'
    });
    
    if (loginResponse.data.success && loginResponse.data.token) {
      authToken = loginResponse.data.token;
      agentId = agent._id.toString();
      console.log('✅ Login successful!');
      return true;
    }
    
    throw new Error('Login failed');
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

/**
 * TEST SUITE 1: Notification System
 */
async function testNotifications() {
  console.log('\n' + '='.repeat(60));
  console.log('🔔 TEST SUITE 1: Notification System');
  console.log('='.repeat(60));
  
  // Test 1.1: Get notifications
  const test1_1 = await testEndpoint(
    'Get all notifications',
    'GET',
    `${BASE_URL}/notifications`
  );
  testResults.notifications.tests.push(test1_1);
  console.log(test1_1.passed ? '✅' : '❌', test1_1.name);
  
  // Test 1.2: Get unread count
  const test1_2 = await testEndpoint(
    'Get unread notification count',
    'GET',
    `${BASE_URL}/notifications/unread/count`
  );
  testResults.notifications.tests.push(test1_2);
  console.log(test1_2.passed ? '✅' : '❌', test1_2.name);
  
  // Test 1.3: Mark notification as read
  if (test1_1.data?.data?.length > 0) {
    const firstNotificationId = test1_1.data.data[0]._id;
    const test1_3 = await testEndpoint(
      'Mark notification as read',
      'PATCH',
      `${BASE_URL}/notifications/${firstNotificationId}/read`
    );
    testResults.notifications.tests.push(test1_3);
    console.log(test1_3.passed ? '✅' : '❌', test1_3.name);
  }
  
  // Calculate results
  testResults.notifications.passed = testResults.notifications.tests.filter(t => t.passed).length;
  testResults.notifications.failed = testResults.notifications.tests.filter(t => !t.passed).length;
}

/**
 * TEST SUITE 2: Analytics Endpoints
 */
async function testAnalytics() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUITE 2: Analytics Endpoints');
  console.log('='.repeat(60));
  
  // Test 2.1: Dashboard Analytics
  const test2_1 = await testEndpoint(
    'Get dashboard analytics',
    'GET',
    `${BASE_URL}/dashboard/analytics?period=30d`
  );
  testResults.analytics.tests.push(test2_1);
  console.log(test2_1.passed ? '✅' : '❌', test2_1.name);
  
  // Test 2.2: Conversion Rates
  const test2_2 = await testEndpoint(
    'Get conversion rates',
    'GET',
    `${BASE_URL}/dashboard/conversion-rates?period=30d`
  );
  testResults.analytics.tests.push(test2_2);
  console.log(test2_2.passed ? '✅' : '❌', test2_2.name);
  
  // Test 2.3: Top Performing Properties
  const test2_3 = await testEndpoint(
    'Get top performing properties',
    'GET',
    `${BASE_URL}/dashboard/top-performing-properties?limit=5&sortBy=visits`
  );
  testResults.analytics.tests.push(test2_3);
  console.log(test2_3.passed ? '✅' : '❌', test2_3.name);
  
  // Test 2.4: Stats Comparison
  const test2_4 = await testEndpoint(
    'Get stats comparison',
    'GET',
    `${BASE_URL}/dashboard/stats-comparison?period=30d`
  );
  testResults.analytics.tests.push(test2_4);
  console.log(test2_4.passed ? '✅' : '❌', test2_4.name);
  
  // Test 2.5: Health Scores
  const test2_5 = await testEndpoint(
    'Get health scores',
    'GET',
    `${BASE_URL}/dashboard/health-scores?limit=10`
  );
  testResults.analytics.tests.push(test2_5);
  console.log(test2_5.passed ? '✅' : '❌', test2_5.name);
  
  // Test 2.6: Lead Pipeline
  const test2_6 = await testEndpoint(
    'Get lead pipeline',
    'GET',
    `${BASE_URL}/dashboard/lead-pipeline?period=30d`
  );
  testResults.analytics.tests.push(test2_6);
  console.log(test2_6.passed ? '✅' : '❌', test2_6.name);
  
  // Calculate results
  testResults.analytics.passed = testResults.analytics.tests.filter(t => t.passed).length;
  testResults.analytics.failed = testResults.analytics.tests.filter(t => !t.passed).length;
}

/**
 * TEST SUITE 3: Export/Import
 */
async function testExportImport() {
  console.log('\n' + '='.repeat(60));
  console.log('📥 TEST SUITE 3: Export/Import Functionality');
  console.log('='.repeat(60));
  
  // Test 3.1: Export properties
  try {
    const exportResponse = await axios.get(`${BASE_URL}/listing/export`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      responseType: 'blob'
    });
    
    const test3_1 = {
      name: 'Export properties to CSV',
      passed: exportResponse.status === 200 && exportResponse.data.size > 0,
      status: exportResponse.status,
      data: { size: exportResponse.data.size },
      error: null
    };
    testResults.exportImport.tests.push(test3_1);
    console.log(test3_1.passed ? '✅' : '❌', test3_1.name);
    
    // Save exported file
    const exportPath = path.join(__dirname, '..', 'test-export.csv');
    await fs.writeFile(exportPath, exportResponse.data);
    console.log(`   📁 Exported file saved to: ${exportPath}`);
    
    // Test 3.2: Import properties (skip if export failed)
    if (test3_1.passed) {
      try {
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('csvFile', await fs.readFile(exportPath), 'test-export.csv');
        
        const importResponse = await axios.post(`${BASE_URL}/listing/import`, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });
        
        const test3_2 = {
          name: 'Import properties from CSV',
          passed: importResponse.status === 200,
          status: importResponse.status,
          data: importResponse.data,
          error: null
        };
        testResults.exportImport.tests.push(test3_2);
        console.log(test3_2.passed ? '✅' : '❌', test3_2.name);
      } catch (error) {
        const test3_2 = {
          name: 'Import properties from CSV',
          passed: false,
          status: error.response?.status || 0,
          data: null,
          error: error.response?.data?.message || error.message
        };
        testResults.exportImport.tests.push(test3_2);
        console.log('❌', test3_2.name, '-', test3_2.error);
      }
    }
  } catch (error) {
    const test3_1 = {
      name: 'Export properties to CSV',
      passed: false,
      status: error.response?.status || 0,
      data: null,
      error: error.response?.data?.message || error.message
    };
    testResults.exportImport.tests.push(test3_1);
    console.log('❌', test3_1.name, '-', test3_1.error);
  }
  
  // Calculate results
  testResults.exportImport.passed = testResults.exportImport.tests.filter(t => t.passed).length;
  testResults.exportImport.failed = testResults.exportImport.tests.filter(t => !t.passed).length;
}

/**
 * TEST SUITE 4: Dashboard Stats
 */
async function testDashboard() {
  console.log('\n' + '='.repeat(60));
  console.log('📈 TEST SUITE 4: Dashboard Stats');
  console.log('='.repeat(60));
  
  // Test 4.1: Dashboard Stats
  const test4_1 = await testEndpoint(
    'Get dashboard stats',
    'GET',
    `${BASE_URL}/dashboard/stats`
  );
  testResults.dashboard.tests.push(test4_1);
  console.log(test4_1.passed ? '✅' : '❌', test4_1.name);
  
  // Test 4.2: Dashboard Notifications
  const test4_2 = await testEndpoint(
    'Get dashboard notifications',
    'GET',
    `${BASE_URL}/dashboard/notifications`
  );
  testResults.dashboard.tests.push(test4_2);
  console.log(test4_2.passed ? '✅' : '❌', test4_2.name);
  
  // Calculate results
  testResults.dashboard.passed = testResults.dashboard.tests.filter(t => t.passed).length;
  testResults.dashboard.failed = testResults.dashboard.tests.filter(t => !t.passed).length;
}

/**
 * TEST SUITE 5: Property Management
 */
async function testProperties() {
  console.log('\n' + '='.repeat(60));
  console.log('🏠 TEST SUITE 5: Property Management');
  console.log('='.repeat(60));
  
  // Test 5.1: Get agent listings
  const test5_1 = await testEndpoint(
    'Get agent listings',
    'GET',
    `${BASE_URL}/listing/agent/${agentId}?limit=10`
  );
  testResults.properties.tests.push(test5_1);
  console.log(test5_1.passed ? '✅' : '❌', test5_1.name);
  
  // Test 5.2: Get most visited listings
  const test5_2 = await testEndpoint(
    'Get most visited listings',
    'GET',
    `${BASE_URL}/listing/agent/${agentId}/mostVisited?limit=5`
  );
  testResults.properties.tests.push(test5_2);
  console.log(test5_2.passed ? '✅' : '❌', test5_2.name);
  
  // Calculate results
  testResults.properties.passed = testResults.properties.tests.filter(t => t.passed).length;
  testResults.properties.failed = testResults.properties.tests.filter(t => !t.passed).length;
}

/**
 * Print final summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const suites = [
    { name: 'Notifications', data: testResults.notifications },
    { name: 'Analytics', data: testResults.analytics },
    { name: 'Export/Import', data: testResults.exportImport },
    { name: 'Dashboard', data: testResults.dashboard },
    { name: 'Properties', data: testResults.properties }
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  suites.forEach(suite => {
    const { name, data } = suite;
    const total = data.passed + data.failed;
    const percentage = total > 0 ? ((data.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`\n${name}:`);
    console.log(`  ✅ Passed: ${data.passed}/${total} (${percentage}%)`);
    console.log(`  ❌ Failed: ${data.failed}/${total}`);
    
    totalPassed += data.passed;
    totalFailed += data.failed;
  });
  
  const grandTotal = totalPassed + totalFailed;
  const grandPercentage = grandTotal > 0 ? ((totalPassed / grandTotal) * 100).toFixed(1) : 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 GRAND TOTAL');
  console.log('='.repeat(60));
  console.log(`✅ Total Passed: ${totalPassed}/${grandTotal} (${grandPercentage}%)`);
  console.log(`❌ Total Failed: ${totalFailed}/${grandTotal}`);
  console.log('\n✨ Test suite complete!');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Comprehensive Test Suite');
  console.log(`📍 API URL: ${BASE_URL}\n`);
  
  // Login
  const loggedIn = await loginAsAgent();
  if (!loggedIn) {
    console.error('❌ Cannot proceed without authentication');
    process.exit(1);
  }
  
  // Run test suites
  await testNotifications();
  await testAnalytics();
  await testExportImport();
  await testDashboard();
  await testProperties();
  
  // Print summary
  printSummary();
  
  await mongoose.disconnect();
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testNotifications, testAnalytics, testExportImport, testDashboard, testProperties };

