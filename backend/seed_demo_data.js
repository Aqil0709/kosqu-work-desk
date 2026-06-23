/**
 * Demo seed: 6 employees (2 teams × 3), 2 CRM clients (Pipeline + Godrej),
 * 2 portal client users.  Password for everyone: 1223456@#$
 * Run: node seed_demo_data.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 5,
});

const TENANT_ID = 2;
const RAW_PW   = '1223456@#$';

// ── helpers ──────────────────────────────────────────────────
const empCode = (uid) => `EMP${String(uid).padStart(5, '0')}`;

async function getOrCreateDept(name) {
  const [[row]] = await pool.execute(
    'SELECT id FROM departments WHERE tenant_id=? AND name=? LIMIT 1',
    [TENANT_ID, name]
  );
  if (row) return row.id;
  const [res] = await pool.execute(
    'INSERT INTO departments (tenant_id, name) VALUES (?,?)',
    [TENANT_ID, name]
  );
  return res.insertId;
}

async function insertEmployee(hash, emp, deptId) {
  // Check if email already exists
  const [[existing]] = await pool.execute(
    'SELECT id FROM users WHERE email=? AND tenant_id=?', [emp.email, TENANT_ID]
  );
  if (existing) {
    console.log(`  SKIP (exists): ${emp.email}`);
    return null;
  }

  const [res] = await pool.execute(
    `INSERT INTO users
       (tenant_id, first_name, last_name, email, password_hash, phone, position,
        is_active, force_password_reset, temp_password_issued, failed_login_attempts, is_locked)
     VALUES (?,?,?,?,?,?,'employee',1,0,0,0,0)`,
    [TENANT_ID, emp.first_name, emp.last_name, emp.email, hash, emp.phone]
  );
  const uid = res.insertId;
  const code = empCode(uid);

  const basic   = emp.basic   || 45000;
  const hra     = emp.hra     || Math.round(basic * 0.4);
  const medical = 1500;
  const travel  = 1500;
  const gross   = basic + hra + medical + travel;
  const pf      = Math.round(basic * 0.12);
  const esic    = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  const pt      = gross > 10000 ? 200 : 0;
  const lwf     = 0;
  const totalDed = pf + esic + pt + lwf;
  const net     = gross - totalDed;
  const empPf   = Math.round(basic * 0.13);
  const empEsic = gross <= 21000 ? Math.round(gross * 0.0325) : 0;

  await pool.execute(
    `INSERT INTO employee_details
       (id, tenant_id, employee_id, department_id, position, employment_type, employment_category,
        joining_date, reporting_manager_id,
        salary_basic, salary_hra, salary_medical_allowance, salary_travel_allowance, salary_other_allowance,
        salary_gross, salary_pf, salary_esic, salary_professional_tax, salary_lwf,
        salary_total_deduction, salary_net, employer_pf, employer_esic, status)
     VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      code, TENANT_ID, uid, deptId,
      emp.designation, emp.employment_type || 'Full-time', 'employee',
      emp.joining_date || '2024-06-01',
      basic, hra, medical, travel, 0,
      gross, pf, esic, pt, lwf,
      totalDed, net, empPf, empEsic,
      'active',
    ]
  );

  // employee_departments many-to-many (non-fatal if table missing)
  try {
    await pool.execute(
      'INSERT IGNORE INTO employee_departments (employee_id, department_id, tenant_id) VALUES (?,?,?)',
      [code, deptId, TENANT_ID]
    );
  } catch (_) {}

  console.log(`  CREATED: ${emp.first_name} ${emp.last_name} → ${code} (users.id=${uid})`);
  return { uid, code, ...emp, deptId };
}

async function setManager(memberCode, managerUid) {
  await pool.execute(
    'UPDATE employee_details SET reporting_manager_id=? WHERE id=? AND tenant_id=?',
    [managerUid, memberCode, TENANT_ID]
  );
}

async function createCrmClient(name, industry, contact, email, phone, location) {
  // ensure clients table exists
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      industry VARCHAR(120) NULL,
      contact_person VARCHAR(255) NULL,
      contact_email VARCHAR(255) NULL,
      contact_phone VARCHAR(50) NULL,
      location VARCHAR(255) NULL,
      assigned_manager VARCHAR(255) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      company VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_clients_tenant (tenant_id)
    )
  `);

  const [[existing]] = await pool.execute(
    'SELECT id FROM clients WHERE tenant_id=? AND name=? LIMIT 1',
    [TENANT_ID, name]
  );
  if (existing) {
    console.log(`  SKIP CRM client (exists): ${name}`);
    return existing.id;
  }

  const [res] = await pool.execute(
    `INSERT INTO clients (tenant_id, name, industry, contact_person, contact_email, contact_phone, location, status)
     VALUES (?,?,?,?,?,?,?,'active')`,
    [TENANT_ID, name, industry, contact, email, phone, location]
  );
  console.log(`  CRM CLIENT: ${name} → id=${res.insertId}`);
  return res.insertId;
}

async function createPortalClientUser(hash, first, last, email, phone, clientId) {
  const [[existing]] = await pool.execute(
    'SELECT id FROM users WHERE email=? AND tenant_id=?', [email, TENANT_ID]
  );
  if (existing) {
    console.log(`  SKIP portal user (exists): ${email}`);
    return existing.id;
  }

  // add client_id column to users if missing
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN client_id INT NULL');
  } catch (_) {}

  const [res] = await pool.execute(
    `INSERT INTO users
       (tenant_id, first_name, last_name, email, password_hash, phone, position,
        is_active, force_password_reset, temp_password_issued, failed_login_attempts, is_locked, client_id)
     VALUES (?,?,?,?,?,?,'client',1,0,0,0,0,?)`,
    [TENANT_ID, first, last, email, hash, phone, clientId]
  );
  console.log(`  PORTAL USER: ${email} → users.id=${res.insertId}`);
  return res.insertId;
}

// ── main ─────────────────────────────────────────────────────
(async () => {
  try {
    const hash = await bcrypt.hash(RAW_PW, 10);
    console.log('Password hash generated.\n');

    // ── Departments ──
    console.log('--- Departments ---');
    const alphaId = await getOrCreateDept('Alpha Team');
    const betaId  = await getOrCreateDept('Beta Team');
    console.log(`  Alpha Team → id=${alphaId}`);
    console.log(`  Beta Team  → id=${betaId}`);

    // ── Alpha Team employees ──
    console.log('\n--- Alpha Team ---');
    const rahul = await insertEmployee(hash, {
      first_name: 'Rahul',  last_name: 'Sharma',
      email: 'rahul.sharma@kosqu.com', phone: '9876543201',
      designation: 'Team Lead', basic: 60000, joining_date: '2023-03-01',
    }, alphaId);

    const priya = await insertEmployee(hash, {
      first_name: 'Priya',  last_name: 'Patel',
      email: 'priya.patel@kosqu.com', phone: '9876543202',
      designation: 'Frontend Developer', basic: 45000, joining_date: '2023-06-15',
    }, alphaId);

    const amit = await insertEmployee(hash, {
      first_name: 'Amit',  last_name: 'Singh',
      email: 'amit.singh@kosqu.com', phone: '9876543203',
      designation: 'Backend Developer', basic: 48000, joining_date: '2023-07-01',
    }, alphaId);

    // Set reporting manager for Alpha non-leads
    if (rahul && priya) await setManager(priya.code, rahul.uid);
    if (rahul && amit)  await setManager(amit.code, rahul.uid);
    console.log('  Reporting manager set: Priya + Amit → Rahul');

    // ── Beta Team employees ──
    console.log('\n--- Beta Team ---');
    const sneha = await insertEmployee(hash, {
      first_name: 'Sneha',  last_name: 'Reddy',
      email: 'sneha.reddy@kosqu.com', phone: '9876543204',
      designation: 'Team Lead', basic: 62000, joining_date: '2023-02-01',
    }, betaId);

    const vikram = await insertEmployee(hash, {
      first_name: 'Vikram',  last_name: 'Mehta',
      email: 'vikram.mehta@kosqu.com', phone: '9876543205',
      designation: 'QA Engineer', basic: 42000, joining_date: '2023-08-01',
    }, betaId);

    const neha = await insertEmployee(hash, {
      first_name: 'Neha',  last_name: 'Joshi',
      email: 'neha.joshi@kosqu.com', phone: '9876543206',
      designation: 'DevOps Engineer', basic: 52000, joining_date: '2023-09-01',
    }, betaId);

    if (sneha && vikram) await setManager(vikram.code, sneha.uid);
    if (sneha && neha)   await setManager(neha.code, sneha.uid);
    console.log('  Reporting manager set: Vikram + Neha → Sneha');

    // ── CRM Clients ──
    console.log('\n--- CRM Clients ---');
    const pipelineId = await createCrmClient(
      'Pipeline', 'Technology', 'Arjun Kumar',
      'arjun@pipeline.in', '9876543211', 'Mumbai'
    );
    const godrejId = await createCrmClient(
      'Godrej', 'Manufacturing & Consumer Goods', 'Ravi Tiwari',
      'ravi@godrej.in', '9876543212', 'Pune'
    );

    // ── Portal client users ──
    console.log('\n--- Portal Client Users ---');
    await createPortalClientUser(hash, 'Pipeline', 'Admin', 'pipeline@kosqu.com', '9876543211', pipelineId);
    await createPortalClientUser(hash, 'Godrej',   'Admin', 'godrej@kosqu.com',   '9876543212', godrejId);

    // ── Summary ──
    console.log('\n========== SEED COMPLETE ==========');
    console.log('Login credentials (all same password: 1223456@#$)');
    console.log('─────────────────────────────────────────────────');
    console.log('ALPHA TEAM:');
    console.log('  Team Lead : rahul.sharma@kosqu.com');
    console.log('  Member    : priya.patel@kosqu.com');
    console.log('  Member    : amit.singh@kosqu.com');
    console.log('\nBETA TEAM:');
    console.log('  Team Lead : sneha.reddy@kosqu.com');
    console.log('  Member    : vikram.mehta@kosqu.com');
    console.log('  Member    : neha.joshi@kosqu.com');
    console.log('\nCLIENT PORTAL:');
    console.log('  Pipeline  : pipeline@kosqu.com');
    console.log('  Godrej    : godrej@kosqu.com');
    console.log('═══════════════════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    console.error('\nSEED ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
