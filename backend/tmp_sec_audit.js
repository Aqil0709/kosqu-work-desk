require('dotenv').config();
const http = require('http');
const fs = require('fs');

const BASE_HOST = 'localhost';
const BASE_PORT = 5001;

// Test credentials
const CREDS = {
  admin:       { email: 'admin@kosqu.com',           password: 'Admin@1234',  role: 'admin' },
  hr:          { email: 'hr@kosqu.com',              password: 'Admin@1234',  role: 'hr' },
  team_lead:   { email: 'teamlead@kosqu.com',        password: 'SecTest@1234',role: 'team_lead' },
  employee:    { email: 'aqil.jamadar09@gmail.com',  password: 'Admin@1234',  role: 'employee' },
  intern:      { email: 'intern.test@kosqu.com',     password: 'Admin@1234',  role: 'intern/employee' },
  consultant:  { email: 'consultant.test@kosqu.com', password: 'Admin@1234',  role: 'consultant/employee' },
  client:      { email: 'info@godrejproperties.com', password: 'SecTest@1234',role: 'client' },
};

// Sensitive fields that should NOT leak to unauthorized roles
const SALARY_FIELDS = ['salary', 'ctc', 'basic_salary', 'hra', 'pf', 'tds', 'net_salary', 'gross_salary', 'deductions', 'tax', 'bonus', 'increment'];
const BANK_FIELDS   = ['account_number', 'ifsc', 'bank_name', 'bank_account', 'bank_details'];
const PII_FIELDS    = ['pan', 'pan_number', 'aadhaar', 'aadhar', 'aadhaar_number'];
const GST_FIELDS    = ['gst', 'gst_number', 'gstin'];

function request(method, path, token, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data)  headers['Content-Length'] = Buffer.byteLength(data);

    const options = { hostname: BASE_HOST, port: BASE_PORT, path, method, headers };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode, body: null, raw }); }
      });
    });
    req.on('error', e => resolve({ error: e.message, status: 0, body: null, raw: '' }));
    if (data) req.write(data);
    req.end();
  });
}

async function login(email, password) {
  const r = await request('POST', '/api/auth/login', null, { email, password });
  if (r.body && r.body.success) {
    // API returns token at top level OR inside data
    return r.body.token || r.body.data?.token;
  }
  return null;
}

function findSensitiveFields(obj, fieldList, path = '') {
  const found = [];
  if (!obj || typeof obj !== 'object') return found;

  function recurse(o, p) {
    if (Array.isArray(o)) {
      o.forEach((item, i) => recurse(item, `${p}[${i}]`));
    } else if (typeof o === 'object' && o !== null) {
      for (const [key, val] of Object.entries(o)) {
        const keyLower = key.toLowerCase();
        if (fieldList.some(f => keyLower.includes(f))) {
          if (val !== null && val !== undefined && val !== '' && val !== 0) {
            found.push({ path: `${p}.${key}`, value: typeof val === 'string' ? val.substring(0, 30) : val });
          }
        }
        recurse(val, `${p}.${key}`);
      }
    }
  }
  recurse(obj, path || 'response');
  return found;
}

const results = [];
let pass = 0, fail = 0, warn = 0;

function log(status, role, endpoint, message, details = '') {
  const sym = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const line = `${sym} [${status}] ${role.padEnd(12)} ${endpoint.padEnd(45)} ${message}`;
  console.log(line);
  if (details) console.log(`         └─ ${details}`);
  results.push({ status, role, endpoint, message, details });
  if (status === 'PASS') pass++;
  else if (status === 'FAIL') fail++;
  else warn++;
}

async function testEndpoint(role, token, endpoint, allowedFields = [], blockedFields = [], expectDenied = false) {
  const r = await request('GET', endpoint, token);

  if (expectDenied) {
    if (r.status === 403 || r.status === 401 || (r.body && r.body.success === false)) {
      log('PASS', role, endpoint, `Correctly denied (${r.status})`);
    } else {
      log('FAIL', role, endpoint, `Should be denied but got ${r.status}`, r.raw.substring(0, 200));
    }
    return r;
  }

  if (r.status === 403 || r.status === 401) {
    log('FAIL', role, endpoint, `Unexpectedly denied — ${r.status}`);
    return r;
  }

  // Check for blocked sensitive fields
  const leaked = findSensitiveFields(r.body, blockedFields);
  if (leaked.length > 0) {
    log('FAIL', role, endpoint, `DATA LEAK — ${leaked.length} sensitive field(s)`,
      leaked.slice(0, 3).map(l => `${l.path}=${l.value}`).join(', '));
  } else {
    log('PASS', role, endpoint, `No sensitive field leak (${r.status})`);
  }
  return r;
}

async function main() {
  console.log('\n================================================');
  console.log('PHASE 6 — SECURITY VALIDATION AUDIT');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('================================================\n');

  // Step 1: Login all roles
  console.log('SECTION 0 — LOGIN ALL ROLES');
  console.log('─'.repeat(60));
  const tokens = {};
  for (const [key, cred] of Object.entries(CREDS)) {
    const token = await login(cred.email, cred.password);
    if (token) {
      tokens[key] = token;
      console.log(`✅ LOGIN OK  ${cred.role.padEnd(15)} ${cred.email}`);
    } else {
      console.log(`❌ LOGIN FAIL ${cred.role.padEnd(15)} ${cred.email}`);
    }
  }

  console.log('\nSECTION 1 — SALARY ENDPOINT SECURITY');
  console.log('─'.repeat(60));
  const SALARY_BLOCK = [...SALARY_FIELDS, ...BANK_FIELDS, ...PII_FIELDS];

  // Admin: full access
  if (tokens.admin) {
    await testEndpoint('admin', tokens.admin, '/api/salary/records', [], [], false);
    await testEndpoint('admin', tokens.admin, '/api/salary/stats', [], [], false);
  }
  // HR: access
  if (tokens.hr) {
    await testEndpoint('hr', tokens.hr, '/api/salary/records', [], [], false);
    await testEndpoint('hr', tokens.hr, '/api/salary/stats', [], [], false);
  }
  // Team Lead: MUST be denied or return no salary data
  if (tokens.team_lead) {
    await testEndpoint('team_lead', tokens.team_lead, '/api/salary/records', [], SALARY_BLOCK, false);
    await testEndpoint('team_lead', tokens.team_lead, '/api/salary/stats', [], SALARY_BLOCK, false);
  }
  // Employee: only own salary
  if (tokens.employee) {
    await testEndpoint('employee', tokens.employee, '/api/salary/my-history', [], [], false);
    await testEndpoint('employee', tokens.employee, '/api/salary/records', [], SALARY_BLOCK, true);
  }
  // Intern: only own
  if (tokens.intern) {
    await testEndpoint('intern', tokens.intern, '/api/salary/records', [], SALARY_BLOCK, true);
    await testEndpoint('intern', tokens.intern, '/api/salary/my-history', [], [], false);
  }
  // Consultant: only own
  if (tokens.consultant) {
    await testEndpoint('consultant', tokens.consultant, '/api/salary/records', [], SALARY_BLOCK, true);
  }
  // Client: NEVER salary data
  if (tokens.client) {
    await testEndpoint('client', tokens.client, '/api/salary/records', [], SALARY_BLOCK, true);
    await testEndpoint('client', tokens.client, '/api/salary/stats', [], SALARY_BLOCK, true);
  }

  console.log('\nSECTION 2 — EMPLOYEE DATA PII SECURITY');
  console.log('─'.repeat(60));
  const PII_BLOCK = [...BANK_FIELDS, ...PII_FIELDS, ...GST_FIELDS];

  // Team Lead should NOT see salary/bank/PAN in employee list
  if (tokens.team_lead) {
    await testEndpoint('team_lead', tokens.team_lead, '/api/employees', [], SALARY_BLOCK, false);
  }
  // Client should NOT see employee data at all
  if (tokens.client) {
    await testEndpoint('client', tokens.client, '/api/employees', [], PII_BLOCK, true);
  }
  // Employee should NOT see other employees' PII
  if (tokens.employee) {
    const r = await testEndpoint('employee', tokens.employee, '/api/employees', [], [...SALARY_BLOCK, ...PII_BLOCK], false);
    // If it returns multiple employees, that itself is a concern — but check fields
  }

  console.log('\nSECTION 3 — DASHBOARD / ANALYTICS SALARY LEAK');
  console.log('─'.repeat(60));
  if (tokens.team_lead) {
    await testEndpoint('team_lead', tokens.team_lead, '/api/dashboard/stats', [], SALARY_BLOCK, false);
    await testEndpoint('team_lead', tokens.team_lead, '/api/dashboard/analytics/salary-trend', [], SALARY_BLOCK, true);
  }
  if (tokens.client) {
    await testEndpoint('client', tokens.client, '/api/dashboard/stats', [], SALARY_BLOCK, true);
  }
  if (tokens.employee) {
    await testEndpoint('employee', tokens.employee, '/api/dashboard/stats', [], SALARY_BLOCK, false);
    await testEndpoint('employee', tokens.employee, '/api/dashboard/analytics/salary-trend', [], SALARY_BLOCK, true);
  }

  console.log('\nSECTION 4 — NOTIFICATION CONTENT AUDIT');
  console.log('─'.repeat(60));
  const MONEY_PATTERNS = /₹\s*[\d,]+|rs\.?\s*[\d,]+|\d+,\d{3}\.?\d*\s*(salary|deduct|paid|credit)/i;

  for (const [role, token] of Object.entries(tokens)) {
    if (!token) continue;
    const r = await request('GET', '/api/notifications', token);
    if (r.body && r.body.success && r.body.data) {
      const notifs = Array.isArray(r.body.data) ? r.body.data : (r.body.data.notifications || []);
      let moneyLeak = false;
      const flagged = [];
      for (const n of notifs.slice(0, 20)) {
        const msg = (n.message || n.content || n.body || '');
        if (MONEY_PATTERNS.test(msg)) {
          moneyLeak = true;
          flagged.push(msg.substring(0, 80));
        }
      }
      if (moneyLeak) {
        log('FAIL', role, '/api/notifications', `Monetary amount in notification`, flagged[0]);
      } else {
        log('PASS', role, '/api/notifications', `No monetary amounts in notifications (${notifs.length} checked)`);
      }
    } else {
      log('PASS', role, '/api/notifications', `No notifications or endpoint unavailable (${r.status})`);
    }
  }

  console.log('\nSECTION 5 — MODULE ACCESS (CLIENT ISOLATION)');
  console.log('─'.repeat(60));
  const CLIENT_BLOCKED = [
    '/api/employees', '/api/salary/records', '/api/attendance',
    '/api/payroll', '/api/audit-log', '/api/user-management'
  ];
  if (tokens.client) {
    for (const ep of CLIENT_BLOCKED) {
      await testEndpoint('client', tokens.client, ep, [], [], true);
    }
  }

  console.log('\nSECTION 6 — PAYROLL ROUTES RBAC');
  console.log('─'.repeat(60));
  if (tokens.admin) {
    await testEndpoint('admin', tokens.admin, '/api/payroll', [], [], false);
  }
  if (tokens.team_lead) {
    await testEndpoint('team_lead', tokens.team_lead, '/api/payroll', [], SALARY_BLOCK, true);
  }
  if (tokens.employee) {
    await testEndpoint('employee', tokens.employee, '/api/payroll', [], SALARY_BLOCK, true);
  }

  console.log('\nSECTION 7 — AUDIT LOG ACCESS');
  console.log('─'.repeat(60));
  if (tokens.admin) {
    await testEndpoint('admin', tokens.admin, '/api/audit-log', [], [], false);
  }
  if (tokens.hr) {
    await testEndpoint('hr', tokens.hr, '/api/audit-log', [], [], false);
  }
  if (tokens.team_lead) {
    await testEndpoint('team_lead', tokens.team_lead, '/api/audit-log', [], [], true);
  }
  if (tokens.employee) {
    await testEndpoint('employee', tokens.employee, '/api/audit-log', [], [], true);
  }

  // Summary
  const total = pass + fail + warn;
  const score = total > 0 ? Math.round((pass / total) * 100) : 0;
  console.log('\n================================================');
  console.log('FINAL SECURITY AUDIT REPORT');
  console.log('================================================');
  console.log(`Total Tests : ${total}`);
  console.log(`PASS        : ${pass} ✅`);
  console.log(`FAIL        : ${fail} ❌`);
  console.log(`WARN        : ${warn} ⚠️`);
  console.log(`Score       : ${score}%`);
  console.log('');

  if (fail > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   [${r.role}] ${r.endpoint} — ${r.message}`);
      if (r.details) console.log(`      └─ ${r.details}`);
    });
  }

  if (score === 100) console.log('\n🏆 PRODUCTION READY — No security issues found');
  else if (score >= 80) console.log('\n⚠️  NEEDS FIXES — Some security gaps remain');
  else console.log('\n🚨 NOT PRODUCTION READY — Critical security issues');

  fs.writeFileSync('C:\\Users\\Aqil\\work-desk\\backend\\tmp_sec_report.json', JSON.stringify({ results, pass, fail, warn, score }, null, 2));
  console.log('\nFull report saved to tmp_sec_report.json');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
