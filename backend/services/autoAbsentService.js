// backend/services/autoAbsentService.js
const pool = require('../config/database');
const Attendance = require('../models/attendanceModel');

class AutoAbsentService {
    // Mark absent employees who didn't check in before shift end
    static async markAbsentForToday() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const currentTime = new Date();
            
            console.log(`🔄 Running auto absent check for ${today} at ${currentTime.toLocaleTimeString()}`);

            // Get all employees with shifts for today who haven't checked in
            const query = `
                SELECT 
                    ed.id as employee_id,
                    u.first_name,
                    u.last_name,
                    es.shift_id,
                    s.shift_name,
                    s.check_in_time,
                    s.check_out_time
                FROM tb_employee_shifts es
                JOIN employee_details ed ON es.employee_id = ed.id
                JOIN users u ON ed.user_id = u.id
                JOIN tb_shifts s ON es.shift_id = s.shift_id
                WHERE es.assigned_date = CURDATE()
                AND NOT EXISTS (
                    SELECT 1 
                    FROM tb_attendance a 
                    WHERE a.employee_id = ed.id 
                    AND a.date = CURDATE()
                    AND (a.check_in IS NOT NULL OR a.status = 'Present')
                )
            `;

            const [employees] = await pool.execute(query);

            console.log(`📊 Found ${employees.length} employees without attendance for today`);

            let markedCount = 0;

            for (const employee of employees) {
                // Check if current time is after shift end time
                const shiftEndTime = new Date(`${today}T${employee.check_out_time}`);
                
                if (currentTime > shiftEndTime) {
                    // Mark as absent
                    try {
                        await this.markEmployeeAbsent(employee, today);
                        markedCount++;
                    } catch (error) {
                        console.error(`❌ Error marking absent for ${employee.first_name} ${employee.last_name}:`, error);
                    }
                }
            }

            console.log(`✅ Auto absent marking completed. Marked ${markedCount} employees as absent.`);
            
            return { markedCount, totalEmployees: employees.length };
            
        } catch (error) {
            console.error('❌ Auto absent service error:', error);
            throw error;
        }
    }

    static async markEmployeeAbsent(employee, date) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Check if attendance record already exists
            const [existing] = await connection.execute(
                'SELECT attendance_id FROM tb_attendance WHERE employee_id = ? AND date = ?',
                [employee.employee_id, date]
            );

            if (existing.length > 0) {
                // Update existing record to Absent
                await connection.execute(
                    `UPDATE tb_attendance 
                     SET status = 'Absent', 
                         remarks = CONCAT(COALESCE(remarks, ''), ' | Auto-marked absent after shift end'),
                         updated_at = NOW()
                     WHERE employee_id = ? AND date = ?`,
                    [employee.employee_id, date]
                );
            } else {
                // Create new absent record
                await connection.execute(
                    `INSERT INTO tb_attendance 
                     (employee_id, shift_id, date, status, remarks, created_at)
                     VALUES (?, ?, ?, 'Absent', 'Auto-marked absent after shift end', NOW())`,
                    [employee.employee_id, employee.shift_id, date]
                );
            }

            // Create attendance history
            await connection.execute(
                `INSERT INTO attendance_history 
                 (employee_id, date, description, status, created_at)
                 VALUES (?, ?, ?, 'Absent', NOW())`,
                [
                    employee.employee_id,
                    date,
                    `Auto-marked absent - Shift ended at ${employee.check_out_time} without check-in`
                ]
            );

            await connection.commit();
            
            console.log(`✅ Marked ${employee.first_name} ${employee.last_name} as absent for ${date}`);
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Run the service (call this from a cron job)
    static async run() {
        return await this.markAbsentForToday();
    }
}

module.exports = AutoAbsentService;