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
const Review = require('../models/review.model');
const User = require('../models/user.model');

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('MONGO_URI is not defined in environment variables!');
  process.exit(1);
}

async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('Connected to MongoDB');
    console.warn('⚠️  WARNING: This will delete ALL data from ALL collections!');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections to clear:`);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    // Delete all documents from each collection
    const deletePromises = collections.map(async (collection) => {
      const result = await mongoose.connection.db.collection(collection.name).deleteMany({});
      console.log(`✅ Cleared ${result.deletedCount} documents from ${collection.name}`);
      return result;
    });

    await Promise.all(deletePromises);

    console.log('✅ Database cleared successfully!');
    console.log('All collections are now empty. You can start fresh.');

  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the script
clearDatabase();

