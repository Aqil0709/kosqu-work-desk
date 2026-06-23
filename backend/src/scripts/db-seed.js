/**
 * db-seed.js — Production seed script.
 *
 * Creates the minimum required user accounts and their employee_details
 * records after a production cleanup. Does NOT create any test data
 * (no attendance, no leaves, no salary records, etc.).
 *
 * Accounts created:
 *   admin@kosqu.com     — Admin       (preserved from cleanup, updated here)
 *   hr@kosqu.com        — HR
 *   teamlead@kosqu.com  — Team Lead
 *
 * All passwords: set via SEED_PASSWORD env var, or prompted interactively.
 * Default fallback (dev only): Admin@1234
 *
 * Idempotent: safe to run multiple times — uses INSERT … ON DUPLICATE KEY UPDATE.
 *
 * Run: node src/scripts/db-seed.js
 *      SEED_PASSWORD=MyStr0ng! node src/scripts/db-seed.js
 */

'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const TENANT_ID   = 2;
const DEPT_IT     = 2;   // Information Technology
const DEPT_HR     = 3;   // Human Resources
const SHIFT_ID    = 1;   // Morning Shift (09:00–18:00)

// Leave type ids (from leave_types table, tenant_id=2)
const LEAVE_TYPES = [
  { id: 6,  name: 'Casual Leave',      allocated: 12 },
  { id: 7,  name: 'Sick Leave',        allocated: 12 },
  { id: 8,  name: 'Privilege Leave',   allocated: 15 },
  { id: 10, name: 'Paternity Leave',   allocated: 5  },
  { id: 11, name: 'Compensatory Off',  allocated: 5  },
  { id: 12, name: 'Unpaid Leave',      allocated: 0  },
];

// Module access grants — keyed by role
const MODULE_GRANTS = {
  hr: [
    'hr', 'hr_dashboard', 'employee_management', 'attendance_management',
    'leave_management', 'salary_management', 'shift_management',
    'holiday_management', 'performance_management', 'work_reports',
    'mom_management', 'recruitment', 'onboarding', 'grievance',
    'asset_management', 'lead_management', 'payroll_compliance',
    'offer_letters', 'experience_letters', 'increment_letters',
    'resignations', 'salary_slips', 'declarations', 'ai_document_generator',
  ],
  team_lead: [
    'work_reports', 'mom_management', 'performance_management',
    'project_management', 'attendance_management', 'leave_management',
  ],
};

// ── Prompt helper ─────────────────────────────────────────────────────────────

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  // Resolve password
  let rawPassword = process.env.SEED_PASSWORD || '';
  if (!rawPassword) {
    console.log('\n📌 No SEED_PASSWORD env var set.');
    rawPassword = await prompt('Enter password for all seeded accounts: ');
    if (!rawPassword) {
      rawPassword = 'Admin@1234';
      console.log('   Using default: Admin@1234 (change this in production!)');
    }
  }
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const conn = await mysql.createConnection({ ...DB, multipleStatements: false });

  console.log(`\n🌱 Seeding production accounts into: ${DB.database} (tenant_id=${TENANT_ID})\n`);

  // ── 1. Upsert users ─────────────────────────────────────────────────────────

  const users = [
    {
      email:      'admin@kosqu.com',
      first_name: 'Admin',
      last_name:  'User',
      position:   'admin',
      phone:      '',
    },
    {
      email:      'hr@kosqu.com',
      first_name: 'HR',
      last_name:  'Manager',
      position:   'hr',
      phone:      '',
    },
    {
      email:      'teamlead@kosqu.com',
      first_name: 'Team',
      last_name:  'Lead',
      position:   'team_lead',
      phone:      '',
    },
  ];

  const insertedUsers = [];

  for (const u of users) {
    const [existing] = await conn.execute(
      'SELECT id FROM users WHERE email = ? AND tenant_id = ?',
      [u.email, TENANT_ID]
    );

    let userId;
    if (existing.length) {
      userId = existing[0].id;
      await conn.execute(
        `UPDATE users SET
          first_name = ?, last_name = ?, position = ?, phone = ?,
          password_hash = ?, is_active = 1, is_locked = 0,
          failed_login_attempts = 0, force_password_reset = 0
         WHERE id = ?`,
        [u.first_name, u.last_name, u.position, u.phone, passwordHash, userId]
      );
      console.log(`  ↺ Updated  ${u.email}  (id=${userId})`);
    } else {
      const [r] = await conn.execute(
        `INSERT INTO users (tenant_id, email, first_name, last_name, position, phone, password_hash, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [TENANT_ID, u.email, u.first_name, u.last_name, u.position, u.phone, passwordHash]
      );
      userId = r.insertId;
      console.log(`  ✓ Created  ${u.email}  (id=${userId})`);
    }

    insertedUsers.push({ ...u, id: userId });
  }

  // ── 2. Upsert employee_details ────────────────────────────────────────────

  console.log('\n  Setting up employee_details...');

  const deptMap = { admin: null, hr: DEPT_HR, team_lead: DEPT_IT };

  for (const u of insertedUsers) {
    const edId = `EMP${String(u.id).padStart(5, '0')}`;
    const dept = deptMap[u.position];

    const [existing] = await conn.execute(
      'SELECT id FROM employee_details WHERE employee_id = ?',
      [u.id]
    );

    if (existing.length) {
      await conn.execute(
        `UPDATE employee_details SET
           tenant_id = ?, department_id = ?, position = ?,
           status = 'active', default_shift_id = ?
         WHERE employee_id = ?`,
        [TENANT_ID, dept, u.position, SHIFT_ID, u.id]
      );
      console.log(`  ↺ Updated  employee_details for ${u.email}`);
    } else {
      await conn.execute(
        `INSERT INTO employee_details (id, tenant_id, employee_id, department_id, position, status, default_shift_id, joining_date)
         VALUES (?, ?, ?, ?, ?, 'active', ?, CURDATE())`,
        [edId, TENANT_ID, u.id, dept, u.position, SHIFT_ID]
      );
      console.log(`  ✓ Created  employee_details ${edId} for ${u.email}`);
    }
  }

  // ── 3. Seed leave balances for current year ───────────────────────────────

  console.log('\n  Seeding leave balances...');
  const year = new Date().getFullYear();

  // Only for non-admin users
  const activeUsers = insertedUsers.filter((u) => u.position !== 'admin');

  for (const u of activeUsers) {
    // Get employee_details.id (varchar) for this user
    const [[ed]] = await conn.execute(
      'SELECT id FROM employee_details WHERE employee_id = ?',
      [u.id]
    );
    if (!ed) continue;

    for (const lt of LEAVE_TYPES) {
      await conn.execute(
        `INSERT INTO leave_balances (tenant_id, employee_id, leave_type, year, allocated, used, pending)
         VALUES (?, ?, ?, ?, ?, 0, 0)
         ON DUPLICATE KEY UPDATE allocated = VALUES(allocated)`,
        [TENANT_ID, ed.id, lt.name, year, lt.allocated]
      );
    }
    console.log(`  ✓ Leave balances seeded for ${u.email} (${LEAVE_TYPES.length} types, year ${year})`);
  }

  // ── 4. Grant module access ────────────────────────────────────────────────

  console.log('\n  Granting module access...');

  for (const u of insertedUsers) {
    const modules = MODULE_GRANTS[u.position] || [];
    if (!modules.length) {
      console.log(`  — ${u.position} (${u.email}): no module grants needed (admin bypasses middleware)`);
      continue;
    }

    // Wipe existing grants for this user first (clean state)
    await conn.execute(
      'DELETE FROM user_module_access WHERE user_id = ? AND tenant_id = ?',
      [u.id, TENANT_ID]
    );

    for (const moduleKey of modules) {
      await conn.execute(
        `INSERT INTO user_module_access (user_id, tenant_id, module_key, access_level, updated_by)
         VALUES (?, ?, ?, 'write', ?)`,
        [u.id, TENANT_ID, moduleKey, insertedUsers[0].id]
      );
    }
    console.log(`  ✓ ${u.position} (${u.email}): ${modules.length} module grants`);
  }

  await conn.end();

  console.log('\n✅ Seed complete.\n');
  console.log('   Accounts created / updated:');
  for (const u of insertedUsers) {
    console.log(`   ${u.position.padEnd(12)} ${u.email}`);
  }
  console.log(`\n   Password: ${rawPassword}`);
  console.log('\n   Next: Log in to the app and change the password via Settings.\n');
}

run().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
