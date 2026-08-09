const mongoose = require('mongoose');
const { EVIDENCE_TYPES, VERIFICATION_STATUS } = require('../../../shared/constants');

/**
 * Evidence Entity Schema — Phase 6 Multi-Evidence Model
 */
const evidenceSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserReport',
    default: null,
    index: true
  },
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    default: null,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(EVIDENCE_TYPES),
    default: EVIDENCE_TYPES.TEXT_EXPLANATION
  },
  title: {
    type: String,
    default: 'Community Submitted Evidence',
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  referenceUrl: {
    type: String,
    default: null,
    trim: true
  },
  verificationStatus: {
    type: String,
    default: VERIFICATION_STATUS.UNVERIFIED
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Evidence', evidenceSchema);
