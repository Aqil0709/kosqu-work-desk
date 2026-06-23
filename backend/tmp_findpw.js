require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

const candidates = [
  'Admin@123', 'Aqil@123', 'Kosqu@123', 'admin@123', 'admin',
  '1223456@#$', 'Test@123', 'password', 'Password@123', 'Admin123',
  'Workdesk@123', 'Hr@123', 'kosqu123', 'Kosqu123!', 'Admin@1234'
];

async function run() {
  const rows = await db.query('SELECT email, position, password_hash FROM users WHERE is_active=1 AND position IN ("admin","hr","team_lead","client") LIMIT 10');

  for (const user of rows) {
    console.log(`\nTesting ${user.email} (${user.position})...`);
    for (const pw of candidates) {
      const ok = await bcrypt.compare(pw, user.password_hash);
      if (ok) {
        console.log(`  ✅ PASSWORD: ${pw}`);
        break;
      }
    }
  }
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
