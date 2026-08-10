/**
 * In-memory rate limiting middleware for sensitive endpoints.
 */
const rateLimitMap = new Map();

function createRateLimiter({ windowMs = 60000, maxRequests = 30, message = 'Too many requests. Please try again later.' }) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const now = Date.now();

    const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(ip, record);

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
