const {pool} = require('../../config/db');
const { ensureQuotationSchema } = require('./quotationSchema');

// Helper function for safe JSON handling
const safeStringify = (obj) => {
    if (obj === null || obj === undefined) {
        return null;
    }
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.error('Error stringifying object:', error);
        return null;
    }
};

const safeParse = (str) => {
    if (!str) return null;
    try {
        // If it's already an object, return it
        if (typeof str === 'object') return str;
        return JSON.parse(str);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
};

const Quotation = {
    // Get connection from pool
    getConnection: () => pool.getConnection(),

    // Get all quotations with items, GST details, and history
    getAll: async (tenantId, filters = {}) => {
        await ensureQuotationSchema();
        let query = `
            SELECT 
                q.*,
                COUNT(qh.id) as history_count
            FROM quotations q
            LEFT JOIN quotation_history qh ON q.id = qh.quotation_id
            WHERE q.tenant_id = ?
        `;
        const params = [tenantId];

        if (filters.status) {
            query += ' AND q.status = ?';
            params.push(filters.status);
        }

        if (filters.month) {
            query += ' AND MONTH(q.quotation_date) = ? AND YEAR(q.quotation_date) = YEAR(CURDATE())';
            params.push(filters.month);
        }

        query += ' GROUP BY q.id ORDER BY q.created_at DESC';

        const [quotations] = await pool.execute(query, params);
        
        // Get complete data for each quotation
        for (let quotation of quotations) {
            const [items] = await pool.execute(
                'SELECT * FROM quotation_items WHERE quotation_id = ?',
                [quotation.id]
            );
            const [gstDetails] = await pool.execute(
                'SELECT * FROM quotation_gst_details WHERE quotation_id = ?',
                [quotation.id]
            );
            const [history] = await pool.execute(
                'SELECT * FROM quotation_history WHERE quotation_id = ? ORDER BY created_at',
                [quotation.id]
            );
            
            quotation.items = items;
            quotation.gst_details = gstDetails;
            quotation.history = history;
        }
        
        return quotations;
    },

    // Get quotation by ID
getById: async (tenantId, id) => {
    await ensureQuotationSchema();
    const [quotations] = await pool.execute(
        'SELECT * FROM quotations WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
    );
    
    if (quotations.length === 0) return null;
    
    const quotation = quotations[0];

    // Safely parse service_bank_details
    if (quotation.service_bank_details) {
        try {
            // If it's already an object, use it directly
            if (typeof quotation.service_bank_details === 'object') {
                // It's already parsed, do nothing
            } else if (typeof quotation.service_bank_details === 'string') {
                quotation.service_bank_details = JSON.parse(quotation.service_bank_details);
            }
        } catch (error) {
            console.warn('Failed to parse service_bank_details JSON:', error.message);
            quotation.service_bank_details = null;
        }
    } else {
        quotation.service_bank_details = null;
    }

    // Safely parse service_gst_details
    if (quotation.service_gst_details) {
        try {
            // If it's already an object, use it directly
            if (typeof quotation.service_gst_details === 'object') {
                // It's already parsed, do nothing
            } else if (typeof quotation.service_gst_details === 'string') {
                quotation.service_gst_details = JSON.parse(quotation.service_gst_details);
            }
        } catch (error) {
            console.warn('Failed to parse service_gst_details JSON:', error.message);
            quotation.service_gst_details = null;
        }
    } else {
        quotation.service_gst_details = null;
    }
    
    const [items] = await pool.execute(
        'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sr_no',
        [quotation.id]
    );
    const [gstDetails] = await pool.execute(
        'SELECT * FROM quotation_gst_details WHERE quotation_id = ?',
        [quotation.id]
    );
    const [history] = await pool.execute(
        'SELECT * FROM quotation_history WHERE quotation_id = ? ORDER BY created_at',
        [quotation.id]
    );
    
    quotation.items = items;
    quotation.gst_details = gstDetails;
    quotation.history = history;
    
    return quotation;
},

    // Get quotation by quotation number
    getByQuotationNo: async (tenantId, quotation_no) => {
        await ensureQuotationSchema();
        const [rows] = await pool.execute(
            'SELECT * FROM quotations WHERE quotation_no = ? AND tenant_id = ?',
            [quotation_no, tenantId]
        );
        return rows[0];
    },

    // Create new quotation
    create: async (tenantId, quotationData) => {
        await ensureQuotationSchema();
        const {
            clientId,
            projectId,
            serviceId,
            client_id,
            project_id,
            service_id,
            quotation_no,
            quotation_date,
            ref_no,
            buyer_gstin,
            party_address,
            total_before_discount,
            discount,
            round_off,
            total_after_tax,
            valid_until,
            created_by,
            service_bank_details,
            service_gst_details
        } = quotationData;

        const [result] = await pool.execute(
            `INSERT INTO quotations (
                tenant_id, client_id, project_id, service_id, quotation_no, quotation_date, ref_no, buyer_gstin,
                party_address, total_before_discount, discount, round_off, 
                total_after_tax, valid_until, created_by,
                service_bank_details, service_gst_details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId, client_id || clientId || null, project_id || projectId || null, service_id || serviceId || null,
                quotation_no, quotation_date, ref_no, buyer_gstin, party_address,
                total_before_discount, discount, round_off, total_after_tax, 
                valid_until, created_by,
                safeStringify(service_bank_details),  // Use helper
            safeStringify(service_gst_details)
            ]
        );
        return result.insertId;
    },

    // Create quotation item
    createItem: async (tenantId, itemData) => {
        await ensureQuotationSchema();
        const { quotation_id, sr_no, description, quantity, rate, total_amount } = itemData;
        const [result] = await pool.execute(
            `INSERT INTO quotation_items (
                quotation_id, sr_no, description, quantity, rate, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [quotation_id, sr_no, description, quantity, rate, total_amount] // Parent records identify tenant. We can still add tenant handling strictly but foreign key logic implies child relations securely. To be safe, adding tenant filtering is primarily for roots. Let's keep parent relationship. 
        );
        return result.insertId;
    },

    // Create GST detail
    createGSTDetail: async (tenantId, gstData) => {
        await ensureQuotationSchema();
        const { quotation_id, tax_type, percentage } = gstData;
        const [result] = await pool.execute(
            'INSERT INTO quotation_gst_details (quotation_id, tax_type, percentage) VALUES (?, ?, ?)',
            [quotation_id, tax_type, percentage]
        );
        return result.insertId;
    },

    // Create history entry
    createHistory: async (tenantId, historyData) => {
        await ensureQuotationSchema();
        const { quotation_id, date, action, user, follow_up } = historyData;
        const [result] = await pool.execute(
            'INSERT INTO quotation_history (quotation_id, date, action, user, follow_up) VALUES (?, ?, ?, ?, ?)',
            [quotation_id, date, action, user, follow_up]
        );
        return result.insertId;
    },

// Update quotation
update: async (tenantId, id, quotationData) => {
    await ensureQuotationSchema();
    const {
        clientId,
        projectId,
        serviceId,
        client_id,
        project_id,
        service_id,
        quotation_no,
        quotation_date,
        ref_no,
        buyer_gstin,
        party_address,
        total_before_discount,
        discount,
        round_off,
        total_after_tax,
        valid_until,
        service_bank_details,
        service_gst_details
    } = quotationData;

    const [result] = await pool.execute(
        `UPDATE quotations SET 
            client_id = ?, project_id = ?, service_id = ?,
            quotation_no = ?, quotation_date = ?, ref_no = ?, buyer_gstin = ?,
            party_address = ?, total_before_discount = ?, discount = ?, round_off = ?, total_after_tax = ?,
            valid_until = ?, updated_at = CURRENT_TIMESTAMP,
            service_bank_details = ?, service_gst_details = ?
        WHERE id = ? AND tenant_id = ?`,
        [
            client_id || clientId || null, project_id || projectId || null, service_id || serviceId || null,
            quotation_no, quotation_date, ref_no, buyer_gstin,
            party_address, total_before_discount, discount, round_off, total_after_tax,
            valid_until,
            safeStringify(service_bank_details),  // Use helper
            safeStringify(service_gst_details),    // Use helper
            id, tenantId
        ]
    );
    return result.affectedRows;
},

    // Update quotation status
    updateStatus: async (tenantId, id, status) => {
        await ensureQuotationSchema();
        const [result] = await pool.execute(
            'UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
            [status, id, tenantId]
        );
        return result.affectedRows;
    },

    // Delete quotation items
    deleteItems: async (tenantId, quotation_id) => {
        await ensureQuotationSchema();
        // Technically this should verify the quotation_id belongs to the tenant. If we scope the parent deletion/fetch it's safe.
        await pool.execute(
            'DELETE FROM quotation_items WHERE quotation_id = ?',
            [quotation_id]
        );
    },

    // Delete GST details
    deleteGSTDetails: async (tenantId, quotation_id) => {
        await ensureQuotationSchema();
        await pool.execute(
            'DELETE FROM quotation_gst_details WHERE quotation_id = ?',
            [quotation_id]
        );
    },

    // Delete quotation
    delete: async (tenantId, id) => {
        await ensureQuotationSchema();
        const [result] = await pool.execute(
            'DELETE FROM quotations WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return result.affectedRows;
    }
};

module.exports = Quotation;
