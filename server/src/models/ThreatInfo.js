const mongoose = require('mongoose');

/**
 * ThreatInfo Entity Schema (Minimum Foundation)
 * Stores security threat evidence and category details associated with a domain.
 */
const threatInfoSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  summary: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('ThreatInfo', threatInfoSchema);
