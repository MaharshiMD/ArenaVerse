const mongoose = require('mongoose');

const LFPPostSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    game: { type: String, required: true },
    region: { type: String, default: 'Global' },
    minRank: { type: String, default: 'Any' },
    requiredRoles: [{ type: String, required: true }],
    description: { type: String, default: '' },
    status: { type: String, enum: ['open', 'filled', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LFPPost', LFPPostSchema);
