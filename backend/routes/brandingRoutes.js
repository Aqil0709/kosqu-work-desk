// routes/brandingRoutes.js
const express = require('express');
const router = express.Router();
const brandingController = require('../controllers/brandingController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/branding - Any authenticated user can read branding (needed for document rendering)
router.get('/', brandingController.getBranding);

// PUT /api/branding - admin/hr only — update text fields
router.put('/', requireRole(['admin', 'hr']), brandingController.updateBranding);

// POST /api/branding/upload - admin/hr only — upload image
router.post('/upload', requireRole(['admin', 'hr']), brandingController.uploadMiddleware, brandingController.uploadImage);

// DELETE /api/branding/upload - admin/hr only — remove image
router.delete('/upload', requireRole(['admin', 'hr']), brandingController.deleteImage);

module.exports = router;
