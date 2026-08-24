const mongoose = require('mongoose');

const MissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    rewardXP: { type: Number, default: 100 },
    rewardCoins: { type: Number, default: 50 },
    progress: { type: Number, default: 0 },
    target: { type: Number, default: 1 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mission', MissionSchema);
