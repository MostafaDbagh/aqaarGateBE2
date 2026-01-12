/**
 * Check Admin User in Production Database
 * 
 * This script checks if an admin user exists in the production database (SyProperties)
 * 
 * Usage: node scripts/check-admin-prod.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

// Ensure we're using production database
process.env.NODE_ENV = 'production';

const checkAdmin = async () => {
  try {
    // Connect to MongoDB - will use production database
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGO_URI is not defined in environment variables!');
      process.exit(1);
    }
    
    // Extract database name and ensure it's production (not _Dev)
    let dbName = 'SyProperties';
    const queryIndex = mongoURI.indexOf('?');
    const uriWithoutQuery = queryIndex !== -1 ? mongoURI.substring(0, queryIndex) : mongoURI;
    const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
    
    if (lastSlashIndex !== -1 && lastSlashIndex < uriWithoutQuery.length - 1) {
      dbName = uriWithoutQuery.substring(lastSlashIndex + 1);
    }
    
    // Remove _Dev suffix if present (ensure production database)
    dbName = dbName.replace(/_Dev$/, '') || 'SyProperties';
    
    // Replace database name in URI
    const baseUri = uriWithoutQuery.substring(0, lastSlashIndex + 1);
    const queryString = queryIndex !== -1 ? mongoURI.substring(queryIndex) : '';
    const productionURI = `${baseUri}${dbName}${queryString}`;
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔍 Checking Admin User (PRODUCTION)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`💾 Database: ${dbName}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Connect to MongoDB
    await mongoose.connect(productionURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB (PRODUCTION)\n');
    
    // Check for admin users
    const adminUsers = await User.find({ role: 'admin' }).select('-password');
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in the production database!');
      console.log('\n📝 To create an admin, run:');
      console.log('   node scripts/create-admin-main.js\n');
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
        if (specificAdmin.isBlocked) {
          console.log('⚠️  WARNING: Admin account is BLOCKED!');
        }
      } else {
        console.log('❌ Admin with email "admin@aqaargate.com" NOT found!');
        console.log('\n📝 To create it, run:');
        console.log('   node scripts/create-admin-main.js\n');
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


