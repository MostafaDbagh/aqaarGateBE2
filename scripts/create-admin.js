const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user.model');
const bcryptjs = require('bcryptjs');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aqaargate');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'mostafadbagh4code@gmail.com' });
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('Admin user already exists!');
        await mongoose.connection.close();
        return;
      } else {
        // Update existing user to admin
        existingAdmin.role = 'admin';
        existingAdmin.password = bcryptjs.hashSync('1234567', 10);
        await existingAdmin.save();
        console.log('Existing user updated to admin!');
        await mongoose.connection.close();
        return;
      }
    }

    // Create admin user
    const hashedPassword = bcryptjs.hashSync('1234567', 10);
    const admin = new User({
      username: 'admin',
      email: 'mostafadbagh4code@gmail.com',
      password: hashedPassword,
      role: 'admin',
      isTrial: false,
      hasUnlimitedPoints: true
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email: mostafadbagh4code@gmail.com');
    console.log('Password: 1234567');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error creating admin:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin();

