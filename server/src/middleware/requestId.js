const crypto = require('crypto');

/**
 * Middleware: Request Traceability & X-Request-ID Correlation.
 */
function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'];
  const requestId = (existingId && typeof existingId === 'string' && existingId.length < 64)
    ? existingId.replace(/[^a-zA-Z0-9_-]/g, '')
    : `req_${crypto.randomBytes(8).toString('hex')}`;

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

module.exports = {
  requestIdMiddleware
};
