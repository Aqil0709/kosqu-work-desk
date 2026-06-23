/**
 * Patch: complete the remaining seed sections (candidates, onboarding, MOM, events, notifications, leads, announcements)
 */
require('dotenv').config();
const { pool } = require('./src/config/db');

const TENANT = 2;
const ADMIN_ID = 58;
const HR_ID = 96;

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[rnd(0, arr.length - 1)];
const dateStr = d => d.toISOString().slice(0, 10);
const dtStr = d => d.toISOString().slice(0, 19).replace('T', ' ');
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const TODAY = new Date('2026-06-21');

async function run() {
  // Fetch all existing employees
  const [users] = await pool.query(
    `SELECT u.id as userId, ed.id as empId, u.position, ed.department_id as deptId
     FROM users u JOIN employee_details ed ON ed.employee_id=u.id
     WHERE u.tenant_id=? AND u.position != 'client'`, [TENANT]
  );
  const allEmps = users;
  const teamLeads = allEmps.filter(u => u.position === 'team_lead');
  const projLeads = allEmps.filter(u => u.position === 'project_manager');

  console.log(`Working with ${allEmps.length} employees`);

  // ── CANDIDATES (20) ──────────────────────────────────────────────────────
  // First create job postings
  const jobRoles = ['Senior Software Engineer','UI/UX Designer','DevOps Engineer','Product Manager','QA Lead','Data Scientist','React Developer','Node.js Developer'];
  const jobIds = [];
  for (const role of jobRoles) {
    const [jr] = await pool.query(
      `INSERT INTO job_postings (tenant_id,title,department,experience_min,experience_max,location,job_type,status,description,created_by)
       VALUES (?,?,?,?,?,?,'full_time','open',?,?)
       ON DUPLICATE KEY UPDATE status='open'`,
      [TENANT, role, 'Information Technology', rnd(2,5), rnd(6,10), 'Bengaluru', `Hiring ${role} for enterprise projects`, ADMIN_ID]
    );
    let jid = jr.insertId;
    if (!jid) {
      const [[ex]] = await pool.query('SELECT id FROM job_postings WHERE tenant_id=? AND title=?', [TENANT, role]);
      if (ex) jid = ex.id;
    }
    if (jid) jobIds.push(jid);
  }
  console.log(`Job postings: ${jobIds.length}`);

  const candNames = [
    ['Suraj','Bansode'],['Priyanka','Deshpande'],['Abhishek','Thodge'],['Anita','Wakode'],['Rohan','Fulke'],
    ['Smita','Khandare'],['Rajesh','Pawar'],['Pooja','Waghmode'],['Nitin','Jagtap'],['Prachi','Sawant'],
    ['Amol','Gaikwad'],['Sunita','Mane'],['Tejas','Shinde'],['Roshani','More'],['Vivek','Kadam'],
    ['Swapnil','Jadhav'],['Sonali','Bhosale'],['Vinayak','Pisal'],['Nandini','Chavan'],['Sachin','Sutar'],
  ];
  const stages = ['applied','screening','interview','technical','hr_round','offer','selected','rejected','rejected','withdrawn','applied','screening','interview','selected','rejected','applied','screening','interview','technical','hr_round'];
  const sources = ['linkedin','referral','job_portal','direct','agency','campus'];

  // Clear existing test candidates
  await pool.query('DELETE FROM candidates WHERE tenant_id=?', [TENANT]);

  let candCount = 0;
  for (let i = 0; i < 20; i++) {
    const [fn, ln] = candNames[i];
    const jid = pick(jobIds);
    const exp = rnd(2, 8) + 0.5;
    const currSal = rnd(40, 120) * 10000;
    const expSal = Math.round(currSal * 1.3);
    const companies = ['TCS','Infosys','Wipro','HCL','Tech Mahindra','Accenture','Cognizant','LTI','Capgemini','Mphasis'];
    const designations = ['Software Engineer','Senior Developer','Tech Lead','Associate Consultant','Software Analyst'];
    try {
      await pool.query(
        `INSERT INTO candidates (tenant_id,job_id,name,email,phone,current_company,current_designation,experience_years,current_salary,expected_salary,notice_period,source,stage,assigned_to,rating,applied_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [TENANT, jid, `${fn} ${ln}`, `${fn.toLowerCase()}.${ln.toLowerCase()}${rnd(10,99)}@email.com`,
         `9${rnd(100000000,999999999)}`, pick(companies), pick(designations),
         exp, currSal, expSal, pick([0,15,30,60]), pick(sources), stages[i],
         pick([...(teamLeads.length?teamLeads:allEmps),...(projLeads.length?projLeads:allEmps)])?.userId||ADMIN_ID,
         rnd(2,5), dtStr(addDays(TODAY, -rnd(5,90)))]
      );
      candCount++;
    } catch (e) { console.log('cand err:', e.message); }
  }
  console.log(`✅ Candidates: ${candCount}`);

  // ── ONBOARDING (10) ──────────────────────────────────────────────────────
  let tmplId;
  const [tmplR] = await pool.query(
    `INSERT IGNORE INTO onboarding_templates (tenant_id,name,type) VALUES (?,'Standard Employee Onboarding','onboarding')`,
    [TENANT]
  );
  tmplId = tmplR.insertId;
  if (!tmplId) {
    const [[tm]] = await pool.query('SELECT id FROM onboarding_templates WHERE tenant_id=? LIMIT 1', [TENANT]);
    if (tm) tmplId = tm.id;
  }

  await pool.query('DELETE FROM onboarding_processes WHERE tenant_id=?', [TENANT]);

  const obStatuses = ['completed','completed','in_progress','in_progress','in_progress','pending','pending','completed','in_progress','pending'];
  const recentEmps = allEmps.slice(0, 10);
  let obCount = 0;
  for (let i = 0; i < recentEmps.length; i++) {
    const emp = recentEmps[i];
    const status = obStatuses[i] || 'pending';
    try {
      await pool.query(
        `INSERT INTO onboarding_processes (tenant_id,employee_id,template_id,type,status,start_date,expected_end_date,actual_end_date,created_by)
         VALUES (?,?,?,'onboarding',?,CURDATE(),DATE_ADD(CURDATE(),INTERVAL 30 DAY),?,?)`,
        [TENANT, emp.userId, tmplId, status, status==='completed'?'2026-05-01':null, ADMIN_ID]
      );
      obCount++;
    } catch (e) { console.log('ob err:', e.message); }
  }
  console.log(`✅ Onboarding: ${obCount}`);

  // ── MOM (25) ─────────────────────────────────────────────────────────────
  await pool.query('DELETE FROM meeting_minutes WHERE tenant_id=?', [TENANT]);
  await pool.query('DELETE FROM mom_action_items WHERE tenant_id=?', [TENANT]);

  const meetingTitles = [
    'Q1 Product Roadmap Review','Sprint 12 Planning Session','Client Sync - ABC Technologies',
    'Architecture Design Review - ERP Module','Monthly HR Policy Update Meeting',
    'Security Compliance Audit Review','Annual Performance Review Process Kickoff',
    'Client Onboarding - Future AI Labs','Weekly Stand-up Catchup','Budget Planning FY2026-27',
    'Team Building Workshop Planning','Technical Interview Process Standardisation',
    'Post-deployment Retrospective - v2.4','Mobile App Feature Prioritisation',
    'Vendor Evaluation - Cloud Infrastructure','New Joiner Orientation Session',
    'Client Demo Prep - Smart Retail','Risk Assessment - Payment Gateway Project',
    'Cross-functional Sync - Design & Dev','Quarterly Business Review Q1 2026',
    'Employee Satisfaction Survey Results','OKR Setting Workshop Q2 2026',
    'Data Privacy Policy Review','Incident Post-mortem - Production Outage','Year-End Team Awards and Recognition',
  ];
  const meetingTypes = ['Internal','Client','Technical','HR','Strategy','Retrospective','Planning'];
  const locations = ['Conference Room A','Conference Room B','Zoom Meeting','Google Meet','Client Office','Cafeteria'];
  const agendas = [
    'Review project milestones and blockers','Discuss team capacity and upcoming sprint',
    'Gather client feedback and requirements','Review security findings and action items',
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
         'Meeting conducted as planned. All agenda items discussed. Action items assigned to respective owners.', organizer]
      );
      const momId = mr.insertId;
      if (momId) {
        await pool.query(
          `INSERT INTO mom_action_items (mom_id,tenant_id,description,assigned_to,due_date,status) VALUES (?,?,?,?,?,?)`,
          [momId, TENANT, 'Share meeting notes with all stakeholders', pick(allEmps)?.userId||ADMIN_ID, dateStr(addDays(meetDate, 3)), 'pending']
        );
        await pool.query(
          `INSERT INTO mom_action_items (mom_id,tenant_id,description,assigned_to,due_date,status) VALUES (?,?,?,?,?,?)`,
          [momId, TENANT, 'Update project tracker with discussed changes', pick(allEmps)?.userId||ADMIN_ID, dateStr(addDays(meetDate, 7)), 'in_progress']
        );
      }
      momCount++;
    } catch (e) { console.log('mom err:', e.message); }
  }
  console.log(`✅ MOM: ${momCount}`);

  // ── COMPANY EVENTS (10) ───────────────────────────────────────────────────
  await pool.query('DELETE FROM company_events WHERE tenant_id=?', [TENANT]);
  const events = [
    ['Annual Day Celebration 2026','Grand annual day with awards, performances, and dinner for all employees','2026-03-28','18:00:00','Marriott Hotel, Bengaluru'],
    ['Republic Day Celebration','Patriotic celebrations with flag hoisting and cultural programs','2026-01-26','09:00:00','Office Premises - Terrace'],
    ['Holi Celebrations 2026','Fun Holi celebration with colors, snacks, and team games','2026-03-14','11:00:00','Office Parking Area'],
    ['Q1 Town Hall Meeting','All-hands meeting for Q1 results, roadmap and open Q&A with leadership','2026-04-15','10:00:00','Main Conference Hall'],
    ['Tech Summit 2026 - Internal','Full-day internal tech summit with talks on AI, Cloud and DevOps','2026-05-20','09:00:00','Training Room - Floor 3'],
    ['Team Outing - Coorg Trip','Two-day team outing to Coorg for team bonding and rejuvenation','2026-06-07','07:00:00','Coorg, Karnataka'],
    ['World Environment Day Drive','Tree plantation drive and sustainability awareness campaign','2026-06-05','08:00:00','Cubbon Park, Bengaluru'],
    ['New Year Kickoff 2026','Welcome 2026 with leadership talks, awards and team celebration','2026-01-02','11:00:00','Rooftop Garden - Office'],
    ['Independence Day 2026','Flag hoisting, patriotic program and sweets distribution','2026-08-15','09:00:00','Office Premises'],
    ['Diwali Celebration 2026','Diwali pooja, sweets, gifts and team celebration at office','2026-10-20','17:00:00','Office Common Area'],
  ];
  let eventCount = 0;
  for (const [title, desc, date, time, loc] of events) {
    try {
      await pool.query(
        `INSERT INTO company_events (tenant_id,title,description,event_date,event_time,location,created_by) VALUES (?,?,?,?,?,?,?)`,
        [TENANT, title, desc, date, time, loc, ADMIN_ID]
      );
      eventCount++;
    } catch (e) { console.log('event err:', e.message); }
  }
  console.log(`✅ Events: ${eventCount}`);

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  const notifTemplates = [
    {title:'Leave Request Approved', msg:'Your Casual Leave request has been approved by HR.', type:'leave'},
    {title:'Salary Processed', msg:'Your salary for May 2026 has been processed and credited to your account.', type:'payroll'},
    {title:'Work Report Reviewed', msg:'Your work report has been reviewed and approved by your manager.', type:'work_report'},
    {title:'New Project Assigned', msg:'You have been assigned to a new project. Please check project details.', type:'project'},
    {title:'Performance Review Due', msg:'Your quarterly performance review is pending acknowledgement.', type:'performance'},
    {title:'Asset Assigned', msg:'A new asset has been assigned to you. Please collect from IT desk.', type:'asset'},
    {title:'Meeting Scheduled', msg:'A team meeting has been scheduled. Please check your calendar.', type:'meeting'},
    {title:'Holiday Announcement', msg:'Office will remain closed for the upcoming national holiday.', type:'announcement'},
    {title:'Training Reminder', msg:'Mandatory cyber security training is scheduled. Please complete it before the deadline.', type:'general'},
    {title:'Birthday Wishes', msg:'Wishing you a very Happy Birthday from the entire Kosqu team!', type:'general'},
  ];

  let notifCount = 0;
  for (const emp of allEmps.slice(0, 30)) {
    for (let n = 0; n < rnd(3, 8); n++) {
      const tmpl = pick(notifTemplates);
      try {
        await pool.query(
          `INSERT INTO in_app_notifications (tenant_id,user_id,title,message,is_read,type,created_at) VALUES (?,?,?,?,?,?,?)`,
          [TENANT, emp.userId, tmpl.title, tmpl.msg, rnd(0,1), tmpl.type, dtStr(addDays(TODAY, -rnd(0,30)))]
        );
        notifCount++;
      } catch (_) {}
    }
  }
  console.log(`✅ Notifications: ${notifCount}`);

  // ── EMPLOYEE LEADS (50) ───────────────────────────────────────────────────
  await pool.query('DELETE FROM employee_leads WHERE tenant_id=?', [TENANT]);

  const leadCompanies = [
    'Mahindra Finance','Reliance Retail','HDFC Life Insurance','Tata Consultancy','Bharti Airtel',
    'ICICI Lombard','Larsen & Toubro','Sun Pharma','Bajaj Auto','Hindustan Unilever',
    'IndusInd Bank','Muthoot Finance','Kotak Mahindra','JSW Steel','Maruti Suzuki',
    'Adani Enterprises','Godrej Industries','Pidilite Industries','Asian Paints','Havells India',
    'Titan Company','Marico','Dabur India','Berger Paints','Page Industries',
  ];
  const leadPeople = [
    'Amit Khanna','Sunita Verma','Rajiv Nair','Pooja Agrawal','Suresh Patel',
    'Meera Desai','Vikram Joshi','Asha Singh','Nikhil Bhat','Priya Rao',
    'Kunal Mehta','Ritu Sharma','Aryan Gupta','Swati Kumar','Deepak Yadav',
    'Gayatri Reddy','Arun Malhotra','Sonia Iyer','Tarun Chopra','Anita Menon',
    'Karan Bajwa','Divya Pillai','Mohit Saxena','Lalitha Krishnan','Vivek Chauhan',
    'Anjali Dubey','Raghav Sinha','Kavitha Nambiar','Sachin Wagh','Shraddha Patil',
    'Neel Deshpande','Puja Kulkarni','Amol Rane','Snehal Pawar','Harsh Pandey',
    'Madhuri Gaikwad','Yash Tiwari','Roshni Shah','Suyash More','Namita Kadam',
    'Tanmay Jadhav','Archana Bhosale','Gaurang Pisal','Rukmini Chavan','Omkar Sutar',
    'Harsha Powar','Ketaki Londhe','Prasad Mane','Vaishali Shinde','Mangesh Thakare',
  ];
  const leadStatuses = ['new','contacted','qualified','lost','converted'];
  const leadSources = ['referral','linkedin','website','cold_call','event','partner'];
  const leadIndustries = ['Technology','Finance','Healthcare','Retail','Manufacturing','Education','Logistics','Real Estate'];
  const leadRequirements = [
    'Looking for a custom CRM with WhatsApp integration','Need ERP implementation for 500 users',
    'Require mobile app for field sales team','Want cloud migration from on-premise to AWS',
    'Need AI-powered analytics dashboard','Require payroll automation for 2000 employees',
    'Looking for e-commerce platform with inventory','Need cybersecurity audit and compliance setup',
  ];

  let leadCount = 0;
  for (let i = 0; i < 50; i++) {
    const submitter = allEmps[i % allEmps.length];
    const company = leadCompanies[i % leadCompanies.length];
    const name = leadPeople[i];
    const status = leadStatuses[i % leadStatuses.length];
    const budget = rnd(5, 200) * 50000;
    try {
      await pool.query(
        `INSERT INTO employee_leads (tenant_id,submitted_by,lead_name,company_name,email,phone,source,industry,budget,requirements,status,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [TENANT, submitter.userId, name, company,
         `${name.toLowerCase().replace(/ /g,'.')}@${company.toLowerCase().replace(/\s+/g,'')}.com`,
         `9${rnd(100000000,999999999)}`, pick(leadSources), pick(leadIndustries),
         budget, pick(leadRequirements), status, dtStr(addDays(TODAY, -rnd(1,150)))]
      );
      leadCount++;
    } catch (e) { console.log('lead err:', e.message); }
  }
  console.log(`✅ Employee leads: ${leadCount}`);

  // ── ANNOUNCEMENTS (6) ─────────────────────────────────────────────────────
  const announcements = [
    ['Work From Home Policy Update','Effective July 2026, employees can opt for 2 WFH days per week with team lead approval. Please review the updated policy on the HR portal.'],
    ['New Leave Policy - 2026','Annual leave entitlement increased to 20 days. Earned leave can now be carried forward up to 10 days. Refer to the policy document for details.'],
    ['Office Renovation - Floor 2','Floor 2 will undergo renovation from July 10-20. Teams on that floor please coordinate with admin for temporary seating arrangements.'],
    ['Mandatory Security Training','All employees must complete the cyber security awareness training by June 30, 2026. Certificate is required for the annual compliance audit.'],
    ['Health Insurance Renewal 2026-27','Medical insurance policies have been renewed. Cashless facility now extended to 5000+ network hospitals across India.'],
    ['Performance Appraisal Cycle Begins','The annual performance appraisal cycle for FY2025-26 starts July 1. Managers to submit reviews by July 31, 2026.'],
  ];
  let annCount = 0;
  for (const [title, content] of announcements) {
    try {
      await pool.query(
        `INSERT INTO announcements (tenant_id,title,content,priority,audience,is_active,created_by,start_date) VALUES (?,?,?,'medium','all',1,?,?)`,
        [TENANT, title, content, ADMIN_ID, dateStr(addDays(TODAY, -rnd(1,60)))]
      );
      annCount++;
    } catch (e) { console.log('ann err:', e.message); }
  }
  console.log(`✅ Announcements: ${annCount}`);

  // ── FINAL COUNTS ─────────────────────────────────────────────────────────
  const tables = [
    ['users','tenant_id'],['employee_details','tenant_id'],['clients','tenant_id'],['projects','tenant_id'],
    ['project_members','tenant_id'],['tb_attendance','tenant_id'],['leave_requests','tenant_id'],
    ['salary_records','tenant_id'],['salary_slips','tenant_id'],['work_reports','tenant_id'],
    ['performance_reviews','tenant_id'],['employee_assets','tenant_id'],['resignation_requests','tenant_id'],
    ['candidates','tenant_id'],['onboarding_processes','tenant_id'],['meeting_minutes','tenant_id'],
    ['company_events','tenant_id'],['in_app_notifications','tenant_id'],['employee_leads','tenant_id'],
    ['announcements','tenant_id'],['leave_balances','tenant_id'],
  ];
  console.log('\n' + '═'.repeat(55));
  console.log('  ENTERPRISE DEMO SEED — FINAL REPORT');
  console.log('═'.repeat(55));
  for (const [tbl, col] of tables) {
    const [[{c}]] = await pool.query(`SELECT COUNT(*) as c FROM ${tbl} WHERE ${col}=${TENANT}`);
    console.log(`  ${tbl.padEnd(30)} : ${c}`);
  }
  console.log('═'.repeat(55));
  console.log('  ✅ ALL MODULES POPULATED — PRODUCTION READY');
  console.log('═'.repeat(55) + '\n');
  process.exit(0);
}

run().catch(e => { console.error('❌ PATCH FAILED:', e.message, e.stack); process.exit(1); });
