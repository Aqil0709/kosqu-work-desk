require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:5001';
const PASSWORDS = ['Admin@123', '1223456@#$', 'Aqil@123', 'admin123', 'password', 'Test@123', 'Kosqu@123'];

const USERS = [
  { email: 'admin@kosqu.com', role: 'admin' },
  { email: 'hr@kosqu.com', role: 'hr' },
  { email: 'teamlead@kosqu.com', role: 'team_lead' },
  { email: 'aqil.jamadar09@gmail.com', role: 'employee' },
  { email: 'intern.test@kosqu.com', role: 'intern/employee' },
  { email: 'consultant.test@kosqu.com', role: 'consultant/employee' },
  { email: 'info@godrejproperties.com', role: 'client' },
];

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

async function tryLogin(email, passwords) {
  for (const pw of passwords) {
    const r = await post('/api/auth/login', { email, password: pw });
    if (r.body && r.body.success) {
      return { token: r.body.data?.token, password: pw, user: r.body.data?.user };
    }
  }
  return null;
}

async function main() {
  console.log('=== FINDING WORKING CREDENTIALS ===\n');
  const tokens = {};
  for (const u of USERS) {
    const result = await tryLogin(u.email, PASSWORDS);
    if (result) {
      tokens[u.role] = { token: result.token, email: u.email, password: result.password, user: result.user };
      console.log(`✅ ${u.role.padEnd(15)} ${u.email} — password: ${result.password}`);
    } else {
      console.log(`❌ ${u.role.padEnd(15)} ${u.email} — NO PASSWORD WORKED`);
    }
  }

  // Write tokens to file for next script
  require('fs').writeFileSync('/tmp/sec_tokens.json', JSON.stringify(tokens, null, 2));
  console.log('\nTokens saved to /tmp/sec_tokens.json');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
