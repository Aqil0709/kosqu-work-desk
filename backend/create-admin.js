/**
 * create-admin.js
 * Run once: node create-admin.js
 * Creates the admin user ashish.kumar@kosqu.com inside the first active tenant.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'work-desk',
    waitForConnections: true,
    connectionLimit: 2,
  });

  const EMAIL    = 'ashish.kumar@kosqu.com';
  const PASSWORD = 'Ashish@1209';
  const FIRST    = 'Ashish';
  const LAST     = 'Kumar';

  // Find tenant
  const [tenants] = await pool.execute(
    'SELECT id, name, slug FROM tenants WHERE is_active = 1 ORDER BY id ASC LIMIT 1'
  );
  if (!tenants.length) {
    console.error('No active tenant found. Create a tenant first.');
    process.exit(1);
  }
  const tenant = tenants[0];
  console.log(`Using tenant: ${tenant.name} (id=${tenant.id})`);

  // Check if user already exists
  const [existing] = await pool.execute(
    'SELECT id, position FROM users WHERE LOWER(email) = LOWER(?) AND tenant_id = ?',
    [EMAIL, tenant.id]
  );

  const hash = await bcrypt.hash(PASSWORD, 10);

  if (existing.length > 0) {
    const u = existing[0];
    await pool.execute(
      `UPDATE users SET password_hash=?, position='admin', is_active=1,
       force_password_reset=0, failed_login_attempts=0, is_locked=0, updated_at=NOW()
       WHERE id=?`,
      [hash, u.id]
    );
    console.log(`Updated existing user id=${u.id} → admin, password reset.`);
  } else {
    const [result] = await pool.execute(
      `INSERT INTO users
         (tenant_id, first_name, last_name, email, password_hash, position,
          is_active, force_password_reset, first_login_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'admin', 1, 0, 1, NOW(), NOW())`,
      [tenant.id, FIRST, LAST, EMAIL, hash]
    );
    console.log(`Created admin user id=${result.insertId}`);
  }

  console.log('Done. Login with:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
