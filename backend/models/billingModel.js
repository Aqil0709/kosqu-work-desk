// backend/models/billingModel.js
const pool = require('../config/database');

const safeStringify = (obj) => {
    if (obj === null || obj === undefined) return null;
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
        if (typeof str === 'object') return str;
        return JSON.parse(str);
    } catch (error) {
        return null;
    }
};

const Billing = {
    getConnection: () => pool.getConnection(),

    getAll: async (tenantId, filters = {}) => {
        let query = `
            SELECT 
                i.*,
                COUNT(ih.id) as history_count
            FROM invoices i
            LEFT JOIN invoice_history ih ON i.id = ih.invoice_id
            WHERE i.tenant_id = ?
        `;
        const params = [tenantId];

        if (filters.status) {
            query += ' AND i.status = ?';
            params.push(filters.status);
        }

        if (filters.month) {
            query += ' AND MONTH(i.invoice_date) = ? AND YEAR(i.invoice_date) = YEAR(CURDATE())';
            params.push(filters.month);
        }

        query += ' GROUP BY i.id ORDER BY i.created_at DESC';

        const [invoices] = await pool.execute(query, params);
        
        for (let invoice of invoices) {
            invoice.service_bank_details = safeParse(invoice.service_bank_details);
            invoice.service_gst_details = safeParse(invoice.service_gst_details);
            
            const [items] = await pool.execute(
                'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sr_no',
                [invoice.id]
            );
            const [gstDetails] = await pool.execute(
                'SELECT * FROM gst_details WHERE invoice_id = ?',
                [invoice.id]
            );
            const [history] = await pool.execute(
                'SELECT * FROM invoice_history WHERE invoice_id = ? ORDER BY created_at',
                [invoice.id]
            );
            
            invoice.items = items;
            invoice.gst_details = gstDetails;
            invoice.history = history;
        }
        
        return invoices;
    },

    getById: async (tenantId, id) => {
        const [invoices] = await pool.execute(
            'SELECT * FROM invoices WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        
        if (invoices.length === 0) return null;
        
        const invoice = invoices[0];
        
        invoice.service_bank_details = safeParse(invoice.service_bank_details);
        invoice.service_gst_details = safeParse(invoice.service_gst_details);
        
        const [items] = await pool.execute(
            'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sr_no',
            [invoice.id]
        );
        const [gstDetails] = await pool.execute(
            'SELECT * FROM gst_details WHERE invoice_id = ?',
            [invoice.id]
        );
        const [history] = await pool.execute(
            'SELECT * FROM invoice_history WHERE invoice_id = ? ORDER BY created_at',
            [invoice.id]
        );
        
        invoice.items = items;
        invoice.gst_details = gstDetails;
        invoice.history = history;
        
        return invoice;
    },

    getByInvoiceNo: async (tenantId, invoice_no) => {
        const [rows] = await pool.execute(
            'SELECT * FROM invoices WHERE invoice_no = ? AND tenant_id = ?',
            [invoice_no, tenantId]
        );
        return rows[0];
    },

    create: async (tenantId, invoiceData) => {
        const {
            invoice_no, invoice_date, ref_no, buyer_gstin, party_address,
            total_before_discount, round_off, total_after_tax, created_by,
            service_bank_details, service_gst_details
        } = invoiceData;

        const [result] = await pool.execute(
            `INSERT INTO invoices (
                tenant_id, invoice_no, invoice_date, ref_no, buyer_gstin, party_address, 
                total_before_discount, round_off, total_after_tax, created_by,
                service_bank_details, service_gst_details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId, invoice_no, invoice_date, ref_no, buyer_gstin, party_address, 
                total_before_discount, round_off, total_after_tax, created_by,
                safeStringify(service_bank_details), safeStringify(service_gst_details)
            ]
        );
        return result.insertId;
    },

    createItem: async (tenantId, itemData) => {
        const { invoice_id, sr_no, description, hsn_code, quantity, rate, total_amount } = itemData;
        const [result] = await pool.execute(
            `INSERT INTO invoice_items (
                invoice_id, sr_no, description, hsn_code, quantity, rate, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [invoice_id, sr_no, description, hsn_code, quantity, rate, total_amount] // Assuming child records scoped implicitly by parent
        );
        return result.insertId;
    },

    createGSTDetail: async (tenantId, gstData) => {
        const { invoice_id, tax_type, percentage } = gstData;
        const [result] = await pool.execute(
            'INSERT INTO gst_details (invoice_id, tax_type, percentage) VALUES (?, ?, ?)',
            [invoice_id, tax_type, percentage]
        );
        return result.insertId;
    },

    createHistory: async (tenantId, historyData) => {
        const { invoice_id, date, action, user, follow_up } = historyData;
        const [result] = await pool.execute(
            'INSERT INTO invoice_history (invoice_id, date, action, user, follow_up) VALUES (?, ?, ?, ?, ?)',
            [invoice_id, date, action, user, follow_up]
        );
        return result.insertId;
    },

    update: async (tenantId, id, invoiceData) => {
        const {
            invoice_no, invoice_date, ref_no, buyer_gstin, party_address,
            total_before_discount, round_off, total_after_tax,
            service_bank_details, service_gst_details
        } = invoiceData;

        const [result] = await pool.execute(
            `UPDATE invoices SET 
                invoice_no = ?, invoice_date = ?, ref_no = ?, buyer_gstin = ?,
                party_address = ?, total_before_discount = ?, round_off = ?, total_after_tax = ?,
                updated_at = CURRENT_TIMESTAMP,
                service_bank_details = ?, service_gst_details = ?
            WHERE id = ? AND tenant_id = ?`,
            [
                invoice_no, invoice_date, ref_no, buyer_gstin,
                party_address, total_before_discount, round_off, total_after_tax,
                safeStringify(service_bank_details), safeStringify(service_gst_details),
                id, tenantId
            ]
        );
        return result.affectedRows;
    },

    updateStatus: async (tenantId, id, status) => {
        const [result] = await pool.execute(
            'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
            [status, id, tenantId]
        );
        return result.affectedRows;
    },

    deleteItems: async (tenantId, invoice_id) => {
        await pool.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoice_id]); // Safe if parent matched first
    },

    deleteGSTDetails: async (tenantId, invoice_id) => {
        await pool.execute('DELETE FROM gst_details WHERE invoice_id = ?', [invoice_id]); // Safe if parent matched first
    },

    delete: async (tenantId, id) => {
        const [result] = await pool.execute(
            'DELETE FROM invoices WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return result.affectedRows;
    }
};

module.exports = Billing;