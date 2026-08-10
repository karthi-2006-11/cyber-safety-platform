const logger = require('../utilities/logger');

/**
 * In-memory granular rate limiting middleware for production endpoints.
 */
const rateLimitMaps = new Map();

function createRateLimiter({ name = 'default', windowMs = 60000, maxRequests = 30, message = 'Too many requests. Please try again later.' }) {
  if (!rateLimitMaps.has(name)) {
    rateLimitMaps.set(name, new Map());
  }
  const limitMap = rateLimitMaps.get(name);

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const now = Date.now();

    const record = limitMap.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count += 1;
    }

    limitMap.set(ip, record);

    if (record.count > maxRequests) {
      logger.security(`Rate limit exceeded on [${name}] from IP: ${ip}`, { ip, name, count: record.count }, req.id);

      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message,
        requestId: req.id || null
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
