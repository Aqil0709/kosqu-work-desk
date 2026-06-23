const express = require('express');
const router = express.Router();
const serviceController = require('./serviceController');
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

router.use(verifyToken);
router.use(requireModuleAccess('service_management', 'read'));

// GET /api/services
router.get('/', serviceController.getAllServices);

// GET /api/services/types
router.get('/types', serviceController.getServiceTypes);

// GET /api/services/status
router.get('/status', serviceController.getStatusTypes);

// GET /api/services/:id
router.get('/:id', serviceController.getServiceById);

// POST /api/services
router.post('/', requireModuleAccess('service_management', 'write'), serviceController.createService);

// PUT /api/services/:id
router.put('/:id', requireModuleAccess('service_management', 'write'), serviceController.updateService);

// DELETE /api/services/:id
router.delete('/:id', requireModuleAccess('service_management', 'write'), serviceController.deleteService);

// POST /api/services/:id/assign
router.post('/:id/assign', requireModuleAccess('service_management', 'write'), serviceController.assignTeam);

module.exports = router;
