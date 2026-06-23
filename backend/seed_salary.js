const mysql = require('mysql2/promise');
require('dotenv').config();

const employees = [
  { id: 'EMP00059', dept: 1, basic: 20000, hra: 4000, medical: 1500, travel: 1200, other: 6140, gross: 32840, deductions: 2400, net: 30440 },
  { id: 'EMP00061', dept: 1, basic: 35000, hra: 7000, medical: 2500, travel: 1500, other: 4000, gross: 50000, deductions: 5750, net: 44250 },
  { id: 'EMP00062', dept: 1, basic: 30000, hra: 6000, medical: 2000, travel: 1500, other: 3000, gross: 42500, deductions: 4000, net: 38500 },
  { id: 'EMP00063', dept: 1, basic: 27000, hra: 5500, medical: 1800, travel: 1200, other: 2500, gross: 38000, deductions: 3500, net: 34500 },
  { id: 'EMP00064', dept: 1, basic: 29000, hra: 5800, medical: 2000, travel: 1500, other: 2700, gross: 41000, deductions: 3800, net: 37200 },
  { id: 'EMP00065', dept: 1, basic: 32000, hra: 6400, medical: 2200, travel: 1500, other: 3400, gross: 45500, deductions: 4200, net: 41300 },
  { id: 'EMP00066', dept: 1, basic: 36000, hra: 7200, medical: 2500, travel: 1500, other: 3800, gross: 51000, deductions: 5900, net: 45100 },
  { id: 'EMP00067', dept: 1, basic: 25000, hra: 5000, medical: 1800, travel: 1200, other: 2000, gross: 35000, deductions: 3200, net: 31800 },
  { id: 'EMP00068', dept: 1, basic: 40000, hra: 8000, medical: 3000, travel: 2000, other: 5000, gross: 58000, deductions: 7000, net: 51000 },
  { id: 'EMP00069', dept: 1, basic: 28000, hra: 5600, medical: 2000, travel: 1500, other: 2900, gross: 40000, deductions: 3700, net: 36300 },
];

const months = [
  { month: 'January',  year: '2026', status: 'paid',    payDate: '2026-02-01' },
  { month: 'February', year: '2026', status: 'paid',    payDate: '2026-03-01' },
  { month: 'March',    year: '2026', status: 'paid',    payDate: '2026-04-01' },
  { month: 'April',    year: '2026', status: 'paid',    payDate: '2026-05-01' },
  { month: 'May',      year: '2026', status: 'pending', payDate: null },
];

async function seed() {
  const conn = await mysql.createConnection({
    host:process.env.DB_HOST, port:process.env.DB_PORT,
    user:process.env.DB_USER, password:process.env.DB_PASSWORD, database:process.env.DB_NAME
  });

  const TENANT_ID = 2;
  let inserted = 0, skipped = 0;

  for (const emp of employees) {
    for (const m of months) {
      const [ex] = await conn.execute(
        'SELECT id FROM salary_records WHERE employee_id=? AND month=? AND year=? AND tenant_id=?',
        [emp.id, m.month, m.year, TENANT_ID]
      );
      if (ex.length > 0) { skipped++; continue; }

      const allowances = JSON.stringify({
        hra: emp.hra, medical_allowance: emp.medical,
        travel_allowance: emp.travel, other_allowance: emp.other
      });
      const deductions = JSON.stringify({
        pf: emp.deductions * 0.6, esic: emp.deductions * 0.3, professional_tax: emp.deductions * 0.1
      });
      const attendance = JSON.stringify({
        present_days: 22, absent_days: 0, half_days: 0, total_working_days: 22
      });

      await conn.execute(
        `INSERT INTO salary_records
          (tenant_id, employee_id, department_id, basic_salary, allowances, deductions, net_salary,
           payment_date, month, year, payment_frequency, status, attendance_summary,
           paid_amount, balance_amount, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Monthly', ?, ?, ?, ?, ?)`,
        [
          TENANT_ID, emp.id, emp.dept, emp.basic, allowances, deductions, emp.net,
          m.payDate, m.month, m.year, m.status, attendance,
          m.status === 'paid' ? emp.net : 0,
          m.status === 'paid' ? 0 : emp.net,
          m.status === 'paid' ? 'Paid' : 'Pending'
        ]
      );
      inserted++;
    }
  }

  console.log(`Salary records — inserted: ${inserted}, skipped: ${skipped}`);

  const [summary] = await conn.execute(
    "SELECT status, COUNT(*) as c, SUM(net_salary) as total FROM salary_records WHERE tenant_id=2 GROUP BY status"
  );
  console.log('Summary:', JSON.stringify(summary));

  await conn.end();
  console.log('Done!');
}
seed().catch(e => console.error('ERROR:', e.message));
