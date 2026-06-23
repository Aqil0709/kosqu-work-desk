const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth.middleware');
const { addColumnIfMissing } = require('../../utils/schemaHelpers');

// Ensure the in_app_notifications table exists at startup
const ensureNotificationsSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS in_app_notifications (
      id         BIGINT       NOT NULL AUTO_INCREMENT,
      tenant_id  INT          NOT NULL,
      user_id    INT          NOT NULL,
      title      VARCHAR(200) NOT NULL,
      message    TEXT         NULL,
      type       VARCHAR(60)  NOT NULL DEFAULT 'general',
      related_id INT          NULL,
      is_read    TINYINT(1)   NOT NULL DEFAULT 0,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notif_user  (tenant_id, user_id, is_read),
      KEY idx_notif_date  (tenant_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // Migrate older tables that may be missing these columns
  await addColumnIfMissing('in_app_notifications', 'type',       "type VARCHAR(60) NOT NULL DEFAULT 'general'");
  await addColumnIfMissing('in_app_notifications', 'related_id', 'related_id INT NULL');
};

// All routes require JWT only — no admin restriction
router.use(verifyToken);

/**
 * GET /api/notifications
 * Return up to 30 most recent notifications for the current user.
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    if (!tenantId || !userId) {
      return res.status(400).json({ success: false, notifications: [], unreadCount: 0, message: 'Invalid session' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM in_app_notifications WHERE tenant_id=? AND user_id=?',
      [tenantId, userId]
    );

    const [[{ unreadCount }]] = await pool.execute(
      'SELECT COUNT(*) AS unreadCount FROM in_app_notifications WHERE tenant_id=? AND user_id=? AND is_read=0',
      [tenantId, userId]
    );

    // Use pool.query (non-prepared) so LIMIT/OFFSET integers are accepted without ER_WRONG_ARGUMENTS
    const [rows] = await pool.query(
      `SELECT id, title, message, type, related_id, is_read, created_at
       FROM in_app_notifications
       WHERE tenant_id=? AND user_id=?
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [tenantId, userId]
    );

    return res.json({
      success: true,
      notifications: rows,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[Notifications] GET / error:', err.message);
    return res.json({ success: false, notifications: [], unreadCount: 0, message: 'Failed to load notifications' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications for the current user as read.
 */
router.put('/read-all', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE in_app_notifications SET is_read=1 WHERE tenant_id=? AND user_id=? AND is_read=0',
      [req.user.tenant_id, req.user.id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read (must belong to current user).
 */
router.put('/:id/read', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'UPDATE in_app_notifications SET is_read=1 WHERE id=? AND tenant_id=? AND user_id=?',
      [req.params.id, req.user.tenant_id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/send-work-report-reminders
 * Send "Daily Work Report" reminder to all employees who haven't submitted today.
 * Admin/HR only.
 */
router.post('/send-work-report-reminders', async (req, res) => {
  try {
    const pos = (req.user.position || '').toLowerCase();
    if (!['admin', 'hr'].includes(pos)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access required' });
    }

    const tenantId = req.tenantId || req.user.tenant_id;
    const today = new Date().toISOString().split('T')[0];

    // Find active employees who have NOT submitted a work report today
    const [missingRows] = await pool.execute(
      `SELECT u.id as user_id, CONCAT(u.first_name,' ',u.last_name) as name
       FROM users u
       WHERE u.tenant_id = ? AND u.is_active = 1
         AND LOWER(u.position) NOT IN ('admin','hr','client','super_admin','superadmin')
         AND NOT EXISTS (
           SELECT 1 FROM work_reports wr
           WHERE wr.user_id = u.id AND wr.tenant_id = u.tenant_id AND wr.report_date = ?
         )`,
      [tenantId, today]
    );

    const { sendNotification } = require('./notificationHelper');
    for (const emp of missingRows) {
      await sendNotification(tenantId, emp.user_id, {
        title: '📝 Daily Work Report Pending',
        message: `Please submit your work report for today (${today}). Don't forget — it helps your team stay aligned!`,
        type: 'work_report',
      });
    }

    return res.json({ success: true, reminded: missingRows.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.ensureSchema = ensureNotificationsSchema;
module.exports = router;
