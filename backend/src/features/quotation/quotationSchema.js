const { pool } = require('../../config/db');
const {
  addColumnIfMissing,
  addForeignKeyIfMissing,
  addIndexIfMissing,
} = require('../../utils/schemaHelpers');

let schemaReady;

const ensureQuotationSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS quotations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          client_id INT NULL,
          project_id INT NULL,
          service_id INT NULL,
          quotation_no VARCHAR(100) NOT NULL,
          quotation_date DATE NOT NULL,
          ref_no VARCHAR(100) NULL,
          buyer_gstin VARCHAR(50) NULL,
          party_address TEXT NULL,
          total_before_discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          round_off DECIMAL(12, 2) NOT NULL DEFAULT 0,
          total_after_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
          valid_until DATE NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'draft',
          created_by INT NULL,
          service_bank_details JSON NULL,
          service_gst_details JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_quotations_tenant_no (tenant_id, quotation_no),
          INDEX idx_quotations_tenant (tenant_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS quotation_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          quotation_id INT NOT NULL,
          sr_no INT NULL,
          description TEXT NULL,
          quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
          rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
          total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_quotation_items_quotation (quotation_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS quotation_gst_details (
          id INT AUTO_INCREMENT PRIMARY KEY,
          quotation_id INT NOT NULL,
          tax_type VARCHAR(50) NULL,
          percentage DECIMAL(8, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_quotation_gst_quotation (quotation_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS quotation_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          quotation_id INT NOT NULL,
          date DATE NULL,
          action VARCHAR(255) NULL,
          user VARCHAR(255) NULL,
          follow_up TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_quotation_history_quotation (quotation_id)
        )
      `);

      await addColumnIfMissing('quotations', 'client_id', 'client_id INT NULL AFTER tenant_id');
      await addColumnIfMissing('quotations', 'project_id', 'project_id INT NULL AFTER client_id');
      await addColumnIfMissing('quotations', 'service_id', 'service_id INT NULL AFTER project_id');

      await addIndexIfMissing('quotations', 'idx_quotations_client', 'INDEX idx_quotations_client (client_id)');
      await addIndexIfMissing('quotations', 'idx_quotations_project', 'INDEX idx_quotations_project (project_id)');
      await addIndexIfMissing('quotations', 'idx_quotations_service', 'INDEX idx_quotations_service (service_id)');

      await addForeignKeyIfMissing(
        'quotations',
        'fk_quotations_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'quotations',
        'fk_quotations_client',
        'FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'quotations',
        'fk_quotations_project',
        'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'quotations',
        'fk_quotations_service',
        'FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'quotations',
        'fk_quotations_created_by',
        'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'quotation_items',
        'fk_quotation_items_quotation',
        'FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'quotation_gst_details',
        'fk_quotation_gst_details_quotation',
        'FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'quotation_history',
        'fk_quotation_history_quotation',
        'FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE'
      );
    })();
  }

  return schemaReady;
};

module.exports = { ensureQuotationSchema };
