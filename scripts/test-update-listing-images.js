/**
 * Test script for update listing images API
 * Run: node scripts/test-update-listing-images.js
 * Requires: Backend running on localhost:5500, valid admin/agent credentials in .env
 */

const http = require('http');
const https = require('https');
const FormDataPkg = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'http://localhost:5500/api';

function request(method, url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url.startsWith('http') ? url : `${API_BASE}${url}`);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function login(email, password) {
  const body = JSON.stringify({ email, password });
  const { status, data } = await request('POST', `${API_BASE}/user/login`, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    body,
  });
  if (status !== 200 || !data.token) {
    throw new Error(`Login failed: ${JSON.stringify(data)}`);
  }
  return data.token;
}

async function getListings(token) {
  const { status, data } = await request('GET', `${API_BASE}/listing/search?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (status !== 200) throw new Error(`Get listings failed: ${JSON.stringify(data)}`);
  const list = Array.isArray(data) ? data : data?.data || [];
  return list;
}

async function testUpdateImagesNoAuth() {
  console.log('\n--- Test 1: Update images without auth (expect 401) ---');
  try {
    const form = new FormDataPkg();
    form.append('imagesToDelete', JSON.stringify([]));
    const res = await new Promise((resolve, reject) => {
      form.submit(
        {
          protocol: 'http:',
          host: 'localhost',
          port: 5500,
          path: '/api/listing/update/000000000000000000000000/images',
          method: 'POST',
        },
        (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });
    const pass = res.statusCode === 401;
    console.log(pass ? '✓ PASS: 401 Unauthorized' : `✗ FAIL: got ${res.statusCode}`);
    return pass;
  } catch (err) {
    console.log('✗ FAIL:', err.message || err);
    return false;
  }
}

async function testUpdateImagesWithAuth(token, listingId) {
  console.log('\n--- Test 2: Update images with auth, no changes (expect 200) ---');
  const form = new FormData();
  form.append('imagesToDelete', JSON.stringify([]));
  const { status, data } = await new Promise((resolve, reject) => {
    const opts = {
      protocol: 'http:',
      host: 'localhost',
      port: 5500,
      path: `/api/listing/update/${listingId}/images`,
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : {} });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
  const pass = status === 200 && data && (data.images !== undefined || data._id);
  console.log(pass ? '✓ PASS: 200 OK, listing returned' : `✗ FAIL: status=${status}`);
  return pass;
}

async function testUpdateImagesInvalidId(token) {
  console.log('\n--- Test 3: Update images with invalid listing ID (expect 404) ---');
  const form = new FormData();
  form.append('imagesToDelete', JSON.stringify([]));
  const { status } = await new Promise((resolve, reject) => {
    const opts = {
      protocol: 'http:',
      host: 'localhost',
      port: 5500,
      path: '/api/listing/update/000000000000000000000000/images',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    form.pipe(req);
  });
  const pass = status === 404;
  console.log(pass ? '✓ PASS: 404 Not Found' : `✗ FAIL: got ${status}`);
  return pass;
}

async function run() {
  console.log('=== Update Listing Images API Tests ===');
  console.log('API Base:', API_BASE);

  let passed = 0;
  let failed = 0;

  // Test 1: No auth
  try {
    const result = await testUpdateImagesNoAuth();
    if (result) passed++;
    else failed++;
  } catch (e) {
    console.log('✗ FAIL:', e.message || e);
    failed++;
  }

  // Need login for remaining tests
  const email = process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('\n⚠ Skipping auth tests: set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD (or ADMIN_EMAIL/ADMIN_PASSWORD)');
    console.log('  Summary:', passed, 'passed,', failed, 'failed');
    process.exit(failed > 0 ? 1 : 0);
  }

  let token;
  try {
    token = await login(email, password);
    console.log('\n✓ Logged in successfully');
  } catch (e) {
    console.log('\n✗ Login failed:', e.message);
    console.log('  Summary:', passed, 'passed,', failed, 'failed');
    process.exit(1);
  }

  const listings = await getListings(token);
  const listingId = listings[0]?._id;
  if (!listingId) {
    console.log('\n⚠ No listings found, skipping listing-specific tests');
  } else {
    console.log('Using listing ID:', listingId);

    // Test 2: With auth, no changes
    try {
      if (await testUpdateImagesWithAuth(token, listingId)) passed++;
      else failed++;
    } catch (e) {
      console.log('✗ FAIL:', e.message);
      failed++;
    }

    // Test 3: Invalid ID
    try {
      if (await testUpdateImagesInvalidId(token)) passed++;
      else failed++;
    } catch (e) {
      console.log('✗ FAIL:', e.message);
      failed++;
    }
  }

  console.log('\n=== Summary ===');
  console.log('Passed:', passed, '| Failed:', failed);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
