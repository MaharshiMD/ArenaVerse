const mongoose = require('mongoose');
require('dotenv').config();
const ReplayVOD = require('./models/ReplayVOD');

const seedReplays = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arenaverse';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing VOD entries
    await ReplayVOD.deleteMany({});

    // Create requested VOD entries
    await ReplayVOD.create([
      {
        title: 'BGMI Arena-Verse Grand Finals 2026 - Match 5 clutch',
        game: 'BGMI / PUBG Mobile',
        platform: 'youtube',
        vodUrl: 'https://www.youtube.com/embed/NtB1wUKNi6E',
        views: 1420,
      },
      {
        title: 'Valorant Champions Cup - Ace Clutch Highlights',
        game: 'VALORANT',
        platform: 'youtube',
        vodUrl: 'https://www.youtube.com/embed/AuZ5vf0rLx8',
        views: 890,
      },
    ]);

    console.log('Replay VODs updated successfully in MongoDB!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed replays:', err);
    process.exit(1);
  }
};

seedReplays();
