const mongoose = require('mongoose');

const LoginHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ipAddress: { type: String, default: '127.0.0.1' },
    userAgent: { type: String, default: 'Web Browser' },
    device: { type: String, default: 'Desktop' },
    browser: { type: String, default: 'Chrome' },
    location: { type: String, default: 'India' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoginHistory', LoginHistorySchema);
