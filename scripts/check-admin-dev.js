/**
 * Check Admin User in Development Database
 * 
 * This script checks if an admin user exists in the development database (SyProperties_Dev)
 * 
 * Usage: node scripts/check-admin-dev.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

// Use the same database connection logic as the main app
const getDatabaseConnection = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';
  
  let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables!');
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

const checkAdmin = async () => {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔍 Checking Admin User');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`💾 Database: ${databaseName}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Connect to MongoDB
    await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Check for admin users
    const adminUsers = await User.find({ role: 'admin' }).select('-password');
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in the database!');
      console.log('\n📝 To create an admin, run:');
      console.log('   node scripts/create-admin-dev.js\n');
    } else {
      console.log(`✅ Found ${adminUsers.length} admin user(s):\n`);
      adminUsers.forEach((admin, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Admin #${index + 1}:`);
        console.log(`  📧 Email: ${admin.email}`);
        console.log(`  👤 Username: ${admin.username || 'N/A'}`);
        console.log(`  📱 Phone: ${admin.phone || 'N/A'}`);
        console.log(`  💬 WhatsApp: ${admin.whatsapp || 'N/A'}`);
        console.log(`  🔑 Has Unlimited Points: ${admin.hasUnlimitedPoints ? 'Yes' : 'No'}`);
        console.log(`  🎁 Is Trial: ${admin.isTrial ? 'Yes' : 'No'}`);
        console.log(`  🚫 Is Blocked: ${admin.isBlocked ? 'Yes' : 'No'}`);
        console.log(`  📅 Created: ${admin.createdAt || 'N/A'}`);
        console.log(`  🆔 ID: ${admin._id}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      });
      
      // Check specifically for admin@aqaargate.com
      const specificAdmin = await User.findOne({ email: 'admin@aqaargate.com' });
      if (specificAdmin) {
        console.log('✅ Admin with email "admin@aqaargate.com" exists!');
        if (specificAdmin.role === 'admin') {
          console.log('✅ User has admin role');
        } else {
          console.log(`⚠️  User exists but role is: ${specificAdmin.role}`);
        }
      } else {
        console.log('❌ Admin with email "admin@aqaargate.com" NOT found!');
      }
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error checking admin:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

checkAdmin();


