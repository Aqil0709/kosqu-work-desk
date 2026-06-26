const shiftService = require('./shiftService');
const { getTenantId } = require('../../utils/tenant');

const getAllShifts = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const shifts = await shiftService.getAllShifts(tenantId);
        res.json({
            success: true,
            message: 'Shifts retrieved successfully',
            shifts: shifts
        });
    } catch (error) {
        next(error);
    }
};

const createShift = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user.id;
        const newShift = await shiftService.createShift(tenantId, req.body, userId);
        res.status(201).json({
            success: true,
            message: 'Shift created successfully',
            shift: newShift
        });
    } catch (error) {
        next(error);
    }
};

const getShiftById = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const shift = await shiftService.getShiftById(tenantId, req.params.id);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }
        res.json({ success: true, shift });
    } catch (error) {
        next(error);
    }
};

const updateShift = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user.id;
        const updatedShift = await shiftService.updateShift(tenantId, req.params.id, req.body, userId);
        res.json({
            success: true,
            message: 'Shift updated successfully',
            shift: updatedShift
        });
    } catch (error) {
        next(error);
    }
};

const deleteShift = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user.id;
        await shiftService.deleteShift(tenantId, req.params.id, userId);
        res.json({ success: true, message: 'Shift deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const setAsDefault = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user.id;
        await shiftService.setAsDefault(tenantId, req.params.id, userId);
        res.json({ success: true, message: 'Shift set as default successfully' });
    } catch (error) {
        next(error);
    }
};

const getShiftEmployees = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const employees = await shiftService.getShiftEmployees(tenantId, req.params.id);
        res.json({ success: true, employees });
    } catch (error) {
        next(error);
    }
};

const getAvailableEmployees = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const employees = await shiftService.getAvailableEmployees(tenantId);
        res.json({ success: true, employees });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllShifts,
    createShift,
    getShiftById,
    updateShift,
    deleteShift,
    setAsDefault,
    getShiftEmployees,
    getAvailableEmployees
};