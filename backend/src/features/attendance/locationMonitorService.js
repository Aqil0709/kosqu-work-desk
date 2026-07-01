// Detects employees who are checked-in but have stopped sending GPS pings
// (GPS/location permission revoked, browser tab closed, device location off, etc.)
// and raises a one-time "Location Disabled By Employee" alert per session.
const { pool } = require('../../config/db');
const { sendNotification, getHRAndAdmins } = require('../notifications/notificationHelper');
const { writeAuditLog } = require('../auditLog/auditLogRoutes');

let schedulerTimer = null;
let pruneTimer = null;
let isRunning = false;

const MONITOR_INTERVAL_MS = Number(process.env.LOCATION_MONITOR_INTERVAL_MS || 60 * 1000);
// Ping is sent every 60s from the client; anything beyond this is a genuine stall/disable.
const STALE_THRESHOLD_MINUTES = Number(process.env.LOCATION_STALE_THRESHOLD_MINUTES || 3);
// At 10,000+ employees pinging every 60s for a 9h shift, tb_location_pings grows by
// ~5.4M rows/day. Raw GPS trail is only useful for recent history/trail lookups —
// prune anything older than this retention window (default 14 days) on a daily sweep.
const PING_RETENTION_DAYS = Number(process.env.LOCATION_PING_RETENTION_DAYS || 14);
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day is sufficient for a retention job

const ensureSchema = async () => {
  // Tracks the "location disabled" state so we alert once per occurrence, not every sweep.
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tb_location_tracking_status (
      tenant_id      INT          NOT NULL,
      employee_id    VARCHAR(36)  NOT NULL,
      attendance_date DATE        NOT NULL,
      status         ENUM('active','disabled') NOT NULL DEFAULT 'active',
      last_ping_at   DATETIME     NULL,
      disabled_at    DATETIME     NULL,
      notified_at    DATETIME     NULL,
      PRIMARY KEY (tenant_id, employee_id, attendance_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const findStaleTrackers = async () => {
  // Employees checked-in today, not yet checked-out, whose latest ping (if any)
  // is older than the threshold — or who never sent a single ping after check-in.
  const [rows] = await pool.execute(
    `SELECT
        a.tenant_id,
        a.employee_id,
        a.date AS attendance_date,
        a.check_in,
        u.first_name, u.last_name,
        latest.last_ping_at
      FROM tb_attendance a
      JOIN employee_details ed ON ed.id = a.employee_id AND ed.tenant_id = a.tenant_id
      JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
      LEFT JOIN (
        SELECT tenant_id, employee_id, MAX(pinged_at) AS last_ping_at
        FROM tb_location_pings
        GROUP BY tenant_id, employee_id
      ) latest
        ON latest.tenant_id = a.tenant_id
       AND latest.employee_id = CAST(ed.employee_id AS CHAR)
      WHERE a.date = CURDATE()
        AND a.check_in IS NOT NULL
        AND a.check_out IS NULL
        AND a.status IN ('Present', 'Delayed')
        AND (
          latest.last_ping_at IS NULL
          OR latest.last_ping_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
        )
        AND a.check_in < DATE_SUB(NOW(), INTERVAL ? MINUTE)
      `,
    [STALE_THRESHOLD_MINUTES, STALE_THRESHOLD_MINUTES]
  );
  return rows;
};

const markDisabledAndAlert = async (row) => {
  const empIdStr = String(row.employee_id);
  const employeeName = `${row.first_name || ''} ${row.last_name || ''}`.trim();

  const [existing] = await pool.execute(
    `SELECT status, notified_at FROM tb_location_tracking_status
     WHERE tenant_id = ? AND employee_id = ? AND attendance_date = ?`,
    [row.tenant_id, empIdStr, row.attendance_date]
  );

  const alreadyDisabled = existing.length > 0 && existing[0].status === 'disabled';

  await pool.execute(
    `INSERT INTO tb_location_tracking_status
       (tenant_id, employee_id, attendance_date, status, last_ping_at, disabled_at, notified_at)
     VALUES (?, ?, ?, 'disabled', ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       status = 'disabled',
       last_ping_at = VALUES(last_ping_at),
       disabled_at = IF(status = 'active', NOW(), disabled_at)`,
    [row.tenant_id, empIdStr, row.attendance_date, row.last_ping_at || null]
  );

  if (alreadyDisabled) return; // already alerted for this session

  const recipients = await getHRAndAdmins(row.tenant_id);
  await Promise.all(recipients.map((uid) => sendNotification(row.tenant_id, uid, {
    title: 'Location Disabled By Employee',
    message: `${employeeName || 'Employee #' + empIdStr} has disabled GPS/location sharing while checked in. Last known location was reported ${row.last_ping_at ? 'at ' + row.last_ping_at : 'never'}.`,
    type: 'location_disabled',
    related_id: empIdStr,
  })));

  await writeAuditLog({
    tenantId: row.tenant_id,
    userId: row.employee_id,
    userName: employeeName,
    action: 'LOCATION_TRACKING_DISABLED',
    entityType: 'attendance',
    entityId: empIdStr,
    description: `GPS location tracking stopped receiving pings for ${employeeName} while checked in (last ping: ${row.last_ping_at || 'none'}).`,
    status: 'success',
  });
};

const runLocationMonitor = async () => {
  if (isRunning) return { success: true, skipped: true };
  isRunning = true;
  try {
    const stale = await findStaleTrackers();
    for (const row of stale) {
      try {
        await markDisabledAndAlert(row);
      } catch (err) {
        console.error('[location-monitor] alert failed for', row.employee_id, err.message);
      }
    }
    return { success: true, flagged: stale.length };
  } finally {
    isRunning = false;
  }
};

// Called on every ping — clears the "disabled" flag once tracking resumes.
const markTrackingActive = async (tenantId, employeeId, attendanceDate) => {
  await pool.execute(
    `INSERT INTO tb_location_tracking_status
       (tenant_id, employee_id, attendance_date, status, last_ping_at)
     VALUES (?, ?, ?, 'active', NOW())
     ON DUPLICATE KEY UPDATE status = 'active', last_ping_at = NOW()`,
    [tenantId, String(employeeId), attendanceDate]
  );
};

const pruneOldPings = async () => {
  // Deletes in bounded batches to avoid a single multi-million-row DELETE from
  // holding a long-running transaction/lock on a hot table.
  let totalDeleted = 0;
  for (let i = 0; i < 500; i++) {
    const [result] = await pool.execute(
      `DELETE FROM tb_location_pings WHERE pinged_at < DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 5000`,
      [PING_RETENTION_DAYS]
    );
    totalDeleted += result.affectedRows;
    if (result.affectedRows < 5000) break;
  }
  return totalDeleted;
};

const startLocationMonitorScheduler = (logger = console) => {
  if (schedulerTimer) return schedulerTimer;

  schedulerTimer = setInterval(async () => {
    try {
      const result = await runLocationMonitor();
      if (result.flagged > 0) {
        logger.info?.(`Location monitor flagged ${result.flagged} employee(s) as location-disabled.`);
      }
    } catch (error) {
      logger.error?.('Location monitor scheduler failed', { error });
    }
  }, MONITOR_INTERVAL_MS);

  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }

  if (!pruneTimer) {
    pruneTimer = setInterval(async () => {
      try {
        const deleted = await pruneOldPings();
        if (deleted > 0) logger.info?.(`Location ping retention sweep deleted ${deleted} row(s) older than ${PING_RETENTION_DAYS} days.`);
      } catch (error) {
        logger.error?.('Location ping retention sweep failed', { error });
      }
    }, PRUNE_INTERVAL_MS);
    if (typeof pruneTimer.unref === 'function') pruneTimer.unref();
  }

  logger.info?.(`Location monitor scheduler started. Interval: ${MONITOR_INTERVAL_MS}ms`);
  return schedulerTimer;
};

module.exports = {
  ensureSchema,
  runLocationMonitor,
  markTrackingActive,
  startLocationMonitorScheduler,
  pruneOldPings,
};
