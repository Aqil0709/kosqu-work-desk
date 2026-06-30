/**
 * Run once to create the super admin account:
 *   node backend/src/features/super-admin/seedSuperAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../../config/db');

async function seed() {
  const email    = 'superadmin@kosqu.com';
  const password = '123@#$Kosqu';
  const hash     = await bcrypt.hash(password, 12);

  // Ensure table exists
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      first_name    VARCHAR(100) NOT NULL,
      last_name     VARCHAR(100) NOT NULL DEFAULT '',
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_active     TINYINT(1)   NOT NULL DEFAULT 1,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Insert or update
  await pool.execute(`
    INSERT INTO super_admins (first_name, last_name, email, password_hash, is_active)
    VALUES ('Kosqu', 'Admin', ?, ?, 1)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1
  `, [email, hash]);

  console.log('✅ Super admin created/updated:');
  console.log('   Email   :', email);
  console.log('   Password:', password);
  process.exit(0);
}

seed().catch(e => { console.error('❌', e.message); process.exit(1); });
