const mongoose = require('mongoose');

const BracketSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['single_elimination', 'double_elimination'],
      required: true,
    },
    roundsCount: {
      type: Number,
      default: 0,
    },
    teamsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bracket', BracketSchema);
