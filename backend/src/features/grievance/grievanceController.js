const { pool } = require('../../config/db');
const { sendNotification, getHRAndAdmins } = require('../notifications/notificationHelper');

function generateTicketNo() {
  const prefix = 'GRV';
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${ts}-${rand}`;
}

function getSLADays(category, priority) {
  if (category === 'posh') return 90;
  if (priority === 'critical') return 3;
  if (priority === 'high') return 7;
  if (priority === 'medium') return 14;
  return 30;
}

// ── Submit Grievance (employee or anonymous) ─────────────────────────────────

async function submitGrievance(req, res) {
  try {
    const {
      category, subject, description, incident_date,
      accused_name, accused_employee_id, witnesses,
      priority, is_anonymous, is_posh
    } = req.body;

    const ticketNo = generateTicketNo();
    const complainantId = is_anonymous ? null : req.user.id;
    const isPosh = is_posh || category === 'posh' ? 1 : 0;
    const slaDays = getSLADays(category, priority || 'medium');
    const slaDate = new Date();
    slaDate.setDate(slaDate.getDate() + slaDays);

    const [r] = await pool.execute(
      `INSERT INTO grievances
        (tenant_id, ticket_no, complainant_id, is_anonymous, category, subject, description,
         incident_date, accused_name, accused_employee_id, witnesses,
         priority, status, sla_due_date, is_posh)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.tenantId, ticketNo, complainantId, is_anonymous ? 1 : 0,
        category || 'other', subject, description,
        incident_date || null, accused_name || null, accused_employee_id || null,
        witnesses || null, priority || 'medium', 'open',
        slaDate.toISOString().slice(0, 10), isPosh
      ]
    );

    // Notify HR/admins
    const hrs = await getHRAndAdmins(req.tenantId);
    for (const hr of hrs) {
      await sendNotification(req.tenantId, hr.id, {
        title: isPosh ? '⚠️ POSH Complaint Filed' : 'New Grievance Filed',
        message: `${isPosh ? 'POSH' : 'Grievance'} [${ticketNo}]: ${subject}`,
        type: 'grievance',
        related_id: r.insertId
      });
    }

    res.status(201).json({ success: true, id: r.insertId, ticket_no: ticketNo });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Employee: my grievances ───────────────────────────────────────────────────

async function getMyGrievances(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT g.*, CONCAT(u.first_name,' ',u.last_name) AS assigned_to_name
       FROM grievances g
       LEFT JOIN users u ON u.id=g.assigned_to
       WHERE g.complainant_id=? AND g.tenant_id=?
       ORDER BY g.created_at DESC`,
      [req.user.id, req.tenantId]
    );
    res.json({ success: true, grievances: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function getMyGrievance(req, res) {
  try {
    const [[g]] = await pool.execute(
      'SELECT * FROM grievances WHERE id=? AND tenant_id=? AND complainant_id=?',
      [req.params.id, req.tenantId, req.user.id]
    );
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    const [comments] = await pool.execute(
      'SELECT * FROM grievance_comments WHERE grievance_id=? AND tenant_id=? AND is_internal=0 ORDER BY created_at',
      [req.params.id, req.tenantId]
    );
    res.json({ success: true, grievance: g, comments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Admin / HR routes ────────────────────────────────────────────────────────

async function listGrievances(req, res) {
  try {
    const { status, category, priority, is_posh } = req.query;
    let sql = `SELECT g.*,
               CASE WHEN g.is_anonymous=1 THEN 'Anonymous' ELSE CONCAT(u.first_name,' ',u.last_name) END AS complainant_name,
               CONCAT(a.first_name,' ',a.last_name) AS assigned_to_name
               FROM grievances g
               LEFT JOIN users u ON u.id=g.complainant_id
               LEFT JOIN users a ON a.id=g.assigned_to
               WHERE g.tenant_id=?`;
    const params = [req.tenantId];
    if (status)    { sql += ' AND g.status=?';    params.push(status); }
    if (category)  { sql += ' AND g.category=?';  params.push(category); }
    if (priority)  { sql += ' AND g.priority=?';  params.push(priority); }
    if (is_posh !== undefined) { sql += ' AND g.is_posh=?'; params.push(is_posh === 'true' ? 1 : 0); }
    sql += ' ORDER BY g.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, grievances: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function getGrievance(req, res) {
  try {
    const [[g]] = await pool.execute(`
      SELECT g.*,
             CASE WHEN g.is_anonymous=1 THEN 'Anonymous' ELSE CONCAT(u.first_name,' ',u.last_name) END AS complainant_name,
             CONCAT(a.first_name,' ',a.last_name) AS assigned_to_name
      FROM grievances g
      LEFT JOIN users u ON u.id=g.complainant_id
      LEFT JOIN users a ON a.id=g.assigned_to
      WHERE g.id=? AND g.tenant_id=?
    `, [req.params.id, req.tenantId]);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });

    const [comments] = await pool.execute(
      'SELECT * FROM grievance_comments WHERE grievance_id=? AND tenant_id=? ORDER BY created_at',
      [req.params.id, req.tenantId]
    );
    const [escalations] = await pool.execute(
      `SELECT e.*, CONCAT(u.first_name,' ',u.last_name) AS escalated_by_name
       FROM grievance_escalations e JOIN users u ON u.id=e.escalated_by
       WHERE e.grievance_id=? AND e.tenant_id=? ORDER BY e.escalated_at`,
      [req.params.id, req.tenantId]
    );
    res.json({ success: true, grievance: g, comments, escalations });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateGrievance(req, res) {
  try {
    const { status, assigned_to, priority, resolution } = req.body;
    const updates = [];
    const vals = [];
    if (status !== undefined)      { updates.push('status=?');      vals.push(status); }
    if (assigned_to !== undefined) { updates.push('assigned_to=?'); vals.push(assigned_to); }
    if (priority !== undefined)    { updates.push('priority=?');    vals.push(priority); }
    if (resolution !== undefined)  { updates.push('resolution=?');  vals.push(resolution); }
    if (status === 'resolved')     { updates.push('resolved_at=NOW()'); }
    if (status === 'closed')       { updates.push('closed_at=NOW()'); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    vals.push(req.params.id, req.tenantId);
    await pool.execute(`UPDATE grievances SET ${updates.join(',')} WHERE id=? AND tenant_id=?`, vals);

    // Notify complainant if not anonymous
    if (status) {
      const [[g]] = await pool.execute('SELECT complainant_id, is_anonymous, ticket_no FROM grievances WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
      if (g && !g.is_anonymous && g.complainant_id) {
        await sendNotification(req.tenantId, g.complainant_id, {
          title: 'Grievance Status Updated',
          message: `Your grievance [${g.ticket_no}] is now: ${status.replace(/_/g, ' ')}`,
          type: 'grievance',
          related_id: Number(req.params.id)
        });
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function addComment(req, res) {
  try {
    const { comment, is_internal } = req.body;
    const authorName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    await pool.execute(
      'INSERT INTO grievance_comments (tenant_id, grievance_id, author_id, author_name, comment, is_internal) VALUES (?,?,?,?,?,?)',
      [req.tenantId, req.params.id, req.user.id, authorName, comment, is_internal ? 1 : 0]
    );

    // Notify complainant if it's a public comment
    if (!is_internal) {
      const [[g]] = await pool.execute('SELECT complainant_id, is_anonymous, ticket_no FROM grievances WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
      if (g && !g.is_anonymous && g.complainant_id && g.complainant_id !== req.user.id) {
        await sendNotification(req.tenantId, g.complainant_id, {
          title: 'New Update on Your Grievance',
          message: `An update has been added to grievance [${g.ticket_no}]`,
          type: 'grievance',
          related_id: Number(req.params.id)
        });
      }
    }
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function escalateGrievance(req, res) {
  try {
    const { escalated_to, reason } = req.body;
    await pool.execute(
      'INSERT INTO grievance_escalations (tenant_id, grievance_id, escalated_by, escalated_to, reason) VALUES (?,?,?,?,?)',
      [req.tenantId, req.params.id, req.user.id, escalated_to, reason || null]
    );
    await pool.execute("UPDATE grievances SET status='under_review', assigned_to=? WHERE id=? AND tenant_id=?", [escalated_to, req.params.id, req.tenantId]);
    if (escalated_to) {
      const [[g]] = await pool.execute('SELECT ticket_no FROM grievances WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
      await sendNotification(req.tenantId, escalated_to, {
        title: 'Grievance Escalated to You',
        message: `Grievance [${g?.ticket_no}] has been escalated to you for review`,
        type: 'grievance',
        related_id: Number(req.params.id)
      });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── POSH Committee ────────────────────────────────────────────────────────────

async function getCommittee(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM posh_committee WHERE tenant_id=? AND is_active=1 ORDER BY role',
      [req.tenantId]
    );
    res.json({ success: true, committee: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function addCommitteeMember(req, res) {
  try {
    const { user_id, name, designation, role } = req.body;
    await pool.execute(
      'INSERT INTO posh_committee (tenant_id, user_id, name, designation, role) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), designation=VALUES(designation), role=VALUES(role), is_active=1',
      [req.tenantId, user_id, name, designation || null, role || 'member']
    );
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function removeCommitteeMember(req, res) {
  try {
    await pool.execute('UPDATE posh_committee SET is_active=0 WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const [[totals]] = await pool.execute(
      `SELECT COUNT(*) as total,
              SUM(status='open') as open_count,
              SUM(status='investigating') as investigating,
              SUM(status='resolved') as resolved,
              SUM(is_posh=1) as posh_count,
              SUM(is_anonymous=1) as anonymous_count,
              SUM(sla_due_date < CURDATE() AND status NOT IN ('resolved','closed')) as sla_breached
       FROM grievances WHERE tenant_id=?`,
      [req.tenantId]
    );
    const [byCategory] = await pool.execute(
      'SELECT category, COUNT(*) as count FROM grievances WHERE tenant_id=? GROUP BY category',
      [req.tenantId]
    );
    const [byPriority] = await pool.execute(
      'SELECT priority, COUNT(*) as count FROM grievances WHERE tenant_id=? GROUP BY priority',
      [req.tenantId]
    );
    res.json({ success: true, totals, byCategory, byPriority });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

module.exports = {
  submitGrievance, getMyGrievances, getMyGrievance,
  listGrievances, getGrievance, updateGrievance,
  addComment, escalateGrievance,
  getCommittee, addCommitteeMember, removeCommitteeMember,
  getStats
};
