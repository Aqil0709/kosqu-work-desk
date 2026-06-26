/**
 * seed-demo-data.js
 * Run: node seed-demo-data.js
 *
 * Inserts 6 months of salary records (Jan–Jun 2026) and offer letters
 * for every active employee in every tenant.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { buildSalaryComponents } = require('../utils/payrollUtils');

const MONTHS = [
  { num: 1, name: 'January'  },
  { num: 2, name: 'February' },
  { num: 3, name: 'March'    },
  { num: 4, name: 'April'    },
  { num: 5, name: 'May'      },
  { num: 6, name: 'June'     },
];
const YEAR = 2026;

const RESPONSIBILITIES = [
  'Developing and maintaining web applications, APIs, and backend services',
  'Working with modern frameworks and related technologies',
  'Designing, developing, and optimizing database structures and data models',
  'Supporting frontend development and integration',
  'Developing and consuming RESTful APIs and integrating third-party services',
  'Participating in software development, debugging, testing, and deployment activities',
  'Writing clean, scalable, secure, and efficient code as per project requirements',
  'Collaborating with cross-functional teams to ensure timely project delivery',
  'Maintaining project documentation and following coding best practices',
  'Learning and adapting to new technologies and development methodologies as required',
];

// ── offer letter form_data ────────────────────────────────────────────────────
function buildOfferFormData(emp, ed, company) {
  const c = buildSalaryComponents(ed);
  const annualCTC = Number(ed.salary || 0) || c.gross * 12;
  const joiningDate = ed.joining_date
    ? new Date(ed.joining_date).toISOString().slice(0, 10)
    : new Date(YEAR, 0, 1).toISOString().slice(0, 10);
  const issueDate = joiningDate;

  return {
    issueDate,
    salutation: 'Mr.',
    fullName:    `${emp.first_name} ${emp.last_name}`.trim(),
    email:       emp.email || '',
    phone:       emp.phone || '',
    address:     ed.address || '',
    designation: ed.position || emp.position || 'Employee',
    location:    ed.work_location || company.address || 'Office',
    joiningDate,
    offerValidDays: '5',
    ctc:        String(annualCTC),
    ctcInWords: '',
    // Salary breakup
    totalEarning:        String(c.gross),
    basicSalary:         String(c.basic),
    hra:                 String(c.hra),
    conveyanceAllowance: String(c.travel),
    medicalAllowance:    String(c.medical),
    specialAllowance:    String(c.special),
    employerPf:          String(c.pf),
    employerEsi:         String(c.esic),
    professionalTax:     String(c.pt),
    tds:                 String(c.tds),
    netPay:              String(c.net),
    responsibilities:    RESPONSIBILITIES,
    terms: [
      'The employee shall abide by all company policies, rules, and regulations.',
      'This offer is contingent upon satisfactory background verification and reference checks.',
      'The first three months shall be a probationary period.',
      'The company reserves the right to modify terms with prior notice.',
      'Confidentiality of company information must be maintained during and after employment.',
    ],
  };
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 5,
  });

  console.log('Connected to database:', process.env.DB_NAME);

  // ── fetch all active employees ──────────────────────────────────────────────
  const [employees] = await pool.execute(`
    SELECT
      ed.id          AS emp_code,
      ed.tenant_id,
      ed.employee_id AS user_id,
      ed.position,
      ed.joining_date,
      ed.work_location,
      ed.address,
      ed.salary,
      ed.salary_gross,
      ed.salary_basic,
      ed.salary_hra,
      ed.salary_travel_allowance,
      ed.salary_medical_allowance,
      ed.salary_other_allowance,
      ed.salary_pf,
      ed.salary_esic,
      ed.salary_professional_tax,
      ed.tds_amount,
      ed.pf_applicable,
      ed.employment_category,
      u.first_name,
      u.last_name,
      u.email,
      u.phone
    FROM employee_details ed
    JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
    WHERE ed.status = 'active' AND u.is_active = 1
    ORDER BY ed.tenant_id, ed.id
  `);

  console.log(`Found ${employees.length} active employee(s)`);

  if (employees.length === 0) {
    console.log('No employees found. Please add employees first.');
    await pool.end();
    return;
  }

  // ── fetch tenant company info for offer letters ─────────────────────────────
  const tenantIds = [...new Set(employees.map(e => e.tenant_id))];
  const companyByTenant = {};
  for (const tid of tenantIds) {
    try {
      const [rows] = await pool.execute(
        `SELECT company_name, company_address, company_email, company_website, company_phone
         FROM branding WHERE tenant_id = ? LIMIT 1`,
        [tid]
      );
      companyByTenant[tid] = rows[0] || {};
    } catch (_) {
      companyByTenant[tid] = {};
    }
  }

  let salaryInserted = 0;
  let salarySkipped  = 0;
  let offerInserted  = 0;
  let offerSkipped   = 0;

  // ── salary records ──────────────────────────────────────────────────────────
  console.log('\nInserting salary records (Jan–Jun 2026)…');

  for (const emp of employees) {
    const c = buildSalaryComponents(emp);

    for (const { num, name } of MONTHS) {
      // Jan–May = paid, Jun = pending (current month)
      const isPaid = num < 6;
      const paymentStatus = isPaid ? 'paid' : 'pending';
      const paidAmount    = isPaid ? c.net : 0;
      const balanceAmount = isPaid ? 0 : c.net;
      const paymentDate   = isPaid
        ? `${YEAR}-${String(num).padStart(2,'0')}-28`
        : null;

      const details = JSON.stringify({
        hra:               c.hra,
        travel_allowance:  c.travel,
        medical_allowance: c.medical,
        other_allowance:   c.special,
        pf:                c.pf,
        professional_tax:  c.pt,
        tds:               c.tds,
        esic:              c.esic,
      });

      try {
        const [result] = await pool.execute(`
          INSERT INTO tb_salary_records
            (tenant_id, employee_id, month, month_number, year,
             basic_salary, gross_salary, deduction_amount, net_salary,
             paid_amount, balance_amount, payment_date, payment_status,
             pf_amount, professional_tax, tds_amount, esic_amount,
             employment_category, details)
          VALUES (?, ?, ?, ?, ?,  ?, ?, ?, ?,  ?, ?, ?, ?,  ?, ?, ?, ?,  ?, ?)
          ON DUPLICATE KEY UPDATE
            basic_salary       = VALUES(basic_salary),
            gross_salary       = VALUES(gross_salary),
            deduction_amount   = VALUES(deduction_amount),
            net_salary         = VALUES(net_salary),
            paid_amount        = VALUES(paid_amount),
            balance_amount     = VALUES(balance_amount),
            payment_date       = VALUES(payment_date),
            payment_status     = VALUES(payment_status),
            pf_amount          = VALUES(pf_amount),
            professional_tax   = VALUES(professional_tax),
            tds_amount         = VALUES(tds_amount),
            esic_amount        = VALUES(esic_amount),
            details            = VALUES(details),
            updated_at         = CURRENT_TIMESTAMP
        `, [
          emp.tenant_id, emp.emp_code, name, num, YEAR,
          c.basic, c.gross, c.totalDeductions, c.net,
          paidAmount, balanceAmount, paymentDate, paymentStatus,
          c.pf, c.pt, c.tds, c.esic,
          emp.employment_category || 'employee',
          details,
        ]);

        if (result.affectedRows > 0 && result.insertId > 0) salaryInserted++;
        else salarySkipped++;
      } catch (err) {
        console.error(`  Salary error for ${emp.emp_code} ${name}: ${err.message}`);
      }
    }

    process.stdout.write(`  [${emp.emp_code}] ${emp.first_name} ${emp.last_name} — salary done\n`);
  }

  // ── offer letters ───────────────────────────────────────────────────────────
  console.log('\nInserting offer letters…');

  // Ensure offer_letters table has needed columns
  try {
    await pool.execute(`ALTER TABLE offer_letters ADD COLUMN tenant_id INT NULL`);
  } catch (_) {}
  try {
    await pool.execute(`ALTER TABLE offer_letters ADD COLUMN candidate_name VARCHAR(255) NULL`);
  } catch (_) {}
  try {
    await pool.execute(`ALTER TABLE offer_letters ADD COLUMN candidate_email VARCHAR(255) NULL`);
  } catch (_) {}
  try {
    await pool.execute(`ALTER TABLE offer_letters MODIFY COLUMN employee_id INT NULL`);
  } catch (_) {}
  try {
    await pool.execute(`ALTER TABLE offer_letters ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Pending'`);
  } catch (_) {}

  for (const emp of employees) {
    const company  = companyByTenant[emp.tenant_id] || {};
    const formData = buildOfferFormData(emp, emp, company);
    const issueDate = formData.issueDate;
    const candidateName  = formData.fullName;
    const candidateEmail = emp.email;

    try {
      const [result] = await pool.execute(`
        INSERT INTO offer_letters
          (tenant_id, employee_id, candidate_name, candidate_email, form_data, issue_date, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Accepted')
        ON DUPLICATE KEY UPDATE
          form_data      = VALUES(form_data),
          issue_date     = VALUES(issue_date),
          candidate_name = VALUES(candidate_name),
          status         = 'Accepted',
          updated_at     = CURRENT_TIMESTAMP
      `, [
        emp.tenant_id,
        emp.user_id,
        candidateName,
        candidateEmail,
        JSON.stringify(formData),
        issueDate,
      ]);

      if (result.affectedRows > 0 && result.insertId > 0) offerInserted++;
      else offerSkipped++;

      process.stdout.write(`  [${emp.emp_code}] ${candidateName} — offer letter done\n`);
    } catch (err) {
      console.error(`  Offer letter error for ${emp.emp_code}: ${err.message}`);
    }
  }

  // ── summary ─────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────');
  console.log(`Salary records  : ${salaryInserted} inserted, ${salarySkipped} already existed (updated)`);
  console.log(`Offer letters   : ${offerInserted} inserted, ${offerSkipped} already existed (updated)`);
  console.log('Seed complete!');

  await pool.end();
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
