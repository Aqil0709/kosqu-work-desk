const express = require('express');
const router = express.Router();
const projectController = require('./projectController');
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

router.use(verifyToken);

router.get('/my', projectController.getMyProjects);
router.get('/my-tasks', projectController.getMyTasks);

router.use(requireModuleAccess('service_management', 'read'));

router.get('/stats', projectController.getProjectStats);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', requireModuleAccess('service_management', 'write'), projectController.createProject);
router.put('/:id', requireModuleAccess('service_management', 'write'), projectController.updateProject);
router.delete('/:id', requireModuleAccess('service_management', 'write'), projectController.deleteProject);

module.exports = router;
