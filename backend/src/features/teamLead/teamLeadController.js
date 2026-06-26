const { pool } = require('../../config/db');
const {
  provisionTLModules,
  revokeTLModules,
  logTLAction,
  wouldCreateCircle,
  isSelfReport,
  checkPendingWorkForTL,
  canManageTeamLeads,
  scheduleTeamLeadChange,
} = require('./teamLeadSchema');
const { sendToMany } = require('../notifications/notificationHelper');

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/team-leads
   List all users with is_team_lead=1 in this tenant.
   Soft-delete filtering: excludes inactive/resigned/deleted/suspended employees.
   ───────────────────────────────────────────────────────────────────────── */
const listTeamLeads = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.position, u.is_team_lead,
              u.profile_photo,
              ed.position AS designation, ed.department_id, ed.status AS emp_status,
              d.name AS department_name,
              COUNT(DISTINCT sub.id) AS direct_reports
       FROM users u
       LEFT JOIN employee_details ed
              ON ed.employee_id = u.id AND ed.tenant_id = u.tenant_id
       LEFT JOIN departments d ON d.id = ed.department_id
       LEFT JOIN employee_details sub
              ON sub.reports_to_user_id = u.id AND sub.tenant_id = u.tenant_id
              AND LOWER(COALESCE(sub.status,'active')) NOT IN ('inactive','resigned','deleted','suspended')
       WHERE u.tenant_id = ?
         AND u.is_team_lead = 1
         AND u.is_active = 1
         AND LOWER(COALESCE(ed.status,'active')) NOT IN ('inactive','resigned','deleted','suspended')
       GROUP BY u.id
       ORDER BY u.first_name ASC`,
      [req.tenantId]
    );
    return res.json({ success: true, team_leads: rows });
  } catch (err) {
    console.error('[listTeamLeads]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PUT /api/team-leads/:userId/status
   Promote or demote a user as team lead.
   Body: { is_team_lead: boolean, force?: boolean }

   Hardening applied:
   ① Authorization: Admin always; HR only if manage_team_leads permission
   ② Demotion validation: blocks if pending leaves / WFH / expenses / attendance
      unless force=true is supplied
   ③ Transaction: entire change wrapped in a single DB transaction
   ④ Soft-delete: target user must be active and not resigned/deleted
   ───────────────────────────────────────────────────────────────────────── */
const setTeamLeadStatus = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // ① Authorization
    const authCheck = await canManageTeamLeads(req.user, req.tenantId);
    if (!authCheck.allowed) {
      conn.release();
      return res.status(403).json({ success: false, message: authCheck.reason });
    }

    const { userId } = req.params;
    const { is_team_lead, force = false } = req.body;

    if (typeof is_team_lead !== 'boolean' && is_team_lead !== 0 && is_team_lead !== 1) {
      conn.release();
      return res.status(400).json({ success: false, message: 'is_team_lead must be true or false' });
    }

    const newFlag = is_team_lead ? 1 : 0;

    // Fetch target user (with soft-delete exclusion)
    const [userRows] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.position, u.is_team_lead,
              u.tenant_id, u.is_active,
              LOWER(COALESCE(ed.status,'active')) AS emp_status
       FROM users u
       LEFT JOIN employee_details ed ON ed.employee_id = u.id AND ed.tenant_id = u.tenant_id
       WHERE u.id = ? AND u.tenant_id = ?`,
      [userId, req.tenantId]
    );

    if (!userRows.length) {
      conn.release();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const target = userRows[0];

    // ④ Soft-delete guard
    if (!target.is_active || ['inactive','resigned','deleted','suspended'].includes(target.emp_status)) {
      conn.release();
      return res.status(400).json({
        success: false,
        message: `Cannot change Team Lead status of ${target.emp_status || 'inactive'} user.`,
      });
    }

    const prevFlag = target.is_team_lead ? 1 : 0;
    if (prevFlag === newFlag) {
      conn.release();
      return res.json({ success: true, message: 'No change needed', is_team_lead: !!newFlag });
    }

    // ② Demotion pending-work validation
    if (newFlag === 0) {
      const pendingWork = await checkPendingWorkForTL(req.tenantId, Number(userId));
      if (pendingWork.has_blockers && !force) {
        conn.release();
        return res.status(409).json({
          success: false,
          message: `Cannot remove Team Lead status: ${target.first_name} ${target.last_name} has pending work that must be resolved first.`,
          pending: {
            leaves: pendingWork.leaves,
            wfh: pendingWork.wfh,
            expenses: pendingWork.expenses,
            attendance: pendingWork.attendance,
            total_blockers: pendingWork.total_blockers,
          },
          hint: 'Resolve the pending items first, or pass force=true to forcibly demote and let HR manually reassign.',
        });
      }
    }

    // ③ Begin transaction
    await conn.beginTransaction();

    // Update is_team_lead
    await conn.execute(
      `UPDATE users SET is_team_lead = ? WHERE id = ? AND tenant_id = ?`,
      [newFlag, userId, req.tenantId]
    );

    let affectedReports = 0;

    if (newFlag === 1) {
      // Promotion: provision TL modules
      await provisionTLModules(conn, req.tenantId, Number(userId), req.user.id);
      await logTLAction(conn, req.tenantId, req.user.id, Number(userId),
        'promoted', '0', '1', 0,
        `Promoted to Team Lead by user#${req.user.id}`
      );
    } else {
      // Demotion: revoke TL modules
      await revokeTLModules(conn, req.tenantId, Number(userId));

      // Clear reports_to_user_id for direct reports — HR must reassign
      const [reassignResult] = await conn.execute(
        `UPDATE employee_details
         SET reports_to_user_id = NULL, team_lead_id = NULL
         WHERE COALESCE(reports_to_user_id, team_lead_id) = ? AND tenant_id = ?`,
        [userId, req.tenantId]
      );
      affectedReports = reassignResult.affectedRows || 0;

      await logTLAction(conn, req.tenantId, req.user.id, Number(userId),
        'demoted', '1', '0', affectedReports,
        `Demoted from Team Lead by user#${req.user.id}. ${affectedReports} direct report(s) now have no TL.`
      );
    }

    await conn.commit();

    // Notifications (best-effort, outside transaction)
    try {
      const action = newFlag === 1 ? 'promoted to' : 'removed from';
      const [hrAdminRows] = await pool.execute(
        `SELECT id FROM users WHERE tenant_id = ? AND position IN ('admin','hr') AND is_active = 1`,
        [req.tenantId]
      );
      const allRecipients = [...new Set([
        ...hrAdminRows.map(r => r.id),
        Number(userId),
      ])].filter(id => id !== req.user.id);

      if (allRecipients.length) {
        await sendToMany(req.tenantId, allRecipients, {
          title: 'Team Lead Status Changed',
          message: `${target.first_name} ${target.last_name} has been ${action} Team Lead role.`,
          type: 'general',
        });
      }
    } catch (_) {}

    return res.json({
      success: true,
      message: newFlag === 1
        ? `${target.first_name} ${target.last_name} is now a Team Lead`
        : `${target.first_name} ${target.last_name} is no longer a Team Lead${affectedReports > 0 ? `. ${affectedReports} employee(s) need a new Team Lead assignment.` : ''}`,
      is_team_lead: !!newFlag,
      affected_reports: affectedReports,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('[setTeamLeadStatus]', err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PUT /api/team-leads/employee/:employeeUserId/assign
   Assign a TL to an employee.
   Body: { team_lead_user_id: number }

   Hardening applied:
   ① Self-reporting prevention: employee cannot report to themselves
   ② Circular reporting prevention: graph traversal before accepting
   ③ TL must be active and non-resigned
   ④ Transaction: update + audit in one transaction
   ───────────────────────────────────────────────────────────────────────── */
const assignTeamLead = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { employeeUserId } = req.params;
    const { team_lead_user_id } = req.body;

    if (!team_lead_user_id) {
      conn.release();
      return res.status(400).json({ success: false, message: 'team_lead_user_id is required' });
    }

    const empId = Number(employeeUserId);
    const tlId  = Number(team_lead_user_id);

    // ① Self-reporting prevention
    if (isSelfReport(empId, tlId)) {
      conn.release();
      return res.status(400).json({ success: false, message: 'An employee cannot report to themselves.' });
    }

    // Validate new TL: is_team_lead=1, active, and not soft-deleted
    const [tlRows] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name,
              LOWER(COALESCE(ed.status,'active')) AS emp_status
       FROM users u
       LEFT JOIN employee_details ed ON ed.employee_id = u.id AND ed.tenant_id = u.tenant_id
       WHERE u.id = ? AND u.tenant_id = ? AND u.is_team_lead = 1 AND u.is_active = 1`,
      [tlId, req.tenantId]
    );

    if (!tlRows.length) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Specified user is not an active Team Lead' });
    }

    // ③ Soft-delete guard on new TL
    if (['inactive','resigned','deleted','suspended'].includes(tlRows[0].emp_status)) {
      conn.release();
      return res.status(400).json({
        success: false,
        message: `Cannot assign ${tlRows[0].first_name} ${tlRows[0].last_name} as Team Lead — their employment status is "${tlRows[0].emp_status}".`,
      });
    }

    // ② Circular reporting detection (iterative BFS)
    const hasCycle = await wouldCreateCircle(req.tenantId, empId, tlId);
    if (hasCycle) {
      conn.release();
      return res.status(400).json({
        success: false,
        message: 'Circular reporting detected. This assignment would create a reporting loop (e.g. A → B → C → A). Please review the hierarchy before reassigning.',
      });
    }

    // Fetch current state for audit
    const [empRows] = await pool.execute(
      `SELECT ed.id, ed.reports_to_user_id, ed.team_lead_id,
              u.first_name, u.last_name
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id
       WHERE ed.employee_id = ? AND ed.tenant_id = ?`,
      [empId, req.tenantId]
    );
    if (!empRows.length) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const emp = empRows[0];
    const oldTlId = emp.reports_to_user_id || emp.team_lead_id;
    const newTl   = tlRows[0];

    // ④ Transaction: update + audit
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE employee_details
       SET reports_to_user_id = ?, team_lead_id = ?
       WHERE employee_id = ? AND tenant_id = ?`,
      [tlId, tlId, empId, req.tenantId]
    );

    await logTLAction(conn, req.tenantId, req.user.id, empId,
      'reports_to_changed', String(oldTlId ?? 'none'), String(tlId), 0,
      `Reports-to changed from user#${oldTlId} to user#${tlId}`
    );

    await conn.commit();

    // Notifications
    try {
      const [hrAdminRows] = await pool.execute(
        `SELECT id FROM users WHERE tenant_id = ? AND position IN ('admin','hr') AND is_active = 1`,
        [req.tenantId]
      );
      const recipients = [...new Set([
        ...hrAdminRows.map(r => r.id),
        tlId,
        ...(oldTlId ? [oldTlId] : []),
      ])].filter(id => id !== req.user.id);

      if (recipients.length) {
        await sendToMany(req.tenantId, recipients, {
          title: 'Team Lead Reassigned',
          message: `${emp.first_name} ${emp.last_name} now reports to ${newTl.first_name} ${newTl.last_name}.`,
          type: 'general',
        });
      }
    } catch (_) {}

    return res.json({
      success: true,
      message: `${emp.first_name} ${emp.last_name} now reports to ${newTl.first_name} ${newTl.last_name}`,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('[assignTeamLead]', err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/team-leads/audit
   TL change audit log (Admin/HR only)
   ───────────────────────────────────────────────────────────────────────── */
const getAuditLog = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 200, 500);
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await pool.execute(
      `SELECT tal.*,
              CONCAT(actor.first_name, ' ', actor.last_name)   AS actor_name,
              CONCAT(target.first_name, ' ', target.last_name) AS target_name,
              target.position AS target_position
       FROM tl_audit_log tal
       JOIN users actor  ON actor.id  = tal.actor_id
       JOIN users target ON target.id = tal.target_user_id
       WHERE tal.tenant_id = ?
       ORDER BY tal.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.tenantId, limit, offset]
    );
    return res.json({ success: true, audit: rows, limit, offset });
  } catch (err) {
    console.error('[getAuditLog]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/team-leads/:userId/pending-work
   Preview pending work before attempting demotion — call this to decide
   whether to show a warning or block demotion in the UI.
   ───────────────────────────────────────────────────────────────────────── */
const getPendingWork = async (req, res) => {
  try {
    const authCheck = await canManageTeamLeads(req.user, req.tenantId);
    if (!authCheck.allowed) {
      return res.status(403).json({ success: false, message: authCheck.reason });
    }
    const pending = await checkPendingWorkForTL(req.tenantId, Number(req.params.userId));
    return res.json({ success: true, pending });
  } catch (err) {
    console.error('[getPendingWork]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/team-leads/schedule
   Schedule a future TL status change (effective dating).
   Body: {
     target_user_id:   number,
     change_type:      'promote' | 'demote' | 'reassign_reports_to',
     new_team_lead_id: number  (required for reassign_reports_to),
     employee_user_id: number  (required for reassign_reports_to),
     effective_from:   'YYYY-MM-DD',
     notes:            string (optional)
   }
   ───────────────────────────────────────────────────────────────────────── */
const scheduleChange = async (req, res) => {
  try {
    const authCheck = await canManageTeamLeads(req.user, req.tenantId);
    if (!authCheck.allowed) {
      return res.status(403).json({ success: false, message: authCheck.reason });
    }

    const { target_user_id, change_type, new_team_lead_id, employee_user_id, effective_from, notes } = req.body;

    if (!target_user_id || !change_type || !effective_from) {
      return res.status(400).json({
        success: false,
        message: 'target_user_id, change_type, and effective_from are required',
      });
    }

    const validTypes = ['promote', 'demote', 'reassign_reports_to'];
    if (!validTypes.includes(change_type)) {
      return res.status(400).json({ success: false, message: `change_type must be one of: ${validTypes.join(', ')}` });
    }

    if (change_type === 'reassign_reports_to' && (!new_team_lead_id || !employee_user_id)) {
      return res.status(400).json({
        success: false,
        message: 'reassign_reports_to requires new_team_lead_id and employee_user_id',
      });
    }

    // effective_from must be in the future
    const effectiveDate = new Date(effective_from);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (effectiveDate <= today) {
      return res.status(400).json({
        success: false,
        message: 'effective_from must be a future date. To apply immediately, use the status endpoint.',
      });
    }

    // Circular check for scheduled reassignments
    if (change_type === 'reassign_reports_to' && employee_user_id && new_team_lead_id) {
      if (isSelfReport(employee_user_id, new_team_lead_id)) {
        return res.status(400).json({ success: false, message: 'An employee cannot report to themselves.' });
      }
      const hasCycle = await wouldCreateCircle(req.tenantId, Number(employee_user_id), Number(new_team_lead_id));
      if (hasCycle) {
        return res.status(400).json({
          success: false,
          message: 'Circular reporting detected. This scheduled change would create a reporting loop.',
        });
      }
    }

    const scheduleId = await scheduleTeamLeadChange(req.tenantId, req.user.id, {
      target_user_id:   Number(target_user_id),
      change_type,
      new_team_lead_id: new_team_lead_id ? Number(new_team_lead_id) : null,
      employee_user_id: employee_user_id ? Number(employee_user_id) : null,
      effective_from,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: `Change scheduled for ${effective_from}`,
      schedule_id: scheduleId,
    });
  } catch (err) {
    console.error('[scheduleChange]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/team-leads/scheduled
   List pending scheduled TL changes for this tenant.
   ───────────────────────────────────────────────────────────────────────── */
const listScheduled = async (req, res) => {
  try {
    const authCheck = await canManageTeamLeads(req.user, req.tenantId);
    if (!authCheck.allowed) {
      return res.status(403).json({ success: false, message: authCheck.reason });
    }

    const [rows] = await pool.execute(
      `SELECT sc.*,
              CONCAT(actor.first_name, ' ', actor.last_name)   AS actor_name,
              CONCAT(target.first_name, ' ', target.last_name) AS target_name,
              CONCAT(tl.first_name,  ' ', tl.last_name)        AS new_tl_name,
              CONCAT(emp.first_name, ' ', emp.last_name)        AS employee_name
       FROM tl_scheduled_changes sc
       JOIN users actor  ON actor.id  = sc.actor_id
       JOIN users target ON target.id = sc.target_user_id
       LEFT JOIN users tl  ON tl.id  = sc.new_team_lead_id
       LEFT JOIN users emp ON emp.id = sc.employee_user_id
       WHERE sc.tenant_id = ?
         AND sc.applied_at IS NULL
         AND sc.cancelled_at IS NULL
       ORDER BY sc.effective_from ASC`,
      [req.tenantId]
    );

    return res.json({ success: true, scheduled: rows });
  } catch (err) {
    console.error('[listScheduled]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   DELETE /api/team-leads/scheduled/:scheduleId
   Cancel a pending scheduled change.
   ───────────────────────────────────────────────────────────────────────── */
const cancelScheduled = async (req, res) => {
  try {
    const authCheck = await canManageTeamLeads(req.user, req.tenantId);
    if (!authCheck.allowed) {
      return res.status(403).json({ success: false, message: authCheck.reason });
    }

    const [result] = await pool.execute(
      `UPDATE tl_scheduled_changes
       SET cancelled_at = NOW(), cancelled_by = ?
       WHERE id = ? AND tenant_id = ? AND applied_at IS NULL AND cancelled_at IS NULL`,
      [req.user.id, req.params.scheduleId, req.tenantId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled change not found or already applied/cancelled.',
      });
    }

    await pool.execute(
      `INSERT INTO tl_audit_log (tenant_id, actor_id, target_user_id, action, notes)
       SELECT tenant_id, ?, target_user_id, 'scheduled_cancelled', CONCAT('Cancelled scheduled change #', id)
       FROM tl_scheduled_changes WHERE id = ?`,
      [req.user.id, req.params.scheduleId]
    ).catch(() => {});

    return res.json({ success: true, message: 'Scheduled change cancelled.' });
  } catch (err) {
    console.error('[cancelScheduled]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/team-leads/grant-hr-permission
   Admin grants/revokes HR user's "manage_team_leads" permission.
   Body: { hr_user_id: number, grant: boolean }
   ───────────────────────────────────────────────────────────────────────── */
const grantHrManageTlPermission = async (req, res) => {
  try {
    if (req.user.position !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only Admin can grant manage_team_leads permission.' });
    }

    const { hr_user_id, grant = true } = req.body;
    if (!hr_user_id) {
      return res.status(400).json({ success: false, message: 'hr_user_id is required' });
    }

    const [hrRows] = await pool.execute(
      `SELECT id, first_name, last_name FROM users WHERE id = ? AND tenant_id = ? AND position = 'hr'`,
      [hr_user_id, req.tenantId]
    );
    if (!hrRows.length) {
      return res.status(404).json({ success: false, message: 'HR user not found in this tenant.' });
    }

    if (grant) {
      await pool.execute(
        `INSERT INTO user_module_access (user_id, tenant_id, module_key, access_level, extra_permissions, updated_by)
         VALUES (?, ?, 'employee_management', 'write', JSON_OBJECT('manage_team_leads', TRUE), ?)
         ON DUPLICATE KEY UPDATE
           access_level = 'write',
           extra_permissions = JSON_SET(COALESCE(extra_permissions, '{}'), '$.manage_team_leads', TRUE),
           updated_by = VALUES(updated_by)`,
        [hr_user_id, req.tenantId, req.user.id]
      );
    } else {
      await pool.execute(
        `UPDATE user_module_access
         SET extra_permissions = JSON_REMOVE(COALESCE(extra_permissions, '{}'), '$.manage_team_leads'),
             updated_by = ?
         WHERE user_id = ? AND tenant_id = ? AND module_key = 'employee_management'`,
        [req.user.id, hr_user_id, req.tenantId]
      );
    }

    const hrUser = hrRows[0];
    return res.json({
      success: true,
      message: grant
        ? `${hrUser.first_name} ${hrUser.last_name} can now manage Team Lead status.`
        : `${hrUser.first_name} ${hrUser.last_name} can no longer manage Team Lead status.`,
    });
  } catch (err) {
    console.error('[grantHrManageTlPermission]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listTeamLeads,
  setTeamLeadStatus,
  assignTeamLead,
  getAuditLog,
  getPendingWork,
  scheduleChange,
  listScheduled,
  cancelScheduled,
  grantHrManageTlPermission,
};
