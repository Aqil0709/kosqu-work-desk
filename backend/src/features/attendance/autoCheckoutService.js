const Attendance = require('./attendanceModel');
const { pool } = require('../../config/db');
const { getIndiaDateTime } = require('../../utils/indiaTime');

let schedulerTimer = null;
let isRunning = false;

const AUTO_CHECKOUT_INTERVAL_MS = Number(process.env.AUTO_CHECKOUT_INTERVAL_MS || 60 * 1000);

const findAutoCheckoutCandidates = async (currentDateTime) => {
  const [rows] = await pool.execute(
    `SELECT
        a.tenant_id,
        a.employee_id,
        DATE_FORMAT(a.date, '%Y-%m-%d') as date,
        DATE_FORMAT(a.check_in, '%Y-%m-%d %H:%i:%s') as check_in_at,
        s.shift_name,
        TIME_FORMAT(s.check_out_time, '%H:%i:%s') as shift_check_out_time,
        DATE_FORMAT(
          CASE
            WHEN s.check_out_time <= s.check_in_time
              THEN DATE_ADD(TIMESTAMP(a.date, s.check_out_time), INTERVAL 1 DAY)
            ELSE TIMESTAMP(a.date, s.check_out_time)
          END,
          '%Y-%m-%d %H:%i:%s'
        ) as scheduled_check_out
      FROM tb_attendance a
      INNER JOIN employee_details ed
        ON ed.id = a.employee_id
        AND ed.tenant_id = a.tenant_id
      INNER JOIN users u
        ON u.id = ed.employee_id
        AND u.tenant_id = ed.tenant_id
      INNER JOIN tb_shifts s
        ON s.shift_id = a.shift_id
        AND s.tenant_id = a.tenant_id
      WHERE ed.auto_checkout_enabled = 1
        AND ed.status = 'active'
        AND u.is_active = 1
        AND a.check_in IS NOT NULL
        AND a.check_out IS NULL
        AND a.status IN ('Present', 'Delayed', 'Half Day')
      HAVING scheduled_check_out <= ?
        AND scheduled_check_out > check_in_at
      ORDER BY scheduled_check_out ASC
      LIMIT 200`,
    [currentDateTime]
  );

  return rows;
};

const runAutoCheckout = async () => {
  if (isRunning) {
    return { success: true, skipped: true, checkedOutCount: 0, totalCandidates: 0 };
  }

  isRunning = true;
  const currentDateTime = getIndiaDateTime();

  try {
    const candidates = await findAutoCheckoutCandidates(currentDateTime);
    let checkedOutCount = 0;
    const errors = [];

    for (const candidate of candidates) {
      try {
        await Attendance.updateCheckOut(
          candidate.tenant_id,
          candidate.employee_id,
          candidate.date,
          candidate.scheduled_check_out,
          null,
          null,
          `Auto checked out at assigned shift end (${candidate.shift_name} - ${candidate.shift_check_out_time})`
        );
        checkedOutCount += 1;
      } catch (error) {
        errors.push({
          employee_id: candidate.employee_id,
          date: candidate.date,
          message: error.message
        });
      }
    }

    return {
      success: true,
      checkedOutCount,
      totalCandidates: candidates.length,
      errors
    };
  } finally {
    isRunning = false;
  }
};

const startAutoCheckoutScheduler = (logger = console) => {
  if (schedulerTimer) return schedulerTimer;

  schedulerTimer = setInterval(async () => {
    try {
      const result = await runAutoCheckout();
      if (result.checkedOutCount > 0) {
        logger.info?.(`Auto checkout completed for ${result.checkedOutCount} employee(s).`);
      }
      if (result.errors?.length) {
        logger.warn?.('Auto checkout completed with errors', { errors: result.errors });
      }
    } catch (error) {
      logger.error?.('Auto checkout scheduler failed', { error });
    }
  }, AUTO_CHECKOUT_INTERVAL_MS);

  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }

  logger.info?.(`Auto checkout scheduler started. Interval: ${AUTO_CHECKOUT_INTERVAL_MS}ms`);
  return schedulerTimer;
};

module.exports = {
  findAutoCheckoutCandidates,
  runAutoCheckout,
  startAutoCheckoutScheduler
};
