require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

const candidates = [
  'Admin@1234', 'Password@123', 'Test@123', 'Aqil@123', 'Kosqu@1234',
  'Client@123', 'TeamLead@123', 'Intern@123', 'Consult@123',
  'NewPass@123', 'Welcome@123', 'Intern@1234', '1223456@#$',
  'TempPass@1', 'Admin@123', 'admin123', 'password123'
];

async function run() {
  const emails = [
    'teamlead@kosqu.com',
    'info@godrejproperties.com',
    'intern.test@kosqu.com',
    'consultant.test@kosqu.com',
    'aqil.jamadar09@gmail.com'
  ];
  const placeholders = emails.map(() => '?').join(',');
  const rows = await db.query(`SELECT email, position, password_hash FROM users WHERE email IN (${placeholders})`, emails);

  for (const user of rows) {
    console.log(`\nTesting ${user.email} (${user.position})...`);
    let found = false;
    for (const pw of candidates) {
      const ok = await bcrypt.compare(pw, user.password_hash);
      if (ok) {
        console.log(`  ✅ PASSWORD: ${pw}`);
        found = true;
        break;
      }
    }
    if (!found) console.log('  ❌ No match in candidates');
  }
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
