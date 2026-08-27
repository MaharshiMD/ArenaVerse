const mongoose = require('mongoose');

const TournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a tournament name'],
      trim: true,
    },
    game: {
      type: String,
      required: [true, 'Please provide the game name'],
      trim: true,
    },
    banner: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date'],
    },
    entryFee: {
      type: Number,
      default: 0,
    },
    prizePool: {
      type: Number,
      default: 0,
      min: 0,
    },
    prizePoolCurrency: {
      type: String,
      default: 'INR',
    },
    prizeDistribution: [
      {
        position: { type: Number, required: true },
        amount: { type: Number, required: true, min: 0 },
      }
    ],
    prizePoolStatus: {
      type: String,
      enum: ['PENDING_FUNDING', 'FUNDED', 'PRIZES_PAID', 'REFUNDED'],
      default: 'PENDING_FUNDING',
    },
    prizePoolFundedAt: {
      type: Date,
    },
    resultsFinalizedAt: {
      type: Date,
    },
    rules: {
      type: String,
      required: [true, 'Please provide the rules'],
    },
    maxTeams: {
      type: Number,
      required: [true, 'Please specify the maximum number of participants/teams'],
      default: 16,
    },
    type: {
      type: String,
      enum: ['solo', 'duo', 'team'],
      default: 'team',
    },
    minTeamMembers: {
      type: Number,
      default: 2,
    },
    maxTeamMembers: {
      type: Number,
      default: 5,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed'],
      default: 'draft',
    },
    region: {
      type: String,
      default: 'Global',
    },
    winnerName: {
      type: String,
      default: '',
    },
    runnerUpName: {
      type: String,
      default: '',
    },
    autoWalkover: {
      type: Boolean,
      default: true,
    },
    checkInWindowMinutes: {
      type: Number,
      default: 15,
    },
    autoSeedingType: {
      type: String,
      enum: ['random', 'rank_based', 'previous_performance', 'manual'],
      default: 'random',
    },
    qrCheckInToken: {
      type: String,
      default: '',
    },
    streams: [
      {
        platform: { type: String, enum: ['youtube', 'twitch', 'kick'], default: 'youtube' },
        url: { type: String, required: true },
        title: { type: String, default: 'Live Stream' },
      },
    ],
    sponsors: [
      {
        name: { type: String, required: true },
        logo: { type: String, default: '' },
        website: { type: String, default: '' },
        tier: { type: String, enum: ['title', 'gold', 'silver', 'bronze'], default: 'gold' },
      },
    ],
    staff: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['referee', 'moderator', 'caster'], required: true },
        assignedAt: { type: Date, default: Date.now },
      },
    ],
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    registeredPlayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    registeredTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    announcements: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tournament', TournamentSchema);
