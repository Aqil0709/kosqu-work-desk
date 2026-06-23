const { pool } = require('../../config/db');

async function ensurePayrollComplianceSchema() {
  // Investment declarations (12BB)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS investment_declarations (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT    NOT NULL,
      employee_id     INT    NOT NULL,
      financial_year  VARCHAR(10) NOT NULL,
      sec_80c         DECIMAL(12,2) DEFAULT 0,
      sec_80d         DECIMAL(12,2) DEFAULT 0,
      sec_80e         DECIMAL(12,2) DEFAULT 0,
      sec_80g         DECIMAL(12,2) DEFAULT 0,
      sec_80tta       DECIMAL(12,2) DEFAULT 0,
      hra_claimed     DECIMAL(12,2) DEFAULT 0,
      lta_claimed     DECIMAL(12,2) DEFAULT 0,
      other_deductions DECIMAL(12,2) DEFAULT 0,
      declaration_date DATE DEFAULT NULL,
      status          ENUM('draft','submitted','approved','rejected') DEFAULT 'draft',
      approved_by     INT DEFAULT NULL,
      remarks         TEXT DEFAULT NULL,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_emp_fy (tenant_id, employee_id, financial_year),
      INDEX idx_tenant_fy (tenant_id, financial_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // TDS computation results (monthly)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tds_computations (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT    NOT NULL,
      employee_id     INT    NOT NULL,
      financial_year  VARCHAR(10) NOT NULL,
      month           TINYINT NOT NULL,
      gross_salary    DECIMAL(12,2) DEFAULT 0,
      hra_exempt      DECIMAL(12,2) DEFAULT 0,
      standard_deduction DECIMAL(12,2) DEFAULT 50000,
      total_deductions DECIMAL(12,2) DEFAULT 0,
      taxable_income  DECIMAL(12,2) DEFAULT 0,
      tax_liability   DECIMAL(12,2) DEFAULT 0,
      surcharge       DECIMAL(12,2) DEFAULT 0,
      health_ed_cess  DECIMAL(12,2) DEFAULT 0,
      total_tax       DECIMAL(12,2) DEFAULT 0,
      tds_deducted    DECIMAL(12,2) DEFAULT 0,
      regime          ENUM('old','new') DEFAULT 'new',
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_emp_fy_month (tenant_id, employee_id, financial_year, month),
      INDEX idx_tenant_fy (tenant_id, financial_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // PF contributions
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS pf_contributions (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT    NOT NULL,
      employee_id     INT    NOT NULL,
      month           VARCHAR(7) NOT NULL,
      uan_number      VARCHAR(20) DEFAULT NULL,
      pf_wages        DECIMAL(12,2) DEFAULT 0,
      employee_pf     DECIMAL(12,2) DEFAULT 0,
      employer_eps    DECIMAL(12,2) DEFAULT 0,
      employer_epf    DECIMAL(12,2) DEFAULT 0,
      employer_edli   DECIMAL(12,2) DEFAULT 0,
      admin_charges   DECIMAL(12,2) DEFAULT 0,
      total_liability DECIMAL(12,2) DEFAULT 0,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_emp_month (tenant_id, employee_id, month),
      INDEX idx_tenant_month (tenant_id, month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ESIC contributions
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS esic_contributions (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT    NOT NULL,
      employee_id     INT    NOT NULL,
      month           VARCHAR(7) NOT NULL,
      esic_number     VARCHAR(20) DEFAULT NULL,
      gross_wages     DECIMAL(12,2) DEFAULT 0,
      employee_esic   DECIMAL(12,2) DEFAULT 0,
      employer_esic   DECIMAL(12,2) DEFAULT 0,
      total_esic      DECIMAL(12,2) DEFAULT 0,
      is_esic_eligible TINYINT(1) DEFAULT 1,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_emp_month (tenant_id, employee_id, month),
      INDEX idx_tenant_month (tenant_id, month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Professional Tax
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS professional_tax (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT    NOT NULL,
      employee_id     INT    NOT NULL,
      month           VARCHAR(7) NOT NULL,
      state_code      VARCHAR(5) DEFAULT 'MH',
      gross_salary    DECIMAL(12,2) DEFAULT 0,
      pt_deducted     DECIMAL(12,2) DEFAULT 0,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_emp_month (tenant_id, employee_id, month),
      INDEX idx_tenant_month (tenant_id, month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Compliance settings per tenant
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payroll_compliance_settings (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT NOT NULL UNIQUE,
      pf_applicable   TINYINT(1) DEFAULT 1,
      esic_applicable TINYINT(1) DEFAULT 1,
      pt_state        VARCHAR(5) DEFAULT 'MH',
      default_regime  ENUM('old','new') DEFAULT 'new',
      pf_wage_ceiling DECIMAL(12,2) DEFAULT 15000,
      esic_wage_ceiling DECIMAL(12,2) DEFAULT 21000,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensurePayrollComplianceSchema };
