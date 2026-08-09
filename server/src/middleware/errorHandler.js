const logger = require('../utilities/logger');

/**
 * Centralized Express Error Handling Middleware.
 */
function errorHandler(err, req, res, next) {
  logger.error(`Error handling ${req.method} ${req.originalUrl}:`, err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
}

/**
 * 404 Not Found Middleware handler.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
