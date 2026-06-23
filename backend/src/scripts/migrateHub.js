require('dotenv').config();
const { query, pool } = require('../config/db');

async function migrate() {
  try {
    console.log('Starting migration for Management Hub...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        client_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        status ENUM('Active', 'On Hold', 'Completed', 'Cancelled') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Projects table created/verified.');

    try {
      await query(`ALTER TABLE clients ADD COLUMN company VARCHAR(255);`);
      console.log('Clients table updated.');
    } catch (e) {
      console.log('Clients table update failed or already exists:', e.message);
    }

    try {
      await query(`ALTER TABLE services ADD COLUMN client_id INT;`);
      await query(`ALTER TABLE services ADD COLUMN project_id INT;`);
      await query(`ALTER TABLE services ADD COLUMN amount DECIMAL(10, 2) DEFAULT 0.00;`);
      await query(`ALTER TABLE services ADD COLUMN paid DECIMAL(10, 2) DEFAULT 0.00;`);
      await query(`ALTER TABLE services ADD COLUMN due_date DATE;`);
      console.log('Services table updated.');
    } catch (e) {
      console.log('Services table update failed or already exists:', e.message);
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

migrate();
