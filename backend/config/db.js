const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arena_verse');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop legacy index 'tournamentId_1' if present and synchronize indexes across key models
    try {
      const Bracket = require('../models/Bracket');
      const Tournament = require('../models/Tournament');
      const Match = require('../models/Match');
      const Team = require('../models/Team');
      const User = require('../models/User');

      await Bracket.collection.dropIndex('tournamentId_1').catch(() => {});
      await Promise.all([
        Bracket.syncIndexes(),
        Tournament.syncIndexes(),
        Match.syncIndexes(),
        Team.syncIndexes(),
        User.syncIndexes(),
      ]);
      console.log('Database indexes synchronized for optimal query performance.');
    } catch (indexError) {
      console.warn('Index sync note:', indexError.message);
    }
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

