const sendResponse = require('../utils/response');

const requireClient = (req, res, next) => {
  const role = req.user?.role || req.user?.position;
  if (role === 'client' || role === 'admin') {
    return next();
  }
  return sendResponse(res, 403, false, 'Client access required', null);
};

module.exports = requireClient;
