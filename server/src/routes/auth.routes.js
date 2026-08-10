const express = require('express');
const { register, login, getMe, promoteUser } = require('../controllers/auth.controller');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const authLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 20, message: 'Too many authentication attempts.' });

// POST /api/v1/auth/register (Public registration — ALWAYS assigns role 'USER')
router.post('/auth/register', authLimiter, register);

// POST /api/v1/auth/login
router.post('/auth/login', authLimiter, login);

// GET /api/v1/auth/me
router.get('/auth/me', requireAuth, getMe);

// POST /api/v1/auth/promote-user (Strict ADMIN-only user role promotion)
router.post('/auth/promote-user', requireAuth, requireRole('ADMIN'), promoteUser);

module.exports = router;
