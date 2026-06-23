const { pool } = require('../../config/db');

async function ensureLeadSchema() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS employee_leads (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id    INT          NOT NULL,
      submitted_by INT          NOT NULL,
      lead_name    VARCHAR(150) NOT NULL,
      company_name VARCHAR(150) DEFAULT NULL,
      email        VARCHAR(150) DEFAULT NULL,
      phone        VARCHAR(30)  DEFAULT NULL,
      source       VARCHAR(80)  DEFAULT NULL,
      industry     VARCHAR(80)  DEFAULT NULL,
      budget       DECIMAL(12,2) DEFAULT NULL,
      requirements TEXT         DEFAULT NULL,
      notes        TEXT         DEFAULT NULL,
      status       ENUM('new','contacted','qualified','lost','converted') NOT NULL DEFAULT 'new',
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_submitted_by (submitted_by),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensureLeadSchema };
