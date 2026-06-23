// backend/src/features/pttm/reset_admin.js

require('dotenv').config();
const { query } = require('../../config/db');

async function run() {
  try {
    console.log('Resetting admin password hash...');
    await query('UPDATE users SET password_hash = NULL WHERE id = 1');
    console.log('Admin password hash successfully cleared! You can now log in using any password.');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password hash:', err);
    process.exit(1);
  }
}

run();
