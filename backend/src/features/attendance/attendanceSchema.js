const { addColumnIfMissing } = require('../../utils/schemaHelpers');
const { pool } = require('../../config/db');

let schemaReady;

const ensureAttendanceSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      // attendance_history — used by leave approval and auto-absent service
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS attendance_history (
          history_id    BIGINT       NOT NULL AUTO_INCREMENT,
          tenant_id     INT          NOT NULL,
          employee_id   VARCHAR(20)  NOT NULL,
          date          DATE         NOT NULL,
          status        VARCHAR(50)  NOT NULL DEFAULT 'Present',
          description   TEXT         NULL,
          created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (history_id),
          UNIQUE KEY uq_ah_emp_date (tenant_id, employee_id, date),
          KEY idx_ah_tenant (tenant_id),
          KEY idx_ah_date   (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      // Coordinate columns on main attendance table
      await addColumnIfMissing('tb_attendance', 'check_in_latitude',  'check_in_latitude DECIMAL(10, 8) NULL AFTER deduction_reason');
      await addColumnIfMissing('tb_attendance', 'check_in_longitude',  'check_in_longitude DECIMAL(11, 8) NULL AFTER check_in_latitude');
      await addColumnIfMissing('tb_attendance', 'check_out_latitude',  'check_out_latitude DECIMAL(10, 8) NULL AFTER check_in_longitude');
      await addColumnIfMissing('tb_attendance', 'check_out_longitude', 'check_out_longitude DECIMAL(11, 8) NULL AFTER check_out_latitude');
    })();
  }

  return schemaReady;
};

module.exports = { ensureAttendanceSchema };
