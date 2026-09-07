const mongoose = require('mongoose');

const BRMatchSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TournamentStage',
      required: true,
    },
    groupName: {
      type: String,
      required: true, // e.g., 'Group A'
    },
    matchNumber: {
      type: Number,
      required: true,
    },
    mapName: {
      type: String,
      default: 'Bermuda',
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed'],
      default: 'scheduled',
    },
    results: [
      {
        teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
        placement: { type: Number, required: true },
        kills: { type: Number, default: 0 },
        placementPoints: { type: Number, default: 0 },
        killPoints: { type: Number, default: 0 },
        totalPoints: { type: Number, default: 0 },
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('BRMatch', BRMatchSchema);
