/**
 * Database Verification Script
 * 
 * This script verifies which database your application will connect to
 * without actually connecting. Use this to double-check your configuration.
 * 
 * Usage: node scripts/verifyDatabase.js
 */

require('dotenv').config();

// Determine environment (default to development for safety)
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Get MongoDB URI from environment variables
let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ ERROR: MONGO_URI is not defined in environment variables!');
  console.error('Please create a .env file in the api/ directory with MONGO_URI set.');
  process.exit(1);
}

// Extract existing database name from connection string
let existingDbName = 'SyProperties'; // default
const queryIndex = mongoURI.indexOf('?');
const uriWithoutQuery = queryIndex !== -1 ? mongoURI.substring(0, queryIndex) : mongoURI;
const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');

if (lastSlashIndex !== -1 && lastSlashIndex < uriWithoutQuery.length - 1) {
  existingDbName = uriWithoutQuery.substring(lastSlashIndex + 1);
}

// Determine final database name
let finalDbName;
if (process.env.MONGO_DB_NAME) {
  finalDbName = process.env.MONGO_DB_NAME;
  console.log('ℹ️  Using explicit MONGO_DB_NAME from environment');
} else if (isProduction) {
  finalDbName = existingDbName.replace(/_Dev$/, '') || 'SyProperties';
} else {
  const baseName = existingDbName.replace(/_Dev$/, '') || 'SyProperties';
  finalDbName = `${baseName}_Dev`;
}

// Replace database name in connection string
const replaceDatabaseName = (uri, newDbName) => {
  const queryIndex = uri.indexOf('?');
  const uriWithoutQuery = queryIndex !== -1 ? uri.substring(0, queryIndex) : uri;
  const queryString = queryIndex !== -1 ? uri.substring(queryIndex) : '';
  const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
  
  if (lastSlashIndex !== -1) {
    const baseUri = uriWithoutQuery.substring(0, lastSlashIndex + 1);
    return `${baseUri}${newDbName}${queryString}`;
  }
  
  return `${uri}/${newDbName}${queryString}`;
};

const finalMongoURI = replaceDatabaseName(mongoURI, finalDbName);

// Display results
console.log('\n═══════════════════════════════════════════════════════');
console.log('📋 Database Configuration Verification');
console.log('═══════════════════════════════════════════════════════');
console.log(`NODE_ENV: ${NODE_ENV}`);
console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`\nOriginal Database Name: ${existingDbName}`);
console.log(`Final Database Name: ${finalDbName}`);
console.log(`\nConnection String (masked):`);
const maskedURI = finalMongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
console.log(maskedURI);
console.log('\n═══════════════════════════════════════════════════════');

// Safety checks
if (isDevelopment && finalDbName === 'SyProperties' && !finalDbName.includes('_Dev')) {
  console.log('\n⚠️  ⚠️  ⚠️  WARNING ⚠️  ⚠️  ⚠️');
  console.log('You are configured to use PRODUCTION database in DEVELOPMENT mode!');
  console.log('This is DANGEROUS! Your production data could be affected.');
  console.log('\nTo fix this:');
  console.log('1. Set NODE_ENV=development in your .env file');
  console.log('2. Restart your application');
  console.log('3. The database name should automatically change to SyProperties_Dev');
  console.log('\n');
  process.exit(1);
}

if (isDevelopment && finalDbName.includes('_Dev')) {
  console.log('\n✅ SAFE: You are using the DEVELOPMENT database');
  console.log('✅ Your production database is PROTECTED');
  console.log('✅ You can test freely without affecting production data');
}

if (isProduction) {
  console.log('\n⚠️  PRODUCTION MODE: You are using the PRODUCTION database');
  console.log('⚠️  All changes will affect live production data');
}

console.log('═══════════════════════════════════════════════════════\n');

