// backend/models/attendanceModel.js
const { pool } = require('../../config/db');
const { getIndiaDate, getIndiaDateTime } = require('../../utils/indiaTime');

async function getEmployeeShiftForDateHelper(connection, tenantId, employeeId, date) {
    try {
        // 1. wfm_roster_assignments/wfm_shift_templates not available — skip roster lookup

        // 2. If no roster, fall back to the employee's default shift from the old system
        const [defaultShift] = await connection.execute(
            `SELECT
                s.shift_id as id,
                s.shift_id as shift_template_id,
                s.tenant_id,
                s.shift_name as name,
                s.check_in_time as start_time,
                s.check_out_time as end_time,
                s.grace_period_minutes,
                15 as late_mark_after_minutes,
                3 as half_day_on_late_count,
                8.00 as min_hours_for_full_day,
                4.00 as min_hours_for_half_day,
                s.is_default
            FROM employee_details ed
            JOIN tb_shifts s ON ed.default_shift_id = s.shift_id
            WHERE ed.id = ? AND ed.tenant_id = ?`,
            [employeeId, tenantId]
        );

        if (defaultShift.length > 0) {
            return { ...defaultShift[0], isFromRoster: false };
        }

        // 3. Fall back to the tenant's default from the old system.
        const [systemDefault] = await connection.execute(
            `SELECT
                s.shift_id as id,
                s.shift_id as shift_template_id,
                s.tenant_id,
                s.shift_name as name,
                s.check_in_time as start_time,
                s.check_out_time as end_time,
                s.grace_period_minutes,
                15 as late_mark_after_minutes,
                3 as half_day_on_late_count,
                8.00 as min_hours_for_full_day,
                4.00 as min_hours_for_half_day,
                s.is_default
            FROM tb_shifts s
            WHERE s.tenant_id = ? AND s.is_default = TRUE LIMIT 1`,
            [tenantId]
        );

        if (systemDefault.length > 0) {
            return { ...systemDefault[0], isFromRoster: false, isTenantDefault: true };
        }

        return null;
    } catch (error) {
        console.error('Error getting employee shift:', error);
        return null;
    }
}

const Attendance = {

getAll: async (tenantId, filters = {}) => {
    try {
        if (!tenantId) {
            return { rows: [], total: 0, page: 1, limit: 50 };
        }

        const baseSelect = `
            SELECT
                a.attendance_id,
                a.employee_id,
                ed.id as hr_employee_code,
                u.id as user_id,
                COALESCE(CONCAT(u.first_name, " ", u.last_name), "Unknown") as employee_name,
                s.shift_name,
                a.date,
                TIME_FORMAT(a.check_in, "%h:%i %p") as check_in_time,
                TIME_FORMAT(a.check_out, "%h:%i %p") as check_out_time,
                a.status,
                a.is_half_day,
                a.worked_hours,
                a.late_minutes,
                a.early_exit_minutes,
                a.overtime_minutes,
                a.undertime_minutes,
                a.remarks,
                a.deduction_reason,
                a.approved_by,
                a.check_in_latitude,
                a.check_in_longitude,
                a.check_out_latitude,
                a.check_out_longitude,
                DATE_FORMAT(a.approved_at, "%Y-%m-%d %h:%i %p") as approved_at,
                a.created_at
            FROM tb_attendance a
            LEFT JOIN employee_details ed ON a.employee_id = ed.id
            LEFT JOIN users u ON ed.employee_id = u.id
            LEFT JOIN tb_shifts s ON a.shift_id = s.shift_id
            WHERE a.tenant_id = ?
        `;

        const params = [tenantId];
        let whereClause = '';

        if (filters.start_date && filters.end_date) {
            whereClause += ' AND a.date BETWEEN ? AND ?';
            params.push(filters.start_date, filters.end_date);
        } else if (filters.date) {
            whereClause += ' AND a.date = ?';
            params.push(filters.date);
        } else {
            const today = getIndiaDate();
            whereClause += ' AND a.date = ?';
            params.push(today);
        }

        if (filters.status && filters.status !== 'all') {
            whereClause += ' AND a.status = ?';
            params.push(filters.status);
        }

        if (filters.department) {
            whereClause += ' AND ed.department_id = ?';
            params.push(filters.department);
        }

        if (filters.team_lead_user_id) {
            whereClause += ' AND ed.team_lead_id = ?';
            params.push(filters.team_lead_user_id);
        }

        const orderClause = ' ORDER BY a.date DESC, u.first_name, u.last_name';

        const page  = Math.max(1, Number(filters.page  || 1));
        const limit = Math.min(500, Math.max(1, Number(filters.limit || 100)));
        const offset = (page - 1) * limit;

        const dataQuery  = baseSelect + whereClause + orderClause + ` LIMIT ${limit} OFFSET ${offset}`;
        const countQuery = `SELECT COUNT(*) AS total FROM tb_attendance a LEFT JOIN employee_details ed ON a.employee_id = ed.id WHERE a.tenant_id = ?` + whereClause;

        const countParams = [tenantId, ...params.slice(1)];

        const [[countRow], [rows]] = await Promise.all([
            pool.execute(countQuery, countParams),
            pool.execute(dataQuery, params),
        ]);

        return { rows: rows || [], total: countRow[0]?.total || 0, page, limit };
    } catch (error) {
        console.error('Error in Attendance.getAll:', error);
        return { rows: [], total: 0, page: 1, limit: 100 };
    }
},      // Get attendance statistics
       // Get attendance statistics - FIXED VERSION
getStatistics: async (tenantId, date = null) => {
    try {
        const targetDate = date || getIndiaDate();

        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as delayed,
                SUM(CASE WHEN a.is_half_day = 1 THEN 1 ELSE 0 END) as half_day,
                SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) as on_leave,
                SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = 'Pending' THEN 1 ELSE 0 END) as pending
            FROM tb_attendance a
            WHERE a.date = ? AND a.tenant_id = ?
        `;

        const [rows] = await pool.execute(query, [targetDate, tenantId]);
        return rows[0] || { total: 0, present: 0, delayed: 0, half_day: 0, on_leave: 0, absent: 0, pending: 0 };
    } catch (error) {
        console.error('Error in Attendance.getStatistics:', error);
        // Return default values instead of throwing
        return { total: 0, present: 0, delayed: 0, half_day: 0, on_leave: 0, absent: 0, pending: 0 };
    }
},

        // Get employee history - FIXED VERSION
getEmployeeHistory: async (tenantId, employeeId) => {
    try {
        const query = `
            SELECT
                a.attendance_id as history_id,
                a.employee_id,
                a.date,
                a.remarks as description,
                a.status,
                DATE_FORMAT(a.created_at, "%Y-%m-%d") as created_date,
                TIME_FORMAT(a.check_in, "%H:%i") as check_in_time,
                TIME_FORMAT(a.check_out, "%H:%i") as check_out_time,
                a.is_half_day,
                a.worked_hours,
                a.remarks,
                s.shift_name
            FROM tb_attendance a
            LEFT JOIN tb_shifts s ON a.shift_id = s.shift_id
            JOIN employee_details ed ON a.employee_id = ed.id
            WHERE a.employee_id = ? AND a.tenant_id = ?
            ORDER BY a.date DESC
            LIMIT 50
        `;
        
        const [rows] = await pool.execute(query, [employeeId, tenantId]);
        return rows;
    } catch (error) {
        console.error('Error in Attendance.getEmployeeHistory:', error);
        return [];
    }
},

        // Get employee history statistics
        getEmployeeHistoryStats: async (tenantId, employeeId) => {
            try {
                const query = `
                    SELECT 
                        COUNT(*) as total,
                        COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) as present,
                        COALESCE(SUM(CASE WHEN a.status = 'Delayed' THEN 1 ELSE 0 END), 0) as delayed,
                        COALESCE(SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END), 0) as on_leave,
                        COALESCE(SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END), 0) as half_day
                    FROM tb_attendance a
                    JOIN employee_details ed ON a.employee_id = ed.id
                    WHERE a.employee_id = ? AND ed.tenant_id = ?
                `;
                
                const [rows] = await pool.execute(query, [employeeId, tenantId]);
                return rows[0] || { total: 0, present: 0, delayed: 0, on_leave: 0, half_day: 0 };
            } catch (error) {
                console.error('Error in Attendance.getEmployeeHistoryStats:', error);
                throw error;
            }
        },

        // Approve attendance
        approve: async (tenantId, attendanceId, approvedByEmployeeId) => {
            try {
                const [result] = await pool.execute(
                    `UPDATE tb_attendance a
                    SET a.status = 'Present', a.approved_by = ?, a.approved_at = ? 
                    WHERE a.attendance_id = ? AND a.tenant_id = ?`,
                    [approvedByEmployeeId, getIndiaDateTime(), attendanceId, tenantId]
                );

                if (result.affectedRows === 0) {
                    throw new Error('Attendance record not found or unauthorized');
                }

                return result;
            } catch (error) {
                console.error('Attendance model approve error:', error);
                throw error;
            }
        },

        // Reject attendance
        reject: async (tenantId, attendanceId, approvedByEmployeeId, remarks) => {
            try {
                const [result] = await pool.execute(
                    `UPDATE tb_attendance a 
                    SET a.status = 'Absent', a.remarks = ?, a.approved_by = ?, a.approved_at = ? 
                    WHERE a.attendance_id = ? AND a.tenant_id = ?`,
                    [remarks, approvedByEmployeeId, getIndiaDateTime(), attendanceId, tenantId]
                );

                if (result.affectedRows === 0) {
                    throw new Error('Attendance record not found or unauthorized');
                }

                return result;
            } catch (error) {
                console.error('Attendance model reject error:', error);
                throw error;
            }
        },

        // Get all shifts
        getShifts: async (tenantId) => {
            try {
                const [rows] = await pool.execute(
                    'SELECT * FROM tb_shifts WHERE tenant_id = ? ORDER BY check_in_time',
                    [tenantId]
                );
                return rows;
            } catch (error) {
                console.error('Error in Attendance.getShifts:', error);
                throw error;
            }
        },

       // backend/models/attendanceModel.js

checkExists: async (tenantId, employeeId, date) => {
    try {
        const [rows] = await pool.execute(
            `SELECT a.* FROM tb_attendance a
            WHERE a.employee_id = ? AND a.date = ? AND a.tenant_id = ?`,
            [employeeId, date, tenantId]
        );
        return rows.length > 0;
    } catch (error) {
        console.error('Error in Attendance.checkExists:', error);
        throw error;
    }
},
// backend/models/attendanceModel.js - Update the create method

create: async (tenantId, attendanceData) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Get employee details
        const [eCheck] = await connection.execute(
            'SELECT id, salary FROM employee_details WHERE id = ? AND tenant_id = ?',
            [attendanceData.employee_id, tenantId]
        );
        
        if (eCheck.length === 0) {
            throw new Error("Employee not found in tenant");
        }
        
        const employeeIdString = eCheck[0].id;
        const employeeSalary = eCheck[0].salary || 0;

        // Get shift for the employee
        let shiftInfo = await getEmployeeShiftForDateHelper(connection, tenantId, employeeIdString, attendanceData.date);

        // If no shift is configured, proceed without late/deduction calculations
        if (!shiftInfo) {
            shiftInfo = { start_time: null, grace_period_minutes: 15, id: null, shift_template_id: null };
        }

        const shiftId = shiftInfo.isFromRoster ? null : (shiftInfo.id || shiftInfo.shift_template_id);
        const shiftTemplateId = shiftInfo.id || shiftInfo.shift_template_id;
        const shiftCheckInTime = shiftInfo.start_time;
        const gracePeriodMinutes = shiftInfo.grace_period_minutes || 15;

        // Calculate status based on check-in time
        let status = attendanceData.status || 'Pending';
        let isLate = false;
        let lateMinutes = 0;
        let lateStreak = 0;
        let shouldDeductSalary = false;
        let deductionAmount = 0;
        let deductionReason = null;
        let lateWarning = false;   // true when this is the 3rd late this month (warn, no deduction)
        let monthLateCount = 0;    // total lates this calendar month including today

        if (attendanceData.check_in && shiftCheckInTime) {
            const checkInDateTime = new Date(attendanceData.check_in);
            const shiftTime = new Date(attendanceData.date);
            const [hours, minutes] = shiftCheckInTime.split(':');
            shiftTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const gracePeriod = new Date(shiftTime.getTime() + gracePeriodMinutes * 60000);

            if (checkInDateTime > gracePeriod) {
                status = 'Delayed';
                isLate = true;
                lateMinutes = Math.round((checkInDateTime - shiftTime) / (1000 * 60));

                // Count total lates this calendar month (excluding today)
                const dateParts = attendanceData.date.split('-');
                const yearVal = dateParts[0];
                const monthVal = dateParts[1];
                const [monthLateRows] = await connection.execute(
                    `SELECT COUNT(*) as cnt FROM tb_attendance
                     WHERE employee_id = ? AND tenant_id = ? AND is_late = 1
                       AND YEAR(date) = ? AND MONTH(date) = ? AND date < ?`,
                    [employeeIdString, tenantId, yearVal, monthVal, attendanceData.date]
                );
                monthLateCount = (Number(monthLateRows[0].cnt) || 0) + 1;
                lateStreak = monthLateCount;

                if (monthLateCount === 3) {
                    // 3rd late this month → warning notification only, no deduction yet
                    lateWarning = true;
                    deductionReason = `3 late arrivals this month — Warning: next late will result in half-day deduction`;
                } else if (monthLateCount >= 4) {
                    // 4th+ late this month → HALF day salary deduction (per policy)
                    shouldDeductSalary = true;
                    const dailySalary = employeeSalary / 26;
                    deductionAmount = parseFloat((dailySalary * 0.5).toFixed(2));
                    deductionReason = `${monthLateCount} late arrivals this month — Half-day salary deducted`;
                }
            } else {
                status = 'Present';
                lateStreak = 0;
            }
        }

        // Calculate worked hours
        let workedHours = 0;
        if (attendanceData.check_in && attendanceData.check_out) {
            const checkIn = new Date(attendanceData.check_in);
            const checkOut = new Date(attendanceData.check_out);
            workedHours = parseFloat(((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2));

            // Half-day deduction if worked < 4 hours
            if (workedHours < 4 && workedHours > 0 && !shouldDeductSalary) {
                shouldDeductSalary = true;
                const dailySalary = employeeSalary / 26;
                deductionAmount = parseFloat((dailySalary * 0.5).toFixed(2));
                deductionReason = `Worked only ${workedHours}h - Half day deduction`;
            }
        }

        // Prepare remarks
        let remarks = attendanceData.remarks || '';
        if (isLate && !remarks) {
            remarks = `Late check-in by ${lateMinutes} minutes`;
        }
        if (lateWarning && !shouldDeductSalary) {
            remarks = remarks ? `${remarks} | ${deductionReason}` : deductionReason;
        }
        if (shouldDeductSalary) {
            remarks = remarks ? `${remarks} | ${deductionReason}` : deductionReason;
        }

        // Insert attendance record - is_half_day is always 0
        const query = `
            INSERT INTO tb_attendance 
            (tenant_id, employee_id, shift_id, date, check_in, check_out, status, 
             is_half_day, is_late, late_minutes, late_streak, worked_hours, 
             scheduled_check_in, grace_period_minutes, remarks, 
             should_deduct_salary, deduction_amount, deduction_reason,
             check_in_latitude, check_in_longitude, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await connection.execute(query, [
            tenantId,
            employeeIdString,
            shiftId,
            attendanceData.date,
            attendanceData.check_in || null,
            attendanceData.check_out || null,
            status,  // Always 'Delayed' for late arrivals, never 'Half Day'
            0,  // is_half_day always 0 (removed from UI)
            isLate ? 1 : 0,
            lateMinutes,
            lateStreak,
            workedHours,
            shiftCheckInTime || null,
            gracePeriodMinutes,
            remarks,
            shouldDeductSalary ? 1 : 0,
            deductionAmount,
            deductionReason,
            attendanceData.latitude || null,
            attendanceData.longitude || null,
            getIndiaDateTime()
        ]);

        await connection.commit();
        
        return {
            attendance_id: result.insertId,
            shift_id: shiftId,
            status: status,
            is_late: isLate,
            late_minutes: lateMinutes,
            late_streak: lateStreak,
            month_late_count: monthLateCount,
            late_warning: lateWarning,
            should_deduct_salary: shouldDeductSalary,
            deduction_amount: deductionAmount,
            deduction_reason: deductionReason,
            is_half_day: false,
            worked_hours: workedHours,
            shift_name: shiftInfo.shift_name,
            shift_check_in: shiftCheckInTime
        };
    } catch (error) {
        await connection.rollback();
        console.error('Error in Attendance.create:', error);
        throw error;
    } finally {
        connection.release();
    }
},

        // Get employee shift for specific date
        getEmployeeShiftForDate: async (tenantId, employeeId, date) => {
            const connection = await pool.getConnection();
            try {
                const shift = await getEmployeeShiftForDateHelper(connection, tenantId, employeeId, date);
                return shift;
            } catch (error) {
                console.error('Error in Attendance.getEmployeeShiftForDate:', error);
                return null;
            } finally {
                connection.release();
            }
        },

      // backend/models/attendanceModel.js

updateCheckOut: async (tenantId, employeeId, date, checkOutTime, latitude = null, longitude = null, newRemarks = null) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Get existing attendance record
        const [attendance] = await connection.execute(
            `SELECT a.*, s.check_out_time as old_end_time
            FROM tb_attendance a
            LEFT JOIN tb_shifts s ON a.shift_id = s.shift_id
            WHERE a.employee_id = ? AND a.date = ? AND a.tenant_id = ?`,
            [employeeId, date, tenantId]
        );
        
        if (attendance.length === 0) {
            throw new Error('Check-in record not found for today.');
        }
        
        const record = attendance[0];
        const checkInTime = record.check_in;
        const shift = record; // The joined shift template data

        // --- Calculations ---
        const checkIn = new Date(checkInTime);
        const checkOut = new Date(checkOutTime);
        const workedHours = parseFloat(((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2));

        const endTimeStr = shift.check_out_time || shift.old_end_time || shift.end_time || '18:00';
        const [endHours, endMinutes] = endTimeStr.split(':');
        const expectedCheckOut = new Date(date);
        expectedCheckOut.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0, 0);

        const timeDiffMinutes = (checkOut - expectedCheckOut) / 60000;
        const earlyExitMinutes = timeDiffMinutes < 0 ? Math.abs(Math.round(timeDiffMinutes)) : 0;
        const overtimeMinutes = timeDiffMinutes > 0 ? Math.round(timeDiffMinutes) : 0;

        const isHalfDay = workedHours > 0 && workedHours < (shift.min_hours_for_half_day || 4);
        const undertimeMinutes = Math.max(0, ((shift.min_hours_for_full_day || 8) * 60) - (workedHours * 60));

        let finalRemarks = record.remarks;
        if (newRemarks) {
            finalRemarks = finalRemarks ? `${finalRemarks} | ${newRemarks}` : newRemarks;
        }
        if (earlyExitMinutes > 0) {
            finalRemarks = finalRemarks ? `${finalRemarks} | Early exit by ${earlyExitMinutes} mins` : `Early exit by ${earlyExitMinutes} mins`;
        }
        if (isHalfDay) {
            finalRemarks = finalRemarks ? `${finalRemarks} | Half-day` : `Half-day`;
        }

        const nextRemarks = newRemarks
            ? [record.remarks, newRemarks].filter(Boolean).join(' | ')
            : record.remarks;

        // Update attendance
        await connection.execute(
            `UPDATE tb_attendance
            SET check_out = ?, 
                worked_hours = ?, 
                is_half_day = ?, 
                early_exit_minutes = ?, 
                overtime_minutes = ?, 
                undertime_minutes = ?,
                remarks = ?,
                check_out_latitude = ?, 
                check_out_longitude = ?, 
                updated_at = ?
            WHERE employee_id = ? AND date = ? AND tenant_id = ?`,
            [checkOutTime, workedHours, isHalfDay, earlyExitMinutes, overtimeMinutes, undertimeMinutes, finalRemarks, latitude, longitude, getIndiaDateTime(), employeeId, date, tenantId]
        );
        
        await connection.commit();
        return { 
            employee_id: employeeId, 
            date: date, 
            check_out: checkOutTime,
            worked_hours: workedHours,
            is_half_day: isHalfDay,
        };
    } catch (error) {
        await connection.rollback();
        console.error('Error in Attendance.updateCheckOut:', error);
        throw error;
    } finally {
        connection.release();
    }
},

       // backend/models/attendanceModel.js

getByEmployeeAndDate: async (tenantId, employeeId, date) => {
    try {
        const [rows] = await pool.execute(
            `SELECT a.*, s.shift_name FROM tb_attendance a
            LEFT JOIN tb_shifts s ON a.shift_id = s.shift_id
            WHERE a.employee_id = ? AND a.date = ? AND a.tenant_id = ?`,
            [employeeId, date, tenantId]
        );
        return rows[0];
    } catch (error) {
        console.error('Error in Attendance.getByEmployeeAndDate:', error);
        throw error;
    }
},

        // Get monthly percentage
        getMonthlyPercentage: async (tenantId, employeeId, month = null, year = null) => {
            try {
                const [indiaYear, indiaMonth] = getIndiaDate().split('-');
                const targetMonth = month || Number(indiaMonth);
                const targetYear = year || Number(indiaYear);
                
                const query = `
                    SELECT 
                        COUNT(*) as total_records,
                        SUM(CASE WHEN a.status IN ('Present', 'Delayed', 'Half Day') THEN 1 ELSE 0 END) as present_days
                    FROM tb_attendance a
                    WHERE a.employee_id = ? 
                    AND MONTH(a.date) = ? 
                    AND YEAR(a.date) = ?
                    AND a.tenant_id = ?
                `;
                
                const [rows] = await pool.execute(query, [employeeId, targetMonth, targetYear, tenantId]);
                const data = rows[0] || { total_records: 0, present_days: 0 };
                
                const percentage = Math.min(100, Math.round((data.present_days / 22) * 100));
                return percentage;
            } catch (error) {
                console.error('Error in Attendance.getMonthlyPercentage:', error);
                throw error;
            }
        },

        // Get attendance for salary calculation
        getAttendanceForSalary: async (tenantId, employeeId, month, year) => {
            try {
                const [rows] = await pool.execute(
                    `SELECT 
                        date,
                        DATE_FORMAT(check_in, '%h:%i %p') as check_in_time,
                        DATE_FORMAT(check_out, '%h:%i %p') as check_out_time,
                        status,
                        is_half_day,
                        is_late,
                        late_minutes,
                        worked_hours,
                        remarks
                    FROM tb_attendance
                    WHERE tenant_id = ? 
                        AND employee_id = ? 
                        AND MONTH(date) = ? 
                        AND YEAR(date) = ?
                    ORDER BY date ASC`,
                    [tenantId, employeeId, month, year]
                );
                
                return rows;
            } catch (error) {
                console.error('Error in Attendance.getAttendanceForSalary:', error);
                throw error;
            }
        },

        // Get monthly attendance summary
        getMonthlyAttendanceSummary: async (tenantId, employeeId, month, year) => {
            try {
                const [rows] = await pool.execute(
                    `SELECT 
                        COUNT(*) as total_days,
                        COALESCE(SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END), 0) as present_days,
                        COALESCE(SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END), 0) as delayed_days,
                        COALESCE(SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END), 0) as half_days,
                        COALESCE(SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END), 0) as absent_days,
                        COALESCE(SUM(CASE WHEN status = 'On Leave' THEN 1 ELSE 0 END), 0) as leave_days,
                        COALESCE(SUM(worked_hours), 0) as total_worked_hours,
                        COALESCE(AVG(worked_hours), 0) as avg_worked_hours
                    FROM tb_attendance
                    WHERE tenant_id = ? 
                        AND employee_id = ? 
                        AND MONTH(date) = ? 
                        AND YEAR(date) = ?`,
                    [tenantId, employeeId, month, year]
                );
                
                return rows[0] || { 
                    total_days: 0, 
                    present_days: 0, 
                    delayed_days: 0,
                    half_days: 0, 
                    absent_days: 0,
                    leave_days: 0 
                };
            } catch (error) {
                console.error('Error in Attendance.getMonthlyAttendanceSummary:', error);
                throw error;
            }
        },
    };

    module.exports = Attendance;