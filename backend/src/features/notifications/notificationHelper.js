const { pool } = require('../../config/db');

async function sendNotification(tenantId, userId, { title, message, type = 'general', related_id = null }) {
  if (!userId || !tenantId) return;
  try {
    const [result] = await pool.execute(
      `INSERT INTO in_app_notifications (tenant_id, user_id, title, message, type, related_id) VALUES (?,?,?,?,?,?)`,
      [tenantId, userId, title || '', message || null, type, related_id || null]
    );

    // Real-time push via Socket.IO
    try {
      const { getIo } = require('../../socket/socketInstance');
      const io = getIo();
      if (io) {
        io.to(`user:${userId}`).emit('notification', {
          id: result.insertId,
          tenant_id: tenantId,
          user_id: userId,
          title: title || '',
          message: message || null,
          type,
          related_id: related_id || null,
          is_read: 0,
          created_at: new Date().toISOString(),
        });
      }
    } catch (_) {}
  } catch (err) {
    console.error('[Notification] send error:', err.message);
  }
}

async function sendToMany(tenantId, userIds, notification) {
  const unique = [...new Set((userIds || []).filter(id => id != null))];
  await Promise.all(unique.map(uid => sendNotification(tenantId, uid, notification)));
}

async function getHRAndAdmins(tenantId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT id FROM users WHERE tenant_id = ? AND LOWER(position) IN ('admin','hr') AND is_active = 1`,
    [tenantId]
  );
  return rows.map(r => r.id);
}

// employeeUserId = the user.id that corresponds to this employee (from req.user.id)
// options.includeClient = false → skip client portal users (use false for non-leave events)
async function getNotificationRecipients(tenantId, employeeUserId, { includeClient = true } = {}) {
  const [rows] = await pool.execute(
    `SELECT ed.team_lead_id, ed.client_id,
            CONCAT(u.first_name,' ',u.last_name) as employee_name
     FROM employee_details ed
     JOIN users u ON u.id = ?
     WHERE CAST(ed.employee_id AS UNSIGNED) = ? AND ed.tenant_id = ?
     LIMIT 1`,
    [employeeUserId, employeeUserId, tenantId]
  );

  const details = rows[0] || {};
  const adminHrIds = await getHRAndAdmins(tenantId);

  // Client portal users — only included when explicitly requested (leave notifications only)
  let clientUserIds = [];
  if (includeClient && details.client_id) {
    const [clientRows] = await pool.execute(
      `SELECT id FROM users WHERE tenant_id = ? AND client_ref_id = ? AND is_active = 1`,
      [tenantId, details.client_id]
    );
    clientUserIds = clientRows.map(r => r.id);
  }

  const userIds = [
    employeeUserId,
    details.team_lead_id,
    ...adminHrIds,
    ...clientUserIds,
  ].filter(id => id != null);

  return { userIds, employeeName: details.employee_name || 'Employee' };
}

module.exports = { sendNotification, sendToMany, getHRAndAdmins, getNotificationRecipients };
