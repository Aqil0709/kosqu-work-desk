const express = require('express');
const authController = require('./authController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/requireAdmin');
const { validateBody, schemas } = require('../../middleware/validateBody');

const router = express.Router();

// Public routes
router.post('/login',           validateBody(schemas.loginSchema), authController.login);
router.get('/tenant/:slug',     authController.getTenantBySlug);
router.post('/forgot-password', validateBody(schemas.forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Cookie-based token refresh (reads refresh_token cookie, no auth header needed)
router.post('/refresh', authController.refresh);

// Logout — revokes refresh token and clears cookies (no auth required: client may call even if access token expired)
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile',          authMiddleware.verifyToken, authController.getProfile);
router.put('/change-password',  authMiddleware.verifyToken, validateBody(schemas.changePasswordSchema), authController.changePassword);
router.put('/first-login-reset', authMiddleware.verifyToken, authController.firstLoginReset);

// Admin-only: register a new user within the caller's tenant
router.post('/register', authMiddleware.verifyToken, requireAdmin.strict, validateBody(schemas.registerSchema), authController.register);

// Debug
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

module.exports = router;
