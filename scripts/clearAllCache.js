/**
 * Clear all cache (categories and cities)
 * Run this script to clear all cached data
 */

require('dotenv').config();
const cache = require('../utils/cache');

console.log('\n🗑️  Clearing all cache...\n');

// Clear all cache
cache.clear();

console.log('✅ All cache cleared successfully!\n');
console.log('Cache statistics:', cache.getStats());

process.exit(0);

