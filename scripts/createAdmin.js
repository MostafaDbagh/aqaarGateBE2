/**
 * Create Admin Account
 * 
 * Creates an admin user with:
 * Email: admin@aqaargate.com
 * Password: Ca34@Dmh56
 * 
 * Usage: node scripts/createAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

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
    console.log('👤 Create Admin Account');
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
    
    // Admin credentials
    const adminEmail = 'admin@aqaargate.com';
    const adminPassword = 'Ca34@Dmh56';
    const adminUsername = 'admin';
    const adminPhone = '+963999999999';
    const adminWhatsapp = '+963999999999';
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('⚠️  Admin account already exists!');
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Username: ${existingAdmin.username}`);
        console.log(`   Role: ${existingAdmin.role}\n`);
        
        // Update password if needed
        const passwordMatch = await bcrypt.compare(adminPassword, existingAdmin.password);
        if (!passwordMatch) {
          console.log('🔄 Updating admin password...');
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          existingAdmin.password = hashedPassword;
          await existingAdmin.save();
          console.log('✅ Admin password updated successfully!\n');
        } else {
          console.log('✅ Admin password is already correct.\n');
        }
        
        await mongoose.connection.close();
        console.log('✅ Database connection closed.');
        process.exit(0);
      } else {
        console.log('⚠️  User with this email exists but is not an admin.');
        console.log('   Updating role to admin...\n');
        existingAdmin.role = 'admin';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        existingAdmin.password = hashedPassword;
        await existingAdmin.save();
        console.log('✅ User updated to admin successfully!\n');
        await mongoose.connection.close();
        process.exit(0);
      }
    }
    
    // Create new admin
    console.log('👤 Creating admin account...');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = new User({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      phone: adminPhone,
      whatsapp: adminWhatsapp,
      role: 'admin',
      isBlocked: false,
      isVerified: true,
      hasUnlimitedPoints: true,
      isTrial: false
    });
    
    await admin.save();
    
    console.log('✅ Admin account created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Admin Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Role: ${admin.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.code === 11000) {
      console.error('   Duplicate key error - admin may already exist');
    }
    process.exit(1);
  }
};

// Run the script
createAdmin();

