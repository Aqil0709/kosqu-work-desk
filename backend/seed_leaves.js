const mysql = require('mysql2/promise');
require('dotenv').config();

const employees = ['EMP00061','EMP00062','EMP00063','EMP00064','EMP00065','EMP00066','EMP00067','EMP00068','EMP00069'];
const leaveTypes = [
  { name: 'Casual',    allocated: 10 },
  { name: 'Sick',      allocated: 10 },
  { name: 'Earned',    allocated: 15 },
  { name: 'Maternity', allocated: 90 },
  { name: 'Unpaid',    allocated: 365 },
];

// Sample leave requests - some approved, some pending
const sampleRequests = [
  { emp: 'EMP00061', type: 'Casual',  start: '2026-05-12', end: '2026-05-13', status: 'Approved', desc: 'Personal work' },
  { emp: 'EMP00062', type: 'Sick',    start: '2026-05-20', end: '2026-05-20', status: 'Approved', desc: 'Fever' },
  { emp: 'EMP00063', type: 'Casual',  start: '2026-06-02', end: '2026-06-02', status: 'Pending',  desc: 'Family function' },
  { emp: 'EMP00064', type: 'Earned',  start: '2026-04-14', end: '2026-04-16', status: 'Approved', desc: 'Vacation' },
  { emp: 'EMP00065', type: 'Sick',    start: '2026-05-28', end: '2026-05-28', status: 'Approved', desc: 'Not feeling well' },
  { emp: 'EMP00066', type: 'Casual',  start: '2026-06-05', end: '2026-06-05', status: 'Rejected', desc: 'Personal work' },
  { emp: 'EMP00067', type: 'Sick',    start: '2026-06-10', end: '2026-06-11', status: 'Pending',  desc: 'Cold and flu' },
  { emp: 'EMP00068', type: 'Earned',  start: '2026-05-05', end: '2026-05-09', status: 'Approved', desc: 'Annual vacation' },
  { emp: 'EMP00069', type: 'Casual',  start: '2026-06-12', end: '2026-06-12', status: 'Pending',  desc: 'Appointment' },
];

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  const TENANT_ID = 2;
  const YEAR = 2026;
  let inserted = 0;

  // Insert leave balances for all new employees
  for (const empId of employees) {
    for (const lt of leaveTypes) {
      const [ex] = await conn.execute(
        'SELECT id FROM leave_balances WHERE employee_id=? AND leave_type=? AND year=? AND tenant_id=?',
        [empId, lt.name, YEAR, TENANT_ID]
      );
      if (ex.length > 0) continue;

      await conn.execute(
        `INSERT INTO leave_balances (tenant_id, employee_id, leave_type, year, allocated, used, pending)
         VALUES (?, ?, ?, ?, ?, 0, 0)`,
        [TENANT_ID, empId, lt.name, YEAR, lt.allocated]
      );
      inserted++;
    }
  }
  console.log(`Leave balances inserted: ${inserted}`);

  // Insert sample leave requests
  let reqInserted = 0;
  for (const req of sampleRequests) {
    const [ex] = await conn.execute(
      'SELECT leave_id FROM leave_requests WHERE employee_id=? AND start_date=? AND tenant_id=?',
      [req.emp, req.start, TENANT_ID]
    );
    if (ex.length > 0) continue;

    await conn.execute(
      `INSERT INTO leave_requests
        (tenant_id, employee_id, leave_type, is_paid, description, start_date, end_date, status,
         tl_status, pl_status, hr_status, approval_level)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, 'approved', 'approved', 'approved', 'done')`,
      [TENANT_ID, req.emp, req.type, req.desc, req.start, req.end, req.status]
    );
    reqInserted++;

    // Update used count if approved
    if (req.status === 'Approved') {
      const days = Math.ceil((new Date(req.end) - new Date(req.start)) / 86400000) + 1;
      await conn.execute(
        `UPDATE leave_balances SET used = used + ? WHERE employee_id=? AND leave_type=? AND tenant_id=? AND year=?`,
        [days, req.emp, req.type, TENANT_ID, YEAR]
      );
    }
  }
  console.log(`Leave requests inserted: ${reqInserted}`);

  // Summary
  const [balSummary] = await conn.execute(
    "SELECT COUNT(*) as c FROM leave_balances WHERE tenant_id=2"
  );
  const [reqSummary] = await conn.execute(
    "SELECT status, COUNT(*) as c FROM leave_requests WHERE tenant_id=2 GROUP BY status"
  );
  console.log(`Total leave_balances: ${balSummary[0].c}`);
  console.log('Leave requests by status:', JSON.stringify(reqSummary));

  await conn.end();
  console.log('Done!');
}
seed().catch(e => console.error('ERROR:', e.message));
