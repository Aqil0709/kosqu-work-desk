const mysql = require('mysql2/promise');
require('dotenv').config();

// Map user_id -> employee EMP id
const employees = [
  { emp_id: 'EMP00059', user_id: 59 },
  { emp_id: 'EMP00061', user_id: 61 },
  { emp_id: 'EMP00062', user_id: 62 },
  { emp_id: 'EMP00063', user_id: 63 },
  { emp_id: 'EMP00064', user_id: 64 },
  { emp_id: 'EMP00065', user_id: 65 },
  { emp_id: 'EMP00066', user_id: 66 },
  { emp_id: 'EMP00067', user_id: 67 },
  { emp_id: 'EMP00068', user_id: 68 },
  { emp_id: 'EMP00069', user_id: 69 },
];

const TENANT_ID = 2;
const SHIFT_ID = 1;
const SHIFT_CHECKIN = '09:30'; // from tb_shifts

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  const today = new Date('2026-06-14');
  const dates = [];
  for (let i = 29; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    dates.push(d.toISOString().split('T')[0]);
  }

  let inserted = 0, skipped = 0;

  for (const emp of employees) {
    for (const dateStr of dates) {
      const [existing] = await conn.execute(
        'SELECT attendance_id FROM tb_attendance WHERE employee_id=? AND date=? AND tenant_id=?',
        [emp.emp_id, dateStr, TENANT_ID]
      );
      if (existing.length > 0) { skipped++; continue; }

      // Randomize check-in/check-out
      const lateChance = Math.random();
      let checkInHour = 9, checkInMin = 30;
      let status = 'Present', isLate = 0, lateMinutes = 0;

      if (lateChance > 0.90) {
        // Absent
        await conn.execute(
          `INSERT INTO tb_attendance (tenant_id, employee_id, shift_id, date, status, worked_hours, grace_period_minutes)
           VALUES (?, ?, ?, ?, 'Absent', 0, 15)`,
          [TENANT_ID, emp.emp_id, SHIFT_ID, dateStr]
        );
        inserted++; continue;
      } else if (lateChance > 0.80) {
        // Late by 20-40 min
        checkInMin = 50 + Math.floor(Math.random() * 20);
        if (checkInMin >= 60) { checkInHour = 10; checkInMin -= 60; }
        lateMinutes = (checkInHour - 9) * 60 + (checkInMin - 30);
        if (lateMinutes < 0) lateMinutes = 0;
        status = lateMinutes > 15 ? 'Delayed' : 'Present';
        isLate = lateMinutes > 15 ? 1 : 0;
      } else {
        // On time (9:15 - 9:30)
        checkInMin = 15 + Math.floor(Math.random() * 15);
        status = 'Present';
      }

      const checkOutHour = 18 + Math.floor(Math.random() * 2);
      const checkOutMin = Math.floor(Math.random() * 60);
      const checkIn  = `${dateStr} ${String(checkInHour).padStart(2,'0')}:${String(checkInMin).padStart(2,'0')}:00`;
      const checkOut = `${dateStr} ${String(checkOutHour).padStart(2,'0')}:${String(checkOutMin).padStart(2,'0')}:00`;

      // Calculate worked hours
      const workedHours = ((checkOutHour * 60 + checkOutMin) - (checkInHour * 60 + checkInMin)) / 60;

      await conn.execute(
        `INSERT INTO tb_attendance
          (tenant_id, employee_id, shift_id, date, check_in, check_out, status,
           is_late, late_minutes, worked_hours, grace_period_minutes, scheduled_check_in)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 15, ?)`,
        [TENANT_ID, emp.emp_id, SHIFT_ID, dateStr, checkIn, checkOut, status,
         isLate, lateMinutes, workedHours.toFixed(2), SHIFT_CHECKIN + ':00']
      );
      inserted++;
    }
  }

  console.log(`Inserted: ${inserted}, Skipped: ${skipped}`);

  const [summary] = await conn.execute(
    "SELECT status, COUNT(*) as c FROM tb_attendance WHERE tenant_id=2 GROUP BY status"
  );
  console.log('Attendance summary:', JSON.stringify(summary));

  await conn.end();
  console.log('Done!');
}

seed().catch(e => console.error('ERROR:', e.message));
