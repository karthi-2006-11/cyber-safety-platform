const mongoose = require('mongoose');

/**
 * User Entity Schema (Minimum Foundation)
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN', 'ANALYST'],
    default: 'USER'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
