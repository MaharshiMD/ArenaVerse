const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a team name'],
      unique: true,
      trim: true,
    },
    logo: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
    },
    maxMembers: {
      type: Number,
      default: 10,
    },
    joinRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    invitedPlayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    memberRoles: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: {
          type: String,
          enum: ['Captain', 'Co-Captain', 'Coach', 'Analyst', 'Substitute', 'Player'],
          default: 'Player',
        },
      },
    ],
    stats: {
      totalTournaments: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 },
      averagePlacement: { type: Number, default: 0 },
      prizeMoney: { type: Number, default: 0 },
      mvpCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', TeamSchema);
