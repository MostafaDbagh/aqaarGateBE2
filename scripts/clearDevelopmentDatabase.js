/**
 * Clear Development Database (SyProperties_Dev)
 * 
 * This script will DELETE ALL DATA from DEVELOPMENT database (SyProperties_Dev)
 * 
 * This is SAFER than clearing production, but still be careful!
 * 
 * To run this script:
 * 1. Set NODE_ENV=development (or leave default)
 * 2. Run: node scripts/clearDevelopmentDatabase.js
 *    OR: npm run clear:dev
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Import all models to ensure they're registered
const Agent = require('../models/agent.model');
const AgentImage = require('../models/agentImage.model');
const Blog = require('../models/blog.model');
const Contact = require('../models/contact.model');
const Favorite = require('../models/favorite.model');
const Listing = require('../models/listing.model');
const Message = require('../models/message.model');
const Newsletter = require('../models/newsletter.model');
const Point = require('../models/point.model');
const PointTransaction = require('../models/pointTransaction.model');
const PropertyRental = require('../models/propertyRental.model');
const Review = require('../models/review.model');
const User = require('../models/user.model');

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

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function clearDevelopmentDatabase() {
  try {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🗑️  Clear Development Database');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Database: ${databaseName}`);
    console.log(`🌍 Environment: DEVELOPMENT`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⚠️  WARNING: This will DELETE ALL DATA from DEVELOPMENT database!');
    console.log('✅ Your PRODUCTION database is SAFE and will NOT be affected');
    console.log('⚠️  This action CANNOT be undone!\n');

    // Confirmation
    const confirm = await askQuestion('Type "CLEAR DEV" to confirm: ');
    
    if (confirm !== 'CLEAR DEV') {
      console.log('❌ Operation cancelled. Development database is safe.');
      rl.close();
      process.exit(0);
    }

    console.log('\n🔌 Connecting to MongoDB...');
    
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
      rl.close();
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`📋 Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    console.log('\n⚠️  Starting deletion in 2 seconds...');
    console.log('   Press Ctrl+C NOW to cancel!\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Delete all documents from each collection
    console.log('🗑️  Deleting all data...\n');
    const deletePromises = collections.map(async (collection) => {
      const result = await mongoose.connection.db.collection(collection.name).deleteMany({});
      console.log(`✅ Cleared ${result.deletedCount} documents from ${collection.name}`);
      return result;
    });

    await Promise.all(deletePromises);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Development database cleared successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All collections are now empty.');
    console.log('✅ Production database (SyProperties) is SAFE and untouched.');
    console.log('✅ You can now start fresh with development data.\n');

  } catch (error) {
    console.error('\n❌ Error clearing development database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    rl.close();
    process.exit(0);
  }
}

// Run the script
clearDevelopmentDatabase();

