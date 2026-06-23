/**
 * seedTestUsers.js
 * Creates a demo tenant with 6 test users covering all roles.
 *
 * Usage:
 *   node backend/src/scripts/seedTestUsers.js
 *
 * Requires the same .env as the backend (DB credentials).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Uses existing tenant — slug is looked up at runtime
// Test emails use demo. prefix to avoid conflicts with real users
const TENANT_SLUG = 'kosqu-technolab';

// ── Test credentials ─────────────────────────────────────────────────────────
const USERS = [
  {
    first_name: 'Admin',   last_name: 'User',
    email: 'admin@kosqu.com',          password: 'Admin@2025!',
    position: 'admin',
    note: 'Full system access — all modules including Settings',
  },
  {
    first_name: 'Demo',    last_name: 'HR',
    email: 'demo.hr@kosqu.com',        password: 'HR@2025!',
    position: 'hr',
    note: 'HR modules, payroll, employee management. No system settings.',
  },
  {
    first_name: 'Demo',    last_name: 'TeamLead',
    email: 'demo.teamlead@kosqu.com',  password: 'TL@2025!',
    position: 'team_lead',
    note: 'Own team attendance, leave approval, work reports, projects.',
  },
  {
    first_name: 'Demo',    last_name: 'Employee',
    email: 'demo.employee@kosqu.com',  password: 'Emp@2025!',
    position: 'employee',
    note: 'Dashboard, attendance, leave, salary, payslip, work reports.',
  },
  {
    first_name: 'Demo',    last_name: 'Intern',
    email: 'demo.intern@kosqu.com',    password: 'Intern@2025!',
    position: 'intern',
    note: 'Same access as Employee. Extra profile: college, stipend, duration.',
  },
  {
    first_name: 'Demo',    last_name: 'Consultant',
    email: 'demo.consultant@kosqu.com',password: 'Consult@2025!',
    position: 'consultant',
    note: 'Same access as Employee. Extra profile: consultant_type, contract_duration.',
  },
];

// Additional modules to register if they don't exist yet in the modules table
const EXTRA_MODULES = [
  { key: 'onboarding',        name: 'Onboarding / Offboarding', group: 'hr' },
  { key: 'grievance',         name: 'Grievance & POSH',          group: 'hr' },
  { key: 'recruitment',       name: 'Recruitment',               group: 'hr' },
  { key: 'asset_management',  name: 'Asset Management',          group: 'hr' },
  { key: 'project_management',name: 'Project Management',        group: 'operations' },
  { key: 'lead_management',   name: 'Lead Management',           group: 'crm' },
  { key: 'payroll_compliance',name: 'Payroll Compliance',        group: 'hr' },
];

// Default module access per role (only include keys that exist in modules table OR are in EXTRA_MODULES)
const ROLE_MODULES = {
  hr: [
    'hr', 'hr_dashboard', 'employee_management', 'attendance_management',
    'leave_management', 'shift_management', 'salary_management', 'holiday_management',
    'ai_document_generator', 'offer_letters', 'declarations', 'resignations',
    'salary_slips', 'experience_letters', 'increment_letters', 'performance_management',
    'mom_management', 'work_reports', 'onboarding', 'grievance', 'recruitment',
  ],
  team_lead: [
    'work_reports', 'mom_management', 'performance_management',
    'attendance_management', 'leave_management', 'grievance',
  ],
  employee: ['work_reports', 'mom_management', 'grievance'],
  intern:   ['work_reports', 'grievance'],
  consultant: ['work_reports', 'grievance'],
};

async function seed() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT || 3306),
  });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── 1. Resolve existing tenant ────────────────────────────────────────────
    const [[existingTenant]] = await conn.execute(
      'SELECT id, name FROM tenants WHERE slug=?', [TENANT_SLUG]
    );

    if (!existingTenant) {
      throw new Error(`Tenant with slug '${TENANT_SLUG}' not found. Run the app first to create it.`);
    }
    const tenantId = existingTenant.id;
    console.log(`[Seed] Using tenant '${existingTenant.name}' (id=${tenantId})`);

    // ── 1b. Register extra modules if missing ────────────────────────────────
    for (const mod of EXTRA_MODULES) {
      await conn.execute(
        `INSERT INTO modules (module_key, name) VALUES (?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [mod.key, mod.name]
      );
    }
    console.log(`[Seed] Registered ${EXTRA_MODULES.length} extra module(s)`);

    // ── 2. Create/update users ────────────────────────────────────────────────
    const createdUsers = [];
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);

      const [[existing]] = await conn.execute(
        'SELECT id FROM users WHERE email=? AND tenant_id=?', [u.email, tenantId]
      );

      let userId;
      if (existing) {
        await conn.execute(
          `UPDATE users SET first_name=?, last_name=?, password_hash=?, position=?, is_active=1
           WHERE id=? AND tenant_id=?`,
          [u.first_name, u.last_name, hash, u.position, existing.id, tenantId]
        );
        userId = existing.id;
        console.log(`[Seed] Updated user: ${u.email} (${u.position})`);
      } else {
        const [r] = await conn.execute(
          `INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, position, is_active)
           VALUES (?,?,?,?,?,?,1)`,
          [tenantId, u.first_name, u.last_name, u.email, hash, u.position]
        );
        userId = r.insertId;
        console.log(`[Seed] Created user: ${u.email} (${u.position})`);
      }

      createdUsers.push({ ...u, id: userId });

      // ── 3. Assign module access ─────────────────────────────────────────────
      if (u.position !== 'admin') {
        const modules = ROLE_MODULES[u.position] || [];
        // Remove existing access for this user
        await conn.execute(
          'DELETE FROM user_module_access WHERE user_id=? AND tenant_id=?',
          [userId, tenantId]
        );
        for (const moduleKey of modules) {
          await conn.execute(
            `INSERT INTO user_module_access (user_id, tenant_id, module_key, access_level)
             VALUES (?,?,?,'write')
             ON DUPLICATE KEY UPDATE access_level='write'`,
            [userId, tenantId, moduleKey]
          );
        }
        console.log(`  → Assigned ${modules.length} module(s) to ${u.email}`);
      }

      // ── 4. Ensure employee_details row exists (non-admin users) ────────────
      if (u.position !== 'admin') {
        const [[empDetail]] = await conn.execute(
          'SELECT id FROM employee_details WHERE employee_id=? AND tenant_id=? LIMIT 1',
          [userId, tenantId]
        );

        if (!empDetail) {
          const empCode = `EMP${String(userId).padStart(5, '0')}`;
          await conn.execute(
            `INSERT INTO employee_details
               (id, tenant_id, employee_id, position, employment_type, status)
             VALUES (?,?,?,?,?,?)`,
            [empCode, tenantId, userId, u.position, 'full_time', 'active']
          );
          console.log(`  → Created employee_details for ${u.email} (${empCode})`);
        }
      }
    }

    await conn.commit();
    console.log('\n✅  Seed complete!\n');
    console.log('─'.repeat(65));
    console.log('  TENANT SLUG : ' + TENANT_SLUG);
    console.log('─'.repeat(65));
    console.log(
      '  ROLE'.padEnd(14) + 'EMAIL'.padEnd(30) + 'PASSWORD'
    );
    console.log('─'.repeat(65));
    for (const u of USERS) {
      console.log(
        ('  ' + u.position).padEnd(14) + u.email.padEnd(30) + u.password
      );
    }
    console.log('─'.repeat(65));
    console.log('\n  Login URL: http://localhost:5173/login');
    console.log('  (Enter email + password; tenant slug not required)\n');

  } catch (err) {
    await conn.rollback();
    console.error('[Seed] ERROR:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
