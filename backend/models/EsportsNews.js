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
    },
    videoPreview: {
      hasVideo: {
        type: Boolean,
        default: true,
      },
      generatedAt: {
        type: Date,
        default: Date.now,
      },
      duration: {
        type: Number,
        default: 12,
      },
      audioUrl: {
        type: String,
      },
      audioWaveform: [{
        type: Number,
      }],
      vfxTheme: {
        themeName: String,
        accentColor: String,
        secondaryColor: String,
        bgGradient: String,
        particlesStyle: String,
        particleCount: Number,
        glitchIntensity: Number,
        scanlineEffect: Boolean,
        overlayTag: String,
      },
      scenes: [
        {
          id: Number,
          timeStart: Number,
          timeEnd: Number,
          badge: String,
          headline: String,
          contentSnippet: String,
          vfxType: String,
          highlightKeywords: [String],
        }
      ],
      subtitles: [
        {
          word: String,
          sentenceIndex: Number,
          startTime: Number,
          endTime: Number,
        }
      ],
      scriptText: String,
    }
  },
  {
    timestamps: true,
  }
);

const EsportsNews = mongoose.model('EsportsNews', esportsNewsSchema);

module.exports = EsportsNews;
