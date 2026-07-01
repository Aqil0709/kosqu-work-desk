/**
 * Live Location Tracking Routes
 * POST /api/location-tracking/ping        — employee sends current GPS
 * GET  /api/location-tracking/live        — HR/Admin/TL sees all active employees
 * GET  /api/location-tracking/history/:id — HR/Admin sees one employee's trail for a day
 */

const express = require('express');
const router  = express.Router();
const { pool } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth.middleware');
const { markTrackingActive } = require('./locationMonitorService');
const { getIndiaDate } = require('../../utils/indiaTime');

/* ── Schema bootstrap ───────────────────────────────────────── */
const ensureSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tb_location_pings (
      id           BIGINT       NOT NULL AUTO_INCREMENT,
      tenant_id    INT          NOT NULL,
      employee_id  VARCHAR(36)  NOT NULL,   -- matches employee_details.employee_id
      latitude     DECIMAL(10,8) NOT NULL,
      longitude    DECIMAL(11,8) NOT NULL,
      accuracy     FLOAT        NULL,
      speed        FLOAT        NULL,        -- m/s, null if stationary
      battery      TINYINT      NULL,        -- 0-100 %
      pinged_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY  (id),
      KEY idx_ping_tenant_emp  (tenant_id, employee_id),
      KEY idx_ping_tenant_time (tenant_id, pinged_at),
      KEY idx_ping_tenant_emp_time (tenant_id, employee_id, pinged_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // Added after initial release — safe no-op if already present.
  await addColumnIndexIfMissing();
};

const addColumnIndexIfMissing = async () => {
  const [rows] = await pool.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tb_location_pings' AND INDEX_NAME = 'idx_ping_tenant_emp_time'`
  );
  if (!rows.length) {
    await pool.execute(`ALTER TABLE tb_location_pings ADD INDEX idx_ping_tenant_emp_time (tenant_id, employee_id, pinged_at)`);
  }
};

// Also run eagerly at require-time as a safety net for any entrypoint that
// doesn't call ensureSchema() explicitly during startup — server.js's runSchema
// sequence is the primary, deadlock-safe path (see module.exports.ensureSchema).
ensureSchema().catch(e => console.error('[location-tracking schema]', e.message));

router.use(verifyToken);

/* ────────────────────────────────────────────────────────────
   POST /api/location-tracking/ping
   Body: { latitude, longitude, accuracy?, speed?, battery? }
   Called every ~60 s from employee app while checked in.
─────────────────────────────────────────────────────────── */
router.post('/ping', async (req, res) => {
  try {
    const tenantId   = req.tenantId || req.user?.tenant_id;
    const employeeId = String(req.user.id);
    const { latitude, longitude, accuracy, speed, battery } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    await pool.execute(
      `INSERT INTO tb_location_pings (tenant_id, employee_id, latitude, longitude, accuracy, speed, battery)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, employeeId, latitude, longitude, accuracy ?? null, speed ?? null, battery ?? null]
    );

    // Clears any prior "location disabled" flag now that pings have resumed.
    markTrackingActive(tenantId, employeeId, getIndiaDate()).catch(() => {});

    return res.json({ success: true });
  } catch (err) {
    console.error('[location-ping]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ────────────────────────────────────────────────────────────
   GET /api/location-tracking/live
   Returns latest ping for every employee who has checked in today
   and whose last ping was within the last 10 minutes.
   Access: admin, hr, team_lead (sees own team only)
─────────────────────────────────────────────────────────── */
router.get('/live', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const pos      = (req.user.position || '').toLowerCase();
    const isAdmin  = ['admin', 'hr'].includes(pos);
    const isTL     = req.user.is_team_lead === 1 || req.user.is_team_lead === true;

    if (!isAdmin && !isTL) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Base population = everyone checked-in today (present or delayed, not yet checked out
    // or checked out earlier today). Latest ping / tracking status is left-joined so
    // employees who disabled GPS still appear with their last known location.
    let sql = `
      SELECT
        CAST(ed.employee_id AS CHAR) AS employee_id,
        ed.id AS employee_pk,
        u.first_name,
        u.last_name,
        u.email,
        ed.position,
        ed.department_id,
        d.name AS department_name,
        sh.shift_name,
        sh.check_in_time AS shift_start,
        sh.check_out_time AS shift_end,
        ta.check_in,
        ta.check_out,
        ta.status AS attendance_status,
        lp.latitude,
        lp.longitude,
        lp.accuracy,
        lp.speed,
        lp.battery,
        lp.pinged_at AS last_updated_at,
        COALESCE(lts.status,
          CASE WHEN lp.pinged_at IS NOT NULL AND lp.pinged_at >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)
               THEN 'active' ELSE 'disabled' END
        ) AS tracking_status,
        TIMESTAMPDIFF(MINUTE, ta.check_in, COALESCE(ta.check_out, NOW())) AS minutes_since_checkin
      FROM tb_attendance ta
      JOIN employee_details ed ON ed.id = ta.employee_id AND ed.tenant_id = ta.tenant_id
      JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
      LEFT JOIN departments d ON d.id = ed.department_id
      LEFT JOIN tb_shifts sh ON sh.shift_id = ta.shift_id
      LEFT JOIN (
        -- Bounded to today's pings only — without this the aggregate re-scans the
        -- entire (ever-growing) ping history for the tenant on every /live poll.
        SELECT employee_id, MAX(pinged_at) AS latest
        FROM tb_location_pings
        WHERE tenant_id = ? AND pinged_at >= CURDATE()
        GROUP BY employee_id
      ) latest ON latest.employee_id = CAST(ed.employee_id AS CHAR)
      LEFT JOIN tb_location_pings lp
        ON lp.employee_id = latest.employee_id AND lp.pinged_at = latest.latest AND lp.tenant_id = ta.tenant_id
      LEFT JOIN tb_location_tracking_status lts
        ON lts.tenant_id = ta.tenant_id AND lts.employee_id = CAST(ed.employee_id AS CHAR) AND lts.attendance_date = ta.date
      WHERE ta.tenant_id = ?
        AND ta.date = CURDATE()
        AND ta.check_in IS NOT NULL
        AND ta.status IN ('Present', 'Delayed', 'Half Day')
    `;
    const params = [tenantId, tenantId];

    // Team lead: only see their own team
    if (!isAdmin && isTL) {
      sql += ' AND ed.team_lead_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY u.first_name ASC';

    // Bounded by default so a tenant with thousands of concurrently checked-in
    // employees doesn't return an unbounded result set on every 30s poll.
    // Frontend can pass ?page=&limit= to paginate explicitly; without params we
    // still cap at 500 rows to protect the server.
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 500));
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.execute(sql, params);

    const employees = rows.map(r => ({
      ...r,
      working_hours_completed: r.minutes_since_checkin != null
        ? +(r.minutes_since_checkin / 60).toFixed(2)
        : null,
      is_offline: !!r.check_out,
    }));

    return res.json({ success: true, employees });
  } catch (err) {
    console.error('[location-live]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ────────────────────────────────────────────────────────────
   GET /api/location-tracking/history/:employeeUserId?date=YYYY-MM-DD
   Returns all pings for one employee on a given day (trail).
   Access: admin, hr only
─────────────────────────────────────────────────────────── */
router.get('/history/:employeeUserId', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const pos      = (req.user.position || '').toLowerCase();
    if (!['admin', 'hr'].includes(pos)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access required' });
    }

    const { employeeUserId } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const [rows] = await pool.execute(
      `SELECT latitude, longitude, accuracy, speed, battery, pinged_at
       FROM tb_location_pings
       WHERE tenant_id = ? AND employee_id = ? AND DATE(pinged_at) = ?
       ORDER BY pinged_at ASC`,
      [tenantId, employeeUserId, date]
    );

    return res.json({ success: true, trail: rows, date, employee_id: employeeUserId });
  } catch (err) {
    console.error('[location-history]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.ensureSchema = ensureSchema;
module.exports = router;
