// backend/models/deliveryModel.js
const pool = require('../config/database');

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
        if (typeof str === 'object') return str;
        return JSON.parse(str);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
};

const DeliveryChallan = {
    // Get connection from pool
    getConnection: () => pool.getConnection(),

    // Get all delivery challans with filters
    getAll: async (tenantId, filters = {}) => {
        let query = `
            SELECT 
                dc.*,
                COUNT(dch.id) as history_count
            FROM delivery_challans dc
            LEFT JOIN delivery_challan_history dch ON dc.id = dch.challan_id
            WHERE dc.tenant_id = ?
        `;
        const params = [tenantId];

        if (filters.month) {
            query += ' AND MONTH(dc.challan_date) = ? AND YEAR(dc.challan_date) = YEAR(CURDATE())';
            params.push(filters.month);
        }

        if (filters.destination) {
            query += ' AND dc.destination LIKE ?';
            params.push(`%${filters.destination}%`);
        }

        query += ' GROUP BY dc.id ORDER BY dc.created_at DESC';

        const [challans] = await pool.execute(query, params);
        
        // Get complete data for each challan
        for (let challan of challans) {
            const [items] = await pool.execute(
                'SELECT * FROM delivery_challan_items WHERE challan_id = ? ORDER BY sr_no',
                [challan.id]
            );
            const [history] = await pool.execute(
                'SELECT * FROM delivery_challan_history WHERE challan_id = ? ORDER BY created_at',
                [challan.id]
            );
            
            challan.items = items;
            challan.history = history;
        }
        
        return challans;
    },

    // Get challan by ID
    getById: async (tenantId, id) => {
        const [challans] = await pool.execute(
            'SELECT * FROM delivery_challans WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        
        if (challans.length === 0) return null;
        
        const challan = challans[0];
        
        const [items] = await pool.execute(
            'SELECT * FROM delivery_challan_items WHERE challan_id = ? ORDER BY sr_no',
            [challan.id]
        );
        const [history] = await pool.execute(
            'SELECT * FROM delivery_challan_history WHERE challan_id = ? ORDER BY created_at',
            [challan.id]
        );
        
        challan.items = items;
        challan.history = history;
        
        return challan;
    },

    // Get challan by challan number
    getByChallanNo: async (tenantId, challan_no) => {
        const [rows] = await pool.execute(
            'SELECT * FROM delivery_challans WHERE challan_no = ? AND tenant_id = ?',
            [challan_no, tenantId]
        );
        return rows[0];
    },

    // Create new delivery challan
    create: async (tenantId, challanData) => {
        const {
            challan_no,
            challan_date,
            destination,
            dispatched_through,
            to_address,
            from_address,
            contact_info,
            payment_info,
            created_by
        } = challanData;

        const [result] = await pool.execute(
            `INSERT INTO delivery_challans (
                tenant_id, challan_no, challan_date, destination, dispatched_through, 
                to_address, from_address, contact_info, payment_info, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId, challan_no, challan_date, destination, dispatched_through,
                to_address, from_address, contact_info, payment_info, created_by
            ]
        );
        return result.insertId;
    },

    // Create challan item
    createItem: async (tenantId, itemData) => {
        const { challan_id, sr_no, description, quantity } = itemData;
        const [result] = await pool.execute(
            `INSERT INTO delivery_challan_items (
                challan_id, sr_no, description, quantity
            ) VALUES (?, ?, ?, ?)`,
            [challan_id, sr_no, description, quantity]
        );
        return result.insertId;
    },

    // Create history entry
    createHistory: async (tenantId, historyData) => {
        const { challan_id, date, action, user, follow_up } = historyData;
        const [result] = await pool.execute(
            'INSERT INTO delivery_challan_history (challan_id, date, action, user, follow_up) VALUES (?, ?, ?, ?, ?)',
            [challan_id, date, action, user, follow_up]
        );
        return result.insertId;
    },

    // Update delivery challan
    update: async (tenantId, id, challanData) => {
        const {
            challan_no,
            challan_date,
            destination,
            dispatched_through,
            to_address,
            from_address,
            contact_info,
            payment_info
        } = challanData;

        const [result] = await pool.execute(
            `UPDATE delivery_challans SET 
                challan_no = ?, challan_date = ?, destination = ?, dispatched_through = ?,
                to_address = ?, from_address = ?, contact_info = ?, payment_info = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?`,
            [
                challan_no, challan_date, destination, dispatched_through,
                to_address, from_address, contact_info, payment_info, id, tenantId
            ]
        );
        return result.affectedRows;
    },

    // Delete challan items
    deleteItems: async (tenantId, challan_id) => {
        await pool.execute(
            'DELETE FROM delivery_challan_items WHERE challan_id = ?',
            [challan_id]
        );
    },

    // Delete delivery challan
    delete: async (tenantId, id) => {
        const [result] = await pool.execute(
            'DELETE FROM delivery_challans WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return result.affectedRows;
    },

    // Get recent challans
    getRecent: async (tenantId, limit = 10) => {
        const [challans] = await pool.execute(
            'SELECT * FROM delivery_challans WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?',
            [tenantId, limit]
        );
        return challans;
    }
};

module.exports = DeliveryChallan;