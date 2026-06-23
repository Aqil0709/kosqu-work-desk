// migrations/add_company_phone_to_branding.js
// Run: node migrations/add_company_phone_to_branding.js
const pool = require('../config/database');

async function addCompanyPhoneColumn() {
    try {
        // Check if column already exists
        const [columns] = await pool.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenant_branding' AND COLUMN_NAME = 'company_phone'"
        );

        if (columns.length === 0) {
            await pool.execute(
                "ALTER TABLE tenant_branding ADD COLUMN company_phone VARCHAR(20) DEFAULT NULL AFTER company_email"
            );
            console.log('✅ company_phone column added to tenant_branding table');
        } else {
            console.log('ℹ️ company_phone column already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding company_phone column:', error.message);
        process.exit(1);
    }
}

addCompanyPhoneColumn();
