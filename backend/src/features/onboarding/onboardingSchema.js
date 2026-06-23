const { pool } = require('../../config/db');

async function ensureOnboardingSchema() {
  const conn = await pool.getConnection();
  try {
    // Onboarding checklists templates (admin defines per tenant)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS onboarding_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        type ENUM('onboarding','offboarding') NOT NULL DEFAULT 'onboarding',
        department VARCHAR(100),
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Checklist items inside a template
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS onboarding_template_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        template_id INT NOT NULL,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        assigned_to_role ENUM('hr','it','admin','manager','employee') DEFAULT 'hr',
        due_days INT DEFAULT 1,
        is_required TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        INDEX idx_template (template_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Per-employee onboarding/offboarding process instance
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS onboarding_processes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        employee_id INT NOT NULL,
        template_id INT,
        type ENUM('onboarding','offboarding') NOT NULL DEFAULT 'onboarding',
        status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
        start_date DATE,
        expected_end_date DATE,
        actual_end_date DATE,
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id),
        INDEX idx_employee (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Tasks per process instance (copied from template + ad-hoc)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS onboarding_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        process_id INT NOT NULL,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        assigned_to INT,
        assigned_to_role ENUM('hr','it','admin','manager','employee') DEFAULT 'hr',
        due_date DATE,
        status ENUM('pending','in_progress','completed','skipped') DEFAULT 'pending',
        completed_at TIMESTAMP NULL,
        completed_by INT,
        notes TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_process (process_id),
        INDEX idx_tenant (tenant_id),
        INDEX idx_assigned (assigned_to)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Documents collected during onboarding
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS onboarding_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        process_id INT NOT NULL,
        employee_id INT NOT NULL,
        document_name VARCHAR(200) NOT NULL,
        document_type VARCHAR(100),
        file_path VARCHAR(500),
        status ENUM('pending','submitted','verified','rejected') DEFAULT 'pending',
        verified_by INT,
        verified_at TIMESTAMP NULL,
        remarks TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_process (process_id),
        INDEX idx_employee (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } finally {
    conn.release();
  }
}

module.exports = { ensureOnboardingSchema };
