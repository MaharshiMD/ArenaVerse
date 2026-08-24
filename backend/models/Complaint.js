const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reportedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    reportedTournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      default: null,
    },
    type: {
      type: String,
      enum: ['cheating', 'toxicity', 'spam', 'roster_fraud', 'match_dispute', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    evidenceUrls: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed', 'escalated'],
      default: 'pending',
    },
    assignedModerator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatorNotes: {
      type: String,
      default: '',
    },
    resolutionAction: {
      type: String,
      enum: ['none', 'warning_issued', 'temporary_ban', 'dismissed', 'escalated_to_admin'],
      default: 'none',
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', ComplaintSchema);
