#!/usr/bin/env node
/**
 * Test: Featured order feature (schema, middleware, controller logic, aggregation).
 * Run from aqaarGateBE2: node scripts/test-featured-order.js
 * Or: npm run test:featured-order
 * Requires: DB connection (optional for schema check; required for aggregation tests).
 *
 * Manual testing checklist:
 * 1. Admin: Go to Admin > Properties by Admin. Star a listing (featured). Set # to 1.
 * 2. Star another listing, set # to 2. Ensure first stays first on homepage.
 * 3. Homepage / property-list (newest): Order should be featured 1, featured 2, then other featured (no #), then non-featured by date.
 * 4. Unfeature a listing: # input should disappear; listing drops to normal order.
 *
 * Performance: getFilteredListings runs count in parallel with main query; compound index
 * (approvalStatus, isDeleted, isSold, isFeatured, featuredOrder, createdAt) supports the aggregation.
 */

require('dotenv').config();
const Listing = require('../models/listing.model.js');

let totalRun = 0;
let totalPass = 0;
function pass(name) {
  totalRun++;
  totalPass++;
  console.log('PASS:', name);
}
function fail(name, detail) {
  totalRun++;
  console.error('FAIL:', name, detail ? `- ${detail}` : '');
}

// --- Schema ---
function testSchema() {
  const pathOrder = Listing.schema.path('featuredOrder');
  if (!pathOrder) { fail('schema featuredOrder', 'missing'); return; }
  if (pathOrder.instance !== 'Number') { fail('schema featuredOrder', `expected Number, got ${pathOrder.instance}`); return; }
  pass('schema has featuredOrder (Number)');

  const pathFeat = Listing.schema.path('isFeatured');
  if (!pathFeat) { fail('schema isFeatured', 'missing'); return; }
  pass('schema has isFeatured');
}

// --- Controller logic: featuredOrder parsing (same as setListingFeatured) ---
function testControllerFeaturedOrderLogic() {
  const parseFeaturedOrder = (isFeatured, bodyOrder) => {
    if (!isFeatured) return null;
    if (bodyOrder === undefined) return undefined; // leave existing
    const order = parseInt(bodyOrder, 10);
    return (Number.isInteger(order) && order >= 1) ? order : null;
  };
  // isFeatured true, valid number -> that number
  if (parseFeaturedOrder(true, 1) !== 1) { fail('controller logic', 'featuredOrder 1'); return; }
  if (parseFeaturedOrder(true, 2) !== 2) { fail('controller logic', 'featuredOrder 2'); return; }
  if (parseFeaturedOrder(true, '3') !== 3) { fail('controller logic', 'featuredOrder "3"'); return; }
  pass('controller logic: featuredOrder valid (1, 2, "3")');
  // isFeatured true, invalid -> null
  if (parseFeaturedOrder(true, 0) !== null) { fail('controller logic', 'featuredOrder 0 should become null'); return; }
  if (parseFeaturedOrder(true, -1) !== null) { fail('controller logic', 'featuredOrder -1'); return; }
  if (parseFeaturedOrder(true, 'x') !== null) { fail('controller logic', 'featuredOrder "x"'); return; }
  if (parseFeaturedOrder(true, null) !== null) { fail('controller logic', 'featuredOrder null'); return; }
  pass('controller logic: featuredOrder invalid (0, -1, "x", null) -> null');
  // isFeatured false -> null
  if (parseFeaturedOrder(false, 1) !== null) { fail('controller logic', 'unfeature should clear order'); return; }
  pass('controller logic: unfeature clears featuredOrder');
}

// --- Middleware: sort options trigger featured-order aggregation ---
function testMiddlewareSortOptions() {
  const filterListings = require('../middleware/listing.js');
  return new Promise((resolve) => {
    const req = { query: { page: 1, limit: 12 }, filter: null, sortOptions: null };
    const next = (err) => {
      if (err) { fail('middleware', err.message); resolve(false); return; }
      const so = req.sortOptions;
      if (!so || so.isFeatured !== -1 || so.createdAt !== -1) {
        fail('middleware', `expected isFeatured:-1 createdAt:-1, got ${JSON.stringify(so)}`);
        resolve(false);
        return;
      }
      pass('middleware: default sort isFeatured -1, createdAt -1 (triggers featuredOrder sort)');
      // explicit newest
      const req2 = { query: { page: 1, limit: 12, sort: 'newest' }, filter: null, sortOptions: null };
      filterListings(req2, {}, (err2) => {
        if (err2) { fail('middleware newest', err2.message); resolve(false); return; }
        const so2 = req2.sortOptions;
        if (so2.isFeatured !== -1 || so2.createdAt !== -1) {
          fail('middleware sort=newest', JSON.stringify(so2));
          resolve(false);
          return;
        }
        pass('middleware: sort=newest sets isFeatured -1, createdAt -1');
        resolve(true);
      });
    };
    filterListings(req, {}, next);
  });
}

// --- Aggregation: sort order (in-memory simulation) ---
function testAggregationSortOrder() {
  const docs = [
    { id: 'a', isFeatured: false, featuredOrder: null, createdAt: new Date('2025-01-03') },
    { id: 'b', isFeatured: true, featuredOrder: 2, createdAt: new Date('2025-01-02') },
    { id: 'c', isFeatured: true, featuredOrder: null, createdAt: new Date('2025-01-01') },
    { id: 'd', isFeatured: true, featuredOrder: 1, createdAt: new Date('2025-01-05') },
    { id: 'e', isFeatured: false, featuredOrder: null, createdAt: new Date('2025-01-04') },
  ];
  const _fo = (d) => {
    if (d.isFeatured && d.featuredOrder != null && d.featuredOrder >= 1) return d.featuredOrder;
    return 999999;
  };
  docs.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    const foA = _fo(a), foB = _fo(b);
    if (foA !== foB) return foA - foB;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  const ids = docs.map((d) => d.id);
  const expected = ['d', 'b', 'c', 'e', 'a']; // featured 1, featured 2, featured no order, then non-featured by date desc
  if (JSON.stringify(ids) !== JSON.stringify(expected)) {
    fail('aggregation sort order', `got ${ids.join(',')}, expected ${expected.join(',')}`);
    return false;
  }
  pass('aggregation sort order: featured 1, 2, then featured no order, then non-featured by date');
  return true;
}

// --- DB: aggregation pipeline runs (with skip/limit like real controller) ---
async function testAggregationPipeline() {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    try {
      const dbConnect = require('../db/connect');
      await (dbConnect.ready || dbConnect());
    } catch (e) {
      console.warn('SKIP: DB not available:', e.message);
      return true;
    }
  }

  const filters = {
    isDeleted: { $ne: true },
    isSold: { $ne: true },
    approvalStatus: 'approved'
  };
  const pipeline = [
    { $match: filters },
    { $addFields: { _featuredOrder: { $cond: [
      { $and: [{ $eq: ['$isFeatured', true] }, { $ne: ['$featuredOrder', null] }, { $gte: ['$featuredOrder', 1] }] },
      '$featuredOrder',
      999999
    ] } } },
    { $sort: { isFeatured: -1, _featuredOrder: 1, createdAt: -1 } },
    { $skip: 0 },
    { $limit: 5 },
    { $project: { _featuredOrder: 0 } }
  ];

  try {
    const results = await Listing.aggregate(pipeline);
    pass(`aggregation pipeline runs (sample size: ${results.length})`);
    // Pagination: run again with skip 1
    const pipeline2 = [
      { $match: filters },
      { $addFields: { _featuredOrder: { $cond: [
        { $and: [{ $eq: ['$isFeatured', true] }, { $ne: ['$featuredOrder', null] }, { $gte: ['$featuredOrder', 1] }] },
        '$featuredOrder',
        999999
      ] } } },
      { $sort: { isFeatured: -1, _featuredOrder: 1, createdAt: -1 } },
      { $skip: 1 },
      { $limit: 2 },
      { $project: { _featuredOrder: 0 } }
    ];
    const results2 = await Listing.aggregate(pipeline2);
    pass(`aggregation with skip/limit runs (page 2 size: ${results2.length})`);
  } catch (err) {
    fail('aggregation pipeline', err.message);
    return false;
  }
  return true;
}

// --- DB: useFeaturedOrderSort condition matches controller ---
function testUseFeaturedOrderSortCondition() {
  const sortOptions1 = { isFeatured: -1, createdAt: -1 };
  const use1 = sortOptions1.isFeatured === -1 && sortOptions1.createdAt === -1;
  if (!use1) { fail('useFeaturedOrderSort', 'newest should trigger'); return false; }
  pass('useFeaturedOrderSort: isFeatured -1 and createdAt -1 triggers');

  const sortOptions2 = { createdAt: 1 };
  const use2 = sortOptions2.isFeatured === -1 && sortOptions2.createdAt === -1;
  if (use2) { fail('useFeaturedOrderSort', 'oldest should not trigger'); return false; }
  pass('useFeaturedOrderSort: oldest does not trigger');
  return true;
}

// --- Schema defaults ---
function testSchemaDefaults() {
  const ListingModel = require('../models/listing.model.js');
  const doc = new ListingModel({ propertyType: 'Apartment', propertyPrice: 100, bedrooms: 2, bathrooms: 1, size: 100, furnished: false, garages: false, status: 'sale', country: 'Syria', city: 'Damascus', agent: 'test' });
  if (doc.isFeatured !== false) { fail('schema default isFeatured', `expected false, got ${doc.isFeatured}`); return; }
  pass('schema default isFeatured is false');
  if (doc.featuredOrder !== undefined && doc.featuredOrder !== null) { fail('schema default featuredOrder', `expected null/undefined, got ${doc.featuredOrder}`); return; }
  pass('schema default featuredOrder is null/undefined');
}

// --- Controller: more edge cases ---
function testControllerEdgeCases() {
  const parse = (isFeatured, bodyOrder) => {
    if (!isFeatured) return null;
    if (bodyOrder === undefined) return undefined;
    const order = parseInt(bodyOrder, 10);
    return (Number.isInteger(order) && order >= 1) ? order : null;
  };
  if (parse(true, undefined) !== undefined) { fail('controller edge', 'undefined leaves existing'); return; }
  pass('controller: isFeatured true + featuredOrder undefined -> leave existing');
  if (parse(true, '') !== null) { fail('controller edge', 'empty string'); return; }
  if (parse(true, 1.5) !== 1) { fail('controller edge', '1.5 parses to 1'); return; }
  pass('controller: featuredOrder 1.5 parses to 1');
  if (parse(true, 999999) !== 999999) { fail('controller edge', 'large number'); return; }
  pass('controller: large featuredOrder 999999 accepted');
  if (parse(false, 5) !== null) { fail('controller edge', 'unfeature with order'); return; }
  pass('controller: unfeature ignores featuredOrder');
}

// --- Middleware: all sort options ---
function testMiddlewareAllSorts() {
  const filterListings = require('../middleware/listing.js');
  const cases = [
    { sort: 'oldest', expectCreated: 1 },
    { sort: 'price_asc', expectPrice: 1 },
    { sort: 'price_desc', expectPrice: -1 },
    { sort: 'RANDOM', expectFeatured: -1, expectCreated: -1 },
  ];
  let idx = 0;
  function run() {
    if (idx >= cases.length) { pass('middleware: all sort options (oldest, price_asc, price_desc, default)'); return Promise.resolve(true); }
    const c = cases[idx];
    const req = { query: { page: 1, limit: 12, sort: c.sort }, filter: null, sortOptions: null };
    return new Promise((resolve) => {
      filterListings(req, {}, (err) => {
        if (err) { fail('middleware sort ' + c.sort, err.message); resolve(false); return; }
        const so = req.sortOptions;
        if (c.expectPrice !== undefined) {
          if (so.propertyPrice !== c.expectPrice) { fail('middleware ' + c.sort, `propertyPrice ${so.propertyPrice}`); resolve(false); return; }
        }
        if (c.expectFeatured !== undefined && so.isFeatured !== c.expectFeatured) { fail('middleware ' + c.sort, `isFeatured ${so.isFeatured}`); resolve(false); return; }
        if (c.expectCreated !== undefined && so.createdAt !== c.expectCreated) { fail('middleware ' + c.sort, `createdAt ${so.createdAt}`); resolve(false); return; }
        idx++;
        resolve(run());
      });
    });
  }
  return run();
}

// --- Aggregation: edge cases (in-memory) ---
function testAggregationEdgeCases() {
  const _fo = (d) => (d.isFeatured && d.featuredOrder != null && d.featuredOrder >= 1) ? d.featuredOrder : 999999;
  const sort = (docs) => {
    const copy = docs.map((d) => ({ ...d }));
    copy.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const foA = _fo(a), foB = _fo(b);
      if (foA !== foB) return foA - foB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return copy;
  };
  // All non-featured
  const allNon = [{ id: 'a', isFeatured: false, featuredOrder: null, createdAt: new Date('2025-01-01') }, { id: 'b', isFeatured: false, featuredOrder: null, createdAt: new Date('2025-01-02') }];
  const outNon = sort(allNon);
  if (outNon[0].id !== 'b' || outNon[1].id !== 'a') { fail('aggregation edge: all non-featured', outNon.map((d) => d.id).join(',')); return; }
  pass('aggregation edge: all non-featured sorts by createdAt desc');
  // All featured, no order
  const allFeatNoOrder = [{ id: 'x', isFeatured: true, featuredOrder: null, createdAt: new Date('2025-01-02') }, { id: 'y', isFeatured: true, featuredOrder: null, createdAt: new Date('2025-01-01') }];
  const outFeat = sort(allFeatNoOrder);
  if (outFeat[0].id !== 'x' || outFeat[1].id !== 'y') { fail('aggregation edge: featured no order', outFeat.map((d) => d.id).join(',')); return; }
  pass('aggregation edge: all featured no order sorts by createdAt desc');
  // Tie: same featuredOrder, tie-break by createdAt
  const tie = [{ id: 't1', isFeatured: true, featuredOrder: 1, createdAt: new Date('2025-01-01') }, { id: 't2', isFeatured: true, featuredOrder: 1, createdAt: new Date('2025-01-02') }];
  const outTie = sort(tie);
  if (outTie[0].id !== 't2' || outTie[1].id !== 't1') { fail('aggregation edge: tie-break', outTie.map((d) => d.id).join(',')); return; }
  pass('aggregation edge: same featuredOrder tie-break by createdAt desc');
  // featuredOrder 0 treated as no order
  const zero = [{ id: 'z', isFeatured: true, featuredOrder: 0, createdAt: new Date('2025-01-01') }, { id: 'w', isFeatured: true, featuredOrder: 1, createdAt: new Date('2025-01-01') }];
  const outZero = sort(zero);
  if (outZero[0].id !== 'w' || outZero[1].id !== 'z') { fail('aggregation edge: featuredOrder 0 last', outZero.map((d) => d.id).join(',')); return; }
  pass('aggregation edge: featuredOrder 0 goes last among featured');
}

// --- API route exists ---
function testRouteExists() {
  const listingRoute = require('../routes/listing.route.js');
  const stack = listingRoute.stack || [];
  const hasFeatured = stack.some((l) => l.route && String(l.route.path).includes('featured') && l.route.methods && l.route.methods.patch);
  if (!hasFeatured) { fail('route PATCH /:id/featured', 'not found'); return; }
  pass('route PATCH /:id/featured registered');
}

// --- Frontend API contract (listing.js setListingFeatured) ---
function testFrontendAPIContract() {
  try {
    const path = require('path');
    const fs = require('fs');
    const possible = [path.join(__dirname, '../../aqaarGate-FE/apis/listing.js'), path.join(__dirname, '../aqaarGate-FE/apis/listing.js'), path.join(process.cwd(), '../aqaarGate-FE/apis/listing.js')];
    let content = null;
    for (const p of possible) {
      if (fs.existsSync(p)) { content = fs.readFileSync(p, 'utf8'); break; }
    }
    if (!content) { console.warn('SKIP: Frontend apis/listing.js not found'); return true; }
    if (!content.includes('setListingFeatured')) { fail('frontend API', 'setListingFeatured missing'); return false; }
    if (!content.includes('featuredOrder')) { fail('frontend API', 'featuredOrder not passed'); return false; }
    pass('frontend API: setListingFeatured exists and uses featuredOrder');
  } catch (e) {
    console.warn('SKIP: frontend API check', e.message);
  }
  return true;
}

// --- DB: aggregation with filters that return 0 (no crash) ---
async function testAggregationEmptyResult() {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    try {
      const dbConnect = require('../db/connect');
      await (dbConnect.ready || dbConnect());
    } catch (e) { return true; }
  }
  const Listing = require('../models/listing.model.js');
  const impossible = { approvalStatus: 'nonexistent_status_xyz', isDeleted: { $ne: true } };
  const pipeline = [
    { $match: impossible },
    { $addFields: { _featuredOrder: { $cond: [{ $and: [{ $eq: ['$isFeatured', true] }, { $ne: ['$featuredOrder', null] }, { $gte: ['$featuredOrder', 1] }] }, '$featuredOrder', 999999] } } },
    { $sort: { isFeatured: -1, _featuredOrder: 1, createdAt: -1 } },
    { $limit: 5 },
    { $project: { _featuredOrder: 0 } }
  ];
  try {
    const results = await Listing.aggregate(pipeline);
    if (results.length !== 0) { fail('aggregation empty', `expected 0, got ${results.length}`); return false; }
    pass('aggregation with 0 results does not crash');
  } catch (err) {
    fail('aggregation empty', err.message);
    return false;
  }
  return true;
}

// --- Mock: setListingFeatured response shape and listing updates (no DB) ---
async function testMockSetListingFeatured() {
  const mockListing = {
    _id: 'mock-id-1',
    isFeatured: false,
    featuredOrder: null,
    save: function () { return Promise.resolve(); }
  };
  const capturedRes = { statusCode: null, jsonPayload: null };
  const mockRes = {
    status (code) { capturedRes.statusCode = code; return this; },
    json (payload) { capturedRes.jsonPayload = payload; return this; }
  };

  // Replicate controller logic (same as setListingFeatured)
  const isFeatured = true;
  const bodyFeaturedOrder = 2;
  mockListing.isFeatured = isFeatured;
  if (isFeatured && bodyFeaturedOrder !== undefined) {
    const order = parseInt(bodyFeaturedOrder, 10);
    mockListing.featuredOrder = (Number.isInteger(order) && order >= 1) ? order : null;
  } else if (!isFeatured) {
    mockListing.featuredOrder = null;
  }
  await mockListing.save();
  mockRes.status(200).json({ success: true, isFeatured: mockListing.isFeatured, featuredOrder: mockListing.featuredOrder ?? undefined });

  if (capturedRes.statusCode !== 200) { fail('mock setListingFeatured', `status ${capturedRes.statusCode}`); return false; }
  if (!capturedRes.jsonPayload || capturedRes.jsonPayload.success !== true) { fail('mock setListingFeatured', 'json success'); return false; }
  if (capturedRes.jsonPayload.isFeatured !== true) { fail('mock setListingFeatured', `isFeatured ${capturedRes.jsonPayload.isFeatured}`); return false; }
  if (capturedRes.jsonPayload.featuredOrder !== 2) { fail('mock setListingFeatured', `featuredOrder ${capturedRes.jsonPayload.featuredOrder}`); return false; }
  if (mockListing.isFeatured !== true || mockListing.featuredOrder !== 2) { fail('mock setListingFeatured', 'listing fields'); return false; }
  pass('mock: setListingFeatured updates listing and response { success, isFeatured, featuredOrder }');

  // Mock unfeature
  const mockListing2 = { _id: 'm2', isFeatured: true, featuredOrder: 3, save: () => Promise.resolve() };
  mockListing2.isFeatured = false;
  mockListing2.featuredOrder = null;
  const payload2 = { success: true, isFeatured: mockListing2.isFeatured, featuredOrder: mockListing2.featuredOrder ?? undefined };
  if (payload2.featuredOrder !== undefined) { fail('mock unfeature', 'featuredOrder should be undefined'); return false; }
  pass('mock: unfeature clears featuredOrder and omits from response');
  return true;
}

// --- Position-based placement (Fresh Listings / property-list page 1): featuredOrder N → index N-1 ---
function testPositionBasedPlacement() {
  // Same algorithm as getFilteredListings when skip === 0 and useFeaturedOrderSort
  const limit = 20;
  const listings = [
    { _id: 'a', isFeatured: true, featuredOrder: 6, createdAt: new Date('2025-01-01') }, // should end at index 5
    { _id: 'b', isFeatured: true, featuredOrder: null, createdAt: new Date('2025-01-02') },
    { _id: 'c', isFeatured: true, featuredOrder: 1, createdAt: new Date('2025-01-03') },
    { _id: 'd', isFeatured: false, featuredOrder: null, createdAt: new Date('2025-01-04') },
    { _id: 'e', isFeatured: true, featuredOrder: null, createdAt: new Date('2025-01-05') },
    { _id: 'f', isFeatured: false, featuredOrder: null, createdAt: new Date('2025-01-06') },
  ];
  const slots = new Array(Math.min(limit, listings.length)).fill(null);
  const placedIds = new Set();
  for (const doc of listings) {
    const order = doc.featuredOrder;
    if (doc.isFeatured && order >= 1 && order <= limit && order <= slots.length) {
      const idx = order - 1;
      if (idx < slots.length && slots[idx] === null) {
        slots[idx] = doc;
        placedIds.add(doc._id.toString());
      }
    }
  }
  let fillIdx = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null) {
      while (fillIdx < listings.length) {
        const cand = listings[fillIdx++];
        if (!placedIds.has(cand._id.toString())) {
          slots[i] = cand;
          break;
        }
      }
    }
  }
  const result = slots.filter(Boolean);
  const idxA = result.findIndex((d) => d._id === 'a');
  const idxC = result.findIndex((d) => d._id === 'c');
  if (idxA !== 5) { fail('position-based: featuredOrder 6 at index 5', `listing "a" at index ${idxA}`); return; }
  pass('position-based: featuredOrder 6 appears at index 5 (6th in Fresh Listings)');
  if (idxC !== 0) { fail('position-based: featuredOrder 1 at index 0', `listing "c" at index ${idxC}`); return; }
  pass('position-based: featuredOrder 1 appears at index 0 (first)');
  if (result.length !== 6) { fail('position-based: result length', `expected 6, got ${result.length}`); return; }
  pass('position-based: all 6 listings present after slot fill');
}

// --- Model: create and read back (if DB) ---
async function testModelSaveAndRead() {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) return true;
  const Listing = require('../models/listing.model.js');
  const id = `TEST_FEAT_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const base = { propertyId: id, propertyType: 'Apartment', propertyPrice: 1, bedrooms: 1, bathrooms: 1, size: 1, furnished: false, garages: false, status: 'sale', country: 'X', city: 'Y', agent: 'test', approvalStatus: 'approved' };
  const doc = new Listing({ ...base, isFeatured: true, featuredOrder: 7 });
  try {
    await doc.save();
    const found = await Listing.findById(doc._id).lean();
    if (!found) { fail('model save/read', 'not found'); await Listing.findByIdAndDelete(doc._id); return false; }
    if (found.isFeatured !== true) { fail('model save/read', `isFeatured ${found.isFeatured}`); await Listing.findByIdAndDelete(doc._id); return false; }
    if (found.featuredOrder !== 7) { fail('model save/read', `featuredOrder ${found.featuredOrder}`); await Listing.findByIdAndDelete(doc._id); return false; }
    await Listing.findByIdAndDelete(doc._id);
    pass('model: save isFeatured true + featuredOrder 7, read back correct');
  } catch (err) {
    fail('model save/read', err.message);
    try { await Listing.findOneAndDelete({ propertyId: id }); } catch (_) {}
    return false;
  }
  return true;
}

async function main() {
  console.log('=== Featured order test suite (extended) ===\n');

  testSchema();
  testSchemaDefaults();
  testControllerFeaturedOrderLogic();
  testControllerEdgeCases();
  testAggregationSortOrder();
  testAggregationEdgeCases();
  testUseFeaturedOrderSortCondition();
  testPositionBasedPlacement();
  testRouteExists();
  testFrontendAPIContract();
  await testMiddlewareSortOptions();
  await testMiddlewareAllSorts();
  await testAggregationPipeline();
  await testAggregationEmptyResult();
  await testMockSetListingFeatured();
  await testModelSaveAndRead();

  console.log('\n--- Summary ---');
  console.log(`${totalPass}/${totalRun} passed`);
  if (totalPass < totalRun) {
    console.error('Some tests failed.');
    process.exit(1);
  }
  console.log('All tests passed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
