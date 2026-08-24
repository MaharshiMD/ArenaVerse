const mongoose = require('mongoose');

const LFTPostSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    games: [{ type: String, required: true }],
    region: { type: String, default: 'Global' },
    rank: { type: String, default: 'Unranked' },
    role: { type: String, default: 'Flex / Any' },
    availability: { type: String, default: 'Evenings & Weekends' },
    bio: { type: String, default: '' },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LFTPost', LFTPostSchema);
