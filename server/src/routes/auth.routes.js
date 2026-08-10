const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const authLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 20, message: 'Too many authentication attempts.' });

// POST /api/v1/auth/register
router.post('/auth/register', authLimiter, register);

// POST /api/v1/auth/login
router.post('/auth/login', authLimiter, login);

// GET /api/v1/auth/me
router.get('/auth/me', requireAuth, getMe);

module.exports = router;
