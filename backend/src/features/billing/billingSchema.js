const { pool } = require('../../config/db');
const {
  addColumnIfMissing,
  addForeignKeyIfMissing,
  addIndexIfMissing,
} = require('../../utils/schemaHelpers');

let schemaReady;

const ensureBillingSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          client_id INT NULL,
          project_id INT NULL,
          service_id INT NULL,
          invoice_no VARCHAR(100) NOT NULL,
          invoice_date DATE NOT NULL,
          ref_no VARCHAR(100) NULL,
          buyer_gstin VARCHAR(50) NULL,
          party_address TEXT NULL,
          total_before_discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          round_off DECIMAL(12, 2) NOT NULL DEFAULT 0,
          total_after_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
          status VARCHAR(50) NOT NULL DEFAULT 'draft',
          created_by INT NULL,
          service_bank_details JSON NULL,
          service_gst_details JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_invoices_tenant_no (tenant_id, invoice_no),
          INDEX idx_invoices_tenant (tenant_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          invoice_id INT NOT NULL,
          sr_no INT NULL,
          description TEXT NULL,
          hsn_code VARCHAR(50) NULL,
          quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
          rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
          total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_invoice_items_invoice (invoice_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS gst_details (
          id INT AUTO_INCREMENT PRIMARY KEY,
          invoice_id INT NOT NULL,
          tax_type VARCHAR(50) NULL,
          percentage DECIMAL(8, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_gst_details_invoice (invoice_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS invoice_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          invoice_id INT NOT NULL,
          date DATE NULL,
          action VARCHAR(255) NULL,
          user VARCHAR(255) NULL,
          follow_up TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_invoice_history_invoice (invoice_id)
        )
      `);

      await addColumnIfMissing('invoices', 'client_id', 'client_id INT NULL AFTER tenant_id');
      await addColumnIfMissing('invoices', 'project_id', 'project_id INT NULL AFTER client_id');
      await addColumnIfMissing('invoices', 'service_id', 'service_id INT NULL AFTER project_id');

      await addIndexIfMissing('invoices', 'idx_invoices_client', 'INDEX idx_invoices_client (client_id)');
      await addIndexIfMissing('invoices', 'idx_invoices_project', 'INDEX idx_invoices_project (project_id)');
      await addIndexIfMissing('invoices', 'idx_invoices_service', 'INDEX idx_invoices_service (service_id)');

      await addForeignKeyIfMissing(
        'invoices',
        'fk_invoices_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'invoices',
        'fk_invoices_client',
        'FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'invoices',
        'fk_invoices_project',
        'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'invoices',
        'fk_invoices_service',
        'FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'invoices',
        'fk_invoices_created_by',
        'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'invoice_items',
        'fk_invoice_items_invoice',
        'FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'gst_details',
        'fk_gst_details_invoice',
        'FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'invoice_history',
        'fk_invoice_history_invoice',
        'FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE'
      );
    })();
  }

  return schemaReady;
};

module.exports = { ensureBillingSchema };
