const mongoose = require('mongoose');
const { REPORT_STATUS } = require('../../../shared/constants');

/**
 * UserReport Entity Schema (Minimum Foundation)
 * Allows users to submit safety reports for suspicious domains.
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
    trim: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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
    default: REPORT_STATUS.PENDING
  }
}, { timestamps: true });

module.exports = mongoose.model('UserReport', userReportSchema);
