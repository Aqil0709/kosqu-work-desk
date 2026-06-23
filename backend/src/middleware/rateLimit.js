// backend/src/middleware/rateLimit.js
// Sliding-window in-memory rate limiter.
// CONSTRAINT: Not cluster-safe — run with PM2 cluster=1 or add Redis for multi-process.

const cluster = require('cluster');
if (cluster.isWorker) {
  console.warn('[rateLimit] Running as cluster worker — rate limits are per-worker, not global. Set PM2 instances=1 or add a Redis adapter.');
}

const store = new Map(); // key → { count, resetAt }

const cleanup = () => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (val.resetAt < now) store.delete(key);
  }
};

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000).unref();

/**
 * createRateLimiter(options)
 * @param {number} options.windowMs   — Window in ms (default 15 min)
 * @param {number} options.max        — Max requests per window (default 100)
 * @param {string} options.message    — Error message (default standard)
 * @param {boolean} options.skipSuccess — Only count failed (4xx/5xx) responses
 */
const createRateLimiter = ({
  windowMs  = 15 * 60 * 1000,
  max       = 100,
  message   = 'Too many requests, please try again later.',
  skipSuccess = false,
} = {}) => {
  return (req, res, next) => {
    // Never rate-limit CORS preflight requests
    if (req.method === 'OPTIONS') return next();

    // Key: IP + optional route for isolation
    const ip  = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    if (!skipSuccess) {
      entry.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }

    if (skipSuccess) {
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          const e = store.get(key);
          if (e) e.count += 1;
        }
      });
    }

    next();
  };
};

// Pre-built limiters for common scenarios
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 20,
  message: 'Too many login attempts, please try again in 15 minutes.',
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 min
  max: 300,
  message: 'API rate limit exceeded, please slow down.',
});

const strictLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,
  message: 'Rate limit exceeded for this operation.',
});

module.exports = { createRateLimiter, authLimiter, apiLimiter, strictLimiter };
