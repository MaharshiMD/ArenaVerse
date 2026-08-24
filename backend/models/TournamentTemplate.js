const mongoose = require('mongoose');

const TournamentTemplateSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    templateName: { type: String, required: true },
    game: { type: String, required: true },
    type: { type: String, enum: ['solo', 'duo', 'team'], default: 'solo' },
    format: { type: String, enum: ['single_elimination', 'double_elimination'], default: 'single_elimination' },
    maxTeams: { type: Number, default: 16 },
    prizePool: { type: Number, default: 0 },
    entryFee: { type: Number, default: 0 },
    rules: { type: String, default: '' },
    region: { type: String, default: 'Global' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TournamentTemplate', TournamentTemplateSchema);
