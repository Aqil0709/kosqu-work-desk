/**
 * Seed script — tenant_id=2 (kosqu.com) complete demo data.
 * Run: node seed_tenant2.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/db');

const TENANT = 2;
const q = async (sql, params = []) => { const [r] = await pool.execute(sql, params); return r; };
const skip = (e) => { /* silently skip duplicates / non-fatal errors */ };

async function seed() {
  console.log('\n=== Seeding tenant_id=2 (kosqu.com) ===\n');

  /* ─── 1. Departments ─── */
  console.log('1. Departments...');
  const deptNames = ['Engineering','Human Resources','Finance','Sales & Marketing','Operations','Design','Product Management'];
  const deptIds = {};
  for (const name of deptNames) {
    const ex = await q('SELECT id FROM departments WHERE name=? AND tenant_id=?', [name, TENANT]);
    if (ex.length) { deptIds[name] = ex[0].id; continue; }
    const r = await q('INSERT INTO departments (name, tenant_id) VALUES (?,?)', [name, TENANT]);
    deptIds[name] = r.insertId;
    console.log('  +', name, '→ id', r.insertId);
  }

  /* ─── 2. Shifts ─── */
  console.log('\n2. Shifts...');
  const shiftsData = [
    { name: 'Morning Shift', cin: '09:00:00', cout: '18:00:00' },
    { name: 'Flexible Shift', cin: '10:00:00', cout: '19:00:00' },
  ];
  const shiftIds = [];
  for (const s of shiftsData) {
    const ex = await q('SELECT shift_id FROM tb_shifts WHERE shift_name=? AND tenant_id=?', [s.name, TENANT]);
    if (ex.length) { shiftIds.push(ex[0].shift_id); continue; }
    const r = await q(
      'INSERT INTO tb_shifts (tenant_id,shift_name,check_in_time,check_out_time,is_default,grace_period_minutes) VALUES (?,?,?,?,1,10)',
      [TENANT, s.name, s.cin, s.cout]
    );
    shiftIds.push(r.insertId);
    console.log('  + shift:', s.name, '→ id', r.insertId);
  }
  const defaultShift = shiftIds[0] || 1;

  /* ─── 3. Users ─── */
  console.log('\n3. Users...');
  const hash = await bcrypt.hash('Employee@123', 10);
  const empDefs = [
    { first:'Arjun',  last:'Sharma',  email:'arjun.sharma@kosqu.com',  phone:'9876501001', dept:'Engineering',       pos:'employee', dob:'1993-04-15', join:'2022-01-10', sal:75000 },
    { first:'Divya',  last:'Patel',   email:'divya.patel@kosqu.com',   phone:'9876501002', dept:'Engineering',       pos:'employee', dob:'1995-07-22', join:'2022-03-15', sal:65000 },
    { first:'Karan',  last:'Mehta',   email:'karan.mehta@kosqu.com',   phone:'9876501003', dept:'Human Resources',   pos:'hr',       dob:'1991-02-10', join:'2021-06-01', sal:55000 },
    { first:'Pooja',  last:'Singh',   email:'pooja.singh@kosqu.com',   phone:'9876501004', dept:'Finance',           pos:'employee', dob:'1994-11-30', join:'2023-01-20', sal:60000 },
    { first:'Rohan',  last:'Gupta',   email:'rohan.gupta@kosqu.com',   phone:'9876501005', dept:'Sales & Marketing', pos:'employee', dob:'1996-03-08', join:'2022-08-05', sal:58000 },
    { first:'Sneha',  last:'Iyer',    email:'sneha.iyer@kosqu.com',    phone:'9876501006', dept:'Design',            pos:'employee', dob:'1997-09-14', join:'2023-04-12', sal:52000 },
    { first:'Vikram', last:'Nair',    email:'vikram.nair@kosqu.com',   phone:'9876501007', dept:'Product Management',pos:'employee', dob:'1990-12-05', join:'2021-11-30', sal:70000 },
    { first:'Ananya', last:'Rao',     email:'ananya.rao@kosqu.com',    phone:'9876501008', dept:'Engineering',       pos:'employee', dob:'1998-06-19', join:'2023-07-01', sal:68000 },
    { first:'Rahul',  last:'Verma',   email:'rahul.verma@kosqu.com',   phone:'9876501009', dept:'Operations',        pos:'employee', dob:'1992-01-25', join:'2022-05-22', sal:50000 },
    { first:'Meera',  last:'Joshi',   email:'meera.joshi@kosqu.com',   phone:'9876501010', dept:'Finance',           pos:'employee', dob:'1995-08-03', join:'2023-02-14', sal:56000 },
    { first:'Aditya', last:'Kumar',   email:'aditya.kumar@kosqu.com',  phone:'9876501011', dept:'Engineering',       pos:'employee', dob:'1993-05-17', join:'2022-09-09', sal:72000 },
    { first:'Priya',  last:'Kapoor',  email:'priya.kapoor@kosqu.com',  phone:'9876501012', dept:'Sales & Marketing', pos:'employee', dob:'1996-10-28', join:'2023-05-18', sal:54000 },
  ];

  const userIds = {}; // email → users.id
  const edIds   = {}; // users.id → employee_details.id (varchar)

  for (let i = 0; i < empDefs.length; i++) {
    const e = empDefs[i];
    let uid;
    const exu = await q('SELECT id FROM users WHERE email=? AND tenant_id=?', [e.email, TENANT]);
    if (exu.length) {
      uid = exu[0].id;
    } else {
      const r = await q(
        'INSERT INTO users (tenant_id,first_name,last_name,email,password_hash,phone,position,is_active) VALUES (?,?,?,?,?,?,?,1)',
        [TENANT, e.first, e.last, e.email, hash, e.phone, e.pos]
      );
      uid = r.insertId;
      console.log('  + user:', e.email, '→ uid', uid);
    }
    userIds[e.email] = uid;

    /* employee_details — id is varchar(20) */
    const edCode = 'KSQ' + String(uid).padStart(4, '0');
    const exed = await q('SELECT id FROM employee_details WHERE employee_id=? AND tenant_id=?', [uid, TENANT]);
    if (exed.length) {
      edIds[uid] = exed[0].id;
    } else {
      const basic = Math.round(e.sal * 0.50);
      const hra   = Math.round(e.sal * 0.20);
      const med   = Math.round(e.sal * 0.10);
      const trav  = Math.round(e.sal * 0.10);
      const other = e.sal - basic - hra - med - trav;
      const pf    = Math.round(basic * 0.12);
      await q(
        `INSERT INTO employee_details
           (id,tenant_id,employee_id,department_id,position,joining_date,salary,date_of_birth,address,emergency_contact,status,default_shift_id,employment_type,employment_category,
            salary_basic,salary_hra,salary_medical_allowance,salary_travel_allowance,salary_other_allowance,salary_gross,
            salary_pf,salary_esic,salary_professional_tax,salary_lwf,salary_total_deduction,salary_net,employer_pf,employer_esic,auto_checkout_enabled)
         VALUES (?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [
          edCode, TENANT, uid, deptIds[e.dept] || 3, e.pos,
          e.join, e.sal, e.dob,
          `${i+1} Brigade Road, Bengaluru 560001`,
          `9900${String(100 + i)}`,
          defaultShift, 'full_time', 'employee',
          basic, hra, med, trav, other, e.sal,
          pf, 0, 200, 0, pf + 200, e.sal - pf - 200,
          pf, 0,
        ]
      );
      edIds[uid] = edCode;
      console.log('  + emp_detail:', edCode, 'for', e.email);
    }
  }

  /* ─── 4. Attendance (last 60 working days) ─── */
  console.log('\n4. Attendance records...');
  const today = new Date();
  let attCount = 0;
  const statuses = ['Present','Present','Present','Present','Present','Present','Present','Delayed','Half Day','Absent'];
  for (const [email, uid] of Object.entries(userIds)) {
    const edId = edIds[uid];
    if (!edId) continue;
    for (let d = 60; d >= 1; d--) {
      const dt = new Date(today); dt.setDate(today.getDate() - d);
      const dow = dt.getDay();
      if (dow === 0 || dow === 6) continue;
      const dateStr = dt.toISOString().split('T')[0];
      const ex = await q('SELECT attendance_id FROM tb_attendance WHERE employee_id=? AND date=? AND tenant_id=?', [edId, dateStr, TENANT]);
      if (ex.length) continue;
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      const ciHour = st === 'Delayed' ? '10:30' : '09:' + String(Math.floor(Math.random()*20)).padStart(2,'0');
      const coHour = st === 'Half Day' ? '13:30' : '18:' + String(Math.floor(Math.random()*30)).padStart(2,'0');
      const ci = st === 'Absent' ? null : `${dateStr} ${ciHour}:00`;
      const co = st === 'Absent' ? null : `${dateStr} ${coHour}:00`;
      const wh = st === 'Absent' ? 0 : st === 'Half Day' ? 4.0 : (st === 'Delayed' ? 7.5 : 9.0);
      await q(
        `INSERT INTO tb_attendance (tenant_id,employee_id,shift_id,date,check_in,check_out,status,worked_hours,is_half_day,is_late,late_minutes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [TENANT, edId, defaultShift, dateStr, ci, co, st, wh,
         st==='Half Day'?1:0, st==='Delayed'?1:0, st==='Delayed'?30:0]
      ).catch(skip);
      attCount++;
    }
  }
  console.log('  + inserted', attCount, 'attendance records');

  /* ─── 5. Leave Requests ─── */
  console.log('\n5. Leave requests...');
  const lvTypes   = ['Sick Leave','Casual Leave','Earned Leave'];
  const lvStatuses = ['Approved','Approved','Pending','Rejected','Approved'];
  let lvCount = 0;
  const empUids = Object.values(userIds).slice(0, 10);
  for (let i = 0; i < empUids.length; i++) {
    const uid = empUids[i];
    const edId = edIds[uid];
    if (!edId) continue;
    for (let j = 0; j < 3; j++) {
      const off = -((i * 5) + (j * 14) + 3);
      const sd = new Date(today); sd.setDate(today.getDate() + off);
      const ed2 = new Date(sd); ed2.setDate(sd.getDate() + j + 1);
      await q(
        `INSERT INTO leave_requests (tenant_id,employee_id,leave_type,is_paid,description,start_date,end_date,status,tl_status,pl_status,approval_level)
         VALUES (?,?,?,1,?,?,?,?,?,?,?)`,
        [TENANT, edId, lvTypes[(i+j)%3], 'Personal / medical reason',
         sd.toISOString().split('T')[0], ed2.toISOString().split('T')[0],
         lvStatuses[(i+j)%5], 'approved', 'approved', 'done']
      ).catch(skip);
      lvCount++;
    }
  }
  console.log('  + inserted', lvCount, 'leave requests');

  /* ─── 6. Salary Records (6 months) ─── */
  console.log('\n6. Salary records...');
  const months    = ['January','February','March','April','May','June'];
  const monthNums = [1,2,3,4,5,6];
  let salCount = 0;
  for (let i = 0; i < empDefs.length; i++) {
    const uid  = userIds[empDefs[i].email];
    const edId = edIds[uid];
    if (!edId) continue;
    const gross = empDefs[i].sal;
    const basic = Math.round(gross * 0.50);
    const pf    = Math.round(basic * 0.12);
    const pt    = 200;
    const deduct= pf + pt;
    const net   = gross - deduct;
    for (let m = 0; m < 6; m++) {
      const paid = m < 5;
      await q(
        `INSERT INTO tb_salary_records
           (employee_id,tenant_id,month,month_number,year,basic_salary,total_working_days,present_days,absent_days,half_days,
            late_days,paid_leaves_used,unpaid_leaves,holiday_days,gross_salary,deduction_amount,net_salary,
            paid_amount,balance_amount,payment_status,payment_date,details)
         VALUES (?,?,?,?,?,?,22,20,1,0,1,0,0,2,?,?,?,?,?,?,?,?)`,
        [edId, TENANT, months[m], monthNums[m], 2026, basic, gross, deduct, net,
         paid ? net : 0, paid ? 0 : net,
         paid ? 'paid' : 'pending',
         paid ? `2026-0${m+1}-28` : null,
         JSON.stringify({ basic, hra: Math.round(gross*0.2), medical: Math.round(gross*0.1), travel: Math.round(gross*0.1), pf, professional_tax: pt })
        ]
      ).catch(skip);
      salCount++;
    }
  }
  console.log('  + inserted', salCount, 'salary records');

  /* ─── 7. Announcements ─── */
  console.log('\n7. Announcements...');
  const anns = [
    { title:'Welcome to Work Desk HRMS!', content:'Our new HR portal is live. Manage attendance, leaves, payslips and more — all in one place.', priority:'high', pinned:1 },
    { title:'Office Holiday — Independence Day', content:'The office will remain closed on 15th August 2026 for Independence Day.', priority:'medium', pinned:0 },
    { title:'New Leave Policy 2026', content:'Effective Q3 2026, all employees get 18 days Earned Leave annually. Check the Leave Policy section for details.', priority:'high', pinned:1 },
    { title:'Q2 Performance Reviews', content:'Reviews will be held July 15–30. Update your KRAs before July 10.', priority:'medium', pinned:0 },
    { title:'Health Insurance Renewal', content:'Submit family member details to HR by June 20 for annual health insurance card renewal.', priority:'low', pinned:0 },
  ];
  for (const a of anns) {
    await q(
      `INSERT INTO announcements (tenant_id,title,content,priority,target_audience,is_active,is_pinned,created_by)
       VALUES (?,?,?,?,'all',1,?,58)`,
      [TENANT, a.title, a.content, a.priority, a.pinned]
    ).catch(skip);
  }
  console.log('  + inserted', anns.length, 'announcements');

  /* ─── 8. Clients ─── */
  console.log('\n8. Clients...');
  const clientDefs = [
    { name:'TechNova Solutions',     contact:'Ravi Sharma',   email:'ravi@technova.in',    phone:'9123456001', city:'Bengaluru', industry:'Technology' },
    { name:'GlobalEdge Consulting',  contact:'Nisha Patel',   email:'nisha@globaledge.com',phone:'9123456002', city:'Mumbai',    industry:'Consulting' },
    { name:'SwiftLogix',             contact:'Anand Kumar',   email:'anand@swiftlogix.co', phone:'9123456003', city:'Hyderabad', industry:'Logistics' },
    { name:'FinServe India',         contact:'Pradeep Menon', email:'pradeep@finserve.in', phone:'9123456004', city:'Chennai',   industry:'Finance' },
    { name:'HealthFirst Pharma',     contact:'Sunita Bose',   email:'sunita@hfpharma.in',  phone:'9123456005', city:'Pune',      industry:'Healthcare' },
  ];
  const clientIds = [];
  for (const c of clientDefs) {
    const ex = await q('SELECT id FROM clients WHERE name=? AND tenant_id=?', [c.name, TENANT]);
    if (ex.length) { clientIds.push(ex[0].id); continue; }
    const r = await q(
      `INSERT INTO clients (tenant_id,name,contact_person,email,phone,city,industry,status) VALUES (?,?,?,?,?,?,?,'active')`,
      [TENANT, c.name, c.contact, c.email, c.phone, c.city, c.industry]
    ).catch(() => ({ insertId: null }));
    if (r.insertId) clientIds.push(r.insertId);
  }
  console.log('  + inserted/found', clientIds.length, 'clients');

  /* ─── 9. PTTM Projects ─── */
  console.log('\n9. PTTM Projects...');
  const projDefs = [
    { name:'Work Desk HRMS v2',       status:'in_progress', ci:0 },
    { name:'TechNova ERP Integration',status:'in_progress', ci:0 },
    { name:'GlobalEdge CRM Portal',   status:'completed',   ci:1 },
    { name:'SwiftLogix Mobile App',   status:'on_hold',     ci:2 },
    { name:'FinServe Payroll System', status:'in_progress', ci:3 },
  ];
  for (const p of projDefs) {
    await q(
      `INSERT INTO pttm_projects (tenant_id,name,status,client_id,start_date,end_date,description)
       VALUES (?,?,?,?,'2026-01-01','2026-12-31','Demo project seeded for testing')`,
      [TENANT, p.name, p.status, clientIds[p.ci] || null]
    ).catch(skip);
  }
  console.log('  + inserted', projDefs.length, 'pttm projects');

  /* ─── 10. Employee Assets ─── */
  console.log('\n10. Assets...');
  const assetDefs = [
    { ei:0, type:'Laptop',      name:'Dell XPS 15',         serial:'DXP15-2024-001' },
    { ei:1, type:'Laptop',      name:'MacBook Pro 14"',     serial:'MBP14-2024-002' },
    { ei:2, type:'Mobile',      name:'iPhone 14',           serial:'IPH14-2024-003' },
    { ei:3, type:'Monitor',     name:'LG 27" 4K',           serial:'LG27-2024-004'  },
    { ei:4, type:'Laptop',      name:'HP EliteBook 840',    serial:'HPE840-2024-005'},
    { ei:5, type:'Access Card', name:'Office Access Card',  serial:'AC-2024-006'    },
    { ei:6, type:'Laptop',      name:'Lenovo ThinkPad X1',  serial:'LTX1-2024-007'  },
    { ei:0, type:'Headset',     name:'Sony WH-1000XM5',     serial:'SONY-2024-008'  },
  ];
  const empEmails = Object.keys(userIds);
  let assetCount = 0;
  for (const a of assetDefs) {
    const uid = userIds[empEmails[a.ei]];
    if (!uid) continue;
    await q(
      `INSERT INTO employee_assets (tenant_id,employee_id,asset_type,asset_name,serial_number,assigned_date,status)
       VALUES (?,?,?,?,?,'2024-01-15','assigned')`,
      [TENANT, uid, a.type, a.name, a.serial]
    ).catch(skip);
    assetCount++;
  }
  console.log('  + inserted', assetCount, 'assets');

  /* ─── 11. Invoices ─── */
  console.log('\n11. Invoices...');
  const invDefs = [
    { ci:0, num:'INV-2026-001', amt:250000, status:'paid'    },
    { ci:1, num:'INV-2026-002', amt:185000, status:'pending' },
    { ci:2, num:'INV-2026-003', amt:320000, status:'paid'    },
    { ci:3, num:'INV-2026-004', amt:95000,  status:'overdue' },
    { ci:0, num:'INV-2026-005', amt:175000, status:'pending' },
  ];
  for (const inv of invDefs) {
    await q(
      `INSERT INTO invoices (tenant_id,client_id,invoice_number,total_amount,status,issue_date,due_date,created_at)
       VALUES (?,?,?,?,?,CURDATE()-INTERVAL 30 DAY,CURDATE()+INTERVAL 30 DAY,NOW())`,
      [TENANT, clientIds[inv.ci]||null, inv.num, inv.amt, inv.status]
    ).catch(skip);
  }
  console.log('  + inserted', invDefs.length, 'invoices');

  /* ─── 12. Quotations ─── */
  console.log('\n12. Quotations...');
  const quotDefs = [
    { ci:1, num:'QT-2026-001', amt:420000, status:'sent'     },
    { ci:4, num:'QT-2026-002', amt:165000, status:'accepted' },
    { ci:2, num:'QT-2026-003', amt:890000, status:'draft'    },
    { ci:3, num:'QT-2026-004', amt:550000, status:'sent'     },
  ];
  for (const qt of quotDefs) {
    await q(
      `INSERT INTO quotations (tenant_id,client_id,quotation_number,total_amount,status,valid_until,created_at)
       VALUES (?,?,?,?,?,CURDATE()+INTERVAL 30 DAY,NOW())`,
      [TENANT, clientIds[qt.ci]||null, qt.num, qt.amt, qt.status]
    ).catch(skip);
  }
  console.log('  + inserted', quotDefs.length, 'quotations');

  /* ─── 13. Holidays ─── */
  console.log('\n13. Holidays...');
  const holidays = [
    ['Republic Day',    '2026-01-26'],
    ['Holi',           '2026-03-14'],
    ['Good Friday',    '2026-04-03'],
    ['Independence Day','2026-08-15'],
    ['Gandhi Jayanti', '2026-10-02'],
    ['Diwali',         '2026-10-20'],
    ['Christmas',      '2026-12-25'],
  ];
  for (const [name, date] of holidays) {
    await q(
      'INSERT INTO holidays (tenant_id,name,date,type) VALUES (?,?,?,?)',
      [TENANT, name, date, 'national']
    ).catch(() =>
      q('INSERT INTO tb_holidays (tenant_id,holiday_name,holiday_date) VALUES (?,?,?)',
        [TENANT, name, date]).catch(skip)
    );
  }
  console.log('  + inserted', holidays.length, 'holidays');

  /* ─── done ─── */
  console.log('\n✅  Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:    admin@kosqu.com             / Kosqu@123');
  console.log('  Employee: arjun.sharma@kosqu.com      / Employee@123');
  console.log('  HR:       karan.mehta@kosqu.com       / Employee@123');
  console.log('  (all 12 employees share: Employee@123)\n');
  process.exit(0);
}

seed().catch(e => { console.error('\nSEED ERROR:', e.message, '\n', e.sql || ''); process.exit(1); });
