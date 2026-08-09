const express = require('express');
const { checkThreat } = require('../controllers/threat.controller');
const { validateDomainInput } = require('../middleware/validateInput');

const router = express.Router();

// GET /api/v1/threats/check?domain=example.com
router.get('/threats/check', validateDomainInput, checkThreat);

// POST /api/v1/threats/check { domain: 'example.com' }
router.post('/threats/check', validateDomainInput, checkThreat);

module.exports = router;
