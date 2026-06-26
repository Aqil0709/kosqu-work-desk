const jwt = require('jsonwebtoken');
const sendResponse = require('../utils/response');

/**
 * Extract JWT from:
 *  1. HttpOnly cookie `access_token` (preferred — secure)
 *  2. Authorization: Bearer <token> header (API clients / backward compat)
 */
const extractToken = (req) => {
  // Cookie-based (HttpOnly, set by the server on login)
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  // Bearer token (API clients, mobile, backward compat)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return sendResponse(res, 401, false, 'No token provided', null);
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('SECURITY ERROR: JWT_SECRET not configured');
      return sendResponse(res, 500, false, 'Server configuration error', null);
    }
    const decoded = jwt.verify(token, secret);
    const role = decoded.role || decoded.position || decoded.role_name;
    req.user = decoded;
    req.user.id = decoded.id || decoded.user_id;
    req.user.user_id = decoded.user_id || decoded.id;
    req.user.position = decoded.position || role;
    req.user.role = decoded.role || role;
    req.user.role_name = decoded.role_name || role;
    req.tenantId = decoded.tenant_id;
    next();
  } catch (error) {
    return sendResponse(res, 401, false, 'Invalid or expired token', null);
  }
};

// Auth middleware — same as verifyToken, kept for backward-compatibility
const authMiddleware = (req, res, next) => verifyToken(req, res, next);

module.exports = {
  verifyToken,
  authMiddleware,
  extractToken,
};
