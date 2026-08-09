const mongoose = require('mongoose');
const { REPORT_STATUS } = require('../../../shared/constants');

/**
 * UserReport Entity Schema — Phase 6 Community Intelligence
 */
const userReportSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    index: true
  },
  domain: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reporterHash: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(REPORT_STATUS),
    default: REPORT_STATUS.PENDING,
    index: true
  },
  confidenceContribution: {
    type: Number,
    default: 0.1
  },
  moderationMetadata: {
    moderatedBy: { type: String, default: null },
    moderatedAt: { type: Date, default: null },
    moderationNotes: { type: String, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('UserReport', userReportSchema);
