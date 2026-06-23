// backend/routes/quotationRoutes.js
const express = require('express');
const quotationController = require('./quotationController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);
router.use(requireModuleAccess('quotation_management', 'read'));

// GET /api/quotations - Get all quotations
router.get('/', quotationController.getAllQuotations);

// GET /api/quotations/:id - Get specific quotation
router.get('/:id', quotationController.getQuotation);

// POST /api/quotations - Create new quotation
router.post('/', requireModuleAccess('quotation_management', 'write'), quotationController.createQuotation);

// PUT /api/quotations/:id - Update quotation
router.put('/:id', requireModuleAccess('quotation_management', 'write'), quotationController.updateQuotation);

// DELETE /api/quotations/:id - Delete quotation
router.delete('/:id', requireModuleAccess('quotation_management', 'write'), quotationController.deleteQuotation);

// PUT /api/quotations/:id/status - Update quotation status
router.put('/:id/status', requireModuleAccess('quotation_management', 'write'), quotationController.updateQuotationStatus);

// POST /api/quotations/:id/follow-up - Add follow-up note
router.post('/:id/follow-up', requireModuleAccess('quotation_management', 'write'), quotationController.addFollowUp);

module.exports = router;
