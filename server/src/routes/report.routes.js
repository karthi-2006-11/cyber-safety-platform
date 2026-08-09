const express = require('express');
const { createReport, getReports } = require('../controllers/report.controller');
const { validateDomainInput, validateReportInput } = require('../middleware/validateInput');

const router = express.Router();

// POST /api/v1/reports
router.post('/reports', validateReportInput, createReport);

// GET /api/v1/reports?domain=example.com
router.get('/reports', validateDomainInput, getReports);

module.exports = router;
