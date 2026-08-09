const express = require('express');
const {
  requireModeratorRole,
  listReports,
  verifyReport,
  actionReport,
  rejectReport
} = require('../controllers/moderation.controller');

const router = express.Router();

// Apply RBAC middleware to all moderation endpoints
router.use(requireModeratorRole);

// GET /api/v1/moderation/reports
router.get('/moderation/reports', listReports);

// POST /api/v1/moderation/reports/:id/verify
router.post('/moderation/reports/:id/verify', verifyReport);

// POST /api/v1/moderation/reports/:id/action
router.post('/moderation/reports/:id/action', actionReport);

// POST /api/v1/moderation/reports/:id/reject
router.post('/moderation/reports/:id/reject', rejectReport);

module.exports = router;
