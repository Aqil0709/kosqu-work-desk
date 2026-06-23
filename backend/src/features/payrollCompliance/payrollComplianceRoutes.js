const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const ctrl = require('./payrollComplianceController');

router.use(authMiddleware.verifyToken);

// Employee self-service — investment declarations
router.get('/declaration/my', ctrl.getMyDeclaration);
router.post('/declaration/my', ctrl.saveMyDeclaration);

// Admin / HR routes
router.get('/settings', requireModuleAccess('salary_management', 'read'), ctrl.getSettings);
router.post('/settings', requireModuleAccess('salary_management', 'write'), ctrl.saveSettings);

router.get('/declarations', requireModuleAccess('salary_management', 'read'), ctrl.getAllDeclarations);
router.put('/declarations/:id/approve', requireModuleAccess('salary_management', 'write'), ctrl.approveDeclaration);

router.post('/tds/compute', requireModuleAccess('salary_management', 'write'), ctrl.computeTDS);

router.get('/form16/:employee_id/:financial_year', requireModuleAccess('salary_management', 'read'), ctrl.generateForm16);

router.get('/pf-ecr', requireModuleAccess('salary_management', 'read'), ctrl.getPFECR);
router.get('/esic', requireModuleAccess('salary_management', 'read'), ctrl.getESICReport);
router.get('/pt', requireModuleAccess('salary_management', 'read'), ctrl.getPTReport);
router.get('/form24q', requireModuleAccess('salary_management', 'read'), ctrl.getForm24QData);

router.post('/process-monthly', requireModuleAccess('salary_management', 'write'), ctrl.processMonthlyCompliance);

module.exports = router;
