const { pool } = require('../../config/db');
const {
  addColumnIfMissing,
  addForeignKeyIfMissing,
  addIndexIfMissing,
  modifyColumnIfExists,
} = require('../../utils/schemaHelpers');

let schemaReady;

const ensureProjectSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS projects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          client_id INT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT NULL,
          start_date DATE NULL,
          end_date DATE NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_projects_tenant (tenant_id),
          INDEX idx_projects_client (client_id)
        )
      `);

      await addColumnIfMissing('projects', 'client_id', 'client_id INT NULL');
      await addColumnIfMissing('projects', 'description', 'description TEXT NULL');
      await addColumnIfMissing('projects', 'start_date', 'start_date DATE NULL');
      await addColumnIfMissing('projects', 'end_date', 'end_date DATE NULL');
      await addColumnIfMissing('projects', 'status', "status VARCHAR(50) NOT NULL DEFAULT 'Active'");
      await addColumnIfMissing('projects', 'department', 'department VARCHAR(255) NULL');
      await addColumnIfMissing('projects', 'manager', 'manager VARCHAR(255) NULL');
      await addColumnIfMissing('projects', 'current_phase', 'current_phase VARCHAR(255) NULL');
      await addColumnIfMissing('projects', 'updated_at', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

      await modifyColumnIfExists('projects', 'client_id', 'client_id INT NULL');
      await modifyColumnIfExists('projects', 'status', "status VARCHAR(50) NOT NULL DEFAULT 'Active'");

      await addIndexIfMissing('projects', 'idx_projects_tenant', 'INDEX idx_projects_tenant (tenant_id)');
      await addIndexIfMissing('projects', 'idx_projects_client', 'INDEX idx_projects_client (client_id)');

      await addForeignKeyIfMissing(
        'projects',
        'fk_projects_tenant',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
      );
      await addForeignKeyIfMissing(
        'projects',
        'fk_projects_client',
        'FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL'
      );
    })();
  }

  return schemaReady;
};

module.exports = { ensureProjectSchema };
