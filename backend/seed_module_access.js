const mysql = require('mysql2/promise');
require('dotenv').config();

// Employee portal modules for regular employees
const EMPLOYEE_MODULES = ['employee_attendance', 'employee_expense', 'employee_projects'];

// HR staff (user 61 - Riya Sharma) also gets HR admin modules
const HR_MODULES = [
  'hr', 'hr_dashboard', 'employee_management', 'attendance_management',
  'leave_management', 'salary_management', 'holiday_management',
  'performance_management', 'work_reports',
];

const ADMIN_USER_ID = 58; // Admin Kosqu

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  const demoEmployeeIds = [62, 63, 64, 65, 66, 67, 68, 69]; // regular employees
  const hrUserId = 61; // Riya Sharma (HR Manager)
  const TENANT_ID = 2;

  let inserted = 0;

  const upsert = async (userId, moduleKey, accessLevel) => {
    await conn.execute(`
      INSERT INTO user_module_access (user_id, tenant_id, module_key, access_level, updated_by)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE access_level = VALUES(access_level)
    `, [userId, TENANT_ID, moduleKey, accessLevel, ADMIN_USER_ID]);
    inserted++;
  };

  // Grant employee portal access to all demo employees (including HR)
  for (const userId of [...demoEmployeeIds, hrUserId]) {
    for (const moduleKey of EMPLOYEE_MODULES) {
      await upsert(userId, moduleKey, 'write');
    }
  }

  // Grant HR module access to Riya Sharma (HR Manager)
  for (const moduleKey of HR_MODULES) {
    await upsert(hrUserId, moduleKey, 'write');
  }

  // Also grant Aqil (user 59) employee portal access
  for (const moduleKey of EMPLOYEE_MODULES) {
    await upsert(59, moduleKey, 'write');
  }

  console.log(`Inserted/updated ${inserted} module access records`);

  // Verify
  const [rows] = await conn.execute(`
    SELECT u.first_name, u.last_name, uma.module_key, uma.access_level
    FROM user_module_access uma
    JOIN users u ON u.id = uma.user_id
    WHERE uma.tenant_id = 2
    ORDER BY u.id, uma.module_key
  `);
  console.log(`\nTotal module access rows: ${rows.length}`);
  const byUser = {};
  rows.forEach(r => {
    const k = `${r.first_name} ${r.last_name}`;
    if (!byUser[k]) byUser[k] = [];
    byUser[k].push(`${r.module_key}(${r.access_level})`);
  });
  Object.entries(byUser).forEach(([name, mods]) => console.log(`  ${name}: ${mods.join(', ')}`));

  await conn.end();
  console.log('\nDone!');
}

seed().catch(e => console.error('ERROR:', e.message));
