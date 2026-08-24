const mongoose = require('mongoose');

const ForumCommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ForumPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['General', 'Tournament Discussion', 'Recruitment', 'Support'],
      default: 'General',
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [ForumCommentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ForumPost', ForumPostSchema);
