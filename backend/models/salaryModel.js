// backend/models/salaryModel.js - CLEAN WORKING VERSION
const pool = require('../config/database');

const Salary = {
    // Get all salary records with employee and department details
    getAll: async (tenantId, filters = {}) => {
        let query = `
            SELECT 
                sr.*,
                CONCAT(u.first_name, ' ', u.last_name) as employee_name,
                ed.position as designation,
                d.name as department_name
            FROM salary_records sr
            INNER JOIN employee_details ed ON sr.employee_id = ed.id
            INNER JOIN users u ON ed.user_id = u.id
            INNER JOIN departments d ON sr.department_id = d.id
            WHERE sr.tenant_id = ?
        `;
        
        const params = [tenantId];
        
        if (filters.employee) {
            query += ' AND sr.employee_id = ?';
            params.push(filters.employee);
        }
        if (filters.department) {
            query += ' AND sr.department_id = ?';
            params.push(filters.department);
        }
        if (filters.month) {
            query += ' AND sr.month = ?';
            params.push(filters.month);
        }
        if (filters.year) {
            query += ' AND sr.year = ?';
            params.push(filters.year);
        }
        if (filters.status) {
            query += ' AND sr.status = ?';
            params.push(filters.status);
        }
        
        query += ' ORDER BY sr.created_at DESC';
        
        const [rows] = await pool.execute(query, params);
        
        return rows.map(row => ({
            ...row,
            allowances: typeof row.allowances === 'string' ? JSON.parse(row.allowances) : (row.allowances || {}),
            deductions: typeof row.deductions === 'string' ? JSON.parse(row.deductions) : (row.deductions || {})
        }));
    },

    // Get salary record by ID
    getById: async (tenantId, id) => {
        const [rows] = await pool.execute(
            `SELECT 
                sr.*,
                CONCAT(u.first_name, ' ', u.last_name) as employee_name,
                ed.position as designation,
                d.name as department_name,
                ed.bank_account_number,
                ed.ifsc_code,
                ed.pan_number,
                ed.aadhar_number
            FROM salary_records sr
            INNER JOIN employee_details ed ON sr.employee_id = ed.id
            INNER JOIN users u ON ed.user_id = u.id
            INNER JOIN departments d ON sr.department_id = d.id
            WHERE sr.id = ? AND sr.tenant_id = ?`,
            [id, tenantId]
        );
        
        if (rows.length === 0) return null;
        
        const row = rows[0];
        return {
            ...row,
            allowances: typeof row.allowances === 'string' ? JSON.parse(row.allowances) : (row.allowances || {}),
            deductions: typeof row.deductions === 'string' ? JSON.parse(row.deductions) : (row.deductions || {})
        };
    },

    // Create new salary record
    create: async (tenantId, salaryData) => {
        const {
            employee_id,
            department_id,
            basic_salary,
            allowances,
            deductions,
            net_salary,
            payment_date,
            month,
            year,
            payment_frequency,
            status
        } = salaryData;

        const [result] = await pool.execute(
            `INSERT INTO salary_records (
                tenant_id, employee_id, department_id, basic_salary, allowances, deductions, 
                net_salary, payment_date, month, year, payment_frequency, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                tenantId,
                employee_id,
                department_id,
                basic_salary,
                JSON.stringify(allowances || {}),
                JSON.stringify(deductions || {}),
                net_salary,
                payment_date,
                month,
                year,
                payment_frequency || 'Monthly',
                status || 'pending'
            ]
        );
        return result.insertId;
    },

    // Update salary record
    update: async (tenantId, id, salaryData) => {
        const {
            employee_id,
            department_id,
            basic_salary,
            allowances,
            deductions,
            net_salary,
            payment_date,
            month,
            year,
            payment_frequency,
            status
        } = salaryData;

        const [result] = await pool.execute(
            `UPDATE salary_records 
            SET employee_id = ?, department_id = ?, basic_salary = ?, allowances = ?, 
                deductions = ?, net_salary = ?, payment_date = ?, month = ?, year = ?, 
                payment_frequency = ?, status = ?, updated_at = NOW()
            WHERE id = ? AND tenant_id = ?`,
            [
                employee_id,
                department_id,
                basic_salary,
                JSON.stringify(allowances || {}),
                JSON.stringify(deductions || {}),
                net_salary,
                payment_date,
                month,
                year,
                payment_frequency,
                status,
                id,
                tenantId
            ]
        );
        return result.affectedRows;
    },

    // Delete salary record
    delete: async (tenantId, id) => {
        const [result] = await pool.execute(
            'DELETE FROM salary_records WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return result.affectedRows;
    },

   // backend/models/salaryModel.js - FIXED getEmployees for your schema

getEmployees: async (tenantId) => {
    try {
        console.log('🔍 Fetching employees for tenant:', tenantId);
        
        // Query to get employees - using id as string
        const [rows] = await pool.execute(
            `SELECT 
                ed.id as employee_db_id,
                ed.id as employee_id,
                ed.user_id,
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as name,
                ed.position,
                ed.department_id,
                ed.salary,
                u.email,
                u.phone,
                ed.status
            FROM employee_details ed
            LEFT JOIN users u ON ed.user_id = u.id
            WHERE ed.tenant_id = ? AND ed.status = 'active'
            ORDER BY u.first_name, u.last_name`,
            [tenantId]
        );
        
        console.log('📊 Query returned rows:', rows.length);
        
        if (rows.length === 0) {
            console.log('⚠️ No employees found for tenant:', tenantId);
            return [];
        }
        
        const employees = rows.map(row => ({
            id: row.employee_db_id,  // This is the string ID from employee_details
            employee_id: row.employee_id,
            name: row.name && row.name.trim() ? row.name.trim() : `Employee ${row.employee_id}`,
            position: row.position || 'N/A',
            department_id: row.department_id,
            salary: parseFloat(row.salary) || 0,
            email: row.email || '',
            phone: row.phone || '',
            status: row.status || 'active'
        }));
        
        console.log('✅ Returning employees:', employees.length);
        if (employees.length > 0) {
            console.log('First employee:', employees[0]);
        }
        
        return employees;
    } catch (error) {
        console.error('❌ Error in Salary.getEmployees:', error);
        return [];
    }
},

    // Get departments for dropdown
    getDepartments: async (tenantId) => {
        try {
            const [rows] = await pool.execute(
                'SELECT id, name FROM departments WHERE tenant_id = ? ORDER BY name',
                [tenantId]
            );
            console.log('✅ Departments fetched:', rows.length);
            return rows;
        } catch (error) {
            console.error('Error in Salary.getDepartments:', error);
            return [];
        }
    },

    // Check if salary record already exists
    checkRecordExists: async (tenantId, employee_id, month, year, excludeId = null) => {
        let query = 'SELECT id FROM salary_records WHERE employee_id = ? AND month = ? AND year = ? AND tenant_id = ?';
        const params = [employee_id, month, year, tenantId];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const [rows] = await pool.execute(query, params);
        return rows.length > 0;
    },

    // Get salary statistics
    getStatistics: async (tenantId) => {
        const [rows] = await pool.execute(
            `SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as total_paid,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
                COALESCE(SUM(net_salary), 0) as total_amount
            FROM salary_records
            WHERE tenant_id = ?`,
            [tenantId]
        );
        return rows[0];
    },

    // Get salary records for a specific user ID (Employee view)
    getByUserId: async (tenantId, userId, filters = {}) => {
        let query = `
            SELECT 
                sr.*,
                CONCAT(u.first_name, ' ', u.last_name) as employee_name,
                ed.position as designation,
                d.name as department_name
            FROM salary_records sr
            INNER JOIN employee_details ed ON sr.employee_id = ed.id
            INNER JOIN users u ON ed.user_id = u.id
            INNER JOIN departments d ON sr.department_id = d.id
            WHERE sr.tenant_id = ? AND u.id = ?
        `;
        const params = [tenantId, userId];

        if (filters.month) {
            query += ' AND sr.month = ?';
            params.push(filters.month);
        }
        if (filters.year) {
            query += ' AND sr.year = ?';
            params.push(filters.year);
        }

        query += ` ORDER BY sr.year DESC, sr.month DESC`;
        
        const [rows] = await pool.execute(query, params);
        
        return rows.map(row => ({
            ...row,
            allowances: typeof row.allowances === 'string' ? JSON.parse(row.allowances) : (row.allowances || {}),
            deductions: typeof row.deductions === 'string' ? JSON.parse(row.deductions) : (row.deductions || {})
        }));
    },

    // Get salary breakdown by department
    getSalaryByDepartment: async (tenantId, month, year) => {
        const [rows] = await pool.execute(
            `SELECT 
                d.name as department_name,
                COUNT(sr.id) as employee_count,
                SUM(sr.basic_salary) as total_basic_salary,
                SUM(sr.net_salary) as total_net_salary,
                AVG(sr.net_salary) as average_salary
            FROM salary_records sr
            INNER JOIN departments d ON sr.department_id = d.id
            WHERE sr.tenant_id = ? AND sr.month = ? AND sr.year = ?
            GROUP BY d.id, d.name
            ORDER BY total_net_salary DESC`,
            [tenantId, month, year]
        );
        return rows;
    },

// backend/models/salaryModel.js - Fix calculateSalaryFromAttendance

calculateSalaryFromAttendance: async (tenantId, employeeId, month, year, basicSalary) => {
    try {
        let monthNumber = month;
        if (isNaN(month) && month) {
            const months = {
                'January': 1, 'February': 2, 'March': 3, 'April': 4,
                'May': 5, 'June': 6, 'July': 7, 'August': 8,
                'September': 9, 'October': 10, 'November': 11, 'December': 12
            };
            monthNumber = months[month];
        }
        
        const daysInMonth = new Date(year, monthNumber, 0).getDate();
        
        // Get attendance records
        const [attendanceRecords] = await pool.execute(
            `SELECT date, status, is_half_day, should_deduct_salary, deduction_amount, late_streak
            FROM tb_attendance 
            WHERE tenant_id = ? AND employee_id = ? 
            AND MONTH(date) = ? AND YEAR(date) = ?
            ORDER BY date ASC`,
            [tenantId, employeeId, monthNumber, year]
        );
        
        console.log(`📊 Attendance records for ${employeeId}:`, attendanceRecords.length);
        
        const dailyRate = basicSalary / daysInMonth;
        const halfDayDeduction = dailyRate * 0.5;
        
        let totalPayableDays = 0;
        let presentDays = 0;
        let delayedDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let totalDeductionAmount = 0;  // This will be the amount to DEDUCT from salary
        
        // Track consecutive late days
        let consecutiveLateCount = 0;
        let prevDate = null;
        
        for (const record of attendanceRecords) {
            const currentDate = new Date(record.date);
            let dayValue = 1;
            let deductionForDay = 0;
            
            // Check for consecutive late days
            if (prevDate) {
                const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
                if (dayDiff === 1 && record.status === 'Delayed') {
                    consecutiveLateCount++;
                } else if (record.status !== 'Delayed') {
                    consecutiveLateCount = 0;
                } else {
                    consecutiveLateCount = 1;
                }
            } else {
                consecutiveLateCount = record.status === 'Delayed' ? 1 : 0;
            }
            
            prevDate = currentDate;
            
            if (record.status === 'Present') {
                dayValue = 1;
                presentDays++;
                deductionForDay = 0;
            }
            else if (record.status === 'Delayed') {
                delayedDays++;
                if (consecutiveLateCount >= 3) {
                    dayValue = 0.5;  // Half day counted
                    deductionForDay = halfDayDeduction;  // Deduct half day salary
                    halfDays++;
                    totalDeductionAmount += halfDayDeduction;
                    console.log(`💰 Deducting ₹${halfDayDeduction} for ${record.date} (${consecutiveLateCount} consecutive lates)`);
                } else {
                    dayValue = 1;
                    deductionForDay = 0;
                }
            }
            else if (record.status === 'Half Day') {
                dayValue = 0.5;
                deductionForDay = halfDayDeduction;
                halfDays++;
                totalDeductionAmount += halfDayDeduction;
            }
            else if (record.status === 'Absent') {
                dayValue = 0;
                deductionForDay = dailyRate;  // Full day deduction for absent
                absentDays++;
                totalDeductionAmount += dailyRate;
                console.log(`💰 Deducting ₹${dailyRate} for ${record.date} (Absent)`);
            }
            else if (record.status === 'On Leave') {
                dayValue = 1;
                deductionForDay = 0;
            }
            
            totalPayableDays += dayValue;
        }
        
        // Calculate salary based on payable days
        let calculatedSalary = totalPayableDays * dailyRate;
        
        // Alternative calculation: Basic Salary - Total Deductions
        let finalSalary = basicSalary - totalDeductionAmount;
        
        console.log(`💰 Salary Calculation Result:`, {
            basicSalary,
            daysInMonth,
            dailyRate,
            payableDays: totalPayableDays,
            calculatedSalary,
            totalDeductionAmount,  // Amount to deduct
            finalSalary  // Net salary to pay
        });
        
        return {
            success: true,
            working_days: daysInMonth,
            daily_rate: dailyRate,
            half_day_deduction_rate: halfDayDeduction,
            payable_days: totalPayableDays,
            calculated_salary: calculatedSalary,
            deduction_amount: totalDeductionAmount,  // Amount to deduct from salary
            final_salary: finalSalary,  // Net salary to pay
            attendance_percentage: ((totalPayableDays / daysInMonth) * 100).toFixed(2),
            attendance_summary: {
                present_days: presentDays,
                delayed_days: delayedDays,
                half_days: halfDays,
                absent_days: absentDays,
                total_days: daysInMonth,
                payable_days: totalPayableDays
            }
        };
    } catch (error) {
        console.error('Error in calculateSalaryFromAttendance:', error);
        return {
            success: false,
            error: error.message,
            final_salary: basicSalary,
            deduction_amount: 0
        };
    }
}
};

module.exports = Salary;