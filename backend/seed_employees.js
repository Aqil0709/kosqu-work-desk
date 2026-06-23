const mysql = require('mysql2/promise');
require('dotenv').config();

const employees = [
  { id: 'EMP00061', user_id: 61, position: 'HR Manager',        salary: 600000, joining: '2023-03-01', basic: 35000, hra: 7000, medical: 2500, travel: 1500, other: 4000, gross: 50000, deductions: 5750,  net: 44250, exp: 5.0, loc: 'Office',  type: 'Full-time' },
  { id: 'EMP00062', user_id: 62, position: 'Backend Developer',  salary: 540000, joining: '2023-06-15', basic: 30000, hra: 6000, medical: 2000, travel: 1500, other: 3000, gross: 42500, deductions: 4000,  net: 38500, exp: 3.5, loc: 'Hybrid',  type: 'Full-time' },
  { id: 'EMP00063', user_id: 63, position: 'Frontend Developer', salary: 480000, joining: '2023-09-01', basic: 27000, hra: 5500, medical: 1800, travel: 1200, other: 2500, gross: 38000, deductions: 3500,  net: 34500, exp: 2.5, loc: 'Hybrid',  type: 'Full-time' },
  { id: 'EMP00064', user_id: 64, position: 'UI/UX Designer',     salary: 520000, joining: '2023-04-10', basic: 29000, hra: 5800, medical: 2000, travel: 1500, other: 2700, gross: 41000, deductions: 3800,  net: 37200, exp: 4.0, loc: 'Office',  type: 'Full-time' },
  { id: 'EMP00065', user_id: 65, position: 'Business Analyst',   salary: 560000, joining: '2024-01-15', basic: 32000, hra: 6400, medical: 2200, travel: 1500, other: 3400, gross: 45500, deductions: 4200,  net: 41300, exp: 3.0, loc: 'Office',  type: 'Full-time' },
  { id: 'EMP00066', user_id: 66, position: 'DevOps Engineer',    salary: 620000, joining: '2023-07-01', basic: 36000, hra: 7200, medical: 2500, travel: 1500, other: 3800, gross: 51000, deductions: 5900,  net: 45100, exp: 4.5, loc: 'Remote',  type: 'Full-time' },
  { id: 'EMP00067', user_id: 67, position: 'QA Engineer',        salary: 440000, joining: '2024-02-01', basic: 25000, hra: 5000, medical: 1800, travel: 1200, other: 2000, gross: 35000, deductions: 3200,  net: 31800, exp: 2.0, loc: 'Office',  type: 'Full-time' },
  { id: 'EMP00068', user_id: 68, position: 'Project Manager',    salary: 700000, joining: '2022-11-01', basic: 40000, hra: 8000, medical: 3000, travel: 2000, other: 5000, gross: 58000, deductions: 7000,  net: 51000, exp: 6.0, loc: 'Office',  type: 'Full-time' },
  { id: 'EMP00069', user_id: 69, position: 'Data Analyst',       salary: 500000, joining: '2023-12-01', basic: 28000, hra: 5600, medical: 2000, travel: 1500, other: 2900, gross: 40000, deductions: 3700,  net: 36300, exp: 2.5, loc: 'Hybrid',  type: 'Full-time' },
];

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  for (const e of employees) {
    // Check if record already exists
    const [existing] = await conn.execute('SELECT id FROM employee_details WHERE employee_id=? AND tenant_id=2', [e.user_id]);
    if (existing.length > 0) {
      console.log(`SKIP ${e.id} — already exists`);
      continue;
    }

    await conn.execute(`
      INSERT INTO employee_details
        (id, tenant_id, employee_id, department_id, position, salary, joining_date, status,
         employment_type, employment_category, experience_years, work_location,
         salary_basic, salary_hra, salary_medical_allowance, salary_travel_allowance,
         salary_other_allowance, salary_gross, salary_total_deduction, salary_net,
         auto_checkout_enabled, pf_applicable, tds_applicable)
      VALUES (?, 2, ?, 1, ?, ?, ?, 'active', ?, 'employee', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
    `, [
      e.id, e.user_id, e.position, e.salary, e.joining,
      e.type, e.exp, e.loc,
      e.basic, e.hra, e.medical, e.travel, e.other, e.gross, e.deductions, e.net
    ]);
    console.log(`INSERTED ${e.id} — ${e.position} (user_id=${e.user_id})`);
  }

  // Verify
  const [eds] = await conn.execute(
    `SELECT ed.id, u.first_name, u.last_name, ed.position, ed.salary, ed.status
     FROM employee_details ed
     JOIN users u ON u.id = ed.employee_id
     WHERE ed.tenant_id = 2
     ORDER BY ed.id`
  );
  console.log('\nAll employee_details (tenant 2):');
  eds.forEach(r => console.log(`  ${r.id} | ${r.first_name} ${r.last_name} | ${r.position} | ₹${r.salary} | ${r.status}`));

  await conn.end();
  console.log('\nDone!');
}

seed().catch(e => console.error('ERROR:', e.message));
