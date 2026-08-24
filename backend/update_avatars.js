const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/arenaverse');
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      {
        $or: [
          { 'profile.avatar': { $regex: 'unsplash.com', $options: 'i' } },
          { 'profile.avatar': { $regex: 'photo-1500000', $options: 'i' } },
          { 'profile.avatar': '' },
          { 'profile.avatar': null }
        ]
      },
      {
        $set: { 'profile.avatar': '/images/default-avatar.png' }
      }
    );
    console.log('MongoDB Update Result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Error updating avatars:', err);
    process.exit(1);
  }
};

run();
