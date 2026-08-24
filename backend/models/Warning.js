const mongoose = require('mongoose');

const WarningSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['rule_violation', 'unsportsmanlike', 'spam', 'roster_infringement', 'other'],
      default: 'rule_violation',
    },
    reason: {
      type: String,
      required: true,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    complaintRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warning', WarningSchema);
