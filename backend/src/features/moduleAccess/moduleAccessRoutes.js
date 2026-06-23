const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/requireAdmin');
const moduleAccessController = require('./moduleAccessController');
const moduleAccessModel = require('./moduleAccessModel');

router.use(verifyToken);

router.get('/my-modules', moduleAccessController.getMyModules);

router.get('/users', requireAdmin.strict, moduleAccessController.listUsers);
router.get('/users/:userId', requireAdmin.strict, moduleAccessController.getUserAccess);
router.put('/users/:userId', requireAdmin.strict, moduleAccessController.updateUserAccess);
// Bulk assign module defaults to all users of a given role
router.post('/role-defaults', requireAdmin.strict, moduleAccessController.assignRoleDefaults);

module.exports = router;
module.exports.ensureSchema = () => moduleAccessModel.ensureSchema();
