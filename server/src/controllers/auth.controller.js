const User = require('../models/User');
const { hashPassword, comparePassword, generateToken } = require('../utilities/auth');
const { sanitizeText } = require('../services/report.service');
const { getDBStatus } = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/v1/auth/register
 * Register a new user account safely.
 * CRITICAL SECURITY CONTRACT: Public registration MUST ALWAYS assign role 'USER'.
 * Client-provided role parameters (req.body.role, x-user-role, x-user-id, etc.) are UNCONDITIONALLY IGNORED.
 */
async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

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
    
    // CRITICAL SECURITY FIX: Unconditionally enforce role 'USER' for public registration.
    // Never trust req.body.role, x-user-role, or any client input.
    const assignedRole = 'USER';

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

/**
 * POST /api/v1/auth/promote-user
 * Protected Administrative User Role Promotion Endpoint.
 * Requires ADMIN role. Normal users or moderators cannot promote users or self-promote.
 */
async function promoteUser(req, res, next) {
  try {
    const { targetEmail, targetUserId, newRole } = req.body;

    if (!['USER', 'MODERATOR', 'ADMIN'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ROLE',
        message: 'Role must be one of: USER, MODERATOR, ADMIN'
      });
    }

    const query = targetUserId ? { _id: targetUserId } : { email: (targetEmail || '').trim().toLowerCase() };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Target user account not found.'
      });
    }

    user.role = newRole;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.email} role updated to ${newRole}.`,
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

module.exports = {
  register,
  login,
  getMe,
  promoteUser
};
