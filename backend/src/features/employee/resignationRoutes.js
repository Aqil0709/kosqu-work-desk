// routes/resignationRoutes.js
const express = require('express');
const router = express.Router();
const resignationController = require('./resignationController');
const authMiddleware = require('../../middleware/auth.middleware');
const tenantMiddleware = require('../../middleware/tenantMiddleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

// All routes require auth + tenant context
router.use(authMiddleware.verifyToken);
router.use(tenantMiddleware.extractTenantId);

// ── Employee routes ──────────────────────────────────────────────
// Employee submits resignation (with optional attachment)
router.post('/', resignationController.uploadAttachmentMiddleware, resignationController.submitRequest);

// Employee views own requests
router.get('/my', resignationController.getMyRequests);

// Employee withdraws own pending request
router.put('/:id/withdraw', resignationController.withdrawRequest);

// ── HR/Admin stats ───────────────────────────────────────────────
router.get('/stats/pending-count', requireModuleAccess('resignations', 'read'), resignationController.getPendingCount);

// ── HR/Admin management routes ───────────────────────────────────
router.get('/', requireModuleAccess('resignations', 'read'), resignationController.getAllRequests);
router.get('/:id', requireModuleAccess('resignations', 'read'), resignationController.getRequestById);

router.put('/:id/under-review', requireModuleAccess('resignations', 'write'), resignationController.markUnderReview);

// Approve: requires PDF upload
router.put('/:id/approve', requireModuleAccess('resignations', 'write'), resignationController.uploadPDFMiddleware, resignationController.approveRequest);

// Legacy accept route (kept for backward compatibility with existing HR frontend)
router.put('/:id/accept', requireModuleAccess('resignations', 'write'), resignationController.uploadPDFMiddleware, resignationController.approveRequest);

router.put('/:id/reject', requireModuleAccess('resignations', 'write'), resignationController.rejectRequest);

router.put('/:id/override-lwd', requireModuleAccess('resignations', 'write'), resignationController.overrideLWD);

module.exports = router;
