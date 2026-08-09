const express = require('express');
const { handleReportSubmission, getMyReports } = require('../controllers/report.controller');

const router = express.Router();

// POST /api/v1/reports (Submit community report)
router.post('/reports', handleReportSubmission);

// GET /api/v1/reports/my-reports (View my submitted reports)
router.get('/reports/my-reports', getMyReports);

module.exports = router;
