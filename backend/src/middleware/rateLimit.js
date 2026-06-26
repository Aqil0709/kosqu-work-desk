/**
 * Rate Limiter — Redis-backed when REDIS_URL is set, in-memory fallback otherwise.
 *
 * Production: set REDIS_URL=redis://your-redis-host:6379
 * Development: no REDIS_URL → in-memory (single-process only, fine for local dev)
 *
 * Redis client uses the built-in `redis` package (Node.js 18+ ships with a native
 * fetch-based client; we use a pure-JS approach so no native addon is needed).
 */

const cluster = require('cluster');

// ── In-memory store (fallback / dev) ──────────────────────────────────────
const memStore = new Map();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (v.resetAt < now) memStore.delete(k);
  }
}, 5 * 60 * 1000).unref();

const memIncrement = (key, windowMs) => {
  const now = Date.now();
  let entry = memStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    memStore.set(key, entry);
  }
  entry.count += 1;
  return { count: entry.count, resetAt: entry.resetAt };
};

// ── Redis store (production) ───────────────────────────────────────────────
let redisClient = null;
let redisReady  = false;

if (process.env.REDIS_URL) {
  try {
    // Dynamically require — only available if installed.
    // Works with `ioredis` (preferred) or `redis` v4.
    let Redis;
    try { Redis = require('ioredis'); } catch { Redis = require('redis'); }

    if (typeof Redis.createClient === 'function') {
      // `redis` v4 API
      redisClient = Redis.createClient({ url: process.env.REDIS_URL });
      redisClient.connect().then(() => { redisReady = true; });
      redisClient.on('error', (e) => console.error('[rateLimit Redis]', e.message));
    } else {
      // `ioredis` API
      redisClient = new Redis(process.env.REDIS_URL);
      redisClient.on('ready', () => { redisReady = true; });
      redisClient.on('error', (e) => console.error('[rateLimit Redis]', e.message));
    }
  } catch (e) {
    console.warn('[rateLimit] Redis package not found; falling back to in-memory.', e.message);
  }
} else {
  if (cluster.isWorker) {
    console.warn('[rateLimit] REDIS_URL not set — rate limits are per-worker. Set REDIS_URL in production.');
  }
}

/**
 * Increment a counter in Redis (INCR + EXPIRE pattern, cluster-safe).
 * Returns { count, resetAt } matching the mem-store shape.
 */
const redisIncrement = async (key, windowMs) => {
  const windowSec = Math.ceil(windowMs / 1000);
  let count;

  if (typeof redisClient.incr === 'function') {
    // `redis` v4
    count = await redisClient.incr(key);
    if (count === 1) await redisClient.expire(key, windowSec);
    const ttl = await redisClient.ttl(key);
    return { count, resetAt: Date.now() + ttl * 1000 };
  } else {
    // `ioredis`
    const pipeline = redisClient.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSec);
    pipeline.ttl(key);
    const results = await pipeline.exec();
    count = results[0][1];
    const ttl = results[2][1];
    return { count, resetAt: Date.now() + ttl * 1000 };
  }
};

const increment = async (key, windowMs) => {
  if (redisReady && redisClient) {
    try {
      return await redisIncrement(key, windowMs);
    } catch (e) {
      console.warn('[rateLimit] Redis error, falling back to memory:', e.message);
    }
  }
  return memIncrement(key, windowMs);
};

// ── Factory ────────────────────────────────────────────────────────────────
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max      = 100,
  message  = 'Too many requests, please try again later.',
  keyFn    = null, // optional custom key function (req) => string
} = {}) => {
  return async (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    const ip  = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = keyFn ? keyFn(req) : `rl:${ip}:${req.path}`;

    try {
      const { count, resetAt } = await increment(key, windowMs);

      res.setHeader('X-RateLimit-Limit',     max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset',     Math.ceil(resetAt / 1000));

      if (count > max) {
        return res.status(429).json({ success: false, message });
      }
    } catch (e) {
      console.error('[rateLimit] Unexpected error:', e.message);
      // On error, allow the request through — don't block users due to limiter bugs
    }

    next();
  };
};

// ── Pre-built limiters ─────────────────────────────────────────────────────

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  'Too many login attempts, please try again in 15 minutes.',
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max:      300,
  message:  'API rate limit exceeded, please slow down.',
});

const strictLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max:      50,
  message:  'Rate limit exceeded for this operation.',
});

// AI Chat limiter keyed by userId (not IP) for accurate per-user enforcement
const aiChatLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max:      60,
  message:  'AI chat rate limit exceeded. Please wait before sending more messages.',
  keyFn:    (req) => `rl:ai_chat:${req.user?.id || req.ip || 'unknown'}`,
});

module.exports = { createRateLimiter, authLimiter, apiLimiter, strictLimiter, aiChatLimiter };
