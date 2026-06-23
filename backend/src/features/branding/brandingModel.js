const {pool} = require('../../config/db');

let schemaReady;

const textColumns = [
    ['primary_color', "VARCHAR(50) DEFAULT '#3B82F6'"],
    ['secondary_color', "VARCHAR(50) DEFAULT '#10B981'"],
    ['logo_url', 'VARCHAR(500) DEFAULT NULL'],
    ['favicon_url', 'VARCHAR(500) DEFAULT NULL'],
    ['signature_url', 'VARCHAR(500) DEFAULT NULL'],
    ['stamp_url', 'VARCHAR(500) DEFAULT NULL'],
    ['idcard_header_url', 'VARCHAR(500) DEFAULT NULL'],
    ['idcard_footer_url', 'VARCHAR(500) DEFAULT NULL'],
    ['company_name', 'VARCHAR(255) DEFAULT NULL'],
    ['hr_name', 'VARCHAR(255) DEFAULT NULL'],
    ['hr_designation', 'VARCHAR(255) DEFAULT NULL'],
    ['company_address', 'TEXT DEFAULT NULL'],
    ['company_email', 'VARCHAR(255) DEFAULT NULL'],
    ['company_phone', 'VARCHAR(50) DEFAULT NULL'],
    ['company_website', 'VARCHAR(255) DEFAULT NULL'],
    ['company_tagline', 'VARCHAR(255) DEFAULT NULL'],
    ['company_cin', 'VARCHAR(100) DEFAULT NULL'],
    ['company_gst', 'VARCHAR(100) DEFAULT NULL'],
    ['doc_header_fields', 'JSON DEFAULT NULL'],
    ['default_terms', 'JSON DEFAULT NULL'],
    // ── Document watermark settings ──
    ['watermark_enabled', 'TINYINT(1) DEFAULT 1'],
    ['watermark_opacity', "DECIMAL(4,3) DEFAULT '0.070'"],
    ['watermark_size', "VARCHAR(20) DEFAULT 'medium'"],
    ['watermark_position', "VARCHAR(20) DEFAULT 'center'"],
    ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
    ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
];

const ensureSchema = async () => {
    if (!schemaReady) {
        schemaReady = (async () => {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS tenant_branding (
                    id INT NOT NULL AUTO_INCREMENT,
                    tenant_id INT NOT NULL,
                    primary_color VARCHAR(50) DEFAULT '#3B82F6',
                    secondary_color VARCHAR(50) DEFAULT '#10B981',
                    logo_url VARCHAR(500) DEFAULT NULL,
                    favicon_url VARCHAR(500) DEFAULT NULL,
                    signature_url VARCHAR(500) DEFAULT NULL,
                    stamp_url VARCHAR(500) DEFAULT NULL,
                    company_name VARCHAR(255) DEFAULT NULL,
                    hr_name VARCHAR(255) DEFAULT NULL,
                    hr_designation VARCHAR(255) DEFAULT NULL,
                    company_address TEXT DEFAULT NULL,
                    company_email VARCHAR(255) DEFAULT NULL,
                    company_phone VARCHAR(50) DEFAULT NULL,
                    company_website VARCHAR(255) DEFAULT NULL,
                    default_terms JSON DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    KEY tenant_id (tenant_id)
                )
            `);

            const [columns] = await pool.execute(
                `SELECT COLUMN_NAME
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_branding'`
            );
            const existing = new Set(columns.map((column) => column.COLUMN_NAME));

            for (const [name, definition] of textColumns) {
                if (!existing.has(name)) {
                    await pool.execute(`ALTER TABLE tenant_branding ADD COLUMN ${name} ${definition}`);
                }
            }
        })();
    }

    return schemaReady;
};

const brandingModel = {
    ensureSchema,

    // Get branding config for a tenant
    getByTenantId: async (tenantId) => {
        await ensureSchema();
        const [rows] = await pool.execute(
            'SELECT * FROM tenant_branding WHERE tenant_id = ?',
            [tenantId]
        );
        return rows[0] || null;
    },

    // Insert or update text fields
    upsert: async (tenantId, data) => {
        await ensureSchema();
        const {
            company_name, hr_name, hr_designation,
            company_address, company_email, company_phone, company_website,
            company_tagline, company_cin, company_gst, doc_header_fields,
            default_terms,
            watermark_enabled, watermark_opacity, watermark_size, watermark_position,
        } = data;

        // Clamp watermark_opacity to sane range [0.02, 0.15]
        const wmOpacity = watermark_opacity !== undefined
            ? Math.min(0.15, Math.max(0.02, Number(watermark_opacity)))
            : undefined;

        const existing = await brandingModel.getByTenantId(tenantId);

        if (existing) {
            const setClauses = [
                'company_name=?', 'hr_name=?', 'hr_designation=?',
                'company_address=?', 'company_email=?', 'company_phone=?',
                'company_website=?', 'company_tagline=?', 'company_cin=?',
                'company_gst=?', 'doc_header_fields=?', 'default_terms=?',
            ];
            const values = [
                company_name, hr_name, hr_designation, company_address, company_email, company_phone,
                company_website, company_tagline, company_cin, company_gst, doc_header_fields, default_terms,
            ];

            if (watermark_enabled !== undefined) { setClauses.push('watermark_enabled=?'); values.push(watermark_enabled ? 1 : 0); }
            if (wmOpacity       !== undefined) { setClauses.push('watermark_opacity=?'); values.push(wmOpacity); }
            if (watermark_size  !== undefined) { setClauses.push('watermark_size=?');    values.push(watermark_size); }
            if (watermark_position !== undefined) { setClauses.push('watermark_position=?'); values.push(watermark_position); }

            values.push(tenantId);
            const [result] = await pool.execute(
                `UPDATE tenant_branding SET ${setClauses.join(', ')} WHERE tenant_id=?`,
                values
            );
            return result;
        } else {
            const [result] = await pool.execute(
                `INSERT INTO tenant_branding
                 (tenant_id, company_name, hr_name, hr_designation, company_address, company_email,
                  company_phone, company_website, company_tagline, company_cin, company_gst, doc_header_fields, default_terms,
                  watermark_enabled, watermark_opacity, watermark_size, watermark_position)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [tenantId, company_name, hr_name, hr_designation, company_address, company_email,
                 company_phone, company_website, company_tagline, company_cin, company_gst, doc_header_fields, default_terms,
                 watermark_enabled !== undefined ? (watermark_enabled ? 1 : 0) : 1,
                 wmOpacity ?? 0.07, watermark_size ?? 'medium', watermark_position ?? 'center']
            );
            return result;
        }
    },

    // Update a single image URL field
    updateImageUrl: async (tenantId, field, url) => {
        await ensureSchema();
        // Validate field name to prevent SQL injection
        const validFields = ['logo_url', 'signature_url', 'stamp_url', 'idcard_header_url', 'idcard_footer_url'];
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
        await ensureSchema();
        const validFields = ['logo_url', 'signature_url', 'stamp_url', 'idcard_header_url', 'idcard_footer_url'];
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
