require('dotenv').config();
const mongoose = require('mongoose');

// Import all models
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

async function checkDatabaseStatus() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const isProduction = !mongoURI.includes('localhost') && !mongoURI.includes('127.0.0.1');
    console.log(`📍 Database: ${isProduction ? 'PRODUCTION' : 'LOCAL'}`);
    console.log(`🔗 URI: ${mongoURI.substring(0, 30)}...\n`);
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DATABASE STATUS REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check all collections
    const counts = {
      listings: await Listing.countDocuments({}),
      agents: await Agent.countDocuments({}),
      agentImages: await AgentImage.countDocuments({}),
      messages: await Message.countDocuments({}),
      reviews: await Review.countDocuments({}),
      favorites: await Favorite.countDocuments({}),
      contacts: await Contact.countDocuments({}),
      blogs: await Blog.countDocuments({}),
      points: await Point.countDocuments({}),
      pointTransactions: await PointTransaction.countDocuments({}),
      propertyRentals: await PropertyRental.countDocuments({}),
      newsletters: await Newsletter.countDocuments({}),
    };

    // Check users
    const totalUsers = await User.countDocuments({});
    const adminUsers = await User.find({ role: 'admin' }).select('username email role').lean();
    const agentUsers = await User.countDocuments({ role: 'agent' });
    const regularUsers = await User.countDocuments({ role: 'user' });

    // Display results
    console.log('📋 COLLECTIONS STATUS:');
    console.log(`   Listings: ${counts.listings}`);
    console.log(`   Agents (Agent collection): ${counts.agents}`);
    console.log(`   Agent Images: ${counts.agentImages}`);
    console.log(`   Messages: ${counts.messages}`);
    console.log(`   Reviews: ${counts.reviews}`);
    console.log(`   Favorites: ${counts.favorites}`);
    console.log(`   Contacts: ${counts.contacts}`);
    console.log(`   Blogs: ${counts.blogs}`);
    console.log(`   Points: ${counts.points}`);
    console.log(`   Point Transactions: ${counts.pointTransactions}`);
    console.log(`   Property Rentals: ${counts.propertyRentals}`);
    console.log(`   Newsletters: ${counts.newsletters}\n`);

    console.log('👥 USERS STATUS:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Admin Users: ${adminUsers.length}`);
    console.log(`   Agent Users: ${agentUsers}`);
    console.log(`   Regular Users: ${regularUsers}\n`);

    if (adminUsers.length > 0) {
      console.log('👑 ADMIN USERS:');
      adminUsers.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.username} (${admin.email})`);
      });
      console.log('');
    }

    // Calculate total data count
    const totalDataCount = Object.values(counts).reduce((sum, count) => sum + count, 0) + agentUsers + regularUsers;

    // Determine status
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (totalDataCount === 0 && adminUsers.length > 0) {
      console.log('✅ DATABASE STATUS: CLEAN & RESET');
      console.log('   ✓ All data cleared');
      console.log('   ✓ Only admin users remain');
      console.log('   ✓ Ready for fresh start');
    } else if (totalDataCount === 0 && adminUsers.length === 0) {
      console.log('⚠️  DATABASE STATUS: EMPTY (NO ADMINS)');
      console.log('   ⚠️  No admin users found!');
      console.log('   ⚠️  You may need to create an admin account');
    } else {
      console.log('⚠️  DATABASE STATUS: NOT CLEARED');
      console.log(`   ⚠️  Total data items: ${totalDataCount}`);
      console.log('   ⚠️  Database still contains data');
      if (totalDataCount > 0) {
        console.log('\n   Items found:');
        if (counts.listings > 0) console.log(`      - ${counts.listings} listings`);
        if (agentUsers > 0) console.log(`      - ${agentUsers} agent users`);
        if (regularUsers > 0) console.log(`      - ${regularUsers} regular users`);
        if (counts.messages > 0) console.log(`      - ${counts.messages} messages`);
        if (counts.reviews > 0) console.log(`      - ${counts.reviews} reviews`);
        if (counts.favorites > 0) console.log(`      - ${counts.favorites} favorites`);
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Recommendations
    if (totalDataCount > 0) {
      console.log('💡 RECOMMENDATIONS:');
      console.log('   To reset the database, run:');
      console.log('   npm run reset:db\n');
    }

  } catch (error) {
    console.error('❌ Error checking database status:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('   ⚠️  Authentication failed. Check your MongoDB credentials.');
    } else if (error.message.includes('timeout')) {
      console.error('   ⚠️  Connection timeout. Check your MongoDB URI and network.');
    }
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the script
checkDatabaseStatus();



