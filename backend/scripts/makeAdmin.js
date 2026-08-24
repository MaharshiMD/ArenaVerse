require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const makeAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');

    const email = 'maharshidihora100@gmail.com';
    
    let user = await User.findOne({ email });
    if (user) {
      user.role = 'admin';
      await user.save();
      console.log(`Successfully updated existing user ${email} to have the 'admin' role!`);
    } else {
      // Create a new admin user if they don't exist yet
      user = await User.create({
        username: 'SuperAdmin',
        email,
        password: 'AdminPassword123!', 
        role: 'admin',
        profile: {
          avatar: '/images/default-avatar.png',
          bio: 'Platform Administrator'
        }
      });
      console.log(`Successfully created a new admin account!`);
      console.log(`Email: ${email}`);
      console.log(`Password: AdminPassword123!`);
      console.log(`(You can change this password later in your settings, or use Google Login)`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error making admin:', error);
    process.exit(1);
  }
};

makeAdmin();
