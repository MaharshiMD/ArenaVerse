const mongoose = require('mongoose');

const esportsNewsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    game: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    summary: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
    fullContent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    }
  },
  {
    timestamps: true,
  }
);

const EsportsNews = mongoose.model('EsportsNews', esportsNewsSchema);

module.exports = EsportsNews;
