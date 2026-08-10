const { getDBStatus } = require('../config/db');

/**
 * Basic health check endpoint — GET /api/v1/health
 */
function getHealth(req, res) {
  const dbStatus = getDBStatus();

  res.status(200).json({
    status: 'ONLINE',
    service: 'Cyber Safety Platform Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      connected: dbStatus.isConnected
    },
    requestId: req.id || null
  });
}

/**
 * Liveness probe — GET /api/v1/health/liveness
 * Verifies process is alive and responding.
 */
function getLiveness(req, res) {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    requestId: req.id || null
  });
}

/**
 * Readiness probe — GET /api/v1/health/readiness
 * Verifies application dependencies (MongoDB) are ready to serve requests.
 */
function getReadiness(req, res) {
  const dbStatus = getDBStatus();

  if (dbStatus.isConnected) {
    return res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString(),
      database: 'CONNECTED',
      requestId: req.id || null
    });
  }

  res.status(503).json({
    status: 'NOT_READY',
    timestamp: new Date().toISOString(),
    database: 'DISCONNECTED',
    message: 'Database connection is not established.',
    requestId: req.id || null
  });
}

module.exports = {
  getHealth,
  getLiveness,
  getReadiness
};
