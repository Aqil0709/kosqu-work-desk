const { pool } = require('../../config/db');

async function ensureEmployeeDocumentSchema() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id    INT          NOT NULL,
      employee_id  INT          NOT NULL,
      doc_type     ENUM(
                     'aadhaar','pan','resume','bank_passbook',
                     'experience_certificate','education_certificate',
                     'offer_letter','other'
                   ) NOT NULL DEFAULT 'other',
      doc_label    VARCHAR(200) NOT NULL,
      file_path    VARCHAR(500) NOT NULL,
      file_name    VARCHAR(300) NOT NULL,
      file_size    INT          DEFAULT 0,
      mime_type    VARCHAR(100) DEFAULT NULL,
      uploaded_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant_emp (tenant_id, employee_id),
      INDEX idx_type (doc_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensureEmployeeDocumentSchema };
