// models/brandingModel.js
const pool = require('../config/database');

const brandingModel = {
    // Get branding config for a tenant
    getByTenantId: async (tenantId) => {
        const [rows] = await pool.execute(
            'SELECT * FROM tenant_branding WHERE tenant_id = ?',
            [tenantId]
        );
        return rows[0] || null;
    },

    // Insert or update text fields
    upsert: async (tenantId, data) => {
        const { company_name, hr_name, hr_designation, company_address, company_email, company_phone, company_website, default_terms } = data;

        // Check if record exists
        const existing = await brandingModel.getByTenantId(tenantId);

        if (existing) {
            const [result] = await pool.execute(
                `UPDATE tenant_branding 
                 SET company_name = ?, hr_name = ?, hr_designation = ?, 
                     company_address = ?, company_email = ?, company_phone = ?, 
                     company_website = ?, default_terms = ?
                 WHERE tenant_id = ?`,
                [company_name, hr_name, hr_designation, company_address, company_email, company_phone, company_website, default_terms, tenantId]
            );
            return result;
        } else {
            const [result] = await pool.execute(
                `INSERT INTO tenant_branding 
                 (tenant_id, company_name, hr_name, hr_designation, company_address, company_email, company_phone, company_website, default_terms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [tenantId, company_name, hr_name, hr_designation, company_address, company_email, company_phone, company_website, default_terms]
            );
            return result;
        }
    },

    // Update a single image URL field
    updateImageUrl: async (tenantId, field, url) => {
        // Validate field name to prevent SQL injection
        const validFields = ['logo_url', 'signature_url', 'stamp_url'];
        if (!validFields.includes(field)) {
            throw new Error('Invalid image field: ' + field);
        }

        // Ensure a row exists first
        const existing = await brandingModel.getByTenantId(tenantId);
        if (!existing) {
            await pool.execute(
                `INSERT INTO tenant_branding (tenant_id, ${field}) VALUES (?, ?)`,
                [tenantId, url]
            );
        } else {
            await pool.execute(
                `UPDATE tenant_branding SET ${field} = ? WHERE tenant_id = ?`,
                [url, tenantId]
            );
        }
    },

    // Clear an image URL field
    clearImageUrl: async (tenantId, field) => {
        const validFields = ['logo_url', 'signature_url', 'stamp_url'];
        if (!validFields.includes(field)) {
            throw new Error('Invalid image field: ' + field);
        }

        await pool.execute(
            `UPDATE tenant_branding SET ${field} = NULL WHERE tenant_id = ?`,
            [tenantId]
        );
    }
};

module.exports = brandingModel;
