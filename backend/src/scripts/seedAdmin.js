const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const name = process.env.ADMIN_NAME || 'Admin';
    const email = process.env.ADMIN_EMAIL || 'admin@priticake.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      existingAdmin.password = password;
      existingAdmin.role = 'admin'; // ensure role
      await existingAdmin.save();
      console.log(`Admin user updated: ${existingAdmin.email}`);
      process.exit();
    }

    const adminUser = await User.create({
      name,
      email,
      password,
      role: 'admin',
    });

    console.log(`Admin user created: ${adminUser.email}`);
    process.exit();
  } catch (error) {
    console.error(`Error seeding admin: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
