/**
 * Clear All Listings from Non-Production Database
 * 
 * This script clears ONLY listings from the development database.
 * All other data (users, contacts, messages, etc.) will be preserved.
 * 
 * Usage: node scripts/clearListings.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');

// Use the same database connection logic as the main app
const getDatabaseConnection = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';
  
  let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables!');
  }
  
  // Prevent running on production
  if (isProduction) {
    throw new Error('❌ This script cannot run in production environment! Set NODE_ENV=development');
  }
  
  // Get database name
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
    
    if (isProduction) {
      return existingDbName.replace(/_Dev$/, '') || 'SyProperties';
    } else {
      const baseName = existingDbName.replace(/_Dev$/, '') || 'SyProperties';
      return `${baseName}_Dev`;
    }
  };
  
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
  
  const databaseName = getDatabaseName();
  const finalURI = replaceDatabaseName(mongoURI, databaseName);
  
  return { finalURI, databaseName, NODE_ENV };
};

const clearListings = async () => {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🗑️  Clear All Listings (Non-Production)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`💾 Database: ${databaseName}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (NODE_ENV === 'production') {
      console.error('❌ ERROR: This script cannot run in production!');
      process.exit(1);
    }
    
    // Connect to MongoDB
    await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Count listings before deletion (including deleted and sold)
    const countBefore = await Listing.countDocuments({});
    const countApproved = await Listing.countDocuments({ approvalStatus: 'approved', isDeleted: { $ne: true } });
    const countDeleted = await Listing.countDocuments({ isDeleted: true });
    const countSold = await Listing.countDocuments({ isSold: true });
    
    console.log(`📊 Found ${countBefore} total listing(s) in database:`);
    console.log(`   • Approved: ${countApproved}`);
    console.log(`   • Deleted: ${countDeleted}`);
    console.log(`   • Sold: ${countSold}`);
    console.log('');
    
    if (countBefore === 0) {
      console.log('ℹ️  Database already has no listings. Nothing to clear.');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Clear ALL listings (including deleted and sold ones)
    console.log('🗑️  Clearing ALL listings (including deleted and sold)...');
    const result = await Listing.deleteMany({});
    
    // Verify deletion
    const countAfter = await Listing.countDocuments({});
    
    // Get distinct cities and categories BEFORE clearing (for info)
    const citiesBefore = await Listing.distinct('city');
    const categoriesBefore = await Listing.distinct('propertyType');
    
    console.log(`   📍 Cities that will be cleared: ${citiesBefore.length}`);
    if (citiesBefore.length > 0) {
      console.log(`      ${citiesBefore.slice(0, 10).join(', ')}${citiesBefore.length > 10 ? '...' : ''}`);
    }
    console.log(`   📦 Categories that will be cleared: ${categoriesBefore.length}`);
    if (categoriesBefore.length > 0) {
      console.log(`      ${categoriesBefore.join(', ')}`);
    }
    console.log('');
    
    // Clear ALL listings (including deleted and sold ones)
    console.log('🗑️  Clearing ALL listings (including deleted and sold)...');
    const result = await Listing.deleteMany({});
    
    // Verify deletion - check multiple times
    let countAfter = await Listing.countDocuments({});
    
    // If still listings exist, try again
    if (countAfter > 0) {
      console.warn(`⚠️  ${countAfter} listing(s) still remain. Attempting second deletion...`);
      const secondResult = await Listing.deleteMany({});
      countAfter = await Listing.countDocuments({});
      console.log(`   Second deletion: ${secondResult.deletedCount} more deleted`);
    }
    
    // Final verification
    const finalCount = await Listing.countDocuments({});
    const approvedCount = await Listing.countDocuments({ approvalStatus: 'approved' });
    const deletedCount = await Listing.countDocuments({ isDeleted: true });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   • Listings Deleted: ${result.deletedCount}`);
    console.log(`   • Final Count: ${finalCount}`);
    console.log(`   • Approved Listings Remaining: ${approvedCount}`);
    console.log(`   • Deleted Flag Listings Remaining: ${deletedCount}`);
    console.log(`   • Cities Cleared: ${citiesBefore.length}`);
    console.log(`   • Categories Cleared: ${categoriesBefore.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (finalCount > 0) {
      console.error(`❌ ERROR: ${finalCount} listing(s) still remain in database!`);
      console.error('   Database:', mongoose.connection.db.databaseName);
      console.error('   Connection:', mongoose.connection.host);
      console.error('\n   Please check:');
      console.error('   1. Are you connected to the correct database?');
      console.error('   2. Do you have proper permissions?');
      console.error('   3. Try running the script again.\n');
      process.exit(1);
    } else {
      console.log('✅ All listings cleared successfully!');
      console.log('✅ All categories and cities have been cleared (they are derived from listings).');
      console.log('✅ All other data (users, contacts, etc.) has been preserved.\n');
      console.log('💡 Note: If you still see listings in the UI:');
      console.log('   1. Clear browser cache');
      console.log('   2. Restart the backend server');
      console.log('   3. Hard refresh the frontend (Ctrl+Shift+R or Cmd+Shift+R)\n');
    }
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
clearListings();

