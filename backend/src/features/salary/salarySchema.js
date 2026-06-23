const { pool } = require('../../config/db');
const { addForeignKeyIfMissing, modifyColumnIfExists } = require('../../utils/schemaHelpers');

let schemaReady;

const ignoreDuplicateColumn = (error) => {
  if (error.code !== 'ER_DUP_FIELDNAME') throw error;
};

const addColumnIfMissing = async (table, definition) => {
  try {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  } catch (error) {
    ignoreDuplicateColumn(error);
  }
};

const ensureSalarySchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS tb_salary_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          employee_id VARCHAR(50) NOT NULL,
          month VARCHAR(20) NOT NULL,
          month_number INT NOT NULL,
          year INT NOT NULL,
          basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
          gross_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
          deduction_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
          paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          balance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          payment_date DATE NULL,
          payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
          details JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_tb_salary_period (tenant_id, employee_id, month_number, year),
          INDEX idx_tb_salary_tenant_period (tenant_id, month_number, year),
          INDEX idx_tb_salary_employee (employee_id)
        )
      `);

      await addColumnIfMissing('tb_salary_records', 'gross_salary DECIMAL(12, 2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'deduction_amount DECIMAL(12, 2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'balance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', "payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'");
      await addColumnIfMissing('tb_salary_records', 'details JSON NULL');
      await modifyColumnIfExists('tb_salary_payments', 'recorded_by', 'recorded_by INT NULL');

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS tb_salary_payments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          salary_record_id INT NOT NULL,
          amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          payment_method VARCHAR(80) NULL,
          transaction_id VARCHAR(255) NULL,
          notes TEXT NULL,
          recorded_by INT NULL,
          tenant_id INT NOT NULL,
          payment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_tb_salary_payments_record (salary_record_id),
          INDEX idx_tb_salary_payments_tenant (tenant_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS tb_holidays (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          date DATE NOT NULL,
          description TEXT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_tb_holidays_tenant_date (tenant_id, date),
          INDEX idx_tb_holidays_tenant_date (tenant_id, date)
        )
      `);

      await addForeignKeyIfMissing(
        'tb_salary_records',
        'fk_tb_salary_records_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'tb_salary_records',
        'fk_tb_salary_records_employee',
        'FOREIGN KEY (employee_id) REFERENCES employee_details(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'tb_salary_payments',
        'fk_tb_salary_payments_record',
        'FOREIGN KEY (salary_record_id) REFERENCES tb_salary_records(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'tb_salary_payments',
        'fk_tb_salary_payments_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'tb_salary_payments',
        'fk_tb_salary_payments_recorded_by',
        'FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'tb_holidays',
        'fk_tb_holidays_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );

      // ── Extended salary record fields ──────────────────────────────────
      await addColumnIfMissing('tb_salary_records', 'pf_amount DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'employer_pf_amount DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'esic_amount DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'employer_esic_amount DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'professional_tax DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'tds_amount DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'bonus DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'incentives DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'reimbursements DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'other_deductions DECIMAL(12,2) NOT NULL DEFAULT 0');
      await addColumnIfMissing('tb_salary_records', 'employment_category VARCHAR(20) DEFAULT NULL');

      // ── Designation-based salary rules ─────────────────────────────────
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS salary_designation_rules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          designation VARCHAR(100) NOT NULL,
          basic_percentage DECIMAL(5,2) DEFAULT 40.00,
          hra_percentage DECIMAL(5,2) DEFAULT 20.00,
          medical_allowance DECIMAL(12,2) DEFAULT 1250.00,
          travel_allowance DECIMAL(12,2) DEFAULT 800.00,
          pf_applicable TINYINT(1) DEFAULT 1,
          tds_applicable TINYINT(1) DEFAULT 0,
          tds_percentage DECIMAL(5,2) DEFAULT 0,
          bonus_percentage DECIMAL(5,2) DEFAULT 0,
          incentive_percentage DECIMAL(5,2) DEFAULT 0,
          is_active TINYINT(1) DEFAULT 1,
          notes TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_sdr_tenant_designation (tenant_id, designation),
          INDEX idx_sdr_tenant (tenant_id)
        )
      `);
    })();
  }

  return schemaReady;
};

module.exports = { ensureSalarySchema };
