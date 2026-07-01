// backend/controllers/attendanceController.js
const Attendance = require('./attendanceModel');
const Employee = require('../employee/employeeModel');
const { verifyFace, identifyFace } = require('./faceServiceClient');
const Shift = require('../shift/shiftModel');
const {pool} = require('../../config/db');
const { getIndiaDate, getIndiaDateTime } = require('../../utils/indiaTime');
const { runAutoCheckout } = require('./autoCheckoutService');
const { sendToMany, getNotificationRecipients, getHRAndAdmins } = require('../notifications/notificationHelper');
const { parsePagination, paginatedResponse } = require('../../utils/pagination');
const { writeAuditLog } = require('../auditLog/auditLogRoutes');

// Haversine distance in metres between two lat/lng points
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Validate that provided coordinates are within the employee's assigned work location.
// If the employee has no work location assigned, attendance is always allowed.
// If a work location IS assigned, GPS coordinates are required.
// Exception: if employee has an approved WFH for today, skip all location checks.
async function validateGeofence(tenantId, employeeUserId, latitude, longitude) {
  // 1. Check for approved WFH today — bypass geofence entirely
  const todayStr = getIndiaDate();
  const [wfhRows] = await pool.execute(
    `SELECT id FROM wfh_requests
     WHERE tenant_id=? AND employee_id=? AND status='approved'
       AND from_date <= ? AND to_date >= ?
     LIMIT 1`,
    [tenantId, employeeUserId, todayStr, todayStr]
  );
  if (wfhRows.length) {
    return { valid: true, wfhBypass: true };
  }

  // 2. Normal geofence check
  const [rows] = await pool.execute(
    `SELECT wl.latitude, wl.longitude, wl.radius_meters, wl.name
     FROM tb_work_locations wl
     JOIN employee_details ed ON ed.work_location_id = wl.id
     WHERE CAST(ed.employee_id AS UNSIGNED) = ? AND ed.tenant_id = ? AND wl.is_active = 1
     LIMIT 1`,
    [employeeUserId, tenantId]
  );

  // No work location assigned → no geofence restriction
  if (!rows.length) return { valid: true };

  // Work location is configured but GPS was not provided
  if (!latitude || !longitude) {
    return { valid: false, reason: 'GPS location is required for attendance. Please enable location access and try again.' };
  }

  const loc  = rows[0];
  const dist = haversineMeters(Number(loc.latitude), Number(loc.longitude), Number(latitude), Number(longitude));
  if (dist > loc.radius_meters) {
    return {
      valid: false,
      reason: `You are ${Math.round(dist)}m away from "${loc.name}". Attendance can only be marked within ${loc.radius_meters}m.`
    };
  }
  return { valid: true };
}


const attendanceController = {
    // backend/controllers/attendanceController.js - Fix getAllAttendance

    getAllAttendance: async (req, res) => {
        try {
            const { date, status, start_date, end_date, department } = req.query;
            const today = getIndiaDate();
            const targetDate = date || today;
            const { page, limit } = parsePagination(req.query);

            const filters = {
                date: targetDate,
                status: status || 'all',
                start_date: start_date,
                end_date: end_date,
                department: department,
                page,
                limit,
            };

            if (req.user.position === 'team_lead') {
                filters.team_lead_user_id = req.user.id;
            }

            let result  = { rows: [], total: 0, page, limit };
            let stats   = { total: 0, present: 0, delayed: 0, half_day: 0, on_leave: 0, absent: 0, pending: 0 };

            try {
                [result, stats] = await Promise.all([
                    Attendance.getAll(req.tenantId, filters),
                    Attendance.getStatistics(req.tenantId, targetDate),
                ]);
            } catch (dbError) {
                console.error('Database error in getAllAttendance:', dbError);
            }

            res.json({
                success: true,
                attendance: result.rows,
                statistics: stats,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / result.limit),
                },
            });
        } catch (error) {
            console.error('Get attendance error:', error);
            res.status(200).json({
                success: false,
                message: 'Error fetching attendance data',
                attendance: [],
                statistics: { total: 0, present: 0, delayed: 0, half_day: 0, on_leave: 0, absent: 0, pending: 0 },
            });
        }
    },

    // Get employee attendance history
    getEmployeeHistory: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const history = await Attendance.getEmployeeHistory(req.tenantId, employeeId);
            const stats = await Attendance.getEmployeeHistoryStats(req.tenantId, employeeId);
            res.json({ history: history, statistics: stats });
        } catch (error) {
            console.error('Get employee history error:', error);
            res.status(500).json({ message: 'Server error while fetching employee history' });
        }
    },

    // Approve attendance
    approveAttendance: async (req, res) => {
        try {
            const { attendanceId } = req.params;
            const userId = req.user.id;

            const [employees] = await pool.execute(
                'SELECT id, employee_id FROM employee_details WHERE employee_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your user account is not linked to an employee record.'
                });
            }

            const employee = employees[0];
            await Attendance.approve(req.tenantId, attendanceId, employee.id);

            res.json({ success: true, message: 'Attendance approved successfully!' });
        } catch (error) {
            console.error('Approve attendance error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Reject attendance
    rejectAttendance: async (req, res) => {
        try {
            const { attendanceId } = req.params;
            const { remarks } = req.body;
            const userId = req.user.id;

            const [employees] = await pool.execute(
                'SELECT id, employee_id FROM employee_details WHERE employee_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your user account is not linked to an employee record.'
                });
            }

            const employee = employees[0];
            await Attendance.reject(req.tenantId, attendanceId, employee.id, remarks);

            res.json({ success: true, message: 'Attendance marked as leave!' });
        } catch (error) {
            console.error('Reject attendance error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Get shifts
    getShifts: async (req, res) => {
        try {
            const shifts = await Attendance.getShifts(req.tenantId);
            res.json({ shifts });
        } catch (error) {
            console.error('Get shifts error:', error);
            res.status(500).json({ message: 'Server error while fetching shifts' });
        }
    },

    // Get attendance statistics
    getAttendanceStats: async (req, res) => {
        try {
            const { date } = req.query;
            const stats = await Attendance.getStatistics(req.tenantId, date);
            res.json({ statistics: stats });
        } catch (error) {
            console.error('Get attendance stats error:', error);
            res.status(500).json({ message: 'Server error while fetching statistics' });
        }
    },

    // Mark attendance (for admin)
    markAttendance: async (req, res) => {
        try {
            const { employee_id, type, date, check_in_time, check_out_time, latitude, longitude } = req.body;

            if (!employee_id || !type) {
                return res.status(400).json({ success: false, message: 'Employee ID and type are required' });
            }

            const today = date || getIndiaDate();
            const currentDateTime = getIndiaDateTime();
            const attendanceExists = await Attendance.checkExists(req.tenantId, employee_id, today);

            let result;

            if (attendanceExists) {
                if (type === 'check_out') {
                    const checkOutTime = check_out_time || currentDateTime;
                    result = await Attendance.updateCheckOut(req.tenantId, employee_id, today, checkOutTime, latitude, longitude);
                } else {
                    return res.status(400).json({ success: false, message: 'Attendance already marked for today' });
                }
            } else {
                if (type === 'check_in') {
                    const checkInTime = check_in_time || currentDateTime;
                    result = await Attendance.create(req.tenantId, {
                        employee_id,
                        date: today,
                        check_in: checkInTime,
                        status: 'Present',
                        latitude,
                        longitude
                    });
                } else {
                    return res.status(400).json({ success: false, message: 'Cannot check out without checking in first' });
                }
            }

            res.json({ success: true, message: `Attendance ${type} marked successfully`, attendance: result });
        } catch (error) {
            console.error('❌ Mark attendance error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Get current user's today attendance
    getMyTodayAttendance: async (req, res) => {
        try {
            const userId = req.user.id;
            const [employees] = await pool.execute(
                'SELECT id, auto_checkout_enabled FROM employee_details WHERE employee_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const employeeId = employees[0].id;
            const today = getIndiaDate();
            const currentShift = await Shift.getEmployeeShiftForDate(req.tenantId, employeeId, today);

            const [attendance] = await pool.execute(
                `SELECT a.*, DATE_FORMAT(a.check_in, '%h:%i %p') as check_in_time,
                        DATE_FORMAT(a.check_out, '%h:%i %p') as check_out_time
                 FROM tb_attendance a
                 WHERE a.employee_id = ? AND a.date = ? AND a.tenant_id = ?`,
                [employeeId, today, req.tenantId]
            );

            res.json({
                success: true,
                auto_checkout_enabled: Boolean(employees[0].auto_checkout_enabled),
                shift: currentShift,
                attendance: attendance[0] || {
                    employee_id: employeeId,
                    check_in_time: null,
                    check_out_time: null,
                    status: 'Not Checked In',
                    date: today
                }
            });
        } catch (error) {
            console.error('Get my today attendance error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    getMyAutoCheckoutSetting: async (req, res) => {
        try {
            const userId = req.user.id;
            const [employees] = await pool.execute(
                'SELECT id, auto_checkout_enabled FROM employee_details WHERE employee_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const today = getIndiaDate();
            const shift = await Shift.getEmployeeShiftForDate(req.tenantId, employees[0].id, today);

            res.json({
                success: true,
                auto_checkout_enabled: Boolean(employees[0].auto_checkout_enabled),
                shift
            });
        } catch (error) {
            console.error('Get auto checkout setting error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    updateMyAutoCheckoutSetting: async (req, res) => {
        try {
            const userId = req.user.id;
            const enabled = req.body.enabled ?? req.body.auto_checkout_enabled;
            const normalizedEnabled = enabled === true || enabled === 1 || enabled === '1' || enabled === 'true';

            const [result] = await pool.execute(
                `UPDATE employee_details
                 SET auto_checkout_enabled = ?, updated_at = NOW()
                 WHERE employee_id = ? AND tenant_id = ?`,
                [normalizedEnabled ? 1 : 0, userId, req.tenantId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            res.json({
                success: true,
                auto_checkout_enabled: normalizedEnabled,
                message: normalizedEnabled ? 'Auto check-out enabled' : 'Auto check-out disabled'
            });
        } catch (error) {
            console.error('Update auto checkout setting error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Get current user's history
    getMyHistory: async (req, res) => {
        try {
            const userId = req.user.id;
            const [employees] = await pool.execute(
                'SELECT id FROM employee_details WHERE employee_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const employeeId = employees[0].id;
            const history = await Attendance.getEmployeeHistory(req.tenantId, employeeId);

            res.json({ success: true, history: history });
        } catch (error) {
            console.error('Get my history error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Mark my attendance
    // NOTE: This endpoint is ONLY for check-out (face verification is not re-required to
    // leave) and for check-in when the employee has no face enrolled yet (first-time /
    // exempted users). Any employee with an enrolled face MUST use verify-my-face for
    // check-in — this is enforced below so face verification cannot be bypassed by
    // calling this route directly. Client-supplied timestamps are never trusted; the
    // server clock is always used to prevent timestamp tampering.
    markMyAttendance: async (req, res) => {
        try {
            const { type, date, latitude, longitude } = req.body;
            const userId = req.user.id;

            if (!type) {
                return res.status(400).json({ success: false, message: 'Type is required' });
            }

            // Geofence validation
            const geo = await validateGeofence(req.tenantId, userId, latitude, longitude);
            if (!geo.valid) {
                return res.status(403).json({ success: false, message: geo.reason });
            }

            const [employees] = await pool.execute(
                'SELECT id, salary FROM employee_details WHERE employee_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const employeeId = employees[0].id;

            if (type === 'check_in') {
                const [faceRows] = await pool.execute(
                    'SELECT face_enrolled FROM employee_details WHERE id = ? AND tenant_id = ?',
                    [employeeId, req.tenantId]
                );
                if (faceRows.length && faceRows[0].face_enrolled) {
                    return res.status(403).json({
                        success: false,
                        message: 'Face verification is required for check-in. Please use the Face Check-In option.',
                    });
                }
            }

            const today = date || getIndiaDate();
            const currentDateTime = getIndiaDateTime();
            const attendanceExists = await Attendance.checkExists(req.tenantId, employeeId, today);
            const isWFHDay = !!geo.wfhBypass;

            let result;

            if (attendanceExists) {
                if (type === 'check_out') {
                    result = await Attendance.updateCheckOut(req.tenantId, employeeId, today, currentDateTime, latitude, longitude);

                    const { userIds, employeeName } = await getNotificationRecipients(req.tenantId, userId, { includeClient: false });
                    // Notify on half day (worked < 4 hours)
                    if (result && result.worked_hours && result.worked_hours < 4 && result.worked_hours > 0) {
                        await sendToMany(req.tenantId, userIds, {
                            title: 'Half Day Recorded',
                            message: `${employeeName} worked only ${result.worked_hours}h today and has been marked as Half Day.`,
                            type: 'attendance',
                        });
                    } else if (result?.should_deduct_salary) {
                        const hrIds = await getHRAndAdmins(req.tenantId);
                        await sendToMany(req.tenantId, [...new Set([...userIds, ...hrIds])], {
                            title: '🔴 Early Check-Out Salary Deduction',
                            message: `${employeeName} checked out early (shortage ${result.shortage_hours}h). A prorated deduction of ₹${result.deduction_amount} has been applied.`,
                            type: 'salary_deduction',
                        });
                        await writeAuditLog({
                            tenantId: req.tenantId, userId, userName: employeeName,
                            action: 'EARLY_CHECKOUT_DEDUCTION', entityType: 'attendance', entityId: employeeId,
                            description: result.deduction_reason,
                        });
                    } else {
                        // Regular checkout notification
                        await sendToMany(req.tenantId, userIds.filter(id => id !== userId), {
                            title: 'Employee Checked Out',
                            message: `${employeeName} has checked out for today${result?.worked_hours ? ` (${result.worked_hours}h worked)` : ''}.`,
                            type: 'attendance',
                        });
                    }
                } else {
                    return res.status(400).json({ success: false, message: 'Attendance already marked for today' });
                }
            } else {
                if (type === 'check_in') {
                    const checkInTime = currentDateTime;
                    try {
                        result = await Attendance.create(req.tenantId, {
                            employee_id: employeeId,
                            date: today,
                            check_in: checkInTime,
                            status: 'Present',
                            latitude: isWFHDay ? null : latitude,
                            longitude: isWFHDay ? null : longitude,
                            remarks: isWFHDay ? 'WFH' : null,
                        });
                    } catch (createErr) {
                        if (createErr.code === 'LATE_ARRIVAL_LIMIT_EXCEEDED') {
                            const hrIds = await getHRAndAdmins(req.tenantId);
                            const [empRow] = await pool.execute('SELECT CONCAT(first_name," ",last_name) AS name FROM users WHERE id = ?', [userId]);
                            const empName = empRow[0]?.name || `Employee #${userId}`;
                            await sendToMany(req.tenantId, hrIds, {
                                title: '🚫 Check-In Blocked — Late Arrival Limit Exceeded',
                                message: `${empName} attempted to check in but has exceeded the maximum late arrivals (${createErr.priorLateCount}) for this payroll cycle. Check-in was blocked.`,
                                type: 'attendance_warning',
                            });
                            await writeAuditLog({
                                tenantId: req.tenantId, userId, userName: empName,
                                action: 'CHECK_IN_BLOCKED_LATE_LIMIT', entityType: 'attendance', entityId: employeeId,
                                description: `Check-in blocked — ${createErr.priorLateCount} prior late arrivals this month.`,
                                status: 'failed',
                            });
                            return res.status(403).json({ success: false, message: createErr.message });
                        }
                        throw createErr;
                    }

                    const { userIds, employeeName } = await getNotificationRecipients(req.tenantId, userId, { includeClient: false });
                    // Notify on late check-in
                    if (result && result.is_late) {
                        if (result.should_deduct_salary) {
                            const hrIds = await getHRAndAdmins(req.tenantId);
                            await sendToMany(req.tenantId, [...new Set([...userIds, ...hrIds])], {
                                title: '🔴 Attendance Policy Violation — Full-Day Salary Deducted',
                                message: `${employeeName} has been late ${result.month_late_count} times this month. A full-day salary deduction (₹${result.deduction_amount}) has been applied and an absent day recorded per company policy.`,
                                type: 'salary_deduction',
                            });
                            await writeAuditLog({
                                tenantId: req.tenantId, userId, userName: employeeName,
                                action: 'ATTENDANCE_POLICY_VIOLATION', entityType: 'attendance', entityId: employeeId,
                                description: `${result.month_late_count} late arrivals this month — full-day deduction of ₹${result.deduction_amount} applied.`,
                            });
                        } else {
                            await sendToMany(req.tenantId, userIds, {
                                title: 'Late Check-in',
                                message: `${employeeName} checked in ${result.late_minutes} minutes late today (beyond grace period).`,
                                type: 'attendance',
                            });
                        }
                    } else {
                        // Regular on-time check-in notification
                        await sendToMany(req.tenantId, userIds.filter(id => id !== userId), {
                            title: 'Employee Checked In',
                            message: `${employeeName} has checked in for today${checkInTime ? ` at ${checkInTime.split(' ')[1] || ''}` : ''}.`,
                            type: 'attendance',
                        });
                    }
                } else {
                    return res.status(400).json({ success: false, message: 'Cannot check out without checking in first' });
                }
            }

            res.json({ success: true, message: `Attendance ${type} marked successfully`, attendance: result, is_wfh_day: isWFHDay });
        } catch (error) {
            console.error('❌ Mark my attendance error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Verify face via selfie and mark attendance for the logged-in employee
    verifyMyFaceAndMarkAttendance: async (req, res) => {
        try {
            const primaryFile = req.files?.faceImage?.[0];
            if (!primaryFile) {
                return res.status(400).json({ success: false, message: 'Selfie image is required.' });
            }
            // Extra frames (captured a few hundred ms apart) enable the blink/head-turn
            // liveness challenge — optional for backward compatibility with older clients.
            const extraFrames = [req.files?.faceImage_2?.[0], req.files?.faceImage_3?.[0]]
                .filter(Boolean)
                .map((f) => f.buffer);

            const userId    = req.user.id;
            const tenantId  = req.tenantId;
            const { latitude, longitude, type = 'check_in' } = req.body;

            // Get employee_details.id (PK) for this user
            const [employees] = await pool.execute(
                'SELECT id FROM employee_details WHERE employee_id = ? AND tenant_id = ?',
                [userId, tenantId]
            );
            if (!employees.length) {
                return res.status(404).json({ success: false, message: 'Employee record not found.' });
            }
            const employeeId = employees[0].id;

            // Call Python face service
            let faceResult;
            try {
                faceResult = await verifyFace(tenantId, employeeId, primaryFile.buffer, primaryFile.originalname || 'selfie.jpg', extraFrames);
            } catch (svcErr) {
                console.error('[FaceService] unreachable:', svcErr.message);
                // Face verification is mandatory — do NOT allow a silent bypass to regular
                // check-in. The employee must retry once the face service is back up.
                return res.status(503).json({
                    success: false,
                    message: 'Face recognition service is currently unavailable. Please try again in a few minutes or contact your administrator.',
                });
            }

            if (faceResult.success === false) {
                // Includes: no face detected, multiple faces detected, blurred image,
                // liveness/spoof check failed, or employee not enrolled yet.
                await writeAuditLog({
                    tenantId, userId, action: 'FACE_VERIFICATION_REJECTED',
                    entityType: 'attendance', entityId: employeeId,
                    description: `Face check (${type}) rejected: ${faceResult.reason || 'unknown'} — ${faceResult.message || ''}`,
                    ipAddress: req.ip, status: 'failed',
                });
                return res.status(422).json({
                    success: false,
                    face_verified: false,
                    reason: faceResult.reason || null,
                    message: faceResult.message || 'Face check failed. Please try again with a clear, live front-facing photo.',
                });
            }

            if (!faceResult.verified) {
                await writeAuditLog({
                    tenantId, userId, action: 'FACE_VERIFICATION_FAILED',
                    entityType: 'attendance', entityId: employeeId,
                    description: `Face verification (${type}) failed — confidence ${faceResult.confidence}%.`,
                    ipAddress: req.ip, status: 'failed',
                });
                return res.status(401).json({
                    success: false,
                    face_verified: false,
                    confidence: faceResult.confidence,
                    message: faceResult.message || 'Face verification failed.',
                });
            }

            await writeAuditLog({
                tenantId, userId, action: 'FACE_VERIFICATION_SUCCESS',
                entityType: 'attendance', entityId: employeeId,
                description: `Face verified (${type}) — confidence ${faceResult.confidence}%.`,
                ipAddress: req.ip, status: 'success',
            });

            // Face verified — now mark attendance (reuse markMyAttendance logic)
            const geo = await validateGeofence(tenantId, userId, latitude, longitude);
            if (!geo.valid) {
                return res.status(403).json({ success: false, message: geo.reason });
            }

            const today    = getIndiaDate();
            const nowDT    = getIndiaDateTime();
            const isWFHDay = !!geo.wfhBypass;
            const attendanceExists = await Attendance.checkExists(tenantId, employeeId, today);

            let result;
            if (attendanceExists) {
                if (type !== 'check_out') {
                    return res.status(400).json({ success: false, message: 'Attendance already marked for today.' });
                }
                result = await Attendance.updateCheckOut(tenantId, employeeId, today, nowDT, latitude, longitude);
            } else {
                if (type !== 'check_in') {
                    return res.status(400).json({ success: false, message: 'Cannot check out without checking in first.' });
                }
                try {
                    result = await Attendance.create(tenantId, {
                        employee_id: employeeId,
                        date: today,
                        check_in: nowDT,
                        status: 'Present',
                        latitude: isWFHDay ? null : latitude,
                        longitude: isWFHDay ? null : longitude,
                        remarks: `Face Verified${isWFHDay ? ' | WFH' : ''}`,
                    });
                } catch (createErr) {
                    if (createErr.code === 'LATE_ARRIVAL_LIMIT_EXCEEDED') {
                        const hrIds = await getHRAndAdmins(tenantId);
                        const [empRow] = await pool.execute('SELECT CONCAT(first_name," ",last_name) AS name FROM users WHERE id = ?', [userId]);
                        const empName = empRow[0]?.name || `Employee #${userId}`;
                        await sendToMany(tenantId, hrIds, {
                            title: '🚫 Check-In Blocked — Late Arrival Limit Exceeded',
                            message: `${empName} attempted to check in but has exceeded the maximum late arrivals (${createErr.priorLateCount}) for this payroll cycle. Check-in was blocked.`,
                            type: 'attendance_warning',
                        });
                        await writeAuditLog({
                            tenantId, userId, userName: empName, action: 'CHECK_IN_BLOCKED_LATE_LIMIT', entityType: 'attendance', entityId: employeeId,
                            description: `Check-in blocked — ${createErr.priorLateCount} prior late arrivals this month.`,
                            status: 'failed',
                        });
                        return res.status(403).json({ success: false, message: createErr.message });
                    }
                    throw createErr;
                }
            }

            const { userIds, employeeName } = await getNotificationRecipients(tenantId, userId, { includeClient: false });
            if (type === 'check_out' && result?.should_deduct_salary) {
                const hrIds = await getHRAndAdmins(tenantId);
                await sendToMany(tenantId, [...new Set([...userIds, ...hrIds])], {
                    title: '🔴 Early Check-Out Salary Deduction',
                    message: `${employeeName} checked out early (shortage ${result.shortage_hours}h). A prorated deduction of ₹${result.deduction_amount} has been applied.`,
                    type: 'salary_deduction',
                });
                await writeAuditLog({
                    tenantId, userId, userName: employeeName,
                    action: 'EARLY_CHECKOUT_DEDUCTION', entityType: 'attendance', entityId: employeeId,
                    description: result.deduction_reason,
                });
            } else if (result?.is_late) {
                if (result.should_deduct_salary) {
                    const hrIds = await getHRAndAdmins(tenantId);
                    await sendToMany(tenantId, [...new Set([...userIds, ...hrIds])], {
                        title: '🔴 Attendance Policy Violation — Full-Day Salary Deducted',
                        message: `${employeeName} has been late ${result.month_late_count} times this month. A full-day salary deduction (₹${result.deduction_amount}) has been applied and an absent day recorded per company policy.`,
                        type: 'salary_deduction',
                    });
                    await writeAuditLog({
                        tenantId, userId, userName: employeeName,
                        action: 'ATTENDANCE_POLICY_VIOLATION', entityType: 'attendance', entityId: employeeId,
                        description: `${result.month_late_count} late arrivals this month — full-day deduction of ₹${result.deduction_amount} applied.`,
                    });
                } else {
                    await sendToMany(tenantId, userIds, {
                        title: 'Late Check-in',
                        message: `${employeeName} checked in ${result.late_minutes} minutes late today (via face recognition).`,
                        type: 'attendance',
                    });
                }
            } else {
                await sendToMany(tenantId, userIds.filter(id => id !== userId), {
                    title: `Employee ${type === 'check_in' ? 'Checked In' : 'Checked Out'} (Face)`,
                    message: `${employeeName} ${type === 'check_in' ? 'checked in' : 'checked out'} via face recognition.`,
                    type: 'attendance',
                });
            }

            return res.json({
                success: true,
                face_verified: true,
                confidence: faceResult.confidence,
                message: `Attendance ${type} marked via face recognition.`,
                attendance: result,
                is_wfh_day: isWFHDay,
            });
        } catch (error) {
            console.error('❌ verifyMyFaceAndMarkAttendance error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Identify employee from selfie and mark attendance (admin/kiosk use)
    identifyAndMarkAttendance: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Selfie image is required.' });
            }

            const tenantId = req.tenantId;
            const { latitude, longitude, type = 'check_in' } = req.body;

            let faceResult;
            try {
                faceResult = await identifyFace(tenantId, req.file.buffer, req.file.originalname || 'selfie.jpg');
            } catch (svcErr) {
                console.error('[FaceService] unreachable:', svcErr.message);
                return res.status(503).json({ success: false, message: 'Face recognition service is currently unavailable.' });
            }

            if (!faceResult.identified) {
                return res.status(404).json({
                    success: false,
                    identified: false,
                    message: faceResult.message || 'Could not identify employee from this photo.',
                });
            }

            const employeeId = faceResult.employee_id; // employee_details.id (PK)

            // Get user_id for notifications
            const [empRows] = await pool.execute(
                'SELECT employee_id as user_id FROM employee_details WHERE id = ? AND tenant_id = ?',
                [employeeId, tenantId]
            );
            if (!empRows.length) {
                return res.status(404).json({ success: false, message: 'Employee record not found.' });
            }
            const userId = empRows[0].user_id;

            const today  = getIndiaDate();
            const nowDT  = getIndiaDateTime();
            const attendanceExists = await Attendance.checkExists(tenantId, employeeId, today);

            let result;
            if (attendanceExists) {
                if (type !== 'check_out') {
                    return res.status(400).json({ success: false, message: 'Attendance already marked for today.' });
                }
                result = await Attendance.updateCheckOut(tenantId, employeeId, today, nowDT, latitude, longitude);
            } else {
                if (type !== 'check_in') {
                    return res.status(400).json({ success: false, message: 'Cannot check out without checking in first.' });
                }
                result = await Attendance.create(tenantId, {
                    employee_id: employeeId,
                    date: today,
                    check_in: nowDT,
                    status: 'Present',
                    latitude,
                    longitude,
                    remarks: 'Face Identified (Kiosk)',
                });
            }

            return res.json({
                success: true,
                identified: true,
                employee_id: employeeId,
                confidence: faceResult.confidence,
                message: `Attendance ${type} marked via face identification.`,
                attendance: result,
            });
        } catch (error) {
            console.error('❌ identifyAndMarkAttendance error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },


    // Get employee attendance percentage
    getEmployeeAttendancePercentage: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { month, year } = req.query;

            const [indiaYear, indiaMonth] = getIndiaDate().split('-');
            const targetMonth = month || Number(indiaMonth);
            const targetYear = year || Number(indiaYear);
            const percentage = await Attendance.getMonthlyPercentage(req.tenantId, employeeId, targetMonth, targetYear);

            res.json({ success: true, attendance_percentage: percentage });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Get monthly attendance summary
    getMonthlyAttendanceSummary: async (req, res) => {
        try {
            const { employeeId } = req.params;
            let { month, year } = req.query;

            const [indiaYear, indiaMonth] = getIndiaDate().split('-');
            const targetMonth = month || Number(indiaMonth);
            const targetYear = year || Number(indiaYear);
            const summary = await Attendance.getMonthlyAttendanceSummary(req.tenantId, employeeId, parseInt(targetMonth), parseInt(targetYear));

            res.json({ success: true, summary });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Mark absent
    markAbsent: async (req, res) => {
        try {
            const userId = req.user.id;
            const today = getIndiaDate();

            const employee = await Employee.getByUserId(req.tenantId, userId);
            if (!employee || !employee.employee_id) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const exists = await Attendance.checkExists(req.tenantId, employee.employee_id, today);
            if (!exists) {
                await Attendance.create(req.tenantId, {
                    employee_id: employee.employee_id,
                    date: today,
                    status: 'Absent',
                    remarks: 'Marked as absent by system'
                });
            }

            res.json({ success: true, message: 'Absent marked successfully' });
        } catch (error) {
            console.error('Error marking absent:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Get attendance for salary calculation
    getAttendanceForSalary: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { month, year } = req.query;

            const attendanceRecords = await Attendance.getAttendanceForSalary(req.tenantId, employeeId, parseInt(month), parseInt(year));
            res.json({ success: true, attendance: attendanceRecords });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Mark check-out
    markCheckOut: async (req, res) => {
        try {
            const { employee_id, check_out_time, latitude, longitude } = req.body;
            const userId = req.user.id;

            let targetEmployeeId = employee_id;
            if (!targetEmployeeId) {
                const employee = await Employee.getByUserId(req.tenantId, userId);
                targetEmployeeId = employee.employee_id;
            }

            const today = getIndiaDate();
            const checkOutTime = check_out_time || getIndiaDateTime();
            const result = await Attendance.updateCheckOut(req.tenantId, targetEmployeeId, today, checkOutTime, latitude, longitude);

            res.json({ success: true, message: 'Check-out successful', attendance: result });
        } catch (error) {
            console.error('❌ Check-out error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    runAutoCheckout: async (req, res) => {
        try {
            const result = await runAutoCheckout();
            res.json({
                success: true,
                message: `Auto check-out completed for ${result.checkedOutCount} employee(s).`,
                ...result
            });
        } catch (error) {
            console.error('Run auto checkout error:', error);
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    }
};

module.exports = attendanceController;
