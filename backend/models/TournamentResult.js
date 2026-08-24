const mongoose = require('mongoose');

const TournamentResultSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    teamName: {
      type: String,
      default: '',
    },
    placement: {
      type: Number, // 1 = 1st, 2 = 2nd, 3 = 3rd, etc.
      required: true,
    },
    prizeWon: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TournamentResult', TournamentResultSchema);
