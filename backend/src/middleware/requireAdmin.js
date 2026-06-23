const sendResponse = require('../utils/response');

// Allows admin AND hr to pass through.
// Routes that should be truly admin-only (settings, tenant management) use
// requireSuperAdmin or check role explicitly inside the controller.
const requireAdmin = (req, res, next) => {
  const role = req.user?.role || req.user?.position;
  if (role === 'admin' || role === 'hr') {
    return next();
  }
  return sendResponse(res, 403, false, 'Admin or HR access required', null);
};

// Strict admin-only (no HR)
requireAdmin.strict = (req, res, next) => {
  const role = req.user?.role || req.user?.position;
  if (role === 'admin') return next();
  return sendResponse(res, 403, false, 'Admin access required', null);
};

module.exports = requireAdmin;
