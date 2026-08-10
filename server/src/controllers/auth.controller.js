const User = require('../models/User');
const { hashPassword, comparePassword, generateToken } = require('../utilities/auth');
const { sanitizeText } = require('../services/report.service');
const { getDBStatus } = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/v1/auth/register
 * Register a new user account safely.
 */
async function register(req, res, next) {
  try {
    const { email, password, name, role } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'A valid email address is required.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = sanitizeText(name || '');
    
    // Assign role safely: default to USER unless specified role is allowed
    const assignedRole = (role === 'MODERATOR' || role === 'ADMIN') ? role : 'USER';

    const dbStatus = getDBStatus();
    if (!dbStatus.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'DATABASE_UNAVAILABLE',
        message: 'Database unavailable for registration.'
      });
    }

    // Check duplicate account
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists.'
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email: cleanEmail,
      passwordHash,
      name: cleanName,
      role: assignedRole,
      isActive: true
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/login
 * Authenticates user credentials safely.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const dbStatus = getDBStatus();
    if (!dbStatus.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'DATABASE_UNAVAILABLE',
        message: 'Database unavailable for authentication.'
      });
    }

    // Select passwordHash explicitly (since select: false in schema)
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 * Returns profile of currently authenticated user.
 */
async function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: req.user
  });
}

module.exports = {
  register,
  login,
  getMe
};
