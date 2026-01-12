/**
 * Reset Non-Production Database (Non-Interactive)
 * 
 * This script will DELETE ALL DATA from DEVELOPMENT database (SyProperties_Dev)
 * 
 * WARNING: This will delete everything! No confirmation required.
 * 
 * Usage: node scripts/resetNonProdDB.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ ERROR: MONGO_URI is not defined in environment variables!');
  process.exit(1);
}

// Force development mode
process.env.NODE_ENV = 'development';

// Get database name (should be SyProperties_Dev)
const getDatabaseName = () => {
  if (process.env.MONGO_DB_NAME) {
    return process.env.MONGO_DB_NAME;
  }
  
  let existingDbName = 'SyProperties';
  const queryIndex = mongoURI.indexOf('?');
  const uriWithoutQuery = queryIndex !== -1 ? mongoURI.substring(0, queryIndex) : mongoURI;
  const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
  
  if (lastSlashIndex !== -1 && lastSlashIndex < uriWithoutQuery.length - 1) {
    existingDbName = uriWithoutQuery.substring(lastSlashIndex + 1);
  }
  
  // Development: append _Dev to database name
  const baseName = existingDbName.replace(/_Dev$/, '') || 'SyProperties';
  return `${baseName}_Dev`;
};

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

const databaseName = getDatabaseName();
const finalMongoURI = replaceDatabaseName(mongoURI, databaseName);

async function resetNonProdDatabase() {
  try {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🗑️  Reset Non-Production Database');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Database: ${databaseName}`);
    console.log(`🌍 Environment: DEVELOPMENT`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⚠️  WARNING: This will DELETE ALL DATA from DEVELOPMENT database!');
    console.log('✅ Your PRODUCTION database is SAFE and will NOT be affected');
    console.log('⚠️  Starting deletion in 3 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(finalMongoURI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
    });

    console.log(`✅ Connected to MongoDB`);
    console.log(`📊 Database: ${databaseName}`);
    console.log(`✅ DEVELOPMENT MODE - Production database is PROTECTED\n`);

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('ℹ️  Database is already empty. Nothing to clear.');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`📋 Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Delete all documents from each collection
    console.log('\n🗑️  Deleting all data...\n');
    const deletePromises = collections.map(async (collection) => {
      const result = await mongoose.connection.db.collection(collection.name).deleteMany({});
      console.log(`✅ Cleared ${result.deletedCount} documents from ${collection.name}`);
      return result;
    });

    await Promise.all(deletePromises);

    // Verify all collections are empty
    const collectionsAfter = await mongoose.connection.db.listCollections().toArray();
    let totalRemaining = 0;
    for (const col of collectionsAfter) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments({});
      totalRemaining += count;
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Development database reset successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ All collections are now empty.`);
    console.log(`✅ Total documents remaining: ${totalRemaining}`);
    console.log('✅ Production database (SyProperties) is SAFE and untouched.');
    console.log('✅ You can now start fresh with development data.\n');

  } catch (error) {
    console.error('\n❌ Error resetting development database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
resetNonProdDatabase();

