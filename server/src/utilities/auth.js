const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password securely using bcrypt.
 */
async function hashPassword(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return await bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 */
async function comparePassword(plaintext, storedHash) {
  if (!plaintext || !storedHash) return false;
  try {
    return await bcrypt.compare(plaintext, storedHash);
  } catch (err) {
    return false;
  }
}

/**
 * Generates a signed JWT authentication token for a user.
 */
function generateToken(user) {
  const payload = {
    id: String(user._id || user.id),
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn || '24h'
  });
}

/**
 * Verifies a JWT authentication token. Returns decoded payload or null if invalid/expired.
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};
