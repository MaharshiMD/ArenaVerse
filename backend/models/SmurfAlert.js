const mongoose = require('mongoose');

const SmurfAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    suspectedAltOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    ipAddress: { type: String, required: true },
    deviceFingerprint: { type: String, default: '' },
    riskScore: { type: Number, default: 85 }, // 0 to 100
    reasons: [{ type: String }],
    status: { type: String, enum: ['pending', 'verified_smurf', 'dismissed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SmurfAlert', SmurfAlertSchema);
