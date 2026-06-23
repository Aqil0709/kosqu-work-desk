// backend/src/features/admin/brandingRoutes.js
const express = require('express');
const router = express.Router();
const brandingController = require('./brandingController');
const { verifyToken } = require('../../middleware/auth.middleware');

// Simple admin check middleware (temporary)
const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role || req.user?.position;
  if (userRole === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

// All routes require authentication
// GET — any authenticated user can read branding
router.get('/', verifyToken, brandingController.getBranding);

// PUT — admin only — update text fields
router.put('/', verifyToken, requireAdmin, brandingController.updateBranding);

// POST — admin only — upload image
router.post('/upload', verifyToken, requireAdmin, brandingController.uploadMiddleware, brandingController.uploadImage);

// DELETE — admin only — remove image
router.delete('/upload', verifyToken, requireAdmin, brandingController.deleteImage);

module.exports = router;