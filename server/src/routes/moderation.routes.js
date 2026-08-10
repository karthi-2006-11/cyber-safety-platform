const express = require('express');
const {
  listReports,
  verifyReport,
  actionReport,
  rejectReport
} = require('../controllers/moderation.controller');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply JWT Authentication and Server Role Authorization (MODERATOR or ADMIN)
router.use(requireAuth);
router.use(requireRole('MODERATOR', 'ADMIN'));

// GET /api/v1/moderation/reports
router.get('/moderation/reports', listReports);

// POST /api/v1/moderation/reports/:id/verify
router.post('/moderation/reports/:id/verify', verifyReport);

// POST /api/v1/moderation/reports/:id/action
router.post('/moderation/reports/:id/action', actionReport);

// POST /api/v1/moderation/reports/:id/reject
router.post('/moderation/reports/:id/reject', rejectReport);

module.exports = router;
