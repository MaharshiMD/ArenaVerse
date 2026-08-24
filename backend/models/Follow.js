const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['player', 'team', 'organizer'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can only follow a specific target once
FollowSchema.index({ follower: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Follow', FollowSchema);
