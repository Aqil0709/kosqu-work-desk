const { pool } = require('../config/db');
const { getIndiaDate, getIndiaTime } = require('../utils/indiaTime');
const { sendNotification, sendToMany, getHRAndAdmins } = require('../features/notifications/notificationHelper');

// Track last run date per job to avoid duplicate sends on the same day
const lastRun = { absentNotif: null, workReportReminder: null };

// Mirrors the logic in POST /api/attendance/notify-absents
// Runs across ALL tenants
const runAbsentNotifications = async (logger) => {
  const today = getIndiaDate();
  try {
    const [tenants] = await pool.execute(
      `SELECT DISTINCT tenant_id FROM employee_details WHERE is_active = 1 OR is_active IS NULL`
    );

    let total = 0;
    for (const { tenant_id } of tenants) {
      const [absentees] = await pool.execute(
        `SELECT ed.id, ed.employee_id, ed.team_lead_id, ed.reporting_manager_id,
                u.id as user_db_id, CONCAT(u.first_name,' ',u.last_name) as employee_name
         FROM employee_details ed
         JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
         WHERE ed.tenant_id = ? AND u.is_active = 1
           AND LOWER(COALESCE(ed.status, 'active')) NOT IN ('inactive', 'deleted')
           AND NOT EXISTS (
             SELECT 1 FROM tb_attendance ta
             WHERE ta.employee_id = ed.id AND ta.date = ?
           )
           AND NOT EXISTS (
             SELECT 1 FROM leave_requests lr
             WHERE lr.employee_id = ed.id AND lr.tenant_id = ed.tenant_id
               AND ? BETWEEN lr.start_date AND lr.end_date AND LOWER(lr.status) = 'approved'
           )`,
        [tenant_id, today, today]
      );

      const adminHrIds = await getHRAndAdmins(tenant_id);

      for (const emp of absentees) {
        // Notify TL and reporting manager (not the employee themselves)
        const managerIds = [emp.team_lead_id, emp.reporting_manager_id, ...adminHrIds].filter(id => id != null && id !== emp.user_db_id);
        await sendToMany(tenant_id, managerIds, {
          title: 'Absent Without Notice',
          message: `${emp.employee_name} is absent today (${today}) without applying for leave.`,
          type: 'attendance',
          related_id: emp.user_db_id,
        });
      }
      total += absentees.length;
    }

    logger.info(`[DailyScheduler] Absent notifications sent for ${total} employee(s) across ${tenants.length} tenant(s).`);
  } catch (err) {
    logger.error('[DailyScheduler] runAbsentNotifications error:', err.message);
  }
};

// Mirrors the logic in POST /api/notifications/send-work-report-reminders
// Runs across ALL tenants
const runWorkReportReminders = async (logger) => {
  const today = getIndiaDate();
  try {
    const [tenants] = await pool.execute(
      `SELECT DISTINCT tenant_id FROM users WHERE is_active = 1`
    );

    let total = 0;
    for (const { tenant_id } of tenants) {
      const [missingRows] = await pool.execute(
        `SELECT u.id as user_id, CONCAT(u.first_name,' ',u.last_name) as name
         FROM users u
         WHERE u.tenant_id = ? AND u.is_active = 1
           AND LOWER(u.position) NOT IN ('admin','hr','client','super_admin','superadmin')
           AND NOT EXISTS (
             SELECT 1 FROM work_reports wr
             WHERE wr.user_id = u.id AND wr.tenant_id = u.tenant_id AND wr.report_date = ?
           )`,
        [tenant_id, today]
      );

      for (const emp of missingRows) {
        await sendNotification(tenant_id, emp.user_id, {
          title: '📝 Daily Work Report Pending',
          message: `Please submit your work report for today (${today}). Don't forget — it helps your team stay aligned!`,
          type: 'work_report',
        });
      }
      total += missingRows.length;
    }

    logger.info(`[DailyScheduler] Work report reminders sent to ${total} employee(s) across ${tenants.length} tenant(s).`);
  } catch (err) {
    logger.error('[DailyScheduler] runWorkReportReminders error:', err.message);
  }
};

/**
 * Starts a scheduler that checks every 5 minutes and fires:
 *  - Absent-without-notice notifications at 10:30 AM IST
 *  - Work report reminders at 6:00 PM IST
 * Each job runs at most once per calendar day (India time).
 */
const startDailyNotificationScheduler = (logger) => {
  const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  const tick = async () => {
    const now = getIndiaTime();   // 'HH:MM:SS'
    const today = getIndiaDate(); // 'YYYY-MM-DD'
    const [hh, mm] = now.split(':').map(Number);

    // Fire absent notifications at 10:30–10:34 AM IST
    if (hh === 10 && mm >= 30 && mm < 35 && lastRun.absentNotif !== today) {
      lastRun.absentNotif = today;
      await runAbsentNotifications(logger);
    }

    // Fire work report reminders at 6:00–6:04 PM IST
    if (hh === 18 && mm >= 0 && mm < 5 && lastRun.workReportReminder !== today) {
      lastRun.workReportReminder = today;
      await runWorkReportReminders(logger);
    }
  };

  setInterval(tick, CHECK_INTERVAL_MS);
  logger.info('[DailyScheduler] Started — absent notifications at 10:30 AM IST, work report reminders at 6:00 PM IST.');
};

module.exports = { startDailyNotificationScheduler };
