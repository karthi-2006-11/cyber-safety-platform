const mongoose = require('mongoose');
const { THREAT_LEVELS } = require('../../../shared/constants');

/**
 * Website Entity Schema (Minimum Foundation)
 */
const websiteSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  currentStatus: {
    type: String,
    enum: Object.values(THREAT_LEVELS),
    default: THREAT_LEVELS.UNKNOWN
  },
  lastAnalyzedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Website', websiteSchema);
