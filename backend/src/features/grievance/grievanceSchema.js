const { pool } = require('../../config/db');

async function ensureGrievanceSchema() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS grievances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        ticket_no VARCHAR(30) NOT NULL,
        complainant_id INT,
        is_anonymous TINYINT(1) DEFAULT 0,
        category ENUM('harassment','posh','discrimination','workplace_conflict','policy_violation','other') NOT NULL DEFAULT 'other',
        subject VARCHAR(300) NOT NULL,
        description TEXT NOT NULL,
        incident_date DATE,
        accused_name VARCHAR(200),
        accused_employee_id INT,
        witnesses TEXT,
        evidence_paths TEXT,
        priority ENUM('low','medium','high','critical') DEFAULT 'medium',
        status ENUM('open','under_review','investigating','resolved','closed','withdrawn') DEFAULT 'open',
        assigned_to INT,
        resolution TEXT,
        resolved_at TIMESTAMP NULL,
        closed_at TIMESTAMP NULL,
        sla_due_date DATE,
        is_posh TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id),
        INDEX idx_complainant (complainant_id),
        INDEX idx_status (status),
        INDEX idx_ticket (ticket_no)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS grievance_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        grievance_id INT NOT NULL,
        author_id INT,
        author_name VARCHAR(200),
        comment TEXT NOT NULL,
        is_internal TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_grievance (grievance_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS grievance_escalations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        grievance_id INT NOT NULL,
        escalated_by INT,
        escalated_to INT,
        reason TEXT,
        escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_grievance (grievance_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // POSH committee members
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS posh_committee (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        designation VARCHAR(200),
        role ENUM('presiding_officer','member','external_member') DEFAULT 'member',
        is_active TINYINT(1) DEFAULT 1,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id),
        UNIQUE KEY uq_tenant_user (tenant_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } finally {
    conn.release();
  }
}

module.exports = { ensureGrievanceSchema };
