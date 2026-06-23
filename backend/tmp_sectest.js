require('dotenv').config();
const db = require('./src/config/db');
async function run() {
  const rows = await db.query("SELECT email, position, force_password_reset FROM users WHERE is_active=1 LIMIT 30");
  rows.forEach(r => console.log(r.email + ' | ' + r.position + ' | force_reset:' + r.force_password_reset));
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
