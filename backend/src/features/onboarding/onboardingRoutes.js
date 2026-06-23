const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const c = require('./onboardingController');

router.use(auth.verifyToken);

// ── Admin / HR routes ────────────────────────────────────────────────────────
router.get('/stats', requireModuleAccess('onboarding', 'read'), c.getStats);

router.get('/templates', requireModuleAccess('onboarding', 'read'), c.listTemplates);
router.get('/templates/:id', requireModuleAccess('onboarding', 'read'), c.getTemplate);
router.post('/templates', requireModuleAccess('onboarding', 'write'), c.createTemplate);
router.put('/templates/:id', requireModuleAccess('onboarding', 'write'), c.updateTemplate);
router.delete('/templates/:id', requireModuleAccess('onboarding', 'write'), c.deleteTemplate);

router.get('/processes', requireModuleAccess('onboarding', 'read'), c.listProcesses);
router.get('/processes/:id', requireModuleAccess('onboarding', 'read'), c.getProcess);
router.post('/processes', requireModuleAccess('onboarding', 'write'), c.createProcess);
router.put('/processes/:id', requireModuleAccess('onboarding', 'write'), c.updateProcess);

router.post('/tasks', requireModuleAccess('onboarding', 'write'), c.addTask);
router.put('/tasks/:id', requireModuleAccess('onboarding', 'write'), c.updateTask);

// ── Employee self-service routes ─────────────────────────────────────────────
router.get('/my-process', c.getMyProcess);
router.put('/my-tasks/:id/complete', c.completeMyTask);

module.exports = router;
