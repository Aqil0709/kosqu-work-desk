const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    // console.log('Usage: node reset_super_admin_password.js <email> <new_password>');
    // console.log('Example: node reset_super_admin_password.js superadmin@workdesk.com MyNewPassword123');
    process.exit(1);
  }

  // Create database connection
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aits',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log(`Looking for super admin with email: ${email}...`);

    // Check if user exists
    const [rows] = await pool.execute(
      'SELECT id, first_name, last_name FROM super_admins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      console.error(`❌ No super admin found with email ${email}`);
      process.exit(1);
    }

    const admin = rows[0];
    console.log(`Found super admin: ${admin.first_name} ${admin.last_name}`);

    // Hash new password
    console.log('Hashing new password...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await pool.execute(
      'UPDATE super_admins SET password_hash = ? WHERE email = ?',
      [password_hash, email]
    );

    console.log(`✅ Password successfully updated for ${email}`);

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    // Close the connection pool
    await pool.end();
    process.exit(0);
  }
}

resetPassword();
