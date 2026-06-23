const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const leadController = require('./leadController');

router.use(authMiddleware.verifyToken);

// Employee routes
router.get('/my', leadController.getMyLeads);
router.post('/', leadController.createLead);
router.put('/my/:id', leadController.updateMyLead);

// Admin / HR routes
router.get('/', requireModuleAccess('lead_management', 'read'), leadController.getAllLeads);
router.put('/:id/status', requireModuleAccess('lead_management', 'write'), leadController.updateLeadStatus);

module.exports = router;
