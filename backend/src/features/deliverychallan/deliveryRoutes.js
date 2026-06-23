// backend/routes/deliveryRoutes.js
const express = require('express');
const deliveryController = require('./deliveryController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);
router.use(requireModuleAccess('delivery_management', 'read'));

// GET /api/delivery/challans - Get all delivery challans
router.get('/challans', deliveryController.getAllChallans);

// GET /api/delivery/challans/:id - Get specific delivery challan
router.get('/challans/:id', deliveryController.getChallan);

// POST /api/delivery/challans - Create new delivery challan
router.post('/challans', requireModuleAccess('delivery_management', 'write'), deliveryController.createChallan);

// PUT /api/delivery/challans/:id - Update delivery challan
router.put('/challans/:id', requireModuleAccess('delivery_management', 'write'), deliveryController.updateChallan);

// DELETE /api/delivery/challans/:id - Delete delivery challan
router.delete('/challans/:id', requireModuleAccess('delivery_management', 'write'), deliveryController.deleteChallan);

// POST /api/delivery/challans/:id/follow-up - Add follow-up note
router.post('/challans/:id/follow-up', requireModuleAccess('delivery_management', 'write'), deliveryController.addFollowUp);

// GET /api/delivery/challans/:id/download - Download delivery challan as PDF
router.get('/challans/:id/download', deliveryController.downloadChallanPDF);

module.exports = router;
