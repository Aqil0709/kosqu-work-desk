// Reset passwords for test users we can't find passwords for
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

const RESET_PW = 'SecTest@1234';

async function run() {
  const hash = await bcrypt.hash(RESET_PW, 10);
  const emails = ['teamlead@kosqu.com', 'info@godrejproperties.com'];

  for (const email of emails) {
    await db.query('UPDATE users SET password_hash=?, force_password_reset=0 WHERE email=?', [hash, email]);
    console.log(`✅ Reset password for ${email} → ${RESET_PW}`);
  }
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
