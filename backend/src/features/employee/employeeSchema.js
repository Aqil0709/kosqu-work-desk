const { pool } = require('../../config/db');

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

const createEmployeeDepartmentsIfMissing = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS employee_departments (
      employee_id VARCHAR(20) NOT NULL,
      department_id INT NOT NULL,
      tenant_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (employee_id, department_id, tenant_id),
      INDEX idx_employee_departments_department (department_id),
      INDEX idx_employee_departments_tenant (tenant_id)
    )
  `);
};

const ensureEmployeeSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      // ── Core employment fields ──────────────────────────────────────────────
      await addColumnIfMissing('users', "gender VARCHAR(20) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "employment_type VARCHAR(50) NULL");
      await addColumnIfMissing('employee_details', "employment_category VARCHAR(20) DEFAULT 'employee'");
      await addColumnIfMissing('employee_details', "last_working_date DATE NULL");

      // ── Notice Period ───────────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "notice_period VARCHAR(30) DEFAULT NULL");

      // ── Experience ─────────────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "years_of_experience DECIMAL(4,1) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "previous_company VARCHAR(200) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "previous_designation VARCHAR(100) DEFAULT NULL");

      // ── Reporting Structure ─────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "reporting_manager_id INT DEFAULT NULL");
      await addColumnIfMissing('employee_details', "team_lead_id INT DEFAULT NULL");
      await addColumnIfMissing('employee_details', "project_lead_id INT DEFAULT NULL");
      await addColumnIfMissing('employee_details', "client_id INT DEFAULT NULL");
      await addColumnIfMissing('employee_details', "work_location VARCHAR(50) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "shift_id INT DEFAULT NULL");

      // ── Salary components ───────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "salary_basic DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_hra DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_medical_allowance DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_travel_allowance DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_other_allowance DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_gross DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_pf DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_esic DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_professional_tax DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_lwf DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_total_deduction DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "salary_net DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "employer_pf DECIMAL(12,2) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "employer_esic DECIMAL(12,2) NOT NULL DEFAULT 0");

      // ── PF Management ───────────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "pf_applicable TINYINT(1) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "pf_number VARCHAR(50) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "uan_number VARCHAR(50) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "employee_pf_contribution DECIMAL(5,2) DEFAULT 12.00");
      await addColumnIfMissing('employee_details', "employer_pf_contribution DECIMAL(5,2) DEFAULT 13.00");
      await addColumnIfMissing('employee_details', "epf_fixed_amount DECIMAL(12,2) DEFAULT NULL");

      // ── TDS Management ──────────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "tds_applicable TINYINT(1) NOT NULL DEFAULT 0");
      await addColumnIfMissing('employee_details', "tds_percentage DECIMAL(5,2) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "tds_amount DECIMAL(12,2) DEFAULT 0");
      await addColumnIfMissing('employee_details', "tds_category VARCHAR(50) DEFAULT NULL");

      // ── Bonus & incentives ──────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "bonus DECIMAL(12,2) DEFAULT 0");
      await addColumnIfMissing('employee_details', "incentives DECIMAL(12,2) DEFAULT 0");
      await addColumnIfMissing('employee_details', "reimbursements DECIMAL(12,2) DEFAULT 0");
      await addColumnIfMissing('employee_details', "other_deductions DECIMAL(12,2) DEFAULT 0");

      // ── Consultant-specific fields ──────────────────────────────────────────
      await addColumnIfMissing('employee_details', "gst_number VARCHAR(20) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "consultant_type VARCHAR(100) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "contract_duration VARCHAR(50) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "contract_start_date DATE DEFAULT NULL");
      await addColumnIfMissing('employee_details', "contract_end_date DATE DEFAULT NULL");

      // ── Intern-specific fields ──────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "stipend_amount DECIMAL(12,2) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "college_name VARCHAR(200) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "internship_duration VARCHAR(50) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "internship_start_date DATE DEFAULT NULL");
      await addColumnIfMissing('employee_details', "internship_end_date DATE DEFAULT NULL");
      await addColumnIfMissing('employee_details', "mentor_id INT DEFAULT NULL");

      // ── Misc ────────────────────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "auto_checkout_enabled BOOLEAN NOT NULL DEFAULT FALSE");
      await addColumnIfMissing('employee_details', "probation_end_date DATE DEFAULT NULL");
      await addColumnIfMissing('users', "profile_photo VARCHAR(500) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "cv_path VARCHAR(500) DEFAULT NULL");

      // ── Identity Documents ──────────────────────────────────────────────────
      await addColumnIfMissing('employee_details', "aadhaar_doc_path VARCHAR(500) DEFAULT NULL");
      await addColumnIfMissing('employee_details', "pan_doc_path VARCHAR(500) DEFAULT NULL");

      await createEmployeeDepartmentsIfMissing();

      // ── Employee Documents (expanded types) ──────────────────────────────────
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS employee_documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          employee_user_id INT NOT NULL,
          employee_detail_id VARCHAR(20) DEFAULT NULL,
          doc_type VARCHAR(50) NOT NULL,
          doc_label VARCHAR(100) DEFAULT NULL,
          original_filename VARCHAR(500) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size INT DEFAULT NULL,
          mime_type VARCHAR(100) DEFAULT NULL,
          expiry_date DATE DEFAULT NULL,
          is_verified TINYINT(1) DEFAULT 0,
          verified_by INT DEFAULT NULL,
          verified_at DATETIME DEFAULT NULL,
          uploaded_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_emp_docs (tenant_id, employee_user_id),
          INDEX idx_emp_docs_type (tenant_id, employee_user_id, doc_type),
          INDEX idx_emp_detail (employee_detail_id)
        )
      `);
      // Ensure expiry_date exists on tables created before this column was added
      await addColumnIfMissing('employee_documents', 'expiry_date DATE DEFAULT NULL');

      // ── Designation-based salary rules ──────────────────────────────────────
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
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_tenant_designation (tenant_id, designation)
        )
      `);

      // ── HR Automation Alerts ─────────────────────────────────────────────────
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS hr_alerts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          employee_id VARCHAR(20) NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          alert_message TEXT NOT NULL,
          triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_read TINYINT(1) DEFAULT 0,
          notified_to JSON DEFAULT NULL,
          INDEX idx_hr_alerts (tenant_id, employee_id),
          INDEX idx_hr_alerts_type (tenant_id, alert_type, is_read)
        )
      `);

    })();
  }

  return schemaReady;
};

module.exports = { ensureEmployeeSchema };
