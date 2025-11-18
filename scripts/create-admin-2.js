const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user.model');
const bcryptjs = require('bcryptjs');

const createAdmin2 = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aqaargate');
    console.log('Connected to MongoDB');

    // Admin 2 credentials
    const adminEmail = 'admin2@aqaargate.com';
    const adminPassword = 'Admin@2024!';
    const adminUsername = 'admin2';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('Admin 2 user already exists!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        await mongoose.connection.close();
        return;
      } else {
        // Update existing user to admin
        existingAdmin.role = 'admin';
        existingAdmin.password = bcryptjs.hashSync(adminPassword, 10);
        await existingAdmin.save();
        console.log('Existing user updated to admin 2!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
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
      hasUnlimitedPoints: true
    });

    await admin.save();
    console.log('Admin 2 user created successfully!');
    console.log('================================');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('================================');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error creating admin 2:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin2();

