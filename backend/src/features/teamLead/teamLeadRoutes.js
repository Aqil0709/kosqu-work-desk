const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const ctrl = require('./teamLeadController');

router.use(authMiddleware.verifyToken);

// ── Read-only / listing ────────────────────────────────────────────────────

// GET /api/team-leads — list all active TLs (used by employee form dropdown)
router.get('/', ctrl.listTeamLeads);

// GET /api/team-leads/audit — TL change audit log (HR/Admin)
router.get('/audit',
  requireModuleAccess('employee_management', 'read'),
  ctrl.getAuditLog
);

// GET /api/team-leads/scheduled — pending scheduled changes
router.get('/scheduled',
  requireModuleAccess('employee_management', 'read'),
  ctrl.listScheduled
);

// GET /api/team-leads/:userId/pending-work — check pending work before demoting
router.get('/:userId/pending-work',
  requireModuleAccess('employee_management', 'read'),
  ctrl.getPendingWork
);

// ── Mutations ──────────────────────────────────────────────────────────────

// PUT /api/team-leads/:userId/status — promote / demote TL status
// Authorization is re-validated inside the controller (Admin always; HR only if granted)
router.put('/:userId/status',
  requireModuleAccess('employee_management', 'write'),
  ctrl.setTeamLeadStatus
);

// PUT /api/team-leads/employee/:employeeUserId/assign — assign a TL to an employee
router.put('/employee/:employeeUserId/assign',
  requireModuleAccess('employee_management', 'write'),
  ctrl.assignTeamLead
);

// POST /api/team-leads/schedule — schedule a future TL change (effective dating)
router.post('/schedule',
  requireModuleAccess('employee_management', 'write'),
  ctrl.scheduleChange
);

// DELETE /api/team-leads/scheduled/:scheduleId — cancel a pending scheduled change
router.delete('/scheduled/:scheduleId',
  requireModuleAccess('employee_management', 'write'),
  ctrl.cancelScheduled
);

// POST /api/team-leads/grant-hr-permission — Admin grants HR manage_team_leads
router.post('/grant-hr-permission',
  requireModuleAccess('employee_management', 'write'),
  ctrl.grantHrManageTlPermission
);

module.exports = router;
