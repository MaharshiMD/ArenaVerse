const mongoose = require('mongoose');

const EsportsClubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    tag: { type: String, required: true, uppercase: true },
    logo: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    coaches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    squads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    bio: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EsportsClub', EsportsClubSchema);
