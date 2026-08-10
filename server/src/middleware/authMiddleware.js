const { verifyToken } = require('../utilities/auth');
const User = require('../models/User');
const { getDBStatus } = require('../config/db');

/**
 * Middleware: Require valid JWT Authentication Token.
 * Server is sole source of truth. Ignores all client-provided x-user-role headers.
 */
async function requireAuth(req, res, next) {
  // Completely strip/ignore any client-spoofed x-user-role headers
  delete req.headers['x-user-role'];

  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = null;

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication token is invalid or expired.'
    });
  }

  // If MongoDB is connected, verify user exists in database
  const dbStatus = getDBStatus();
  if (dbStatus.isConnected) {
    try {
      const user = await User.findById(decoded.id);
      if (!user || user.isActive === false) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'User account not found or inactive.'
        });
      }
      req.user = {
        _id: String(user._id),
        id: String(user._id),
        email: user.email,
        role: user.role
      };
      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication failed.'
      });
    }
  }

  // Fallback for isolated unit tests with mocked decoded token
  req.user = {
    _id: decoded.id,
    id: decoded.id,
    email: decoded.email,
    role: decoded.role
  };
  next();
}

/**
 * Middleware: Require specific server-verified user role(s).
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
