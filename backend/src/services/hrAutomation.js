/**
 * hrAutomation.js — Smart HR Alert Engine
 *
 * Runs scheduled checks and fires in_app_notifications for:
 *   • Probation completion
 *   • Notice period completion
 *   • Contract expiry (consultants)
 *   • Internship completion
 *   • Document expiry (future: when doc expiry_date stored)
 *
 * Call runHrAutomation(pool) on server startup and then via a daily cron.
 */

const ALERT_TYPES = {
  PROBATION_ENDING:   'probation_ending',
  NOTICE_ENDING:      'notice_ending',
  CONTRACT_EXPIRING:  'contract_expiring',
  INTERNSHIP_ENDING:  'internship_ending',
  DOCUMENT_EXPIRING:  'document_expiring',
  LOW_ATTENDANCE:     'low_attendance',
  BIRTHDAY:           'birthday',
  UPCOMING_EVENT:     'upcoming_event',
};

const DAYS_AHEAD = 7; // alert N days before event

/**
 * Insert a notification into in_app_notifications (ignores if table missing).
 */
const pushNotification = async (pool, tenantId, userId, title, message, type = 'general') => {
  try {
    await pool.execute(
      `INSERT INTO in_app_notifications (tenant_id, user_id, title, message, type, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [tenantId, userId, title, message, type]
    );
    // Real-time Socket.IO push
    try {
      const { getIo } = require('../socket/socketInstance');
      const io = getIo();
      if (io) {
        io.to(`user:${userId}`).emit('notification', {
          tenant_id: tenantId, user_id: userId,
          title, message, type, is_read: 0,
          created_at: new Date().toISOString(),
        });
      }
    } catch (_) {}
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') {
      console.error('[HR Automation] Notification insert error:', err.message);
    }
  }
};

/**
 * Log to hr_alerts table.
 */
const logAlert = async (pool, tenantId, employeeId, alertType, message, notifiedTo = []) => {
  try {
    await pool.execute(
      `INSERT INTO hr_alerts (tenant_id, employee_id, alert_type, alert_message, notified_to)
       VALUES (?, ?, ?, ?, ?)`,
      [tenantId, employeeId, alertType, message, JSON.stringify(notifiedTo)]
    );
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') {
      console.error('[HR Automation] Alert log error:', err.message);
    }
  }
};

/**
 * Notify HR (admin) users for a tenant.
 */
const notifyHR = async (pool, tenantId, title, message, type = 'general') => {
  try {
    const [hrUsers] = await pool.execute(
      `SELECT id FROM users
       WHERE tenant_id = ? AND is_active = 1 AND LOWER(position) IN ('admin', 'hr')`,
      [tenantId]
    );
    for (const hr of hrUsers) {
      await pushNotification(pool, tenantId, hr.id, title, message, type);
    }
    return hrUsers.map(h => h.id);
  } catch {
    return [];
  }
};

// ── Check: probation ending within DAYS_AHEAD ────────────────────────────────
const checkProbationEnding = async (pool) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ed.id as emp_id, ed.tenant_id, ed.employee_id as user_id,
              ed.reporting_manager_id, ed.team_lead_id,
              ed.probation_end_date,
              CONCAT(u.first_name,' ',u.last_name) as name
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       WHERE ed.probation_end_date IS NOT NULL
         AND ed.status = 'active'
         AND ed.probation_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [DAYS_AHEAD]
    );

    for (const row of rows) {
      const msg = `Probation period for ${row.name} (${row.emp_id}) ends on ${row.probation_end_date}. Please initiate confirmation process.`;
      const title = `Probation Ending — ${row.name}`;
      const notified = [];

      if (row.reporting_manager_id) {
        await pushNotification(pool, row.tenant_id, row.reporting_manager_id, title, msg);
        notified.push(row.reporting_manager_id);
      }
      if (row.team_lead_id && row.team_lead_id !== row.reporting_manager_id) {
        await pushNotification(pool, row.tenant_id, row.team_lead_id, title, msg);
        notified.push(row.team_lead_id);
      }
      const hrIds = await notifyHR(pool, row.tenant_id, title, msg, 'hr');
      await logAlert(pool, row.tenant_id, row.emp_id, ALERT_TYPES.PROBATION_ENDING, msg, [...notified, ...hrIds]);
    }
  } catch (err) {
    console.error('[HR Automation] Probation check error:', err.message);
  }
};

// ── Check: contract expiry (consultants) ────────────────────────────────────
const checkContractExpiry = async (pool) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ed.id as emp_id, ed.tenant_id, ed.employee_id as user_id,
              ed.reporting_manager_id, ed.contract_end_date,
              CONCAT(u.first_name,' ',u.last_name) as name
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       WHERE ed.employment_category = 'consultant'
         AND ed.contract_end_date IS NOT NULL
         AND ed.status = 'active'
         AND ed.contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [DAYS_AHEAD]
    );

    for (const row of rows) {
      const msg = `Consultant contract for ${row.name} (${row.emp_id}) expires on ${row.contract_end_date}. Please renew or close the engagement.`;
      const title = `Contract Expiring — ${row.name}`;
      const notified = [];

      if (row.reporting_manager_id) {
        await pushNotification(pool, row.tenant_id, row.reporting_manager_id, title, msg);
        notified.push(row.reporting_manager_id);
      }
      const hrIds = await notifyHR(pool, row.tenant_id, title, msg);
      await logAlert(pool, row.tenant_id, row.emp_id, ALERT_TYPES.CONTRACT_EXPIRING, msg, [...notified, ...hrIds]);
    }
  } catch (err) {
    console.error('[HR Automation] Contract expiry check error:', err.message);
  }
};

// ── Check: internship ending ─────────────────────────────────────────────────
const checkInternshipEnding = async (pool) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ed.id as emp_id, ed.tenant_id, ed.employee_id as user_id,
              ed.mentor_id, ed.reporting_manager_id, ed.internship_end_date,
              CONCAT(u.first_name,' ',u.last_name) as name
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       WHERE ed.employment_category = 'intern'
         AND ed.internship_end_date IS NOT NULL
         AND ed.status = 'active'
         AND ed.internship_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [DAYS_AHEAD]
    );

    for (const row of rows) {
      const msg = `Internship for ${row.name} (${row.emp_id}) ends on ${row.internship_end_date}. Please process internship completion or conversion.`;
      const title = `Internship Ending — ${row.name}`;
      const notified = [];

      if (row.mentor_id) {
        await pushNotification(pool, row.tenant_id, row.mentor_id, title, msg);
        notified.push(row.mentor_id);
      }
      if (row.reporting_manager_id && row.reporting_manager_id !== row.mentor_id) {
        await pushNotification(pool, row.tenant_id, row.reporting_manager_id, title, msg);
        notified.push(row.reporting_manager_id);
      }
      const hrIds = await notifyHR(pool, row.tenant_id, title, msg);
      await logAlert(pool, row.tenant_id, row.emp_id, ALERT_TYPES.INTERNSHIP_ENDING, msg, [...notified, ...hrIds]);
    }
  } catch (err) {
    console.error('[HR Automation] Internship check error:', err.message);
  }
};

// ── Check: document expiry ───────────────────────────────────────────────────
const checkDocumentExpiry = async (pool) => {
  try {
    const [rows] = await pool.execute(
      `SELECT doc.id, doc.tenant_id, doc.employee_user_id as user_id,
              doc.doc_type, doc.doc_type AS doc_label, doc.expiry_date,
              CONCAT(u.first_name,' ',u.last_name) as name,
              ed.id as emp_id, ed.reporting_manager_id
       FROM employee_documents doc
       JOIN users u ON u.id = doc.employee_user_id AND u.tenant_id = doc.tenant_id
       LEFT JOIN employee_details ed ON ed.employee_id = u.id AND ed.tenant_id = doc.tenant_id
       WHERE doc.expiry_date IS NOT NULL
         AND doc.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [DAYS_AHEAD * 4] // 28 days for document expiry
    );

    for (const row of rows) {
      const label = row.doc_label || row.doc_type;
      const msg = `Document "${label}" for ${row.name} (${row.emp_id || 'N/A'}) expires on ${row.expiry_date}. Please request renewal.`;
      const title = `Document Expiring — ${row.name}`;
      const notified = [];

      if (row.reporting_manager_id) {
        await pushNotification(pool, row.tenant_id, row.reporting_manager_id, title, msg);
        notified.push(row.reporting_manager_id);
      }
      const hrIds = await notifyHR(pool, row.tenant_id, title, msg);
      if (row.emp_id) {
        await logAlert(pool, row.tenant_id, row.emp_id, ALERT_TYPES.DOCUMENT_EXPIRING, msg, [...notified, ...hrIds]);
      }
    }
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') {
      console.error('[HR Automation] Document expiry check error:', err.message);
    }
  }
};

// ── Check: low attendance this month ────────────────────────────────────────
const checkLowAttendance = async (pool, threshold = 75) => {
  try {
    // Check current month attendance percentage < threshold
    const [rows] = await pool.execute(
      `SELECT
         ed.id as emp_id, ed.tenant_id, ed.employee_id as user_id,
         ed.reporting_manager_id, ed.team_lead_id,
         CONCAT(u.first_name,' ',u.last_name) as name,
         COUNT(a.id) as total_days,
         SUM(CASE WHEN a.status IN ('present','half_day') THEN 1 ELSE 0 END) as present_days
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       JOIN tb_attendance a ON a.employee_id = ed.id AND a.tenant_id = ed.tenant_id
       WHERE ed.status = 'active'
         AND MONTH(a.date) = MONTH(CURDATE())
         AND YEAR(a.date) = YEAR(CURDATE())
       GROUP BY ed.id, ed.tenant_id, ed.employee_id, ed.reporting_manager_id, ed.team_lead_id, u.first_name, u.last_name
       HAVING total_days > 10 AND (present_days / total_days * 100) < ?`,
      [threshold]
    );

    for (const row of rows) {
      const pct = row.total_days > 0 ? Math.round((row.present_days / row.total_days) * 100) : 0;
      const msg = `Low attendance alert: ${row.name} (${row.emp_id}) has ${pct}% attendance this month (${row.present_days}/${row.total_days} days). Threshold: ${threshold}%.`;
      const title = `Low Attendance — ${row.name}`;
      const notified = [];

      if (row.reporting_manager_id) {
        await pushNotification(pool, row.tenant_id, row.reporting_manager_id, title, msg);
        notified.push(row.reporting_manager_id);
      }
      if (row.team_lead_id && row.team_lead_id !== row.reporting_manager_id) {
        await pushNotification(pool, row.tenant_id, row.team_lead_id, title, msg);
        notified.push(row.team_lead_id);
      }
      const hrIds = await notifyHR(pool, row.tenant_id, title, msg);
      await logAlert(pool, row.tenant_id, row.emp_id, ALERT_TYPES.LOW_ATTENDANCE, msg, [...notified, ...hrIds]);
    }
  } catch (err) {
    // Silently skip if attendance table not found
    if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') {
      console.error('[HR Automation] Attendance check error:', err.message);
    }
  }
};

// ── Check: employee birthdays today ─────────────────────────────────────────
const checkBirthdays = async (pool) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ed.id as emp_id, ed.tenant_id, ed.employee_id as user_id,
              ed.reporting_manager_id,
              CONCAT(u.first_name,' ',u.last_name) as name,
              u.first_name
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       WHERE LOWER(ed.status) = 'active'
         AND ed.date_of_birth IS NOT NULL
         AND MONTH(ed.date_of_birth) = MONTH(CURDATE())
         AND DAY(ed.date_of_birth) = DAY(CURDATE())`
    );

    for (const row of rows) {
      // Notify the employee themselves
      await pushNotification(
        pool, row.tenant_id, row.user_id,
        `🎂 Happy Birthday, ${row.first_name}!`,
        `Wishing you a wonderful birthday! May this year bring you joy and success.`,
        'birthday'
      );

      // Notify HR/admins
      const hrMsg = `Today is ${row.name}'s birthday! 🎉 Don't forget to wish them.`;
      const hrTitle = `🎉 Birthday Today — ${row.name}`;
      await notifyHR(pool, row.tenant_id, hrTitle, hrMsg);

      // Notify reporting manager
      if (row.reporting_manager_id) {
        await pushNotification(pool, row.tenant_id, row.reporting_manager_id, hrTitle, hrMsg, 'birthday');
      }

      // Notify all active employees in the same tenant (team-wide celebration)
      const [allUsers] = await pool.execute(
        `SELECT id FROM users WHERE tenant_id = ? AND is_active = 1 AND id != ?`,
        [row.tenant_id, row.user_id]
      );
      for (const u of allUsers) {
        await pushNotification(pool, row.tenant_id, u.id, hrTitle, hrMsg, 'birthday');
      }
    }
  } catch (err) {
    console.error('[HR Automation] Birthday check error:', err.message);
  }
};

// ── Check: work anniversaries today ─────────────────────────────────────────
const checkWorkAnniversaries = async (pool) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ed.id as emp_id, ed.tenant_id, ed.employee_id as user_id,
              ed.reporting_manager_id, ed.joining_date,
              CONCAT(u.first_name,' ',u.last_name) as name,
              u.first_name,
              YEAR(CURDATE()) - YEAR(ed.joining_date) as years
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       WHERE LOWER(ed.status) = 'active'
         AND ed.joining_date IS NOT NULL
         AND MONTH(ed.joining_date) = MONTH(CURDATE())
         AND DAY(ed.joining_date) = DAY(CURDATE())
         AND YEAR(ed.joining_date) < YEAR(CURDATE())`
    );

    for (const row of rows) {
      const yrs = row.years;
      const suffix = yrs === 1 ? 'st' : yrs === 2 ? 'nd' : yrs === 3 ? 'rd' : 'th';
      const empTitle = `🏆 Happy ${yrs}${suffix} Work Anniversary!`;
      const empMsg = `Congratulations ${row.first_name}! Today marks your ${yrs}${suffix} year at the company. Thank you for your dedication and hard work!`;

      // Notify the employee
      await pushNotification(pool, row.tenant_id, row.user_id, empTitle, empMsg);

      // Notify HR/admins
      const hrTitle = `🏆 Work Anniversary — ${row.name} (${yrs}${suffix} year)`;
      const hrMsg = `Today is ${row.name}'s ${yrs}${suffix} work anniversary! A great milestone to celebrate.`;
      await notifyHR(pool, row.tenant_id, hrTitle, hrMsg);

      if (row.reporting_manager_id) {
        await pushNotification(pool, row.tenant_id, row.reporting_manager_id, hrTitle, hrMsg);
      }
    }
  } catch (err) {
    console.error('[HR Automation] Anniversary check error:', err.message);
  }
};

// ── Check: company events happening tomorrow ─────────────────────────────────
const checkUpcomingEvents = async (pool) => {
  try {
    const [events] = await pool.execute(
      `SELECT id, tenant_id, title, description, event_date, event_time, location
       FROM company_events
       WHERE event_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
    );

    for (const event of events) {
      const timeStr = event.event_time ? ` at ${event.event_time}` : '';
      const locStr  = event.location   ? ` — ${event.location}`    : '';
      const desc    = event.description ? ` ${event.description}`   : '';
      const msg     = `Reminder: "${event.title}" is scheduled tomorrow (${event.event_date})${timeStr}${locStr}.${desc}`;
      const title   = `Upcoming Event Tomorrow: ${event.title} 📅`;

      // Get all active employees for this tenant
      const [users] = await pool.execute(
        `SELECT u.id FROM users u
         WHERE u.tenant_id = ? AND u.is_active = 1`,
        [event.tenant_id]
      );

      for (const user of users) {
        await pushNotification(pool, event.tenant_id, user.id, title, msg, 'event');
      }
    }
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') {
      console.error('[HR Automation] Events check error:', err.message);
    }
  }
};

// ── Main runner ──────────────────────────────────────────────────────────────
const runHrAutomation = async (pool) => {
  console.log('[HR Automation] Running scheduled checks…');
  await Promise.allSettled([
    checkProbationEnding(pool),
    checkContractExpiry(pool),
    checkInternshipEnding(pool),
    checkDocumentExpiry(pool),
    checkLowAttendance(pool),
    checkBirthdays(pool),
    checkWorkAnniversaries(pool),
    checkUpcomingEvents(pool),
  ]);
  console.log('[HR Automation] Checks complete.');
};

module.exports = { runHrAutomation, ALERT_TYPES };
