const mongoose = require('mongoose');

const TwoFactorChallengeSchema = new mongoose.Schema(
  {
    challengeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    purpose: {
      type: String,
      enum: ['login', 'enable', 'disable', 'registration'],
      default: 'login',
    },
    pendingRegistration: {
      username: { type: String },
      email: { type: String },
      password: { type: String },
      role: { type: String, default: 'player' },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // MongoDB TTL index: 10 minutes automatic DB cleanup
    },
  }
);

module.exports = mongoose.model('TwoFactorChallenge', TwoFactorChallengeSchema);
