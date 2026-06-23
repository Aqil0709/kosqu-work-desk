// backend/src/features/admin/holidayController.js
const { pool } = require('../../config/db');

const holidaySelectFields = `
    id,
    name,
    DATE_FORMAT(date, '%Y-%m-%d') AS date,
    description,
    is_active,
    tenant_id
`;

const getMonthDateRange = (yearValue, monthValue) => {
    const year = Number(yearValue);
    const month = Number(monthValue);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return null;
    }

    const paddedMonth = String(month).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();

    return {
        startDate: `${year}-${paddedMonth}-01`,
        endDate: `${year}-${paddedMonth}-${String(daysInMonth).padStart(2, '0')}`,
    };
};

const holidayController = {
    createHoliday: async (req, res) => {
        try {
            const { name, date, description } = req.body;
            const tenantId = req.tenantId || 1;

            if (!name || !date) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and date are required'
                });
            }

            // Check if holiday already exists - if yes, just return success (don't create duplicate)
            const [existing] = await pool.execute(
                `SELECT id FROM tb_holidays WHERE date = ? AND tenant_id = ?`,
                [date, tenantId]
            );

            if (existing.length > 0) {

                // Return success with existing holiday ID instead of error
                return res.json({
                    success: true,
                    message: 'Holiday already exists',
                    holiday_id: existing[0].id,
                    already_exists: true
                });
            }

            const [result] = await pool.execute(
                `INSERT INTO tb_holidays (name, date, description, is_active, tenant_id)
                 VALUES (?, ?, ?, 1, ?)`,
                [name, date, description || null, tenantId]
            );



            res.json({
                success: true,
                message: 'Holiday created successfully',
                holiday_id: result.insertId
            });
        } catch (error) {
            console.error('Create holiday error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    getHolidays: async (req, res) => {
        try {
            const { year } = req.query;
            const tenantId = req.tenantId || 1;

            let query = `SELECT ${holidaySelectFields} FROM tb_holidays WHERE tenant_id = ? AND is_active = 1`;
            const params = [tenantId];

            if (year) {
                query += ` AND YEAR(date) = ?`;
                params.push(year);
            }

            query += ` ORDER BY date ASC`;

            const [holidays] = await pool.execute(query, params);



            res.json({ success: true, holidays });
        } catch (error) {
            console.error('Get holidays error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },
    getHolidaysByYearMonth: async (req, res) => {
        try {
            const { year, month } = req.params;
            const tenantId = req.tenantId || 1;
            const range = getMonthDateRange(year, month);

            if (!range) {
                return res.status(400).json({ success: false, message: 'Invalid year or month' });
            }

            const [holidays] = await pool.execute(
                `SELECT ${holidaySelectFields} FROM tb_holidays
                 WHERE tenant_id = ?
                 AND date BETWEEN ? AND ?
                 AND is_active = 1
                 ORDER BY date ASC`,
                [tenantId, range.startDate, range.endDate]
            );

            res.json({ success: true, holidays });
        } catch (error) {
            console.error('Get holidays by year/month error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },
    deleteHoliday: async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId || 1;

            const [result] = await pool.execute(
                `DELETE FROM tb_holidays WHERE id = ? AND tenant_id = ?`,
                [id, tenantId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Holiday not found' });
            }

            console.log('Holiday deleted:', id);

            res.json({ success: true, message: 'Holiday deleted successfully' });
        } catch (error) {
            console.error('Delete holiday error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    getHolidayById: async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId || 1;

            const [holidays] = await pool.execute(
                `SELECT ${holidaySelectFields} FROM tb_holidays WHERE id = ? AND tenant_id = ?`,
                [id, tenantId]
            );

            if (holidays.length === 0) {
                return res.status(404).json({ success: false, message: 'Holiday not found' });
            }

            res.json({ success: true, holiday: holidays[0] });
        } catch (error) {
            console.error('Get holiday by ID error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    getHolidaysByMonth: async (req, res) => {
        try {
            const { month, year } = req.params;
            const tenantId = req.tenantId || 1;

            const range = getMonthDateRange(year, month);

            if (!range) {
                return res.status(400).json({ success: false, message: 'Invalid year or month' });
            }

            const [holidays] = await pool.execute(
                `SELECT ${holidaySelectFields} FROM tb_holidays
                 WHERE tenant_id = ?
                 AND date BETWEEN ? AND ?
                 AND is_active = 1
                 ORDER BY date ASC`,
                [tenantId, range.startDate, range.endDate]
            );

            res.json({ success: true, holidays });
        } catch (error) {
            console.error('Get holidays by month error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    updateHoliday: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, date, description, is_active } = req.body;
            const tenantId = req.tenantId || 1;

            const [result] = await pool.execute(
                `UPDATE tb_holidays
                 SET name = COALESCE(?, name),
                     date = COALESCE(?, date),
                     description = COALESCE(?, description),
                     is_active = COALESCE(?, is_active)
                 WHERE id = ? AND tenant_id = ?`,
                [
                    name !== undefined ? name : null,
                    date !== undefined ? date : null,
                    description !== undefined ? description : null,
                    is_active !== undefined ? is_active : null,
                    id,
                    tenantId
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Holiday not found' });
            }

            res.json({ success: true, message: 'Holiday updated successfully' });
        } catch (error) {
            console.error('Update holiday error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    bulkDeleteHolidays: async (req, res) => {
        try {
            const { ids } = req.body;
            const tenantId = req.tenantId || 1;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No holiday IDs provided'
                });
            }

            const placeholders = ids.map(() => '?').join(',');
            const [result] = await pool.execute(
                `DELETE FROM tb_holidays WHERE id IN (${placeholders}) AND tenant_id = ?`,
                [...ids, tenantId]
            );

            res.json({
                success: true,
                message: `${result.affectedRows} holidays deleted successfully`
            });
        } catch (error) {
            console.error('Bulk delete holidays error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    }
};

module.exports = holidayController;
