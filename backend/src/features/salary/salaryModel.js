// backend/src/features/admin/salaryModel.js
const { pool } = require('../../config/db');
const { addColumnIfMissing } = require('../../utils/schemaHelpers');

// Auto-create salary_slips table on first load
(async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS salary_slips (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id       INT NOT NULL,
                employee_id     VARCHAR(20) NOT NULL,
                salary_record_id INT NOT NULL,
                month           VARCHAR(20) NOT NULL,
                year            INT NOT NULL,
                month_number    INT NOT NULL DEFAULT 1,
                net_salary      DECIMAL(12,2) DEFAULT 0,
                generated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                generated_by    INT DEFAULT NULL,
                UNIQUE KEY uniq_slip (tenant_id, salary_record_id),
                INDEX idx_emp   (tenant_id, employee_id),
                INDEX idx_month (tenant_id, year, month_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    } catch (e) {
        console.error('[salary_slips] table init error:', e.message);
    }
    try {
        // Defensive fallback only — the guaranteed startup path for these columns
        // is salarySchema.js's ensureSalarySchema(), which server.js awaits before
        // accepting requests. This IIFE runs whenever salaryModel.js is first
        // required, which could theoretically happen before ensureSalarySchema()
        // in a non-standard entrypoint (e.g. a script that imports this model
        // directly) — addColumnIfMissing is idempotent, so running it twice is safe.
        await addColumnIfMissing('employee_details', 'payment_type', `payment_type ENUM('monthly','daily','hourly') NOT NULL DEFAULT 'monthly' AFTER employment_category`);
        await addColumnIfMissing('employee_details', 'pay_rate', `pay_rate DECIMAL(10,2) NULL AFTER payment_type`);
    } catch (e) {
        console.error('[employee_details payment_type/pay_rate] init error:', e.message);
    }
})();

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

const formatDate = (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date.slice(0, 10);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isSunday = (date) => date.getDay() === 0;

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const roundToInt = (num) => {
    if (isNaN(num)) return 0;
    return Math.round(num);
};

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const getPaymentStatus = (netSalary, paidAmount) => {
    if (netSalary <= 0) return 'pending';
    if (paidAmount >= netSalary) return 'paid';
    if (paidAmount > 0) return 'partial';
    return 'pending';
};

// tb_holidays for a given (tenant, month, year) is identical across every employee
// in that tenant. A bulk payroll run for 10,000 employees was re-querying this
// exact same result 10,000 times. Cache it in-process for the duration of a
// payroll run (short TTL — holidays are rarely edited mid-run, and a stale cache
// only matters for the ~1 min window, not for financial correctness since the
// same holiday set applies tenant-wide regardless of when within the run it's read).
const HOLIDAYS_CACHE_TTL_MS = 60 * 1000;
const holidaysCache = new Map(); // `${tenantId}_${year}_${month}` -> { value, expiresAt }

const Salary = {
    getHolidays: async (tenantId, month, year) => {
        const cacheKey = `${tenantId}_${year}_${month}`;
        const cached = holidaysCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) return cached.value;

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const daysInMonth = getDaysInMonth(year, month);
        const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

        const [holidays] = await pool.execute(
            `SELECT id, name, date, description FROM tb_holidays
             WHERE tenant_id = ? AND date BETWEEN ? AND ? AND is_active = 1`,
            [tenantId, startDate, endDate]
        );

        holidaysCache.set(cacheKey, { value: holidays, expiresAt: Date.now() + HOLIDAYS_CACHE_TTL_MS });
        return holidays;
    },

    getAttendanceForSalary: async (tenantId, employeeDetailId, month, year) => {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const daysInMonth = getDaysInMonth(year, month);
        const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

        const [attendance] = await pool.execute(
            `SELECT a.date, a.status, a.check_in, a.check_out, a.should_deduct_salary, a.deduction_amount
             FROM tb_attendance a
             JOIN employee_details ed ON a.employee_id = ed.id
             WHERE ed.tenant_id = ? AND ed.id = ?
             AND a.date BETWEEN ? AND ?
             ORDER BY a.date`,
            [tenantId, employeeDetailId, startDate, endDate]
        );

        return attendance;
    },

    getApprovedLeaveDates: async (tenantId, employeeDetailId, month, year) => {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const daysInMonth = getDaysInMonth(year, month);
        const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

        const [leaves] = await pool.execute(
            `SELECT lr.leave_id, lr.leave_type, lr.start_date, lr.end_date,
                    COALESCE(
                        lr.is_paid,
                        lt.is_paid,
                        CASE WHEN LOWER(TRIM(lr.leave_type)) = 'unpaid' THEN 0 ELSE 1 END
                    ) as is_paid
             FROM leave_requests lr
             LEFT JOIN leave_types lt
               ON lt.tenant_id = lr.tenant_id
              AND lt.name = lr.leave_type
             WHERE lr.tenant_id = ?
             AND lr.employee_id = ?
             AND LOWER(lr.status) = 'approved'
             AND lr.start_date <= ?
             AND lr.end_date >= ?
             ORDER BY lr.start_date ASC`,
            [tenantId, employeeDetailId, endDate, startDate]
        );

        const leaveDates = [];
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month - 1, daysInMonth);

        leaves.forEach((leave) => {
            const leaveStart = new Date(leave.start_date);
            const leaveEnd = new Date(leave.end_date);
            let currentDate = leaveStart > monthStart ? leaveStart : monthStart;
            const finalDate = leaveEnd < monthEnd ? leaveEnd : monthEnd;

            while (currentDate <= finalDate) {
                leaveDates.push({
                    date: formatDate(currentDate),
                    leave_id: leave.leave_id,
                    leave_type: leave.leave_type,
                    is_paid: Number(leave.is_paid) === 1
                });
                currentDate = addDays(currentDate, 1);
            }
        });

        const uniqueByDate = new Map();
        leaveDates.forEach((leaveDate) => {
            if (!uniqueByDate.has(leaveDate.date)) {
                uniqueByDate.set(leaveDate.date, leaveDate);
            }
        });

        return [...uniqueByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    },

    // Hourly/daily wage engine — used for interns, consultants and contract staff.
    // Pay = pay_rate * (days present, for 'daily') or pay_rate * (total worked hours, for 'hourly').
    // No PF/ESIC/TDS accrual model is applied here (statutory deductions for
    // non-payroll contract workers are typically handled outside HRMS payroll).
    calculateHourlyOrDailySalary: async (tenantId, employeeDetailId, month, year, paymentType, payRate) => {
        const startDate = new Date(year, month - 1, 1);
        const daysInMonth = getDaysInMonth(year, month);
        const endDate = new Date(year, month - 1, daysInMonth);

        const attendanceRecords = await Salary.getAttendanceForSalary(tenantId, employeeDetailId, month, year);
        const rate = parseFloat(payRate) || 0;

        let presentDays = 0;
        let halfDays = 0;
        let totalWorkedHours = 0;
        let attendanceDeductions = 0;
        const dailyBreakdown = [];

        const attendanceMap = new Map();
        attendanceRecords.forEach((record) => attendanceMap.set(formatDate(record.date), record));

        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateKey = formatDate(currentDate);
            const attendance = attendanceMap.get(dateKey);
            if (attendance) {
                const status = normalizeStatus(attendance.status);
                const hours = parseFloat(attendance.worked_hours) || 0;
                totalWorkedHours += hours;
                if (status === 'present' || status === 'delayed' || status === 'late') {
                    presentDays++;
                } else if (status === 'half day') {
                    halfDays++;
                }
                if (attendance.should_deduct_salary) {
                    attendanceDeductions += parseFloat(attendance.deduction_amount) || 0;
                }
            }
            dailyBreakdown.push({
                date: dateKey,
                status: attendance?.status || 'Absent',
                check_in: attendance?.check_in || '-',
                check_out: attendance?.check_out || '-',
                worked_hours: attendance ? (parseFloat(attendance.worked_hours) || 0) : 0,
            });
            currentDate = addDays(currentDate, 1);
        }

        const grossPay = paymentType === 'hourly'
            ? Math.round(rate * totalWorkedHours)
            : Math.round(rate * (presentDays + halfDays * 0.5));

        const totalDeduction = Math.round(attendanceDeductions);
        const netSalary = Math.max(0, grossPay - totalDeduction);

        const details = {
            payment_type: paymentType,
            pay_rate: rate,
            present_days: presentDays,
            half_days: halfDays,
            total_worked_hours: Math.round(totalWorkedHours * 100) / 100,
            gross_salary: grossPay,
            attendance_deductions: totalDeduction,
            total_deduction: totalDeduction,
            net_salary: netSalary,
        };

        return {
            basic_salary: grossPay,
            gross_salary: grossPay,
            deduction_amount: totalDeduction,
            pf_amount: 0,
            esic_amount: 0,
            tds_amount: 0,
            present_days: presentDays,
            half_days: halfDays,
            net_salary: netSalary,
            daily_breakdown: dailyBreakdown,
            details,
        };
    },

    calculateSalary: async (tenantId, employeeDetailId, month, year, annualSalary) => {
        // Branch to the hourly/daily wage engine for non-monthly employees.
        const [payTypeRows] = await pool.execute(
            `SELECT payment_type, pay_rate FROM employee_details WHERE id = ? AND tenant_id = ?`,
            [employeeDetailId, tenantId]
        );
        const paymentType = payTypeRows[0]?.payment_type || 'monthly';
        if (paymentType === 'daily' || paymentType === 'hourly') {
            return Salary.calculateHourlyOrDailySalary(tenantId, employeeDetailId, month, year, paymentType, payTypeRows[0]?.pay_rate);
        }

        const startDate = new Date(year, month - 1, 1);
        const daysInMonth = getDaysInMonth(year, month);
        const endDate = new Date(year, month - 1, daysInMonth);
        const monthlySalary = Math.round((parseFloat(annualSalary) || 0) / 12);

        // Fetch employee PF/TDS settings
        const [empData] = await pool.execute(
          `SELECT pf_applicable, employee_pf_contribution, epf_fixed_amount, tds_applicable, tds_percentage,
                  salary_basic, salary_hra, salary_medical_allowance, salary_travel_allowance, salary_other_allowance
           FROM employee_details WHERE id = ? AND tenant_id = ?`,
          [employeeDetailId, tenantId]
        );

        const empSettings = empData?.[0] || {};
        const pf_applicable = empSettings.pf_applicable || false;
        const employee_pf_percentage = empSettings.employee_pf_contribution || 12;
        const epf_fixed_amount = empSettings.epf_fixed_amount ? Number(empSettings.epf_fixed_amount) : null;
        const tds_applicable = empSettings.tds_applicable || false;
        const tds_percentage = empSettings.tds_percentage || 0;

        const holidays = await Salary.getHolidays(tenantId, month, year);
        const holidayDates = new Set(holidays.map((holiday) => formatDate(holiday.date)));
        const attendanceRecords = await Salary.getAttendanceForSalary(tenantId, employeeDetailId, month, year);
        const approvedLeaveDates = await Salary.getApprovedLeaveDates(tenantId, employeeDetailId, month, year);
        const leaveByDate = new Map(approvedLeaveDates.map((leaveDate) => [leaveDate.date, leaveDate]));

        let presentDays = 0;
        let halfDays = 0;
        let lateDays = 0;
        let absentDays = 0;
        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;
        let holidayDays = 0;
        let weeklyOffDays = 0;
        let paidDays = 0;
        let deductionDays = 0;
        let attendanceDeductions = 0;
        const dailyBreakdown = [];

        const attendanceMap = new Map();
        attendanceRecords.forEach((record) => {
            attendanceMap.set(formatDate(record.date), record);
        });

        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateKey = formatDate(currentDate);
            const attendance = attendanceMap.get(dateKey);
            const weeklyOff = isSunday(currentDate);
            const holiday = holidayDates.has(dateKey);
            const approvedLeave = leaveByDate.get(dateKey);
            let status = 'Absent';
            let shortStatus = 'A';
            let paidValue = 0;
            let deductionValue = 1;
            let leaveType = null;

            if (weeklyOff) {
                weeklyOffDays++;
                paidDays += 1;
                status = 'Weekly Off';
                shortStatus = 'WO';
                paidValue = 1;
                deductionValue = 0;
            } else if (holiday) {
                holidayDays++;
                paidDays += 1;
                status = 'Holiday';
                shortStatus = 'HD';
                paidValue = 1;
                deductionValue = 0;
            } else if (approvedLeave || normalizeStatus(attendance?.status) === 'on leave') {
                const isPaidLeave = approvedLeave ? approvedLeave.is_paid : true;
                leaveType = approvedLeave?.leave_type || null;

                if (isPaidLeave) {
                    paidLeaveDays++;
                    paidDays += 1;
                    status = leaveType ? `Paid Leave (${leaveType})` : 'Paid Leave';
                    shortStatus = 'PL';
                    paidValue = 1;
                    deductionValue = 0;
                } else {
                    unpaidLeaveDays++;
                    deductionDays += 1;
                    status = leaveType ? `Unpaid Leave (${leaveType})` : 'Unpaid Leave';
                    shortStatus = 'UL';
                }
            } else if (attendance) {
                const attStatus = normalizeStatus(attendance.status);
                if (attStatus === 'present') {
                    presentDays++;
                    paidDays += 1;
                    status = 'Present';
                    shortStatus = 'P';
                    paidValue = 1;
                    deductionValue = 0;
                } else if (attStatus === 'delayed' || attStatus === 'late') {
                    lateDays++;
                    paidDays += 1;
                    status = 'Delayed';
                    shortStatus = 'D';
                    paidValue = 1;
                    deductionValue = 0;
                } else if (attStatus === 'half day') {
                    halfDays++;
                    paidDays += 0.5;
                    deductionDays += 0.5;
                    status = 'Half Day';
                    shortStatus = 'H';
                    paidValue = 0.5;
                    deductionValue = 0.5;
                } else {
                    absentDays++;
                    deductionDays += 1;
                }

                if (attendance.should_deduct_salary) {
                    attendanceDeductions += parseFloat(attendance.deduction_amount) || 0;
                }
            } else {
                absentDays++;
                deductionDays += 1;
            }

            dailyBreakdown.push({
                date: dateKey,
                day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
                status,
                shortStatus,
                paid_value: paidValue,
                deduction_value: deductionValue,
                leave_type: leaveType,
                leave_is_paid: approvedLeave ? approvedLeave.is_paid : null,
                check_in: attendance?.check_in || '-',
                check_out: attendance?.check_out || '-'
            });

            currentDate = addDays(currentDate, 1);
        }

        if (attendanceRecords.length === 0 && leaveByDate.size === 0) {
            // No attendance data — treat all days as paid (full salary, no deduction)
            paidDays = daysInMonth;
            deductionDays = 0;
        }

        const dailyRate = monthlySalary / daysInMonth;
        const leaveAndAbsenceDeduction = Math.round(dailyRate * deductionDays);

        // Calculate PF using actual stored salary_basic, fallback to 40% of monthly
        const salaryBasic = empSettings.salary_basic
            ? Math.round(Number(empSettings.salary_basic))
            : Math.round(monthlySalary * 0.4);
        // Use fixed EPF amount if set, otherwise fall back to percentage
        const pf_amount = pf_applicable
          ? (epf_fixed_amount != null && epf_fixed_amount > 0
              ? epf_fixed_amount
              : Math.round(salaryBasic * (employee_pf_percentage / 100)))
          : 0;
        const esic_amount = monthlySalary <= 21000 ? Math.round(monthlySalary * 0.0075) : 0;
        const tds_amount = tds_applicable ? Math.round(monthlySalary * (tds_percentage / 100)) : 0;

        const totalDeduction = Math.round(leaveAndAbsenceDeduction + attendanceDeductions + pf_amount + esic_amount + tds_amount);
        const netSalary = Math.max(0, Math.round(monthlySalary - totalDeduction));
        const roundedPaidDays = Math.round(paidDays * 10) / 10;
        const roundedDeductionDays = Math.round(deductionDays * 10) / 10;

        const details = {
            present_days: presentDays,
            half_days: halfDays,
            late_days: lateDays,
            absent_days: absentDays,
            paid_leave_days: paidLeaveDays,
            unpaid_leave_days: unpaidLeaveDays,
            holiday_days: holidayDays,
            weekly_off_days: weeklyOffDays,
            effective_days: roundedPaidDays,
            paid_days: roundedPaidDays,
            deduction_days: roundedDeductionDays,
            total_days: daysInMonth,
            total_working_days: daysInMonth - weeklyOffDays - holidayDays,
            daily_rate: Math.round(dailyRate),
            monthly_salary: monthlySalary,
            gross_salary: monthlySalary,
            leave_and_absence_deduction: leaveAndAbsenceDeduction,
            attendance_deductions: Math.round(attendanceDeductions),
            total_deduction: totalDeduction,
            leave_policy_applied: true,
            paid_leave_rule: 'Paid/unpaid is determined by Leave Policy Settings for each approved leave request.',
            has_attendance_data: attendanceRecords.length > 0,
            calculation_summary: {
                monthly_salary: monthlySalary,
                daily_rate: Math.round(dailyRate),
                effective_days: roundedPaidDays,
                deduction_days: roundedDeductionDays,
                total_deduction: totalDeduction,
                net_salary: netSalary,
                note: attendanceRecords.length === 0 ? 'No attendance records found for this month' : null
            }
        };

        return {
            basic_salary: monthlySalary,
            gross_salary: monthlySalary,
            deduction_amount: totalDeduction,
            pf_amount,
            esic_amount,
            tds_amount,
            present_days: presentDays,
            half_days: halfDays,
            late_days: lateDays,
            absent_days: absentDays,
            paid_leave_days: paidLeaveDays,
            unpaid_leave_days: unpaidLeaveDays,
            holiday_days: holidayDays,
            weekly_off_days: weeklyOffDays,
            effective_days: roundedPaidDays,
            paid_days: roundedPaidDays,
            deduction_days: roundedDeductionDays,
            daily_rate: Math.round(dailyRate),
            net_salary: netSalary,
            daily_breakdown: dailyBreakdown,
            details
        };
    },

    getOrCreateSalaryRecord: async (tenantId, employeeDetailId, month, year, annualSalary) => {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const calculation = await Salary.calculateSalary(tenantId, employeeDetailId, month, year, annualSalary);
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [existing] = await connection.execute(
                `SELECT id, paid_amount, payment_status
                 FROM tb_salary_records
                 WHERE tenant_id = ? AND employee_id = ? AND month_number = ? AND year = ?
                 FOR UPDATE`,
                [tenantId, employeeDetailId, month, year]
            );

            const paidAmount = existing.length > 0 ? roundToInt(parseFloat(existing[0].paid_amount) || 0) : 0;
            const balanceAmount = Math.max(0, roundToInt(calculation.net_salary - paidAmount));
            const paymentStatus = getPaymentStatus(calculation.net_salary, paidAmount);
            const details = JSON.stringify(calculation.details);

            if (existing.length > 0) {
                await connection.execute(
                    `UPDATE tb_salary_records
                     SET month = ?, basic_salary = ?, gross_salary = ?, deduction_amount = ?,
                         net_salary = ?, balance_amount = ?, payment_status = ?, details = ?
                     WHERE id = ? AND tenant_id = ?`,
                    [
                        monthNames[month - 1],
                        calculation.basic_salary,
                        calculation.gross_salary,
                        calculation.deduction_amount,
                        calculation.net_salary,
                        balanceAmount,
                        paymentStatus,
                        details,
                        existing[0].id,
                        tenantId
                    ]
                );
            } else {
                await connection.execute(
                    `INSERT INTO tb_salary_records
                     (tenant_id, employee_id, month, month_number, year, basic_salary,
                      gross_salary, deduction_amount, net_salary, paid_amount, balance_amount,
                      payment_status, details)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        tenantId,
                        employeeDetailId,
                        monthNames[month - 1],
                        month,
                        year,
                        calculation.basic_salary,
                        calculation.gross_salary,
                        calculation.deduction_amount,
                        calculation.net_salary,
                        0,
                        calculation.net_salary,
                        'pending',
                        details
                    ]
                );
            }

            await connection.commit();
            const records = await Salary.getAllSalaryRecords(tenantId, month, year);
            return records.find((record) => record.employee_id === employeeDetailId || record.employee_detail_id === employeeDetailId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getAllSalaryRecords: async (tenantId, month, year, category = null) => {
        const params = [tenantId, month, year];
        let categoryClause = '';
        if (category && ['employee', 'intern', 'consultant'].includes(category)) {
            categoryClause = ' AND ed.employment_category = ?';
            params.push(category);
        }
        const [records] = await pool.execute(
            `SELECT sr.id, sr.employee_id, sr.month, sr.month_number, sr.year,
                    sr.basic_salary, sr.gross_salary, sr.net_salary, sr.paid_amount,
                    sr.balance_amount, sr.deduction_amount, sr.pf_amount, sr.esic_amount,
                    sr.professional_tax, sr.tds_amount,
                    sr.payment_status, sr.payment_date, sr.details, sr.created_at AS generated_at,
                    ROUND(COALESCE(NULLIF(ed.salary,0), ed.salary_gross * 12, 0), 0) as annual_salary,
                    ed.position, ed.department_id, ed.id as employee_detail_id,
                    ed.employment_category,
                    u.id as user_id, u.first_name, u.last_name, u.email,
                    d.name as department
             FROM tb_salary_records sr
             JOIN employee_details ed ON sr.employee_id = ed.id AND ed.tenant_id = sr.tenant_id
             JOIN users u ON ed.employee_id = u.id
             LEFT JOIN departments d ON ed.department_id = d.id
             WHERE sr.tenant_id = ? AND sr.month_number = ? AND sr.year = ?${categoryClause}
             ORDER BY u.first_name, u.last_name`,
            params
        );

        records.forEach((record) => {
            if (record.details && typeof record.details === 'string') {
                try {
                    record.details = JSON.parse(record.details);
                } catch (e) {
                    record.details = null;
                }
            }

            record.net_salary = roundToInt(parseFloat(record.net_salary) || 0);
            record.paid_amount = roundToInt(parseFloat(record.paid_amount) || 0);
            record.balance_amount = roundToInt(parseFloat(record.balance_amount) || 0);
            record.basic_salary = roundToInt(parseFloat(record.basic_salary) || 0);
            record.gross_salary = roundToInt(parseFloat(record.gross_salary) || 0);
            record.deduction_amount = roundToInt(parseFloat(record.deduction_amount) || 0);
            record.annual_salary = roundToInt(parseFloat(record.annual_salary) || 0);
        });

        return records;
    },

    updateSalaryRecord: async (tenantId, salaryRecordId, newNetSalary) => {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [records] = await connection.execute(
                `SELECT id, net_salary, paid_amount, balance_amount, payment_status
                 FROM tb_salary_records WHERE id = ? AND tenant_id = ? FOR UPDATE`,
                [salaryRecordId, tenantId]
            );

            if (records.length === 0) {
                throw new Error('Salary record not found');
            }

            const salaryRecord = records[0];
            const newNetSalaryInt = roundToInt(newNetSalary);
            const paidAmount = roundToInt(salaryRecord.paid_amount || 0);
            const newBalance = Math.max(0, roundToInt(newNetSalaryInt - paidAmount));
            const newStatus = getPaymentStatus(newNetSalaryInt, paidAmount);

            await connection.execute(
                `UPDATE tb_salary_records
                 SET net_salary = ?, balance_amount = ?, payment_status = ?
                 WHERE id = ?`,
                [newNetSalaryInt, newBalance, newStatus, salaryRecordId]
            );

            await connection.commit();

            return { success: true, new_amount: newNetSalaryInt, new_balance: newBalance, new_status: newStatus };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    recordPayment: async (tenantId, salaryRecordId, amount, paymentMethod, transactionId, notes, recordedBy) => {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [records] = await connection.execute(
                `SELECT id, net_salary, paid_amount, balance_amount, payment_status
                 FROM tb_salary_records WHERE id = ? AND tenant_id = ? FOR UPDATE`,
                [salaryRecordId, tenantId]
            );

            if (records.length === 0) {
                throw new Error('Salary record not found');
            }

            const salaryRecord = records[0];
            const paymentAmount = roundToInt(amount);
            const currentPaid = roundToInt(salaryRecord.paid_amount || 0);
            const currentNet = roundToInt(salaryRecord.net_salary || 0);
            const newPaid = roundToInt(currentPaid + paymentAmount);
            const newBalance = Math.max(0, roundToInt(currentNet - newPaid));
            const newStatus = getPaymentStatus(currentNet, newPaid);

            await connection.execute(
                `UPDATE tb_salary_records
                 SET paid_amount = ?, balance_amount = ?, payment_status = ?, payment_date = ?
                 WHERE id = ?`,
                [newPaid, newBalance, newStatus, new Date().toISOString().split('T')[0], salaryRecordId]
            );

            await connection.execute(
                `INSERT INTO tb_salary_payments
                 (salary_record_id, amount, payment_method, transaction_id, notes, recorded_by, tenant_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [salaryRecordId, paymentAmount, paymentMethod, transactionId || null, notes || null, recordedBy || null, tenantId]
            );

            await connection.commit();

            return { success: true, new_status: newStatus, paid_amount: newPaid, balance: newBalance };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    markAsPaid: async (tenantId, salaryRecordId) => {
        const [result] = await pool.execute(
            `UPDATE tb_salary_records
             SET paid_amount = net_salary, balance_amount = 0, payment_status = 'paid', payment_date = ?
             WHERE id = ? AND tenant_id = ?`,
            [new Date().toISOString().split('T')[0], salaryRecordId, tenantId]
        );
        return result.affectedRows > 0;
    },

    markAsPending: async (tenantId, salaryRecordId) => {
        const [result] = await pool.execute(
            `UPDATE tb_salary_records
             SET payment_status = 'pending', payment_date = NULL
             WHERE id = ? AND tenant_id = ?`,
            [salaryRecordId, tenantId]
        );
        return result.affectedRows > 0;
    },

    getEmployeeSalaryHistory: async (tenantId, employeeDetailId) => {
        const [records] = await pool.execute(
            `SELECT sr.*, CONCAT(sr.month, ' ', sr.year) as month
             FROM tb_salary_records sr
             WHERE sr.tenant_id = ? AND sr.employee_id = ?
             ORDER BY sr.year DESC, sr.month_number DESC`,
            [tenantId, employeeDetailId]
        );

        records.forEach((record) => {
            record.net_salary = roundToInt(parseFloat(record.net_salary) || 0);
            record.paid_amount = roundToInt(parseFloat(record.paid_amount) || 0);
            record.balance_amount = roundToInt(parseFloat(record.balance_amount) || 0);
        });

        return records;
    },

    getUniqueMonths: async (tenantId) => {
        const [months] = await pool.execute(
            `SELECT DISTINCT month, year, month_number
             FROM tb_salary_records
             WHERE tenant_id = ?
             ORDER BY year DESC, month_number DESC`,
            [tenantId]
        );
        return months;
    },

    // ── Salary Slip Repository ─────────────────────────────────────────────────

    saveSalarySlip: async (tenantId, salaryRecordId, generatedBy) => {
        const [rows] = await pool.execute(
            `SELECT sr.employee_id, sr.month, sr.year, sr.month_number, sr.net_salary
             FROM tb_salary_records sr
             WHERE sr.id = ? AND sr.tenant_id = ? LIMIT 1`,
            [salaryRecordId, tenantId]
        );
        if (!rows.length) return null;
        const r = rows[0];
        const [result] = await pool.execute(
            `INSERT INTO salary_slips
                (tenant_id, employee_id, salary_record_id, month, year, month_number, net_salary, generated_at, generated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
             ON DUPLICATE KEY UPDATE
                generated_at = NOW(), generated_by = VALUES(generated_by), net_salary = VALUES(net_salary)`,
            [tenantId, r.employee_id, salaryRecordId, r.month, r.year, r.month_number || 1, r.net_salary, generatedBy || null]
        );
        return result.insertId || salaryRecordId;
    },

    // Admin/HR: get all salary slips for tenant with optional filters
    getAllSalarySlips: async (tenantId, { month, year, employeeId } = {}) => {
        let sql = `
            SELECT ss.id, ss.salary_record_id, ss.month, ss.year, ss.month_number, ss.net_salary,
                   ss.generated_at, ss.generated_by,
                   sr.payment_status, sr.payment_date,
                   CONCAT(u.first_name,' ',u.last_name) AS employee_name,
                   u.email,
                   ed.position, ed.id AS employee_detail_id,
                   CONCAT(ug.first_name,' ',ug.last_name) AS generated_by_name
            FROM salary_slips ss
            JOIN tb_salary_records sr ON sr.id = ss.salary_record_id
            JOIN employee_details ed ON ed.id = ss.employee_id AND ed.tenant_id = ss.tenant_id
            JOIN users u ON u.id = ed.employee_id
            LEFT JOIN users ug ON ug.id = ss.generated_by
            WHERE ss.tenant_id = ?
        `;
        const params = [tenantId];
        if (month) { sql += ' AND ss.month_number = ?'; params.push(Number(month)); }
        if (year)  { sql += ' AND ss.year = ?'; params.push(Number(year)); }
        if (employeeId) { sql += ' AND ss.employee_id = ?'; params.push(String(employeeId)); }
        sql += ' ORDER BY ss.year DESC, ss.month_number DESC, employee_name ASC';
        const [rows] = await pool.execute(sql, params);
        return rows;
    },

    // Employee self-service: get own salary slips only
    getMySlips: async (tenantId, userEmployeeDetailId, { month, year } = {}) => {
        let sql = `
            SELECT ss.id, ss.salary_record_id, ss.month, ss.year, ss.month_number, ss.net_salary,
                   ss.generated_at, sr.payment_status, sr.payment_date
            FROM salary_slips ss
            JOIN tb_salary_records sr ON sr.id = ss.salary_record_id
            WHERE ss.tenant_id = ? AND ss.employee_id = ?
        `;
        const params = [tenantId, userEmployeeDetailId];
        if (month) { sql += ' AND ss.month_number = ?'; params.push(Number(month)); }
        if (year)  { sql += ' AND ss.year = ?'; params.push(Number(year)); }
        sql += ' ORDER BY ss.year DESC, ss.month_number DESC';
        const [rows] = await pool.execute(sql, params);
        return rows;
    },
};

module.exports = Salary;
