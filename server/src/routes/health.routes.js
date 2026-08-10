const express = require('express');
const { getHealth, getLiveness, getReadiness } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/v1/health — Application basic health
router.get('/health', getHealth);

// GET /api/v1/health/liveness — Kubernetes / process liveness check
router.get('/health/liveness', getLiveness);

// GET /api/v1/health/readiness — Kubernetes / dependency readiness check
router.get('/health/readiness', getReadiness);

module.exports = router;
