const { pool } = require('../../config/db');

const addColumnIfMissing = async (table, column, definition) => {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (rows[0].cnt === 0) {
      await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
    }
  } catch (_) {}
};

async function ensureEmployeeDocumentSchema() {
  // Create with canonical column names (employee_user_id = users.id of the owner)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id           INT          NOT NULL,
      employee_user_id    INT          NOT NULL COMMENT 'FK to users.id',
      doc_type            ENUM(
                            'photo','cv','aadhaar','pan','resume','bank_passbook',
                            'experience_certificate','education_certificate',
                            'offer_letter','other'
                          ) NOT NULL DEFAULT 'other',
      original_filename   VARCHAR(300) NOT NULL DEFAULT '',
      file_path           VARCHAR(500) NOT NULL,
      file_size           INT          DEFAULT 0,
      mime_type           VARCHAR(100) DEFAULT NULL,
      uploaded_by         INT          NULL,
      deleted_at          DATETIME     NULL DEFAULT NULL,
      created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_doc_tenant_user (tenant_id, employee_user_id),
      INDEX idx_doc_type (doc_type),
      INDEX idx_doc_deleted (deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migrate legacy tables that used employee_id instead of employee_user_id
  await addColumnIfMissing('employee_documents', 'employee_user_id',  'INT NOT NULL DEFAULT 0 COMMENT \'FK to users.id\'');
  await addColumnIfMissing('employee_documents', 'original_filename',  'VARCHAR(300) NOT NULL DEFAULT \'\'');
  await addColumnIfMissing('employee_documents', 'uploaded_by',        'INT NULL DEFAULT NULL');
  await addColumnIfMissing('employee_documents', 'deleted_at',         'DATETIME NULL DEFAULT NULL');

  // If the old 'employee_id' column exists but 'employee_user_id' is empty, copy values
  try {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employee_documents' AND COLUMN_NAME = 'employee_id'`
    );
    if (cols.length) {
      await pool.execute(
        `UPDATE employee_documents SET employee_user_id = employee_id WHERE employee_user_id = 0 OR employee_user_id IS NULL`
      );
    }
  } catch (_) {}
}

module.exports = { ensureEmployeeDocumentSchema };
