/**
 * Final seed: MOM + Attendance
 */
require('dotenv').config();
const { pool } = require('./src/config/db');

const TENANT = 2;
const ADMIN_ID = 58;
const HR_ID = 96;
const DEFAULT_SHIFT = 1;

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[rnd(0, arr.length - 1)];
const dateStr = d => d.toISOString().slice(0, 10);
const dtStr = d => d.toISOString().slice(0, 19).replace('T', ' ');
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const TODAY = new Date('2026-06-21');

async function run() {
  const [users] = await pool.query(
    `SELECT u.id as userId, ed.id as empId, u.position, ed.department_id as deptId
     FROM users u JOIN employee_details ed ON ed.employee_id=u.id
     WHERE u.tenant_id=? AND u.position != 'client'`, [TENANT]
  );
  const allEmps = users;
  console.log(`Employees: ${allEmps.length}`);

  // ── MOM (25) ─────────────────────────────────────────────────────────────
  await pool.query('DELETE FROM mom_action_items WHERE tenant_id=?', [TENANT]);
  await pool.query('DELETE FROM meeting_minutes WHERE tenant_id=?', [TENANT]);

  const meetingTitles = [
    'Q1 Product Roadmap Review','Sprint 12 Planning Session','Client Sync - ABC Technologies',
    'Architecture Design Review - ERP Module','Monthly HR Policy Update Meeting',
    'Security Compliance Audit Review','Annual Performance Review Process Kickoff',
    'Client Onboarding - Future AI Labs','Weekly Stand-up Catchup','Budget Planning FY2026-27',
    'Team Building Workshop Planning','Technical Interview Process Standardisation',
    'Post-deployment Retrospective v2.4','Mobile App Feature Prioritisation',
    'Vendor Evaluation - Cloud Infrastructure','New Joiner Orientation Session',
    'Client Demo Prep - Smart Retail','Risk Assessment - Payment Gateway Project',
    'Cross-functional Sync - Design & Dev','Quarterly Business Review Q1 2026',
    'Employee Satisfaction Survey Results','OKR Setting Workshop Q2 2026',
    'Data Privacy Policy Review','Incident Post-mortem - Production Outage',
    'Year-End Team Awards and Recognition',
  ];
  const meetingTypes = ['Internal','Client','Technical','HR','Strategy','Retrospective','Planning'];
  const locations = ['Conference Room A','Conference Room B','Zoom Meeting','Google Meet','Client Office'];
  const agendas = [
    'Review project milestones and blockers','Discuss team capacity and upcoming sprint',
    'Gather client feedback and requirements','Review security findings and action items',
    'Process improvements and policy updates',
  ];

  let momCount = 0;
  for (let i = 0; i < 25; i++) {
    const organizer = allEmps[i % allEmps.length]?.userId || ADMIN_ID;
    const attendeeUsers = allEmps.slice(0, rnd(4, 10)).map(e => e.userId);
    const meetDate = addDays(new Date('2026-01-01'), rnd(0, 170));
    try {
      const [mr] = await pool.query(
        `INSERT INTO meeting_minutes (tenant_id,meeting_date,title,location,meeting_type,organizer_id,attendees,agenda,notes,status,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,'published',?)`,
        [TENANT, dateStr(meetDate), meetingTitles[i], pick(locations), pick(meetingTypes), organizer,
         JSON.stringify(attendeeUsers), pick(agendas),
         'Meeting conducted as planned. All agenda items discussed. Action items assigned.',
         organizer]
      );
      const momId = mr.insertId;
      if (momId) {
        // status must be: 'open','in_progress','completed','cancelled'
        await pool.query(
          `INSERT INTO mom_action_items (mom_id,tenant_id,description,assigned_to,due_date,status) VALUES (?,?,?,?,?,'open')`,
          [momId, TENANT, 'Share meeting notes with all stakeholders', pick(allEmps)?.userId||ADMIN_ID, dateStr(addDays(meetDate, 3))]
        );
        await pool.query(
          `INSERT INTO mom_action_items (mom_id,tenant_id,description,assigned_to,due_date,status) VALUES (?,?,?,?,?,'in_progress')`,
          [momId, TENANT, 'Update project tracker with discussed changes', pick(allEmps)?.userId||ADMIN_ID, dateStr(addDays(meetDate, 7))]
        );
      }
      momCount++;
    } catch (e) { console.log('mom err:', e.message); }
  }
  console.log(`✅ MOM: ${momCount}`);

  // ── ATTENDANCE (90 days) ──────────────────────────────────────────────────
  const attStart = addDays(TODAY, -90);
  const attStatuses = ['Present','Present','Present','Present','Present','Present','Present','Half Day','Delayed','On Leave','Absent'];
  let attCount = 0;

  // Insert in batches for speed
  const attRows = [];
  for (const emp of allEmps) {
    let d = new Date(attStart);
    while (d <= TODAY) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) { d = addDays(d, 1); continue; }

      const status = pick(attStatuses);
      let checkIn = null, checkOut = null, workedHrs = 0;

      if (status !== 'Absent' && status !== 'On Leave') {
        const h = status === 'Delayed' ? rnd(10, 11) : rnd(9, 10);
        const m = rnd(0, 59);
        checkIn = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
        workedHrs = status === 'Half Day' ? rnd(3, 5) + 0.5 : rnd(7, 9) + 0.5;
        checkOut = new Date(checkIn.getTime() + workedHrs * 3600000);
      }

      attRows.push([
        TENANT, emp.empId, DEFAULT_SHIFT, dateStr(d),
        checkIn ? dtStr(checkIn) : null,
        checkOut ? dtStr(checkOut) : null,
        status,
        status === 'Half Day' ? 1 : 0,
        status === 'Delayed' ? 1 : 0,
        workedHrs,
        HR_ID, dtStr(d)
      ]);
      d = addDays(d, 1);
    }
  }

  // Batch insert 500 at a time
  const BATCH = 500;
  for (let i = 0; i < attRows.length; i += BATCH) {
    const batch = attRows.slice(i, i + BATCH);
    const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const flat = batch.flat();
    try {
      await pool.query(
        `INSERT IGNORE INTO tb_attendance (tenant_id,employee_id,shift_id,date,check_in,check_out,status,is_half_day,is_late,worked_hours,approved_by,approved_at) VALUES ${placeholders}`,
        flat
      );
      attCount += batch.length;
    } catch (e) { console.log('att batch err:', e.message); }
  }
  console.log(`✅ Attendance records: ${attCount}`);

  // ── FINAL SUMMARY ─────────────────────────────────────────────────────────
  const tables = [
    'users','employee_details','departments','clients','projects','project_members',
    'tb_attendance','leave_requests','leave_balances','salary_records','salary_slips',
    'work_reports','performance_reviews','employee_assets','resignation_requests',
    'candidates','onboarding_processes','meeting_minutes','company_events',
    'in_app_notifications','employee_leads','announcements',
  ];

  console.log('\n' + '═'.repeat(55));
  console.log('  ENTERPRISE DEMO — COMPLETE DATA SUMMARY');
  console.log('═'.repeat(55));

  let total = 0;
  for (const tbl of tables) {
    const [[{c}]] = await pool.query(`SELECT COUNT(*) as c FROM ${tbl} WHERE tenant_id=${TENANT}`);
    total += Number(c);
    console.log(`  ${tbl.padEnd(34)} : ${String(c).padStart(6)}`);
  }

  console.log('─'.repeat(55));
  console.log(`  ${'TOTAL RECORDS'.padEnd(34)} : ${String(total).padStart(6)}`);
  console.log('═'.repeat(55));
  console.log('\n  LOGIN CREDENTIALS:');
  console.log('  Admin  → admin@kosqu.com     / Password@123');
  console.log('  HR     → hr@kosqu.com         / Password@123');
  console.log('  TL     → rajan.sharma@kosqu.com / Password@123');
  console.log('  Emp    → kavya.reddy@kosqu.com  / Password@123');
  console.log('═'.repeat(55) + '\n');

  process.exit(0);
}

run().catch(e => { console.error('❌ FAILED:', e.message); process.exit(1); });
