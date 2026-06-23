// backend/routes/deliveryRoutes.js
const express = require('express');
const deliveryController = require('../controllers/deliveryController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY ROUTES ====================
// All delivery management requires admin role

// GET /api/delivery/challans - Get all delivery challans (ADMIN ONLY)
router.get('/challans', authMiddleware.requireAdmin, deliveryController.getAllChallans);

// GET /api/delivery/challans/:id - Get specific delivery challan (ADMIN ONLY)
router.get('/challans/:id', authMiddleware.requireAdmin, deliveryController.getChallan);

// POST /api/delivery/challans - Create new delivery challan (ADMIN ONLY)
router.post('/challans', authMiddleware.requireAdmin, deliveryController.createChallan);

// PUT /api/delivery/challans/:id - Update delivery challan (ADMIN ONLY)
router.put('/challans/:id', authMiddleware.requireAdmin, deliveryController.updateChallan);

// DELETE /api/delivery/challans/:id - Delete delivery challan (ADMIN ONLY)
router.delete('/challans/:id', authMiddleware.requireAdmin, deliveryController.deleteChallan);

// POST /api/delivery/challans/:id/follow-up - Add follow-up note (ADMIN ONLY)
router.post('/challans/:id/follow-up', authMiddleware.requireAdmin, deliveryController.addFollowUp);

// GET /api/delivery/challans/:id/download - Download delivery challan as PDF (ADMIN ONLY)
router.get('/challans/:id/download', authMiddleware.requireAdmin, deliveryController.downloadChallanPDF);

module.exports = router;