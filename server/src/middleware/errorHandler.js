const logger = require('../utilities/logger');
const env = require('../config/env');

/**
 * Centralized Express Error Handling Middleware — Phase 8 Production Reliability.
 */
function errorHandler(err, req, res, next) {
  const requestId = req.id || null;
  const statusCode = err.statusCode || err.status || 500;

  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
    statusCode,
    name: err.name,
    stack: env.nodeEnv === 'development' ? err.stack : undefined
  }, requestId);

  // Mongoose CastError / ValidationError mapping
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_ID_FORMAT',
      message: 'Invalid resource identifier format.',
      requestId
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: err.message,
      requestId
    });
  }

  // JsonWebTokenError mapping
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication token is invalid or expired.',
      requestId
    });
  }

  // Safe Production Response (Never leak raw stack traces)
  res.status(statusCode).json({
    success: false,
    error: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR'),
    message: statusCode === 500 && env.nodeEnv === 'production'
      ? 'An internal server error occurred. Please contact system support.'
      : err.message || 'An unexpected error occurred.',
    requestId
  });
}

/**
 * 404 Not Found Middleware handler.
 */
function notFoundHandler(req, res) {
  const requestId = req.id || null;
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
    requestId
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
