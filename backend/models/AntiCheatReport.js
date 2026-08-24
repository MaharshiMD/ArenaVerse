const mongoose = require('mongoose');

const AntiCheatReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accusedPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    cheatType: { type: String, enum: ['aimbot', 'wallhack', 'macro', 'account_sharing', 'other'], default: 'aimbot' },
    evidenceUrl: { type: String, default: '' },
    replayLink: { type: String, default: '' },
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'under_investigation', 'banned', 'dismissed'], default: 'pending' },
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AntiCheatReport', AntiCheatReportSchema);
