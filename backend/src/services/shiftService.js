const shiftRepository = require('./shiftRepository');
const AppError = require('../../utils/appError');
const { pool } = require('../../config/db');
const { getIndiaDate } = require('../../utils/indiaTime');

const getAllShifts = async (tenantId) => {
    return await shiftRepository.findAll(tenantId);
};

const createShift = async (tenantId, shiftData, userId) => {
    if (!shiftData.shift_name || !shiftData.check_in_time || !shiftData.check_out_time) {
        throw new AppError('Shift Name, Check-in and Check-out times are required.', 400);
    }

    const isCrossMidnight = shiftData.check_out_time < shiftData.check_in_time;
    const dataToSave = {
        ...shiftData,
        is_cross_midnight: isCrossMidnight,
        is_night_shift: isCrossMidnight || (shiftData.check_in_time >= '22:00' || shiftData.check_out_time <= '06:00'),
    };

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (dataToSave.is_default) {
            await shiftRepository.unsetDefaultShift(tenantId, connection);
        }

        const newShiftId = await shiftRepository.create(tenantId, dataToSave, userId, connection);

        if (dataToSave.employees && dataToSave.employees.length > 0) {
            const today = getIndiaDate();
            for (const employeeId of dataToSave.employees) {
                await shiftRepository.assignShiftToEmployeeForDate(tenantId, newShiftId, employeeId, today, userId, connection);
            }
        }

        await connection.commit();
        return { shift_id: newShiftId, ...dataToSave };

    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            throw new AppError('A shift with this name or code already exists.', 409);
        }
        throw error;
    } finally {
        connection.release();
    }
};

const getShiftById = async (tenantId, shiftId) => {
    return await shiftRepository.findById(tenantId, shiftId);
};

const updateShift = async (tenantId, shiftId, shiftData, userId) => {
    const existingShift = await shiftRepository.findById(tenantId, shiftId);
    if (!existingShift) {
        throw new AppError('Shift not found.', 404);
    }

    const isCrossMidnight = shiftData.check_out_time < shiftData.check_in_time;
    const dataToUpdate = {
        ...shiftData,
        is_cross_midnight: isCrossMidnight,
        is_night_shift: isCrossMidnight || (shiftData.check_in_time >= '22:00' || shiftData.check_out_time <= '06:00'),
    };

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await shiftRepository.update(tenantId, shiftId, dataToUpdate, userId, connection);

        const today = getIndiaDate();
        await shiftRepository.removeAssignmentsForShiftDate(tenantId, shiftId, today, connection);
        if (dataToUpdate.employees && dataToUpdate.employees.length > 0) {
            for (const employeeId of dataToUpdate.employees) {
                await shiftRepository.assignShiftToEmployeeForDate(tenantId, shiftId, employeeId, today, userId, connection);
            }
        }

        await connection.commit();
        return { shift_id: shiftId, ...dataToUpdate };

    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            throw new AppError('A shift with this name or code already exists.', 409);
        }
        throw error;
    } finally {
        connection.release();
    }
};

const deleteShift = async (tenantId, shiftId, userId) => {
    const shift = await shiftRepository.findById(tenantId, shiftId);
    if (!shift) throw new AppError('Shift not found.', 404);
    if (shift.is_default) throw new AppError('Cannot delete the default shift. Please set another shift as default first.', 400);
    
    const isInUse = await shiftRepository.isShiftInUse(tenantId, shiftId);
    if (isInUse) throw new AppError('Cannot delete shift as it is assigned in future rosters. Please reassign employees first.', 400);

    return await shiftRepository.deleteById(tenantId, shiftId, userId);
};

const setAsDefault = async (tenantId, shiftId, userId) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await shiftRepository.unsetDefaultShift(tenantId, connection);
        await shiftRepository.setDefaultShift(tenantId, shiftId, userId, connection);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getShiftEmployees = async (tenantId, shiftId) => {
    return await shiftRepository.findEmployeesByShiftAndDate(tenantId, shiftId, getIndiaDate());
};

const getAvailableEmployees = async (tenantId) => {
    return await shiftRepository.findAllEmployees(tenantId);
};

module.exports = { getAllShifts, createShift, getShiftById, updateShift, deleteShift, setAsDefault, getShiftEmployees, getAvailableEmployees };