const { pool } = require('../../config/db');

let schemaReady;

const ensureServiceSettingSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS service_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          setting_type VARCHAR(50) NOT NULL,
          account_holder VARCHAR(255) NULL,
          account_number VARCHAR(100) NULL,
          bank_name VARCHAR(255) NULL,
          ifsc_code VARCHAR(50) NULL,
          branch VARCHAR(255) NULL,
          account_type VARCHAR(50) NULL,
          gstin VARCHAR(50) NULL,
          pan_number VARCHAR(50) NULL,
          hsn_code VARCHAR(50) NULL,
          tax_rate DECIMAL(8, 2) NULL,
          is_gst_applicable TINYINT(1) NOT NULL DEFAULT 1,
          sgst_rate DECIMAL(8, 2) NULL,
          cgst_rate DECIMAL(8, 2) NULL,
          igst_rate DECIMAL(8, 2) NULL,
          smtp_host VARCHAR(255) NULL,
          smtp_port INT NULL,
          smtp_user VARCHAR(255) NULL,
          smtp_password VARCHAR(1024) NULL,
          smtp_from_email VARCHAR(255) NULL,
          smtp_from_name VARCHAR(255) NULL,
          smtp_encryption ENUM('none', 'tls', 'ssl') NOT NULL DEFAULT 'tls',
          smtp_secure TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_service_settings_tenant_type (tenant_id, setting_type)
        )
      `);

      const [columns] = await pool.execute('SHOW COLUMNS FROM service_settings');
      const columnNames = new Set(columns.map((column) => column.Field));

      const alterStatements = [];
      if (columnNames.has('smtp_password')) {
        alterStatements.push('MODIFY COLUMN smtp_password VARCHAR(1024) NULL');
      }
      if (!columnNames.has('smtp_from_email')) {
        alterStatements.push('ADD COLUMN smtp_from_email VARCHAR(255) NULL');
      }
      if (!columnNames.has('smtp_from_name')) {
        alterStatements.push('ADD COLUMN smtp_from_name VARCHAR(255) NULL');
      }
      if (!columnNames.has('smtp_encryption')) {
        alterStatements.push("ADD COLUMN smtp_encryption ENUM('none', 'tls', 'ssl') NOT NULL DEFAULT 'tls'");
      }

      if (alterStatements.length > 0) {
        await pool.execute(`ALTER TABLE service_settings ${alterStatements.join(', ')}`);
      }
    })();
  }

  return schemaReady;
};

module.exports = { ensureServiceSettingSchema };
