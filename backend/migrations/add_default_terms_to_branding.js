// migrations/add_default_terms_to_branding.js
// Run: node migrations/add_default_terms_to_branding.js
const pool = require('../config/database');

async function addDefaultTermsColumn() {
    try {
        // Check if column already exists
        const [columns] = await pool.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenant_branding' AND COLUMN_NAME = 'default_terms'"
        );

        if (columns.length === 0) {
            await pool.execute(
                "ALTER TABLE tenant_branding ADD COLUMN default_terms TEXT DEFAULT NULL AFTER company_phone"
            );
            console.log('✅ default_terms column added to tenant_branding table');
        } else {
            console.log('ℹ️ default_terms column already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding default_terms column:', error.message);
        process.exit(1);
    }
}

addDefaultTermsColumn();
