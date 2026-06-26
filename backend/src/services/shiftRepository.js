const { pool } = require('../../config/db');
const { getIndiaDate } = require('../../utils/indiaTime');

const findAll = async (tenantId) => {
    const query = `
        SELECT 
            s.*,
            (SELECT COUNT(*) FROM rosters r WHERE r.shift_id = s.shift_id AND r.tenant_id = s.tenant_id AND r.roster_date = ?) as employee_count
        FROM shifts s
        WHERE s.tenant_id = ? AND s.is_active = 1
        ORDER BY s.is_default DESC, s.check_in_time ASC, s.shift_name ASC
    `;
    const [shifts] = await pool.execute(query, [getIndiaDate(), tenantId]);
    return shifts;
};

const findById = async (tenantId, shiftId) => {
    const [rows] = await pool.execute('SELECT * FROM shifts WHERE tenant_id = ? AND shift_id = ?', [tenantId, shiftId]);
    return rows[0];
};

const create = async (tenantId, data, userId, connection) => {
    const db = connection || pool;
    const {
        shift_name, shift_code, description, shift_type, check_in_time, check_out_time,
        break_duration, min_hours, grace_period_minutes, is_default, is_cross_midnight, is_night_shift
    } = data;

    const query = `
        INSERT INTO shifts (
            tenant_id, shift_name, shift_code, description, shift_type, check_in_time, check_out_time,
            break_duration, min_hours, grace_period_minutes, is_default, is_cross_midnight, is_night_shift, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
        tenantId, shift_name, shift_code || null, description || null, shift_type || 'General', check_in_time, check_out_time,
        break_duration || 60, min_hours || 8, grace_period_minutes || 15, is_default || false, is_cross_midnight, is_night_shift, userId, userId
    ]);
    return result.insertId;
};

const update = async (tenantId, shiftId, data, userId, connection) => {
    const db = connection || pool;
    const {
        shift_name, shift_code, description, shift_type, check_in_time, check_out_time,
        break_duration, min_hours, grace_period_minutes, is_cross_midnight, is_night_shift
    } = data;

    const query = `
        UPDATE shifts SET
            shift_name = ?, shift_code = ?, description = ?, shift_type = ?, check_in_time = ?, check_out_time = ?,
            break_duration = ?, min_hours = ?, grace_period_minutes = ?, is_cross_midnight = ?, is_night_shift = ?, updated_by = ?
        WHERE tenant_id = ? AND shift_id = ?
    `;
    await db.execute(query, [
        shift_name, shift_code || null, description || null, shift_type || 'General', check_in_time, check_out_time,
        break_duration || 60, min_hours || 8, grace_period_minutes || 15, is_cross_midnight, is_night_shift, userId,
        tenantId, shiftId
    ]);
};

const deleteById = async (tenantId, shiftId, userId) => {
    // Soft delete by setting is_active = 0
    await pool.execute('UPDATE shifts SET is_active = 0, updated_by = ? WHERE tenant_id = ? AND shift_id = ?', [userId, tenantId, shiftId]);
};

const unsetDefaultShift = async (tenantId, connection) => {
    const db = connection || pool;
    await db.execute('UPDATE shifts SET is_default = 0 WHERE tenant_id = ? AND is_default = 1', [tenantId]);
};

const setDefaultShift = async (tenantId, shiftId, userId, connection) => {
    const db = connection || pool;
    await db.execute('UPDATE shifts SET is_default = 1, updated_by = ? WHERE tenant_id = ? AND shift_id = ?', [userId, tenantId, shiftId]);
};

const isShiftInUse = async (tenantId, shiftId) => {
    const today = getIndiaDate();
    const [rows] = await pool.execute(
        'SELECT 1 FROM rosters WHERE tenant_id = ? AND shift_id = ? AND roster_date >= ? LIMIT 1',
        [tenantId, shiftId, today]
    );
    return rows.length > 0;
};

const assignShiftToEmployeeForDate = async (tenantId, shiftId, employeeDbId, date, userId, connection) => {
    const db = connection || pool;
    const query = `
        INSERT INTO rosters (tenant_id, employee_id, roster_date, shift_id, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id), updated_by = VALUES(updated_by), is_weekly_off = 0, is_holiday = 0
    `;
    await db.execute(query, [tenantId, employeeDbId, date, shiftId, userId, userId]);
};

const removeAssignmentsForShiftDate = async (tenantId, shiftId, date, connection) => {
    const db = connection || pool;
    const defaultShift = await findDefaultShift(tenantId, db);
    if (defaultShift) {
        await db.execute(
            'UPDATE rosters SET shift_id = ? WHERE tenant_id = ? AND shift_id = ? AND roster_date = ?',
            [defaultShift.shift_id, tenantId, shiftId, date]
        );
    }
};

const findEmployeesByShiftAndDate = async (tenantId, shiftId, date) => {
    const query = `
        SELECT u.id as employee_id, CONCAT(u.first_name, ' ', u.last_name) as employee_name
        FROM rosters r
        JOIN users u ON r.employee_id = u.id AND r.tenant_id = u.tenant_id
        WHERE r.tenant_id = ? AND r.shift_id = ? AND r.roster_date = ?
    `;
    const [employees] = await pool.execute(query, [tenantId, shiftId, date]);
    return employees;
};

const findAllEmployees = async (tenantId) => {
    const query = `
        SELECT 
            u.id as employee_id, 
            CONCAT(u.first_name, ' ', u.last_name) as employee_name,
            s.shift_name as default_shift_name
        FROM users u
        JOIN employee_details ed ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
        LEFT JOIN shifts s ON ed.default_shift_id = s.shift_id AND ed.tenant_id = s.tenant_id
        WHERE u.tenant_id = ? AND u.is_active = 1
        ORDER BY employee_name ASC
    `;
    const [employees] = await pool.execute(query, [tenantId]);
    return employees;
};

const findDefaultShift = async (tenantId, connection) => {
    const db = connection || pool;
    const [rows] = await db.execute('SELECT * FROM shifts WHERE tenant_id = ? AND is_default = 1 AND is_active = 1', [tenantId]);
    return rows[0];
}

module.exports = {
    findAll,
    findById,
    create,
    update,
    deleteById,
    unsetDefaultShift,
    setDefaultShift,
    isShiftInUse,
    assignShiftToEmployeeForDate,
    removeAssignmentsForShiftDate,
    findEmployeesByShiftAndDate,
    findAllEmployees,
};