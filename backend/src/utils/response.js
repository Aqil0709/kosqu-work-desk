const sendResponse = (res, statusCode, success, message, data = null) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

/**
 * Sanitize an error message for client responses.
 * In production, never expose internal error details for 5xx status codes.
 */
const safeErrorMessage = (err, statusCode = 500) => {
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    return 'Something went wrong. Please contact administrator.';
  }
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong. Please contact administrator.';
};

module.exports = sendResponse;
module.exports.safeErrorMessage = safeErrorMessage;
