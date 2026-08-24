const mongoose = require('mongoose');

const ReplayVODSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    title: { type: String, required: true },
    game: { type: String, required: true },
    vodUrl: { type: String, required: true },
    platform: { type: String, enum: ['youtube', 'twitch', 'kick'], default: 'youtube' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReplayVOD', ReplayVODSchema);
