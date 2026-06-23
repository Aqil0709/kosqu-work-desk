/**
 * Add attendance records, salary records, and leave requests
 * for the 6 seeded employees so all frontend modules have real data.
 * Run: node seed_activity_data.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
});

const TENANT_ID = 2;

// Working days in June 2026 up to the 10th
const JUNE_DAYS = ['2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05',
                   '2026-06-06','2026-06-09','2026-06-10'];
// May 2026 working days (sample — ~22 days)
const MAY_DAYS = [
  '2026-05-01','2026-05-02','2026-05-05','2026-05-06','2026-05-07','2026-05-08','2026-05-09',
  '2026-05-12','2026-05-13','2026-05-14','2026-05-15','2026-05-16',
  '2026-05-19','2026-05-20','2026-05-21','2026-05-22','2026-05-23',
  '2026-05-26','2026-05-27','2026-05-28','2026-05-29','2026-05-30',
];

function toCheckIn(date, hour=9, min=0) {
  return `${date} ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`;
}
function toCheckOut(date) {
  return `${date} 18:30:00`;
}

async function getEmployees() {
  const [rows] = await pool.execute(
    `SELECT u.id as uid, ed.id as emp_code,
            ed.salary_basic, ed.salary_gross, ed.salary_net,
            ed.salary_pf, ed.salary_esic, ed.salary_professional_tax,
            ed.salary_total_deduction
     FROM users u
     JOIN employee_details ed ON ed.employee_id = u.id
     WHERE u.tenant_id=? AND u.email IN (
       'rahul.sharma@kosqu.com','priya.patel@kosqu.com','amit.singh@kosqu.com',
       'sneha.reddy@kosqu.com','vikram.mehta@kosqu.com','neha.joshi@kosqu.com'
     )`,
    [TENANT_ID]
  );
  return rows;
}

async function addAttendance(empCode, days, lateOnDay) {
  for (const day of days) {
    const [[exists]] = await pool.execute(
      'SELECT 1 FROM tb_attendance WHERE employee_id=? AND date=? AND tenant_id=?',
      [empCode, day, TENANT_ID]
    );
    if (exists) continue;

    const isLate = day === lateOnDay;
    const checkInHour = isLate ? 9 : 9;
    const checkInMin  = isLate ? 22 : 0;
    const lateMin     = isLate ? 22 : 0;
    const workedHours = isLate ? 9.13 : 9.50;

    await pool.execute(
      `INSERT INTO tb_attendance
         (tenant_id, employee_id, shift_id, date, check_in, check_out, status,
          is_late, late_minutes, worked_hours, is_half_day)
       VALUES (?,?,1,?,?,?,?,?,?,?,0)`,
      [
        TENANT_ID, empCode, day,
        toCheckIn(day, checkInHour, checkInMin),
        toCheckOut(day),
        isLate ? 'Delayed' : 'Present',
        isLate ? 1 : 0,
        lateMin,
        workedHours,
      ]
    );
  }
}

async function addSalaryRecord(emp, month, monthNum, year, days) {
  const [[exists]] = await pool.execute(
    'SELECT 1 FROM tb_salary_records WHERE employee_id=? AND month=? AND year=? AND tenant_id=?',
    [emp.emp_code, month, year, TENANT_ID]
  );
  if (exists) return;

  const working = days.length;
  const presentDays = working - 1; // 1 day absent for variety
  const basic = Number(emp.salary_basic) || 45000;
  const gross = Number(emp.salary_gross) || 70000;
  const ded   = Number(emp.salary_total_deduction) || 6600;
  const net   = Number(emp.salary_net) || (gross - ded);

  const details = {
    basic_salary:      basic,
    hra:               Number(emp.salary_gross - emp.salary_basic) || 0,
    pf_employee:       Number(emp.salary_pf) || 0,
    esic_employee:     Number(emp.salary_esic) || 0,
    professional_tax:  Number(emp.salary_professional_tax) || 0,
  };

  await pool.execute(
    `INSERT INTO tb_salary_records
       (employee_id, month, year, month_number, basic_salary,
        total_working_days, present_days, absent_days, half_days, late_days,
        paid_leaves_used, unpaid_leaves, holiday_days,
        gross_salary, deduction_amount, net_salary,
        paid_amount, balance_amount, payment_status, payment_date,
        details, tenant_id)
     VALUES (?,?,?,?,?,?,?,?,0,1,0,1,0,?,?,?,?,0,'paid',?,?,?)`,
    [
      emp.emp_code, month, year, monthNum, basic,
      working, presentDays, 1,
      gross, ded, net,
      net, `${year}-${String(monthNum+1).padStart(2,'0')}-05`,
      JSON.stringify(details), TENANT_ID,
    ]
  );
}

async function addLeaveRequest(empCode, type, start, end, reason) {
  const [[exists]] = await pool.execute(
    'SELECT 1 FROM leave_requests WHERE employee_id=? AND start_date=? AND tenant_id=?',
    [empCode, start, TENANT_ID]
  );
  if (exists) return;

  await pool.execute(
    `INSERT INTO leave_requests
       (tenant_id, employee_id, leave_type, start_date, end_date, description,
        status, approval_level, tl_status, pl_status, hr_status)
     VALUES (?,?,?,?,?,?,'pending','tl','pending','pending','pending')`,
    [TENANT_ID, empCode, type, start, end, reason]
  );
  console.log(`  LEAVE: ${empCode} — ${type} ${start}→${end}`);
}

(async () => {
  try {
    const emps = await getEmployees();
    console.log(`Found ${emps.length} demo employees\n`);

    // ----- Attendance -----
    console.log('--- Adding attendance (June 2026) ---');
    const lateMap = {
      'EMP00074': '2026-06-04',  // Rahul late on 4th
      'EMP00075': '2026-06-05',  // Priya late on 5th
      'EMP00076': null,
      'EMP00077': '2026-06-03',  // Sneha late on 3rd
      'EMP00078': '2026-06-06',  // Vikram late on 6th
      'EMP00079': null,
    };

    for (const emp of emps) {
      await addAttendance(emp.emp_code, JUNE_DAYS, lateMap[emp.emp_code]);
      // Skip June 9 for Priya (she'll have leave request)
      console.log(`  Attendance added: ${emp.emp_code} (${JUNE_DAYS.length} days)`);
    }

    console.log('\n--- Adding attendance (May 2026) ---');
    for (const emp of emps) {
      // May: 1 absent day (leave it out), ~2 late days
      const lateDays = MAY_DAYS.slice(3, 5); // 5th and 6th of month
      for (const day of MAY_DAYS) {
        const [[exists]] = await pool.execute(
          'SELECT 1 FROM tb_attendance WHERE employee_id=? AND date=? AND tenant_id=?',
          [emp.emp_code, day, TENANT_ID]
        );
        if (exists) continue;
        const isLate = lateDays.includes(day);
        await pool.execute(
          `INSERT INTO tb_attendance
             (tenant_id, employee_id, shift_id, date, check_in, check_out, status,
              is_late, late_minutes, worked_hours, is_half_day)
           VALUES (?,?,1,?,?,?,?,?,?,?,0)`,
          [
            TENANT_ID, emp.emp_code, day,
            toCheckIn(day, isLate ? 9 : 9, isLate ? 18 : 0),
            toCheckOut(day),
            isLate ? 'Delayed' : 'Present',
            isLate ? 1 : 0,
            isLate ? 18 : 0,
            isLate ? 9.2 : 9.5,
          ]
        );
      }
      console.log(`  May attendance: ${emp.emp_code}`);
    }

    // ----- Salary records -----
    console.log('\n--- Adding salary records (May 2026) ---');
    for (const emp of emps) {
      await addSalaryRecord(emp, 'May', 5, 2026, MAY_DAYS);
      console.log(`  Salary: ${emp.emp_code}`);
    }

    console.log('\n--- Adding salary records (April 2026) ---');
    const APR_DAYS = Array.from({length:22},(_,i)=>`2026-04-${String(i+1).padStart(2,'0')}`).filter((_,i)=>i%7<5);
    for (const emp of emps) {
      await addSalaryRecord(emp, 'April', 4, 2026, APR_DAYS.slice(0,22));
      console.log(`  Salary: ${emp.emp_code}`);
    }

    // ----- Leave requests -----
    console.log('\n--- Adding leave requests ---');
    const [priya] = emps.filter(e => e.emp_code === 'EMP00075');
    const [vikram] = emps.filter(e => e.emp_code === 'EMP00078');
    const [amit] = emps.filter(e => e.emp_code === 'EMP00076');

    if (priya)  await addLeaveRequest(priya.emp_code,  'Casual Leave', '2026-06-12', '2026-06-13', 'Personal work');
    if (vikram) await addLeaveRequest(vikram.emp_code, 'Sick Leave',   '2026-06-16', '2026-06-16', 'Not feeling well');
    if (amit)   await addLeaveRequest(amit.emp_code,   'Casual Leave', '2026-06-19', '2026-06-20', 'Family function');

    console.log('\n========== ACTIVITY DATA SEEDED ==========');
    console.log(`Attendance: ${JUNE_DAYS.length} days June + ${MAY_DAYS.length} days May per employee`);
    console.log('Salary records: May 2026 + April 2026 (paid)');
    console.log('Leave requests: 3 pending (tl approval level)');
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
