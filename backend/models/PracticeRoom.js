const mongoose = require('mongoose');

const PracticeRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    game: { type: String, required: true },
    hostTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    opponentTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    scheduledDate: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'in_progress', 'completed'], default: 'scheduled' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PracticeRoom', PracticeRoomSchema);
