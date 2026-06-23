const pool = require('../config/database');

const offerLetterController = {
    // Save or update an offer letter for an employee
    saveOfferLetter: async (req, res) => {
        try {
            const { employee_id, form_data, issue_date } = req.body;
            console.log('📥 Saving offer letter for employee_id:', employee_id);
            
            if (!employee_id || !form_data || !issue_date) {
                console.log('⚠️ Missing required fields:', { employee_id, hasFormData: !!form_data, issue_date });
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Tenant validation: ensure employee belongs to the same tenant
            const tenantId = req.tenantId;
            if (!tenantId) {
                return res.status(403).json({ message: 'Tenant context missing' });
            }
            const [userRows] = await pool.execute(
                'SELECT tenant_id FROM users WHERE id = ?',
                [employee_id]
            );
            if (userRows.length === 0) {
                return res.status(404).json({ message: 'Employee not found' });
            }
            if (Number(userRows[0].tenant_id) !== Number(tenantId)) {
                return res.status(403).json({ message: 'Employee does not belong to your tenant' });
            }

            // Using INSERT ... ON DUPLICATE KEY UPDATE to ensure only one letter per employee
            const query = `
                INSERT INTO offer_letters (employee_id, form_data, issue_date)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                form_data = VALUES(form_data),
                issue_date = VALUES(issue_date),
                updated_at = CURRENT_TIMESTAMP
            `;

            await pool.execute(query, [employee_id, JSON.stringify(form_data), issue_date]);
            console.log('✅ Offer letter saved successfully');

            res.status(200).json({
                message: 'Offer letter saved/updated successfully'
            });
        } catch (error) {
            console.error('❌ Save offer letter database error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // Get offer letters for the logged-in employee
    getMyOfferLetters: async (req, res) => {
        try {
            const user_id = req.user.id;
            const tenantId = req.tenantId;
            if (!tenantId) {
                return res.status(403).json({ message: 'Tenant context missing' });
            }
            
            // Ensure the offer letter belongs to the same tenant
            const [letters] = await pool.execute(
                `SELECT ol.id, ol.form_data, ol.issue_date, ol.created_at, ol.updated_at
                 FROM offer_letters ol
                 JOIN users u ON ol.employee_id = u.id
                 WHERE ol.employee_id = ? AND u.tenant_id = ?`,
                [user_id, tenantId]
            );

            if (letters.length === 0) {
                return res.json({ letters: [] });
            }

            // Parse JSON form_data for each row
            const processedLetters = letters.map(row => ({
                ...row,
                form_data: typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data
            }));

            res.json({ letters: processedLetters });
        } catch (error) {
            console.error('Get my offer letters error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // HR: Get all saved offer letters for tracking
    getAllOfferLetters: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            if (!tenantId) {
                return res.status(403).json({ message: 'Tenant context missing' });
            }
            const query = `
                SELECT
                    ol.id,
                    ol.employee_id,
                    ol.form_data,
                    ol.issue_date,
                    ol.created_at,
                    ol.updated_at,
                    u.first_name,
                    u.last_name,
                    u.email,
                    ed.id as employee_display_id
                FROM offer_letters ol
                JOIN users u ON ol.employee_id = u.id
                LEFT JOIN employee_details ed ON u.id = ed.user_id
                WHERE u.tenant_id = ?
                ORDER BY ol.updated_at DESC
            `;

            const [rows] = await pool.execute(query, [tenantId]);

            const processedRows = rows.map(row => ({
                ...row,
                form_data: typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data
            }));

            res.json({ success: true, count: processedRows.length, data: processedRows });
        } catch (error) {
            console.error('Get all offer letters error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    }
};

module.exports = offerLetterController;
