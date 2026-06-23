// backend/src/middleware/securityHeaders.js
// Sets recommended security response headers without an external dependency.

const securityHeaders = (req, res, next) => {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Enable browser XSS protection (legacy but harmless)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Transport Security (prod only — 1 year, include subdomains)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Reduce referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Reduce browser feature exposure
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Cross-origin defaults for API responses
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  // Content-Security-Policy — API-only, no HTML served
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  // Remove server fingerprint
  res.removeHeader('X-Powered-By');
  next();
};

module.exports = securityHeaders;
