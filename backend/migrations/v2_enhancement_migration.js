// backend/migrations/v2_enhancement_migration.js
// Run (from project root): node backend/migrations/v2_enhancement_migration.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/config/db');

async function runMigration() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    console.log('Starting v2 enhancement migration...');

    // ── 1. employee_details: employment_category, experience_years, cv_path ──
    await conn.execute(`
      ALTER TABLE employee_details
        ADD COLUMN IF NOT EXISTS employment_category ENUM('employee','intern','consultant') NOT NULL DEFAULT 'employee',
        ADD COLUMN IF NOT EXISTS experience_years DECIMAL(4,1) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS cv_path VARCHAR(500) DEFAULT NULL
    `).catch(() => {
      // MySQL < 8.0.3 doesn't support IF NOT EXISTS on ALTER — add columns individually
    });

    // Fallback: add columns one at a time, ignore duplicate column errors
    const alterCols = [
      `ALTER TABLE employee_details ADD COLUMN employment_category ENUM('employee','intern','consultant') NOT NULL DEFAULT 'employee'`,
      `ALTER TABLE employee_details ADD COLUMN experience_years DECIMAL(4,1) DEFAULT NULL`,
      `ALTER TABLE employee_details ADD COLUMN cv_path VARCHAR(500) DEFAULT NULL`,
    ];
    for (const sql of alterCols) {
      await conn.execute(sql).catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    }
    console.log('✓ employee_details columns added');

    // ── 2. employee_custom_fields ──
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS employee_custom_fields (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id   INT NOT NULL,
        field_name  VARCHAR(100) NOT NULL,
        field_key   VARCHAR(100) NOT NULL,
        field_type  ENUM('text','number','date','dropdown','boolean') NOT NULL DEFAULT 'text',
        field_options JSON DEFAULT NULL,
        is_required TINYINT(1) NOT NULL DEFAULT 0,
        is_active   TINYINT(1) NOT NULL DEFAULT 1,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tenant_field (tenant_id, field_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ employee_custom_fields created');

    // ── 3. employee_custom_field_values ──
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS employee_custom_field_values (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id   INT NOT NULL,
        employee_id INT NOT NULL,
        field_id    INT NOT NULL,
        value       TEXT DEFAULT NULL,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_employee_field (tenant_id, employee_id, field_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ employee_custom_field_values created');

    // ── 4. employee_assets ──
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS employee_assets (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id     INT NOT NULL,
        employee_id   INT NOT NULL,
        asset_type    VARCHAR(100) NOT NULL,
        asset_name    VARCHAR(200) NOT NULL,
        serial_number VARCHAR(200) DEFAULT NULL,
        assigned_date DATE DEFAULT NULL,
        return_date   DATE DEFAULT NULL,
        status        ENUM('assigned','returned','lost','damaged') NOT NULL DEFAULT 'assigned',
        notes         TEXT DEFAULT NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant_employee (tenant_id, employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ employee_assets created');

    // ── 5. clients: gst_number, gst_type, billing_address ──
    const clientCols = [
      `ALTER TABLE clients ADD COLUMN gst_number VARCHAR(20) DEFAULT NULL`,
      `ALTER TABLE clients ADD COLUMN gst_type ENUM('Regular','Composition','Unregistered') DEFAULT 'Unregistered'`,
      `ALTER TABLE clients ADD COLUMN billing_address TEXT DEFAULT NULL`,
    ];
    for (const sql of clientCols) {
      await conn.execute(sql).catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    }
    console.log('✓ clients GST columns added');

    // ── 6. pttm_project_docs ──
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pttm_project_docs (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id   INT NOT NULL,
        project_id  INT NOT NULL,
        title       VARCHAR(300) NOT NULL,
        doc_type    ENUM('PRD','Design','SOW','Meeting Notes','Other') DEFAULT 'Other',
        file_path   VARCHAR(500) DEFAULT NULL,
        url         VARCHAR(1000) DEFAULT NULL,
        uploaded_by INT NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_project (tenant_id, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ pttm_project_docs created');

    // ── 7. pttm_client_teams ──
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pttm_client_teams (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id  INT NOT NULL,
        client_id  INT NOT NULL,
        team_name  VARCHAR(200) NOT NULL,
        lead_id    INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_client (tenant_id, client_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ pttm_client_teams created');

    // ── 8. leave_requests: tl/pl approval columns ──
    const leaveCols = [
      `ALTER TABLE leave_requests ADD COLUMN tl_approved_by INT DEFAULT NULL`,
      `ALTER TABLE leave_requests ADD COLUMN tl_approved_at DATETIME DEFAULT NULL`,
      `ALTER TABLE leave_requests ADD COLUMN tl_status ENUM('pending','approved','rejected') DEFAULT 'pending'`,
      `ALTER TABLE leave_requests ADD COLUMN pl_approved_by INT DEFAULT NULL`,
      `ALTER TABLE leave_requests ADD COLUMN pl_approved_at DATETIME DEFAULT NULL`,
      `ALTER TABLE leave_requests ADD COLUMN pl_status ENUM('pending','approved','rejected') DEFAULT 'pending'`,
      `ALTER TABLE leave_requests ADD COLUMN approval_level ENUM('tl','pl','hr','done') DEFAULT 'tl'`,
    ];
    for (const sql of leaveCols) {
      await conn.execute(sql).catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    }
    console.log('✓ leave_requests approval columns added');

    // ── 9. leave_types: short_break support ──
    const leaveTypeCols = [
      `ALTER TABLE leave_types ADD COLUMN is_short_break TINYINT(1) NOT NULL DEFAULT 0`,
      `ALTER TABLE leave_types ADD COLUMN break_hours DECIMAL(3,1) DEFAULT NULL`,
    ];
    for (const sql of leaveTypeCols) {
      await conn.execute(sql).catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    }
    console.log('✓ leave_types short_break columns added');

    // ── 10. company_events ──
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS company_events (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id   INT NOT NULL,
        title       VARCHAR(300) NOT NULL,
        description TEXT DEFAULT NULL,
        event_date  DATE NOT NULL,
        event_time  TIME DEFAULT NULL,
        location    VARCHAR(300) DEFAULT NULL,
        created_by  INT NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_date (tenant_id, event_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ company_events created');

    // ── 11. Seed "2 Hours Short Break" leave type for all tenants ──
    await conn.execute(`
      INSERT INTO leave_types (tenant_id, name, max_days, is_paid, is_short_break, break_hours)
      SELECT DISTINCT tenant_id, '2 Hours Short Break', 365, 1, 1, 2.0
      FROM leave_types
      WHERE tenant_id NOT IN (
        SELECT tenant_id FROM leave_types WHERE name = '2 Hours Short Break'
      )
      LIMIT 1000
    `).catch(e => console.warn('Short break seed skipped:', e.message));
    console.log('✓ 2 Hours Short Break leave type seeded');

    // ── 12. Seed default shift (09:30–17:30, 8h) for tenants that have tb_shifts but no default ──
    await conn.execute(`
      INSERT INTO tb_shifts (tenant_id, shift_name, check_in_time, check_out_time, grace_period_minutes, is_default)
      SELECT DISTINCT t.tenant_id, 'General Shift', '09:30:00', '17:30:00', 15, TRUE
      FROM (SELECT DISTINCT tenant_id FROM employee_details) t
      WHERE NOT EXISTS (
        SELECT 1 FROM tb_shifts s WHERE s.tenant_id = t.tenant_id AND s.is_default = TRUE
      )
    `).catch(e => console.warn('Default shift seed skipped (table may not exist yet):', e.message));
    console.log('✓ Default shift (09:30-17:30) seeded');

    await conn.commit();
    console.log('\n✅ Migration v2 completed successfully.');
  } catch (err) {
    await conn.rollback();
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

runMigration();
