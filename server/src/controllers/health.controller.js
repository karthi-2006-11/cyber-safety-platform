const { getDBStatus } = require('../config/db');

/**
 * Health check controller for system monitoring.
 */
function getHealth(req, res) {
  const dbStatus = getDBStatus();

  res.status(200).json({
    status: 'ONLINE',
    service: 'Cyber Safety Platform Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.isConnected
    }
  });
}

module.exports = {
  getHealth
};
