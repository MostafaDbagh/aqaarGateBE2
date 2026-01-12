/**
 * Clear All Data from Non-Production Database
 * 
 * This script clears ALL data from the development database:
 * - All listings
 * - All users (agents, regular users) - but keeps admins
 * - All contacts
 * - All messages
 * - All reviews
 * - All favorites
 * - All rental services
 * - All other collections
 * 
 * WARNING: This will delete everything except admin users!
 * 
 * Usage: node scripts/clearDatabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');
const User = require('../models/user.model');
const Contact = require('../models/contact.model');
const Message = require('../models/message.model');
const Review = require('../models/review.model');
const Favorite = require('../models/favorite.model');
const Blog = require('../models/blog.model');
const Newsletter = require('../models/newsletter.model');
const Point = require('../models/point.model');
const PointTransaction = require('../models/pointTransaction.model');
const PropertyRental = require('../models/propertyRental.model');

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

const clearDatabase = async () => {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🗑️  Clear Non-Production Database');
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
    
    // Get admin users to keep
    console.log('📋 Fetching admin users to keep...');
    const adminUsers = await User.find({ role: 'admin' }).lean();
    console.log(`   ✅ Found ${adminUsers.length} admin user(s) to keep`);
    if (adminUsers.length > 0) {
      adminUsers.forEach(admin => {
        console.log(`      - ${admin.username || admin.email} (${admin.email})`);
      });
    }
    console.log('');
    
    // Clear all listings
    console.log('🗑️  Clearing all listings...');
    const listingsResult = await Listing.deleteMany({});
    console.log(`   ✅ Deleted ${listingsResult.deletedCount} listing(s)`);
    
    // Clear all users except admins
    console.log('🗑️  Clearing all users (except admins)...');
    const usersResult = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`   ✅ Deleted ${usersResult.deletedCount} user(s)`);
    
    // Clear all contacts
    console.log('🗑️  Clearing all contacts...');
    const contactsResult = await Contact.deleteMany({});
    console.log(`   ✅ Deleted ${contactsResult.deletedCount} contact(s)`);
    
    // Clear all messages
    console.log('🗑️  Clearing all messages...');
    const messagesResult = await Message.deleteMany({});
    console.log(`   ✅ Deleted ${messagesResult.deletedCount} message(s)`);
    
    // Clear all reviews
    console.log('🗑️  Clearing all reviews...');
    const reviewsResult = await Review.deleteMany({});
    console.log(`   ✅ Deleted ${reviewsResult.deletedCount} review(s)`);
    
    // Clear all favorites
    console.log('🗑️  Clearing all favorites...');
    const favoritesResult = await Favorite.deleteMany({});
    console.log(`   ✅ Deleted ${favoritesResult.deletedCount} favorite(s)`);
    
    // Clear all blogs
    console.log('🗑️  Clearing all blogs...');
    const blogsResult = await Blog.deleteMany({});
    console.log(`   ✅ Deleted ${blogsResult.deletedCount} blog(s)`);
    
    // Clear all newsletters
    console.log('🗑️  Clearing all newsletters...');
    const newslettersResult = await Newsletter.deleteMany({});
    console.log(`   ✅ Deleted ${newslettersResult.deletedCount} newsletter(s)`);
    
    // Clear all points
    console.log('🗑️  Clearing all points...');
    const pointsResult = await Point.deleteMany({});
    console.log(`   ✅ Deleted ${pointsResult.deletedCount} point(s)`);
    
    // Clear all point transactions
    console.log('🗑️  Clearing all point transactions...');
    const pointTransactionsResult = await PointTransaction.deleteMany({});
    console.log(`   ✅ Deleted ${pointTransactionsResult.deletedCount} point transaction(s)`);
    
    // Clear all property rentals
    console.log('🗑️  Clearing all property rentals...');
    const propertyRentalsResult = await PropertyRental.deleteMany({});
    console.log(`   ✅ Deleted ${propertyRentalsResult.deletedCount} property rental(s)`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   • Listings: ${listingsResult.deletedCount}`);
    console.log(`   • Users (non-admin): ${usersResult.deletedCount}`);
    console.log(`   • Contacts: ${contactsResult.deletedCount}`);
    console.log(`   • Messages: ${messagesResult.deletedCount}`);
    console.log(`   • Reviews: ${reviewsResult.deletedCount}`);
    console.log(`   • Favorites: ${favoritesResult.deletedCount}`);
    console.log(`   • Blogs: ${blogsResult.deletedCount}`);
    console.log(`   • Newsletters: ${newslettersResult.deletedCount}`);
    console.log(`   • Points: ${pointsResult.deletedCount}`);
    console.log(`   • Point Transactions: ${pointTransactionsResult.deletedCount}`);
    console.log(`   • Property Rentals: ${propertyRentalsResult.deletedCount}`);
    console.log(`   • Admin Users Kept: ${adminUsers.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Database cleared successfully!');
    console.log('🔐 Admin users have been preserved.\n');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
clearDatabase();
