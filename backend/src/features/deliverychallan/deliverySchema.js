const { pool } = require('../../config/db');
const {
  addColumnIfMissing,
  addForeignKeyIfMissing,
  addIndexIfMissing,
} = require('../../utils/schemaHelpers');

let schemaReady;

const ensureDeliverySchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS delivery_challans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          client_id INT NULL,
          project_id INT NULL,
          service_id INT NULL,
          challan_no VARCHAR(100) NOT NULL,
          challan_date DATE NOT NULL,
          destination VARCHAR(255) NULL,
          dispatched_through VARCHAR(255) NULL,
          to_address TEXT NULL,
          from_address TEXT NULL,
          contact_info TEXT NULL,
          payment_info TEXT NULL,
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_delivery_challan_tenant_no (tenant_id, challan_no),
          INDEX idx_delivery_challans_tenant (tenant_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS delivery_challan_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          challan_id INT NOT NULL,
          sr_no INT NULL,
          description TEXT NULL,
          quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_delivery_items_challan (challan_id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS delivery_challan_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          challan_id INT NOT NULL,
          date DATE NULL,
          action VARCHAR(255) NULL,
          user VARCHAR(255) NULL,
          follow_up TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_delivery_history_challan (challan_id)
        )
      `);

      await addColumnIfMissing('delivery_challans', 'client_id', 'client_id INT NULL AFTER tenant_id');
      await addColumnIfMissing('delivery_challans', 'project_id', 'project_id INT NULL AFTER client_id');
      await addColumnIfMissing('delivery_challans', 'service_id', 'service_id INT NULL AFTER project_id');

      await addIndexIfMissing('delivery_challans', 'idx_delivery_challans_client', 'INDEX idx_delivery_challans_client (client_id)');
      await addIndexIfMissing('delivery_challans', 'idx_delivery_challans_project', 'INDEX idx_delivery_challans_project (project_id)');
      await addIndexIfMissing('delivery_challans', 'idx_delivery_challans_service', 'INDEX idx_delivery_challans_service (service_id)');

      await addForeignKeyIfMissing(
        'delivery_challans',
        'fk_delivery_challans_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'delivery_challans',
        'fk_delivery_challans_client',
        'FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'delivery_challans',
        'fk_delivery_challans_project',
        'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'delivery_challans',
        'fk_delivery_challans_service',
        'FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'delivery_challans',
        'fk_delivery_challans_created_by',
        'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL'
      );
      await addForeignKeyIfMissing(
        'delivery_challan_items',
        'fk_delivery_items_challan',
        'FOREIGN KEY (challan_id) REFERENCES delivery_challans(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'delivery_challan_history',
        'fk_delivery_history_challan',
        'FOREIGN KEY (challan_id) REFERENCES delivery_challans(id) ON DELETE CASCADE'
      );
    })();
  }

  return schemaReady;
};

module.exports = { ensureDeliverySchema };
