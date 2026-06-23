const sendResponse = require('../utils/response');
const logger = require('./logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error('Unhandled error', {
    path: req.originalUrl,
    method: req.method,
    statusCode,
    error: err.message,
    stack: err.stack,
  });

  // In production, never expose internal error messages, stack traces, SQL errors,
  // file paths, or schema info to clients. Always use a generic safe message.
  const clientMessage = isProd && statusCode >= 500
    ? 'Something went wrong. Please contact administrator.'
    : (err.message || 'Internal Server Error');

  sendResponse(res, statusCode, false, clientMessage, null);
};

module.exports = errorHandler;
