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
      await addColumnIfMissing('leave_requests', 'tl_status', "tl_status ENUM('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending' AFTER approval_level");
      await addColumnIfMissing('leave_requests', 'tl_approved_by', 'tl_approved_by INT NULL AFTER tl_status');
      await addColumnIfMissing('leave_requests', 'tl_approved_at', 'tl_approved_at DATETIME NULL AFTER tl_approved_by');
      await addColumnIfMissing('leave_requests', 'tl_remarks', "tl_remarks TEXT NULL AFTER tl_approved_at");
      // Client approval stage (replaces pl)
      await addColumnIfMissing('leave_requests', 'client_status', "client_status ENUM('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending' AFTER tl_remarks");
      await addColumnIfMissing('leave_requests', 'client_approved_by', 'client_approved_by INT NULL AFTER client_status');
      await addColumnIfMissing('leave_requests', 'client_approved_at', 'client_approved_at DATETIME NULL AFTER client_approved_by');
      await addColumnIfMissing('leave_requests', 'client_remarks', "client_remarks TEXT NULL AFTER client_approved_at");
      // Legacy pl columns kept for backward compat
      await addColumnIfMissing('leave_requests', 'pl_status', "pl_status ENUM('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending' AFTER client_remarks");
      await addColumnIfMissing('leave_requests', 'pl_approved_by', 'pl_approved_by INT NULL AFTER pl_status');
      await addColumnIfMissing('leave_requests', 'pl_approved_at', 'pl_approved_at DATETIME NULL AFTER pl_approved_by');
      await addColumnIfMissing('leave_requests', 'hr_status', "hr_status ENUM('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending' AFTER pl_approved_at");
      await addColumnIfMissing('leave_requests', 'hr_approved_by', 'hr_approved_by INT NULL AFTER hr_status');
      await addColumnIfMissing('leave_requests', 'hr_approved_at', 'hr_approved_at DATETIME NULL AFTER hr_approved_by');
      await addColumnIfMissing('leave_requests', 'hr_remarks', "hr_remarks TEXT NULL AFTER hr_approved_at");
      await addColumnIfMissing('leave_requests', 'rejection_reason', "rejection_reason TEXT NULL AFTER hr_remarks");
      await addColumnIfMissing('leave_requests', 'deleted_at', "deleted_at DATETIME NULL AFTER rejection_reason");
      await addColumnIfMissing('leave_requests', 'deleted_by', "deleted_by INT NULL AFTER deleted_at");
      await addColumnIfMissing('leave_requests', 'created_by', "created_by INT NULL AFTER deleted_by");
      await addColumnIfMissing('leave_requests', 'updated_by', "updated_by INT NULL AFTER created_by");

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
      // employee_id stores employee_details.id (INT PK), not the varchar employee code
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS leave_balances (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          employee_id INT NOT NULL,
          leave_type VARCHAR(50) NOT NULL,
          year INT NOT NULL,
          allocated INT NOT NULL DEFAULT 0,
          used INT NOT NULL DEFAULT 0,
          pending INT NOT NULL DEFAULT 0,
          UNIQUE KEY uq_balance (tenant_id, employee_id, leave_type, year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `);

      // 4. Leave audit trail table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS leave_audit_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          leave_id INT NOT NULL,
          actor_id INT NOT NULL,
          actor_role VARCHAR(30) NOT NULL,
          action ENUM('submitted','tl_approved','tl_rejected','client_approved','client_rejected','hr_approved','hr_rejected','admin_approved','admin_rejected','cancelled','deleted') NOT NULL,
          remarks TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_leave_audit_leave (leave_id),
          INDEX idx_leave_audit_tenant (tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `);

      // 5. Foreign keys
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
