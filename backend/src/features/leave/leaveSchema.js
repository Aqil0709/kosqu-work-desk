const { pool } = require('../../config/db');
const { addColumnIfMissing, addForeignKeyIfMissing } = require('../../utils/schemaHelpers');

let schemaReady;

const ensureLeaveSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      // 1. Add leave_type to leave_requests table if missing
      await addColumnIfMissing('leave_requests', 'leave_type', "leave_type VARCHAR(50) NOT NULL DEFAULT 'Casual' AFTER employee_id");
      await addColumnIfMissing('leave_requests', 'is_paid', 'is_paid TINYINT(1) NULL AFTER leave_type');

      // 2. Sequential approval workflow columns
      await addColumnIfMissing('leave_requests', 'approval_level', "approval_level VARCHAR(10) NOT NULL DEFAULT 'tl' AFTER status");
      await addColumnIfMissing('leave_requests', 'tl_status', "tl_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER approval_level");
      await addColumnIfMissing('leave_requests', 'tl_approved_by', 'tl_approved_by INT NULL AFTER tl_status');
      await addColumnIfMissing('leave_requests', 'tl_approved_at', 'tl_approved_at DATETIME NULL AFTER tl_approved_by');
      await addColumnIfMissing('leave_requests', 'pl_status', "pl_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER tl_approved_at");
      await addColumnIfMissing('leave_requests', 'pl_approved_by', 'pl_approved_by INT NULL AFTER pl_status');
      await addColumnIfMissing('leave_requests', 'pl_approved_at', 'pl_approved_at DATETIME NULL AFTER pl_approved_by');
      await addColumnIfMissing('leave_requests', 'hr_status', "hr_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER pl_approved_at");
      await addColumnIfMissing('leave_requests', 'hr_approved_by', 'hr_approved_by INT NULL AFTER hr_status');
      await addColumnIfMissing('leave_requests', 'hr_approved_at', 'hr_approved_at DATETIME NULL AFTER hr_approved_by');

      // 2. Create leave_types table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS leave_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          name VARCHAR(50) NOT NULL,
          max_days INT NOT NULL DEFAULT 0,
          is_paid TINYINT(1) DEFAULT 1,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_leave_type_tenant_name (tenant_id, name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `);

      // 3. Create leave_balances table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS leave_balances (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          employee_id VARCHAR(20) NOT NULL,
          leave_type VARCHAR(50) NOT NULL,
          year INT NOT NULL,
          allocated INT NOT NULL DEFAULT 0,
          used INT NOT NULL DEFAULT 0,
          pending INT NOT NULL DEFAULT 0,
          UNIQUE KEY uq_balance (tenant_id, employee_id, leave_type, year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `);

      // 4. Foreign keys
      await addForeignKeyIfMissing(
        'leave_types',
        'fk_leave_types_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'leave_balances',
        'fk_leave_balances_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'leave_balances',
        'fk_leave_balances_employee',
        'FOREIGN KEY (employee_id) REFERENCES employee_details(id) ON DELETE CASCADE'
      );
    })();
  }

  return schemaReady;
};

module.exports = { ensureLeaveSchema };
