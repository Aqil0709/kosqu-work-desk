const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const ctrl = require('./approvalController');
const { ensureApprovalSchema } = require('./approvalSchema');

router.use(auth.verifyToken);

/* ── Template management (Admin only) ─────────────────────────────────── */
router.get('/templates',         requireModuleAccess('employee_management', 'read'),  ctrl.listTemplates);
router.get('/templates/:id',     requireModuleAccess('employee_management', 'read'),  ctrl.getTemplate);
router.post('/templates',        requireModuleAccess('employee_management', 'write'), ctrl.createTemplate);
router.put('/templates/:id',     requireModuleAccess('employee_management', 'write'), ctrl.updateTemplate);
router.delete('/templates/:id',  requireModuleAccess('employee_management', 'write'), ctrl.deleteTemplate);

/* ── My pending approvals (any authenticated user) ────────────────────── */
router.get('/pending',       ctrl.getPendingApprovals);

/* ── My submitted requests ────────────────────────────────────────────── */
router.get('/my-requests',   ctrl.getMyRequests);

/* ── All requests (HR/Admin) ──────────────────────────────────────────── */
router.get('/all',           requireModuleAccess('employee_management', 'read'), ctrl.getAllRequests);

/* ── Analytics ────────────────────────────────────────────────────────── */
router.get('/analytics',     requireModuleAccess('employee_management', 'read'), ctrl.getAnalytics);

/* ── Delegations ──────────────────────────────────────────────────────── */
router.get('/delegations',    ctrl.listDelegations);
router.post('/delegations',   ctrl.createDelegation);
router.delete('/delegations/:id', ctrl.deleteDelegation);

/* ── Per-request routes ───────────────────────────────────────────────── */
router.get('/:id/timeline',     ctrl.getTimeline);
router.post('/:id/action',      ctrl.takeAction);
router.post('/:id/override',    ctrl.adminOverride);
router.post('/:id/withdraw',    ctrl.withdraw);
router.post('/:id/comments',    ctrl.addComment);
router.post('/:id/attachments', ctrl.uploadAttachmentHandler);

module.exports = router;
module.exports.ensureSchema = ensureApprovalSchema;
