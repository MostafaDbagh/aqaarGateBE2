#!/usr/bin/env node
/**
 * Test: Arabic and English keyword search return the same results.
 * Run with backend DB available: node scripts/test-arabic-english-same-results.js
 *
 * Usage: from aqaarGateBE2 folder:
 *   node scripts/test-arabic-english-same-results.js
 */

require('dotenv').config();
const dbConnect = require('../db/connect');
const filterListings = require('../middleware/listing.js');
const Listing = require('../models/listing.model.js');
const connectionPromise = dbConnect.ready || Promise.resolve(dbConnect);

const PAIRS = [
  { arabic: 'شقق للبيع في سوريا', english: 'Apartment sale Syria' },
  { arabic: 'فيلا للبيع', english: 'Villa sale' },
  { arabic: 'شقة للإيجار دمشق', english: 'Apartment rent Damascus' },
  { arabic: 'أرض للبيع', english: 'Land sale' },
  { arabic: 'للبيع', english: 'sale' },
];

function runMiddleware(keyword) {
  return new Promise((resolve, reject) => {
    const req = {
      query: { keyword, limit: 100, page: 1 },
      filter: null,
      sortOptions: null
    };
    const res = {};
    const next = (err) => {
      if (err) reject(err);
      else resolve({ filter: req.filter, sortOptions: req.sortOptions });
    };
    filterListings(req, res, next);
  });
}

async function getListingIds(filter) {
  const fullFilter = {
    ...filter,
    isDeleted: { $ne: true },
    isSold: { $ne: true },
    approvalStatus: 'approved'
  };
  const list = await Listing.find(fullFilter).select('_id').lean();
  return list.map((d) => d._id.toString()).sort();
}

async function main() {
  await connectionPromise;
  let passed = 0;
  let failed = 0;

  for (const { arabic, english } of PAIRS) {
    try {
      const [arResult, enResult] = await Promise.all([
        runMiddleware(arabic),
        runMiddleware(english)
      ]);
      const [arIds, enIds] = await Promise.all([
        getListingIds(arResult.filter),
        getListingIds(enResult.filter)
      ]);

      const same = arIds.length === enIds.length && arIds.every((id, i) => id === enIds[i]);
      if (same) {
        console.log(`✅ "${arabic}" ⇔ "${english}" → same results (${arIds.length} listings)`);
        passed++;
      } else {
        console.log(`❌ "${arabic}" (${arIds.length}) ≠ "${english}" (${enIds.length})`);
        const onlyAr = arIds.filter((id) => !enIds.includes(id));
        const onlyEn = enIds.filter((id) => !arIds.includes(id));
        if (onlyAr.length) console.log('   Only in Arabic:', onlyAr.slice(0, 3).join(', '), onlyAr.length > 3 ? '...' : '');
        if (onlyEn.length) console.log('   Only in English:', onlyEn.slice(0, 3).join(', '), onlyEn.length > 3 ? '...' : '');
        failed++;
      }
    } catch (e) {
      console.log(`❌ Error for "${arabic}" / "${english}":`, e.message);
      failed++;
    }
  }

  console.log('\n' + (failed === 0 ? 'All tests passed.' : `Failed: ${failed}, Passed: ${passed}`));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
