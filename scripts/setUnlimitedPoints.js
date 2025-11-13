/**
 * Script to set all existing users to unlimited points
 * Run this once to update existing users: node api/scripts/setUnlimitedPoints.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/user.model');

const setUnlimitedPoints = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/syproperty';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Update all users to have unlimited points
    const result = await User.updateMany(
      {},
      { 
        $set: { 
          hasUnlimitedPoints: true,
          isTrial: true // Also set trial to true for existing users
        } 
      }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} users to unlimited points`);
    console.log(`📊 Total users matched: ${result.matchedCount}`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating users:', error);
    process.exit(1);
  }
};

// Run the script
setUnlimitedPoints();

