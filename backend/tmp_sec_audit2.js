require('dotenv').config();
const http = require('http');
const fs = require('fs');

const BASE_PORT = 5001;

const CREDS = {
  admin:      { email: 'admin@kosqu.com',           password: 'Admin@1234',   role: 'admin' },
  hr:         { email: 'hr@kosqu.com',              password: 'Admin@1234',   role: 'hr' },
  team_lead:  { email: 'teamlead@kosqu.com',        password: 'SecTest@1234', role: 'team_lead' },
  employee:   { email: 'aqil.jamadar09@gmail.com',  password: 'Admin@1234',   role: 'employee' },
  intern:     { email: 'intern.test@kosqu.com',     password: 'Admin@1234',   role: 'intern' },
  consultant: { email: 'consultant.test@kosqu.com', password: 'Admin@1234',   role: 'consultant' },
  client:     { email: 'info@godrejproperties.com', password: 'SecTest@1234', role: 'client' },
};

const SALARY_FIELDS = ['salary','ctc','basic_salary','hra','pf','tds','net_salary','gross_salary','deductions','tax','bonus','increment','take_home'];
const BANK_FIELDS   = ['account_number','ifsc','bank_name','bank_account'];
const PII_FIELDS    = ['pan','pan_number','aadhaar','aadhar'];

function apiRequest(method, path, token, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const hdrs = { 'Content-Type': 'application/json' };
    if (token) hdrs['Authorization'] = 'Bearer ' + token;
    if (data)  hdrs['Content-Length'] = Buffer.byteLength(data);
    const opts = { hostname: 'localhost', port: BASE_PORT, path, method, headers: hdrs };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode, body: null, raw }); }
      });
    });
    req.on('error', e => resolve({ status: 0, body: null, raw: '', error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function doLogin(email, password) {
  const r = await apiRequest('POST', '/api/auth/login', null, { email, password });
  if (r.body && r.body.success) return r.body.token || r.body.data?.token || null;
  return null;
}

function scanSensitive(obj, fields) {
  const hits = [];
  function walk(o, path) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((x,i) => walk(x, path+'['+i+']')); return; }
    for (const [k,v] of Object.entries(o)) {
      const kl = k.toLowerCase();
      if (fields.some(f => kl === f || kl.includes(f))) {
        if (v !== null && v !== undefined && v !== '' && v !== 0) {
          hits.push({ key: k, val: String(v).substring(0,40), path: path+'.'+k });
        }
      }
      walk(v, path+'.'+k);
    }
  }
  walk(obj, 'root');
  return hits;
}

const results = [];
let pass=0, fail=0;

function record(status, role, ep, msg, detail='') {
  const sym = status==='PASS' ? '✅' : '❌';
  console.log(`${sym} [${status}] ${role.padEnd(12)} ${ep.padEnd(45)} ${msg}`);
  if (detail) console.log(`         └─ ${detail}`);
  results.push({ status, role, ep, msg, detail });
  if (status==='PASS') pass++; else fail++;
}

async function check(label, role, token, ep, blockFields=[], expectBlocked=false) {
  const r = await apiRequest('GET', ep, token);
  if (r.error) { record('FAIL', role, ep, 'Network error: '+r.error); return r; }

  const blocked = r.status === 401 || r.status === 403 ||
    (r.body && r.body.success === false && (r.status === 401 || r.status === 403));

  if (expectBlocked) {
    if (blocked) {
      record('PASS', role, ep, `Correctly blocked (${r.status})`);
    } else {
      // Check if body has sensitive data even if not 40x
      const leaks = blockFields.length ? scanSensitive(r.body, blockFields) : [];
      if (leaks.length > 0) {
        record('FAIL', role, ep, `UNBLOCKED + DATA LEAK (${r.status}) — ${leaks.length} field(s)`,
          leaks.slice(0,3).map(l => l.path+'='+l.val).join(', '));
      } else {
        record('FAIL', role, ep, `Should be blocked but got ${r.status} (check body manually)`,
          r.raw.substring(0,120));
      }
    }
    return r;
  }

  // Not expecting block — check for leaks
  if (blocked) {
    record('FAIL', role, ep, `Unexpected block ${r.status}`);
    return r;
  }

  if (blockFields.length) {
    const leaks = scanSensitive(r.body, blockFields);
    if (leaks.length > 0) {
      record('FAIL', role, ep, `DATA LEAK — ${leaks.length} sensitive field(s)`,
        leaks.slice(0,3).map(l => l.path+'='+l.val).join(', '));
    } else {
      record('PASS', role, ep, `No leaks (${r.status})`);
    }
  } else {
    record('PASS', role, ep, `OK (${r.status})`);
  }
  return r;
}

const ALL_SENSITIVE = [...SALARY_FIELDS, ...BANK_FIELDS, ...PII_FIELDS];

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PHASE 6 — SECURITY VALIDATION & ZERO-DATA-LEAK AUDIT');
  console.log('  Date: ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── Section 0: Login ──────────────────────────────────────────────
  console.log('SECTION 0 — LOGIN ALL ROLES');
  console.log('─'.repeat(60));
  const T = {};
  for (const [key, cred] of Object.entries(CREDS)) {
    const tok = await doLogin(cred.email, cred.password);
    if (tok) {
      T[key] = tok;
      console.log(`  ✅ ${cred.role.padEnd(15)} ${cred.email}`);
    } else {
      console.log(`  ❌ ${cred.role.padEnd(15)} ${cred.email} — FAILED`);
    }
  }

  const loggedInRoles = Object.keys(T);
  console.log(`\n  ${loggedInRoles.length}/${Object.keys(CREDS).length} roles logged in successfully\n`);

  if (loggedInRoles.length === 0) {
    console.log('🚨 Cannot proceed — no logins succeeded.');
    process.exit(1);
  }

  // ── Section 1: Salary Endpoint RBAC ──────────────────────────────
  console.log('SECTION 1 — SALARY ENDPOINT RBAC');
  console.log('─'.repeat(60));

  if (T.admin)  await check('admin', 'admin', T.admin, '/api/salary/records');
  if (T.admin)  await check('admin', 'admin', T.admin, '/api/salary/stats');
  if (T.hr)     await check('hr', 'hr', T.hr, '/api/salary/records');
  if (T.hr)     await check('hr', 'hr', T.hr, '/api/salary/stats');

  // Team Lead must NOT get salary records list
  if (T.team_lead) await check('team_lead_salary_records', 'team_lead', T.team_lead, '/api/salary/records', ALL_SENSITIVE, true);
  if (T.team_lead) await check('team_lead_salary_stats',   'team_lead', T.team_lead, '/api/salary/stats',   ALL_SENSITIVE, true);

  // Employee can access own salary only
  if (T.employee) await check('employee_my_history', 'employee', T.employee, '/api/salary/my-history');
  if (T.employee) await check('employee_salary_recs', 'employee', T.employee, '/api/salary/records', ALL_SENSITIVE, true);

  if (T.intern) await check('intern_salary_recs',  'intern',     T.intern,     '/api/salary/records', ALL_SENSITIVE, true);
  if (T.intern) await check('intern_my_history',   'intern',     T.intern,     '/api/salary/my-history');
  if (T.consultant) await check('consultant_recs', 'consultant', T.consultant, '/api/salary/records', ALL_SENSITIVE, true);

  // Client NEVER gets payroll
  if (T.client) await check('client_salary_recs',  'client',  T.client,  '/api/salary/records', ALL_SENSITIVE, true);
  if (T.client) await check('client_salary_stats', 'client',  T.client,  '/api/salary/stats',   ALL_SENSITIVE, true);

  // ── Section 2: Employee data PII ─────────────────────────────────
  console.log('\nSECTION 2 — EMPLOYEE DATA PII & SALARY FIELD SECURITY');
  console.log('─'.repeat(60));

  if (T.admin)     await check('admin_employees',     'admin',     T.admin,     '/api/employees');
  if (T.hr)        await check('hr_employees',        'hr',        T.hr,        '/api/employees');
  if (T.team_lead) await check('tl_employees_nosalary','team_lead', T.team_lead, '/api/employees', ALL_SENSITIVE, false);
  if (T.employee)  await check('emp_employees_blocked','employee',  T.employee,  '/api/employees', ALL_SENSITIVE, true);
  if (T.client)    await check('client_emp_blocked',  'client',    T.client,    '/api/employees', ALL_SENSITIVE, true);

  // ── Section 3: Dashboard / Analytics ─────────────────────────────
  console.log('\nSECTION 3 — DASHBOARD & ANALYTICS SALARY LEAK');
  console.log('─'.repeat(60));

  if (T.admin) {
    await check('admin_dash_stats',    'admin', T.admin, '/api/dashboard/stats');
    await check('admin_salary_trend',  'admin', T.admin, '/api/dashboard/analytics/salary-trend');
  }
  if (T.team_lead) {
    await check('tl_dash_stats',       'team_lead', T.team_lead, '/api/dashboard/stats', ALL_SENSITIVE, false);
    await check('tl_salary_trend',     'team_lead', T.team_lead, '/api/dashboard/analytics/salary-trend', ALL_SENSITIVE, true);
  }
  if (T.employee) {
    await check('emp_dash_stats',      'employee', T.employee, '/api/dashboard/stats', ALL_SENSITIVE, false);
    await check('emp_salary_trend',    'employee', T.employee, '/api/dashboard/analytics/salary-trend', ALL_SENSITIVE, true);
  }
  if (T.client) {
    await check('client_dash_stats',   'client', T.client, '/api/dashboard/stats', ALL_SENSITIVE, true);
  }

  // ── Section 4: Client isolation ───────────────────────────────────
  console.log('\nSECTION 4 — CLIENT PORTAL ISOLATION');
  console.log('─'.repeat(60));

  const CLIENT_BLOCKED_ROUTES = [
    '/api/employees', '/api/salary/records', '/api/salary/stats',
    '/api/attendance', '/api/payroll', '/api/audit-log',
    '/api/user-management', '/api/dashboard/analytics/salary-trend'
  ];
  if (T.client) {
    for (const ep of CLIENT_BLOCKED_ROUTES) {
      await check('client_' + ep.split('/').pop(), 'client', T.client, ep, ALL_SENSITIVE, true);
    }
  }

  // ── Section 5: Payroll RBAC ───────────────────────────────────────
  console.log('\nSECTION 5 — PAYROLL RBAC');
  console.log('─'.repeat(60));

  const PAYROLL_EPS = ['/api/payroll', '/api/payroll/runs', '/api/salary/bulk'];
  if (T.admin) {
    for (const ep of PAYROLL_EPS) {
      await check('admin_' + ep.split('/').pop(), 'admin', T.admin, ep);
    }
  }
  if (T.team_lead) {
    for (const ep of PAYROLL_EPS) {
      await check('tl_' + ep.split('/').pop(), 'team_lead', T.team_lead, ep, ALL_SENSITIVE, true);
    }
  }
  if (T.employee) {
    for (const ep of PAYROLL_EPS) {
      await check('emp_' + ep.split('/').pop(), 'employee', T.employee, ep, ALL_SENSITIVE, true);
    }
  }

  // ── Section 6: Audit log ──────────────────────────────────────────
  console.log('\nSECTION 6 — AUDIT LOG ACCESS');
  console.log('─'.repeat(60));

  if (T.admin)     await check('admin_audit',    'admin',     T.admin,     '/api/audit-log');
  if (T.hr)        await check('hr_audit',       'hr',        T.hr,        '/api/audit-log');
  if (T.team_lead) await check('tl_audit',       'team_lead', T.team_lead, '/api/audit-log', [], true);
  if (T.employee)  await check('emp_audit',      'employee',  T.employee,  '/api/audit-log', [], true);
  if (T.client)    await check('client_audit',   'client',    T.client,    '/api/audit-log', [], true);

  // ── Section 7: Notification content audit ─────────────────────────
  console.log('\nSECTION 7 — NOTIFICATION CONTENT (MONETARY LEAK)');
  console.log('─'.repeat(60));

  const MONEY_RE = /₹\s*[\d,]+|Rs\.?\s*[\d,]+|\b\d{4,}\.?\d*\s*(salary|deduct|paid|credit)\b/i;
  for (const [role, tok] of Object.entries(T)) {
    const r = await apiRequest('GET', '/api/notifications', tok);
    if (r.body && r.body.success !== false) {
      const notifs = Array.isArray(r.body) ? r.body
        : Array.isArray(r.body.data) ? r.body.data
        : Array.isArray(r.body.data?.notifications) ? r.body.data.notifications : [];
      const flagged = notifs.slice(0,30).filter(n => MONEY_RE.test(n.message||n.content||n.body||''));
      if (flagged.length > 0) {
        record('FAIL', role, '/api/notifications', 'Monetary amount in notification text',
          (flagged[0].message||'').substring(0,80));
      } else {
        record('PASS', role, '/api/notifications', `Clean — ${notifs.length} notifications, no monetary amounts`);
      }
    } else {
      record('PASS', role, '/api/notifications', `Endpoint unavailable/empty (${r.status})`);
    }
  }

  // ── Section 8: User Management ────────────────────────────────────
  console.log('\nSECTION 8 — USER MANAGEMENT RBAC');
  console.log('─'.repeat(60));

  if (T.admin)     await check('admin_usermgmt',  'admin',     T.admin,     '/api/user-management/users');
  if (T.hr)        await check('hr_usermgmt',     'hr',        T.hr,        '/api/user-management/users');
  if (T.team_lead) await check('tl_usermgmt',     'team_lead', T.team_lead, '/api/user-management/users', [], true);
  if (T.employee)  await check('emp_usermgmt',    'employee',  T.employee,  '/api/user-management/users', [], true);
  if (T.client)    await check('client_usermgmt', 'client',    T.client,    '/api/user-management/users', [], true);

  // ── Summary ───────────────────────────────────────────────────────
  const total = pass + fail;
  const score = total > 0 ? Math.round((pass/total)*100) : 0;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  FINAL SECURITY AUDIT RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Roles Logged In   : ${loggedInRoles.join(', ')}`);
  console.log(`  Total Tests       : ${total}`);
  console.log(`  PASS              : ${pass} ✅`);
  console.log(`  FAIL              : ${fail} ❌`);
  console.log(`  Security Score    : ${score}%`);
  console.log('');

  if (fail > 0) {
    console.log('  ❌ FAILED TESTS:');
    results.filter(r => r.status==='FAIL').forEach(r => {
      console.log(`     [${r.role}] ${r.ep} — ${r.msg}`);
      if (r.detail) console.log(`        └─ ${r.detail}`);
    });
  } else {
    console.log('  ✅ ALL TESTS PASSED');
  }

  const verdict = score===100 ? '🏆 PRODUCTION READY' : score>=85 ? '⚠️ MOSTLY SECURE — Fix failures before prod' : '🚨 NOT PRODUCTION READY';
  console.log('\n  ' + verdict);

  fs.writeFileSync('C:/Users/Aqil/work-desk/backend/tmp_sec_report.json',
    JSON.stringify({ date: new Date().toISOString(), roles: loggedInRoles, total, pass, fail, score, results }, null, 2));
  console.log('\n  Full report → tmp_sec_report.json');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
