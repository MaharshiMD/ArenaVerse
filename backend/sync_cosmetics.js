const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const BattlePass = require('./models/BattlePass');

const sync = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arenaverse';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const battlePasses = await BattlePass.find();
    for (const bp of battlePasses) {
      const u = await User.findById(bp.user);
      if (u) {
        if (!u.profile) u.profile = {};
        u.profile.equippedFrame = bp.equippedFrame || 'Default';
        u.profile.equippedTitle = bp.equippedTitle || 'Challenger';
        u.profile.equippedBadge = bp.equippedBadge || '';
        await u.save();
        console.log(`Synced cosmetics for user ${u.username}: Frame="${u.profile.equippedFrame}", Title="${u.profile.equippedTitle}"`);
      }
    }
    console.log('Cosmetics sync complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing cosmetics:', err);
    process.exit(1);
  }
};

sync();
