// migrations/create_tenant_branding.js
// Run: node migrations/create_tenant_branding.js
const pool = require('../config/database');

async function createTenantBrandingTable() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS tenant_branding (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL UNIQUE,
                company_name VARCHAR(255),
                hr_name VARCHAR(255),
                hr_designation VARCHAR(255),
                company_address TEXT,
                company_email VARCHAR(255),
                company_phone VARCHAR(20),
                company_website VARCHAR(255),
                default_terms TEXT,
                logo_url TEXT,
                signature_url TEXT,
                stamp_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ tenant_branding table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error.message);
        process.exit(1);
    }
}

createTenantBrandingTable();
