/**
 * HR Settings — Attendance Policy Configuration
 * GET  /api/attendance-policy       — current tenant's late-arrival/payroll thresholds
 * PUT  /api/attendance-policy       — update (admin/HR only)
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { getPolicySettings, savePolicySettings } = require('./attendancePolicySettings');
const { writeAuditLog } = require('../auditLog/auditLogRoutes');

router.use(verifyToken);

router.get('/', requireModuleAccess('attendance_management', 'read'), async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const settings = await getPolicySettings(tenantId);
    return res.json({ success: true, settings });
  } catch (err) {
    console.error('[attendance-policy get]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/', requireModuleAccess('attendance_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const pos = (req.user.position || '').toLowerCase();
    if (!['admin', 'hr'].includes(pos)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access required' });
    }

    const settings = await savePolicySettings(tenantId, req.body, req.user.id);

    await writeAuditLog({
      tenantId, userId: req.user.id, action: 'ATTENDANCE_POLICY_UPDATED',
      entityType: 'attendance_policy_settings', entityId: tenantId,
      description: `Late-arrival warning=${settings.late_arrival_warning_threshold}, block=${settings.late_arrival_block_threshold}, working_days=${settings.working_days_per_month}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, settings });
  } catch (err) {
    if (err.message && /must be/.test(err.message)) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('[attendance-policy put]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
