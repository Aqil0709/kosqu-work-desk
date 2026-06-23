require('dotenv').config();
const db = require('./src/config/db');

async function run() {
  const result = await db.query(
    'UPDATE users SET is_locked=0, failed_login_attempts=0, locked_at=NULL WHERE is_active=1'
  );
  console.log('Unlocked all active users. Affected rows:', result.affectedRows);
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
