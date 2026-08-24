const mongoose = require('mongoose');

const BattlePassSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    season: { type: String, default: 'Season 1' },
    level: { type: Number, default: 1, max: 50 },
    xp: { type: Number, default: 0 },
    isPremium: { type: Boolean, default: false },
    unlockedItems: [{ type: String }],
    equippedFrame: { type: String, default: 'Default' },
    equippedTitle: { type: String, default: 'Challenger' },
    arenaCoins: { type: Number, default: 250 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BattlePass', BattlePassSchema);
