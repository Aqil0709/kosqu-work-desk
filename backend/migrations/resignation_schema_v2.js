// Run once to migrate resignation_requests table to v2 schema
// node backend/migrations/resignation_schema_v2.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/db');

async function migrate() {
    const conn = await pool.getConnection();
    try {
        console.log('Running resignation schema v2 migration...');

        // Extend status ENUM
        await conn.execute(`
            ALTER TABLE resignation_requests
            MODIFY COLUMN status ENUM('pending','under_review','approved','rejected','withdrawn')
            NOT NULL DEFAULT 'pending'
        `).catch(() => console.log('status ENUM already up to date or column may differ — skipping'));

        // Add new columns (ignore if already exist)
        const newColumns = [
            `ALTER TABLE resignation_requests ADD COLUMN resignation_date DATE NULL AFTER ref_number`,
            `ALTER TABLE resignation_requests ADD COLUMN notice_period_days INT DEFAULT 30 AFTER resignation_date`,
            `ALTER TABLE resignation_requests ADD COLUMN original_last_working_date DATE NULL AFTER notice_period_days`,
            `ALTER TABLE resignation_requests ADD COLUMN revised_last_working_date DATE NULL AFTER original_last_working_date`,
            `ALTER TABLE resignation_requests ADD COLUMN override_reason TEXT NULL AFTER revised_last_working_date`,
            `ALTER TABLE resignation_requests ADD COLUMN override_by INT NULL AFTER override_reason`,
            `ALTER TABLE resignation_requests ADD COLUMN override_at DATETIME NULL AFTER override_by`,
            `ALTER TABLE resignation_requests ADD COLUMN attachment_url VARCHAR(500) NULL AFTER override_at`,
            `ALTER TABLE resignation_requests ADD COLUMN remarks TEXT NULL AFTER reason`,
        ];

        for (const sql of newColumns) {
            await conn.execute(sql).catch(err => {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`  Column already exists: ${sql.match(/ADD COLUMN (\w+)/)?.[1]}`);
                } else {
                    console.warn(`  Warning: ${err.message}`);
                }
            });
        }

        // Create resignation_status_history table
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS resignation_status_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                resignation_id INT NOT NULL,
                tenant_id INT NOT NULL,
                status ENUM('pending','under_review','approved','rejected','withdrawn') NOT NULL,
                changed_by INT NULL,
                note TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_resignation_id (resignation_id),
                INDEX idx_tenant_id (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        console.log('Migration complete.');
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
