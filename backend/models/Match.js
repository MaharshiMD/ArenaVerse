const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    round: {
      type: Number,
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    bracketType: {
      type: String,
      enum: ['winners', 'losers'],
      default: 'winners',
    },
    teamA: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'participantModel',
        default: null,
      },
      name: { type: String, default: 'TBD' },
    },
    teamB: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'participantModel',
        default: null,
      },
      name: { type: String, default: 'TBD' },
    },
    scoreA: {
      type: Number,
      default: 0,
    },
    scoreB: {
      type: Number,
      default: 0,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participantModel',
      default: null,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed'],
      default: 'scheduled',
    },
    participantModel: {
      type: String,
      required: true,
      enum: ['User', 'Team'],
    },
    nextMatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
    },
    nextMatchSlot: {
      type: String,
      enum: ['teamA', 'teamB'],
      default: null,
    },
    loserDropMatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
    },
    checkInA: {
      type: Boolean,
      default: false,
    },
    checkInB: {
      type: Boolean,
      default: false,
    },
    checkInDeadline: {
      type: Date,
      default: null,
    },
    isWalkover: {
      type: Boolean,
      default: false,
    },
    walkoverReason: {
      type: String,
      default: '',
    },
    mvp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    mvpComment: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', MatchSchema);
