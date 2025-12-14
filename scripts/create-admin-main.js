const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user.model');
const bcryptjs = require('bcryptjs');

// Ensure we're using production database
process.env.NODE_ENV = 'production';

const createAdmin = async () => {
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
    
    console.log('🔗 Connecting to PRODUCTION database:', dbName);
    await mongoose.connect(productionURI);
    console.log('✅ Connected to MongoDB (PRODUCTION)');

    // Admin credentials
    const adminEmail = 'admin@aqaargate.com';
    const adminPassword = 'Ca34@Dmh56';
    const adminUsername = 'admin';
    const adminPhone = '+963999999999'; // Required for admin
    const adminWhatsapp = '+963999999999'; // Required for admin

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('⚠️  Admin user already exists!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        
        // Update password if needed
        const passwordMatch = await bcryptjs.compare(adminPassword, existingAdmin.password);
        if (!passwordMatch) {
          existingAdmin.password = bcryptjs.hashSync(adminPassword, 10);
          existingAdmin.hasUnlimitedPoints = true;
          existingAdmin.isTrial = false;
          existingAdmin.phone = adminPhone;
          existingAdmin.whatsapp = adminWhatsapp;
          await existingAdmin.save();
          console.log('✅ Admin password updated!');
        }
        
        await mongoose.connection.close();
        return;
      } else {
        // Update existing user to admin
        existingAdmin.role = 'admin';
        existingAdmin.password = bcryptjs.hashSync(adminPassword, 10);
        existingAdmin.hasUnlimitedPoints = true;
        existingAdmin.isTrial = false;
        existingAdmin.phone = adminPhone;
        existingAdmin.whatsapp = adminWhatsapp;
        await existingAdmin.save();
        console.log('✅ Existing user updated to admin!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        await mongoose.connection.close();
        return;
      }
    }

    // Create admin user
    const hashedPassword = bcryptjs.hashSync(adminPassword, 10);
    const admin = new User({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      phone: adminPhone,
      whatsapp: adminWhatsapp,
      isTrial: false,
      hasUnlimitedPoints: true,
      isBlocked: false
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('================================');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Username:', adminUsername);
    console.log('📱 Phone:', adminPhone);
    console.log('💬 WhatsApp:', adminWhatsapp);
    console.log('================================');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin();



