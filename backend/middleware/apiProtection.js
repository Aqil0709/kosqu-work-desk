
const allowedOrigins = [
    'https://work-desk.tech',
    'https://www.work-desk.tech',
    'https://admin.work-desk.tech',
    'https://api.work-desk.tech',
    'http://localhost:5173',
    'http://localhost:5174',
];

const publicPaths = [
    '/auth/login',
    '/auth/forgot-password',
    '/auth/reset-password/',
    '/auth/tenant/',
];

const apiProtection = {

    validateOrigin: (req, res, next) => {
        // Skip origin check in development mode for easier local testing
        if (process.env.NODE_ENV === 'development') {
            return next();
        }

        if (req.method === 'OPTIONS') {
            return next();
        }

        const isPublicPath = publicPaths.some(p => req.path.startsWith(p));
        if (isPublicPath) {
            return next();
        }

        const origin = req.headers.origin;
        const referer = req.headers.referer;

        // Check if origin header is present and valid
        if (origin && allowedOrigins.includes(origin)) {
            return next();
        }

        // Fallback: check referer header (browsers always send one of these)
        if (referer) {
            try {
                const refererOrigin = new URL(referer).origin;
                if (allowedOrigins.includes(refererOrigin)) {
                    return next();
                }
            } catch (e) {
                // Invalid referer URL, fall through to block
            }
        }

        // No valid origin or referer — block the request
        const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
        console.warn(`🚫 SECURITY: Blocked API request. IP: ${clientIP}, Path: ${req.path}, Origin: ${origin || 'none'}, Referer: ${referer || 'none'}`);
        return res.status(403).json({
            success: false,
            message: 'Access denied. Direct API access is not allowed.'
        });
    }
};

module.exports = apiProtection;
