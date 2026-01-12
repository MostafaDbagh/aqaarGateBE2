require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

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
  console.error('❌ MONGO_URI is not defined in environment variables!');
  process.exit(1);
}

async function resetDatabaseKeepAdmin() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB\n');
    console.warn('⚠️  WARNING: This will delete ALL data EXCEPT admin users!');
    console.warn('⚠️  This includes:');
    console.warn('   - All agents');
    console.warn('   - All listings');
    console.warn('   - All messages');
    console.warn('   - All reviews');
    console.warn('   - All favorites');
    console.warn('   - All contacts');
    console.warn('   - All blogs');
    console.warn('   - All points and transactions');
    console.warn('   - All property rentals');
    console.warn('   - All regular users (non-admin)\n');

    // First, get all admin users to keep
    const adminUsers = await User.find({ role: 'admin' }).lean();
    console.log(`📋 Found ${adminUsers.length} admin user(s) to keep:`);
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.username} (${admin.email})`);
    });
    console.log('');

    if (adminUsers.length === 0) {
      console.warn('⚠️  WARNING: No admin users found!');
      console.warn('⚠️  This will delete ALL users including admins!');
      console.warn('⚠️  Are you sure you want to continue?');
      console.warn('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Delete all listings
    console.log('🗑️  Deleting all listings...');
    const listingsResult = await Listing.deleteMany({});
    console.log(`   ✅ Deleted ${listingsResult.deletedCount} listing(s)`);

    // Delete all agents (from Agent collection, not User collection)
    console.log('🗑️  Deleting all agents (Agent collection)...');
    const agentsResult = await Agent.deleteMany({});
    console.log(`   ✅ Deleted ${agentsResult.deletedCount} agent(s)`);

    // Delete all agent images
    console.log('🗑️  Deleting all agent images...');
    const agentImagesResult = await AgentImage.deleteMany({});
    console.log(`   ✅ Deleted ${agentImagesResult.deletedCount} agent image(s)`);

    // Delete all messages
    console.log('🗑️  Deleting all messages...');
    const messagesResult = await Message.deleteMany({});
    console.log(`   ✅ Deleted ${messagesResult.deletedCount} message(s)`);

    // Delete all reviews
    console.log('🗑️  Deleting all reviews...');
    const reviewsResult = await Review.deleteMany({});
    console.log(`   ✅ Deleted ${reviewsResult.deletedCount} review(s)`);

    // Delete all favorites
    console.log('🗑️  Deleting all favorites...');
    const favoritesResult = await Favorite.deleteMany({});
    console.log(`   ✅ Deleted ${favoritesResult.deletedCount} favorite(s)`);

    // Delete all contacts
    console.log('🗑️  Deleting all contacts...');
    const contactsResult = await Contact.deleteMany({});
    console.log(`   ✅ Deleted ${contactsResult.deletedCount} contact(s)`);

    // Delete all blogs
    console.log('🗑️  Deleting all blogs...');
    const blogsResult = await Blog.deleteMany({});
    console.log(`   ✅ Deleted ${blogsResult.deletedCount} blog(s)`);

    // Delete all points
    console.log('🗑️  Deleting all points...');
    const pointsResult = await Point.deleteMany({});
    console.log(`   ✅ Deleted ${pointsResult.deletedCount} point record(s)`);

    // Delete all point transactions
    console.log('🗑️  Deleting all point transactions...');
    const pointTransactionsResult = await PointTransaction.deleteMany({});
    console.log(`   ✅ Deleted ${pointTransactionsResult.deletedCount} point transaction(s)`);

    // Delete all property rentals
    console.log('🗑️  Deleting all property rentals...');
    const propertyRentalsResult = await PropertyRental.deleteMany({});
    console.log(`   ✅ Deleted ${propertyRentalsResult.deletedCount} property rental(s)`);

    // Delete all newsletters
    console.log('🗑️  Deleting all newsletters...');
    const newslettersResult = await Newsletter.deleteMany({});
    console.log(`   ✅ Deleted ${newslettersResult.deletedCount} newsletter subscription(s)`);

    // Delete all users EXCEPT admins
    console.log('🗑️  Deleting all users (except admins)...');
    const usersResult = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`   ✅ Deleted ${usersResult.deletedCount} user(s) (agents and regular users)`);
    console.log(`   ✅ Kept ${adminUsers.length} admin user(s)`);

    // Verify admin users still exist
    const remainingAdmins = await User.find({ role: 'admin' });
    console.log(`\n✅ Verification: ${remainingAdmins.length} admin user(s) still in database:`);
    remainingAdmins.forEach(admin => {
      console.log(`   - ${admin.username} (${admin.email})`);
    });

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database reset completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   - Listings deleted: ${listingsResult.deletedCount}`);
    console.log(`   - Agents deleted: ${agentsResult.deletedCount}`);
    console.log(`   - Agent images deleted: ${agentImagesResult.deletedCount}`);
    console.log(`   - Messages deleted: ${messagesResult.deletedCount}`);
    console.log(`   - Reviews deleted: ${reviewsResult.deletedCount}`);
    console.log(`   - Favorites deleted: ${favoritesResult.deletedCount}`);
    console.log(`   - Contacts deleted: ${contactsResult.deletedCount}`);
    console.log(`   - Blogs deleted: ${blogsResult.deletedCount}`);
    console.log(`   - Points deleted: ${pointsResult.deletedCount}`);
    console.log(`   - Point transactions deleted: ${pointTransactionsResult.deletedCount}`);
    console.log(`   - Property rentals deleted: ${propertyRentalsResult.deletedCount}`);
    console.log(`   - Newsletters deleted: ${newslettersResult.deletedCount}`);
    console.log(`   - Users deleted: ${usersResult.deletedCount}`);
    console.log(`   - Admin users kept: ${remainingAdmins.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.info('Database reset completed - all data deleted except admin users');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    logger.error('Database reset error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
resetDatabaseKeepAdmin();





