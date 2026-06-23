const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function runMigration() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'workdesk_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Check if columns already exist
        const [columns] = await pool.query(`SHOW COLUMNS FROM tenants LIKE 'smtp_provider'`);
        if (columns.length > 0) {
            console.log('Column smtp_provider already exists. Skipping migration.');
            return;
        }

        console.log('Adding SMTP columns to tenants table...');
        await pool.query(`
            ALTER TABLE tenants
            ADD COLUMN smtp_provider VARCHAR(50) NULL DEFAULT NULL,
            ADD COLUMN smtp_user VARCHAR(255) NULL DEFAULT NULL,
            ADD COLUMN smtp_password VARCHAR(255) NULL DEFAULT NULL;
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
