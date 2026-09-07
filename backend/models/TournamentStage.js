const mongoose = require('mongoose');

const TournamentStageSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    name: {
      type: String, // e.g., 'Group Stage', 'Grand Final'
      required: true,
    },
    type: {
      type: String,
      enum: ['group', 'final'],
      required: true,
    },
    groups: [
      {
        name: { type: String, required: true }, // e.g., 'Group A', 'Group B'
        teams: [
          {
            teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
            seed: { type: Number, default: 0 },
            qualified: { type: Boolean, default: false },
          }
        ],
        matchesCount: { type: Number, default: 6 },
        status: { type: String, enum: ['pending', 'ongoing', 'completed'], default: 'pending' }
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'ongoing', 'completed'],
      default: 'pending',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TournamentStage', TournamentStageSchema);
