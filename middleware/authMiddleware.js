// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const authenticateToken = (req, res, next) => {
  try {
    console.log('[Middleware] Authenticating token...');

    const token =
      req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;

    console.log('[Middleware] Token exists:', token ? 'Yes' : 'No');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const verified = jwt.verify(token, JWT_SECRET);
    console.log('[Middleware] Token verified for userId:', verified.userId);

    req.user = verified;
    next();
  } catch (error) {
    console.log('[Middleware] Token verification failed:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Optional: role-based guard
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
};

module.exports = authenticateToken;
module.exports.requireRole = requireRole;