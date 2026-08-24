const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function() {
        return !this.googleId;
      },
      minlength: 6,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['player', 'organizer', 'moderator', 'admin'],
      default: 'player',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    suspensionReason: {
      type: String,
      default: '',
    },
    warningsCount: {
      type: Number,
      default: 0,
    },
    temporaryBan: {
      isBanned: { type: Boolean, default: false },
      bannedUntil: { type: Date, default: null },
      banReason: { type: String, default: '' },
      bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    isVerifiedOrganizer: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    verificationRequest: {
      organizationName: { type: String, default: '' },
      websiteUrl: { type: String, default: '' },
      governmentIdUrl: { type: String, default: '' },
      reason: { type: String, default: '' },
      appliedAt: { type: Date },
      adminNote: { type: String, default: '' },
    },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Busy', 'Looking for Tournament', 'Looking for Team'],
      default: 'Available',
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: '',
    },
    settings: {
      language: { type: String, enum: ['en', 'hi', 'gu'], default: 'en' },
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
      notificationsEnabled: { type: Boolean, default: true },
      privacyPublicProfile: { type: Boolean, default: true },
    },
    connectedAccounts: {
      discord: { type: String, default: '' },
      steam: { type: String, default: '' },
      twitch: { type: String, default: '' },
    },
    profile: {
      bio: { type: String, default: 'Ready to compete, conquer, and make my mark in the arena.' },
      avatar: { type: String, default: '/images/default-avatar.png' }, // URL or Base64
      equippedFrame: { type: String, default: 'Default' },
      equippedTitle: { type: String, default: 'Challenger' },
      equippedBadge: { type: String, default: '' },
      favoriteGames: [{ type: String }],
      socialLinks: {
        discord: { type: String, default: '' },
        twitter: { type: String, default: '' },
        youtube: { type: String, default: '' },
        instagram: { type: String, default: '' },
      },
    },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password') || this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
