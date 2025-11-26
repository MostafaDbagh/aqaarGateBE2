const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user.model');
const bcryptjs = require('bcryptjs');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aqaargate');
    console.log('✅ Connected to MongoDB');

    // Admin credentials
    const adminEmail = 'admin@aqaargate.com';
    const adminPassword = 'Admin@2025!';
    const adminUsername = 'admin';

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

