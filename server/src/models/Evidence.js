const mongoose = require('mongoose');
const { EVIDENCE_TYPES } = require('../../../shared/constants');

/**
 * Evidence Entity Schema (Minimum Foundation)
 * References proof supporting threat decisions or user reports.
 */
const evidenceSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserReport',
    default: null
  },
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    default: null
  },
  type: {
    type: String,
    enum: Object.values(EVIDENCE_TYPES),
    default: EVIDENCE_TYPES.TEXT_DESCRIPTION
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Evidence', evidenceSchema);
