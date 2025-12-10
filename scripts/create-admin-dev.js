/**
 * Create Admin User for Development Database
 * 
 * This script creates an admin user in the development database (SyProperties_Dev)
 * It uses the same database connection logic as the main app to ensure it connects
 * to the correct database based on NODE_ENV.
 * 
 * Usage: node scripts/create-admin-dev.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const bcryptjs = require('bcryptjs');

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

const createAdmin = async () => {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔧 Creating Admin User');
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
    console.log('✅ Connected to MongoDB');
    
    // Admin credentials
    const adminEmail = 'admin@aqaargate.com';
    const adminPassword = 'Ca34@Dmh56';
    const adminUsername = 'admin';
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('⚠️  Admin user already exists!');
        console.log('📧 Email:', adminEmail);
        
        // Update password
        const hashedPassword = bcryptjs.hashSync(adminPassword, 10);
        existingAdmin.password = hashedPassword;
        existingAdmin.hasUnlimitedPoints = true;
        existingAdmin.isTrial = false;
        existingAdmin.isBlocked = false;
        await existingAdmin.save();
        console.log('✅ Admin password updated!');
        console.log('🔑 New Password:', adminPassword);
      } else {
        // Update existing user to admin
        const hashedPassword = bcryptjs.hashSync(adminPassword, 10);
        existingAdmin.role = 'admin';
        existingAdmin.password = hashedPassword;
        existingAdmin.hasUnlimitedPoints = true;
        existingAdmin.isTrial = false;
        existingAdmin.isBlocked = false;
        await existingAdmin.save();
        console.log('✅ Existing user updated to admin!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
      }
      
      await mongoose.connection.close();
      console.log('\n✅ Database connection closed');
      return;
    }
    
    // Create admin user
    const hashedPassword = bcryptjs.hashSync(adminPassword, 10);
    const admin = new User({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isTrial: false,
      hasUnlimitedPoints: true,
      isBlocked: false
    });
    
    await admin.save();
    console.log('\n✅ Admin user created successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Username:', adminUsername);
    console.log('💾 Database:', databaseName);
    console.log('═══════════════════════════════════════════════════════\n');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

createAdmin();


