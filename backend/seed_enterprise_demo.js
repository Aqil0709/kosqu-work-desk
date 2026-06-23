/**
 * Enterprise Demo Data Seed Script
 * Tenant: 2 (Kosqu Technolab)
 * Run: node seed_enterprise_demo.js
 */
require('dotenv').config();
const { pool } = require('./src/config/db');
const bcrypt = require('bcryptjs');

const TENANT = 2;
const ADMIN_ID = 58;
const HR_ID = 96;
const DEFAULT_SHIFT = 1;

// ── helpers ──────────────────────────────────────────────────────────────────
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[rnd(0, arr.length - 1)];
const dateStr = d => d.toISOString().slice(0, 10);
const dtStr = d => d.toISOString().slice(0, 19).replace('T', ' ');

function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function subMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() - n); return x; }

const TODAY = new Date('2026-06-21');
const months6ago = subMonths(TODAY, 6);

async function run() {
  console.log('🚀 Starting enterprise demo seed...\n');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DEPARTMENTS (add missing ones)
  // ─────────────────────────────────────────────────────────────────────────
  const deptData = [
    [2, 'Information Technology'], [3, 'Human Resources'], [4, 'Design & Creative'],
    [5, 'Operations'], [6, 'Quality Assurance'],
  ];
  // Add new departments
  const newDepts = [
    'Finance & Accounts', 'Sales & Marketing', 'Product Management', 'Business Development', 'DevOps & Infrastructure',
  ];
  const deptIds = { 'Information Technology': 2, 'Human Resources': 3, 'Design & Creative': 4, 'Operations': 5, 'Quality Assurance': 6 };

  for (const name of newDepts) {
    const [r] = await pool.query(
      'INSERT IGNORE INTO departments (tenant_id,name,description) VALUES (?,?,?)',
      [TENANT, name, `${name} department`]
    );
    if (r.insertId) deptIds[name] = r.insertId;
    else {
      const [[d]] = await pool.query('SELECT id FROM departments WHERE tenant_id=? AND name=?', [TENANT, name]);
      if (d) deptIds[name] = d.id;
    }
  }
  console.log('✅ Departments ready:', Object.keys(deptIds).length);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. EMPLOYEES (30 new + preserve existing 11)
  // ─────────────────────────────────────────────────────────────────────────
  const pwHash = await bcrypt.hash('Password@123', 10);

  const employeeData = [
    // [firstName, lastName, email, phone, position, dept, designation, salary_gross, employment_category, joiningDate]
    // Team Leads (3)
    ['Rajan','Sharma','rajan.sharma@kosqu.com','9876543201','team_lead','Information Technology','Senior Team Lead',95000,'employee','2022-03-15'],
    ['Priya','Nair','priya.nair@kosqu.com','9876543202','team_lead','Design & Creative','Creative Team Lead',88000,'employee','2022-06-01'],
    ['Arjun','Mehta','arjun.mehta@kosqu.com','9876543203','team_lead','Quality Assurance','QA Team Lead',85000,'employee','2022-09-10'],
    // Project Leads (4)
    ['Sneha','Kulkarni','sneha.kulkarni@kosqu.com','9876543204','project_manager','Information Technology','Project Lead - Backend',78000,'employee','2023-01-20'],
    ['Vikram','Desai','vikram.desai@kosqu.com','9876543205','project_manager','Information Technology','Project Lead - Frontend',76000,'employee','2023-02-14'],
    ['Ananya','Iyer','ananya.iyer@kosqu.com','9876543206','project_manager','Design & Creative','Project Lead - UI/UX',72000,'employee','2023-04-05'],
    ['Rohit','Patil','rohit.patil@kosqu.com','9876543207','project_manager','Quality Assurance','Project Lead - QA',70000,'employee','2023-05-20'],
    // Regular Employees (18)
    ['Aditya','Gupta','aditya.gupta@kosqu.com','9876543208','employee','Information Technology','Senior Software Engineer',68000,'employee','2023-07-01'],
    ['Kavya','Reddy','kavya.reddy@kosqu.com','9876543209','employee','Information Technology','Software Engineer',55000,'employee','2023-08-15'],
    ['Manish','Joshi','manish.joshi@kosqu.com','9876543210','employee','Information Technology','Full Stack Developer',60000,'employee','2023-09-01'],
    ['Pooja','Singh','pooja.singh@kosqu.com','9876543211','employee','Design & Creative','UI Designer',52000,'employee','2023-10-10'],
    ['Siddharth','Kumar','siddharth.kumar@kosqu.com','9876543212','employee','Information Technology','Backend Developer',58000,'employee','2023-11-01'],
    ['Neha','Verma','neha.verma@kosqu.com','9876543213','employee','Quality Assurance','QA Engineer',48000,'employee','2024-01-15'],
    ['Rahul','Agarwal','rahul.agarwal@kosqu.com','9876543214','employee','Information Technology','DevOps Engineer',65000,'employee','2024-02-01'],
    ['Divya','Menon','divya.menon@kosqu.com','9876543215','employee','Design & Creative','Graphic Designer',46000,'employee','2024-03-10'],
    ['Akash','Tiwari','akash.tiwari@kosqu.com','9876543216','employee','Information Technology','Mobile Developer',62000,'employee','2024-04-01'],
    ['Shruti','Bose','shruti.bose@kosqu.com','9876543217','employee','Human Resources','HR Executive',45000,'employee','2024-04-20'],
    ['Nikhil','Chauhan','nikhil.chauhan@kosqu.com','9876543218','employee','Sales & Marketing','Business Analyst',52000,'employee','2024-05-01'],
    ['Pallavi','Rao','pallavi.rao@kosqu.com','9876543219','employee','Finance & Accounts','Accounts Executive',44000,'employee','2024-05-15'],
    ['Gaurav','Shah','gaurav.shah@kosqu.com','9876543220','employee','Information Technology','React Developer',56000,'employee','2024-06-01'],
    ['Tanvi','Mishra','tanvi.mishra@kosqu.com','9876543221','employee','Quality Assurance','Test Engineer',44000,'employee','2024-06-15'],
    ['Pranav','Jain','pranav.jain@kosqu.com','9876543222','employee','Operations','Operations Analyst',42000,'employee','2024-07-01'],
    ['Ishaan','Malhotra','ishaan.malhotra@kosqu.com','9876543223','employee','Information Technology','Node.js Developer',58000,'employee','2024-08-01'],
    ['Riya','Pillai','riya.pillai@kosqu.com','9876543224','employee','Design & Creative','UX Researcher',50000,'employee','2024-09-01'],
    ['Karthik','Srinivas','karthik.srinivas@kosqu.com','9876543225','employee','Information Technology','Python Developer',60000,'employee','2024-10-01'],
    // HR (extra)
    ['Meenakshi','Patel','meenakshi.patel@kosqu.com','9876543226','hr','Human Resources','HR Manager',65000,'employee','2022-11-01'],
    // Interns (3)
    ['Aryan','Kapoor','aryan.kapoor@kosqu.com','9876543227','intern','Information Technology','Software Intern',18000,'intern','2026-01-15'],
    ['Shreya','Ghosh','shreya.ghosh@kosqu.com','9876543228','intern','Design & Creative','Design Intern',15000,'intern','2026-02-01'],
    ['Dev','Saxena','dev.saxena@kosqu.com','9876543229','intern','Information Technology','QA Intern',15000,'intern','2026-03-01'],
    // Consultants (3)
    ['Suresh','Rajan','suresh.rajan@kosqu.com','9876543230','consultant','Business Development','Senior Consultant',120000,'consultant','2025-06-01'],
    ['Lakshmi','Krishnan','lakshmi.krishnan@kosqu.com','9876543231','consultant','Finance & Accounts','Finance Consultant',110000,'consultant','2025-08-01'],
    ['Deepak','Nambiar','deepak.nambiar@kosqu.com','9876543232','consultant','Information Technology','Cloud Architect Consultant',130000,'consultant','2025-10-01'],
  ];

  const createdUsers = []; // {userId, empId, firstName, lastName, position, deptId, salary, designation, employment_category}

  // Preserve existing real employees (IDs 58, 96, 97 = admin, hr, TL)
  const existingToUpdate = [
    {userId:58, firstName:'Rahul', lastName:'Kosqu', pos:'admin', dept:deptIds['Operations'], salary:150000, desig:'Chief Executive Officer', cat:'employee', joining:'2020-01-01'},
    {userId:96, firstName:'Preethi', lastName:'Arora', pos:'hr', dept:deptIds['Human Resources'], salary:70000, desig:'HR Director', cat:'employee', joining:'2021-03-01'},
    {userId:97, firstName:'Vijay', lastName:'Kumar', pos:'team_lead', dept:deptIds['Information Technology'], salary:90000, desig:'Engineering Team Lead', cat:'employee', joining:'2021-07-01'},
  ];

  for (const e of existingToUpdate) {
    await pool.query('UPDATE users SET first_name=?,last_name=?,position=? WHERE id=? AND tenant_id=?',
      [e.firstName, e.lastName, e.pos, e.userId, TENANT]);
    const basic = Math.round(e.salary * 0.4);
    const hra = Math.round(basic * 0.4);
    const med = 1500; const travel = 2000;
    const other = e.salary - basic - hra - med - travel;
    const pf = Math.round(basic * 0.12);
    const esic = e.salary <= 21000 ? Math.round(e.salary * 0.0075) : 0;
    const pt = 200;
    const net = e.salary - pf - esic - pt;
    await pool.query(
      `UPDATE employee_details SET department_id=?,position=?,salary=?,salary_basic=?,salary_hra=?,salary_medical_allowance=?,salary_travel_allowance=?,salary_other_allowance=?,salary_gross=?,salary_pf=?,salary_esic=?,salary_professional_tax=?,salary_net=?,joining_date=?,employment_category=?,status='active' WHERE employee_id=? AND tenant_id=?`,
      [e.dept, e.desig, e.salary, basic, hra, med, travel, other, e.salary, pf, esic, pt, net, e.joining, e.cat, e.userId, TENANT]
    );
    createdUsers.push({userId:e.userId, empId:`EMP${String(e.userId).padStart(5,'0')}`, firstName:e.firstName, lastName:e.lastName, position:e.pos, deptId:e.dept, salary:e.salary, designation:e.desig, employment_category:e.cat, joining:e.joining});
  }

  for (const [fi, la, em, ph, pos, deptName, desig, grossSal, cat, joining] of employeeData) {
    // Create user
    const [ur] = await pool.query(
      'INSERT IGNORE INTO users (tenant_id,first_name,last_name,email,password_hash,phone,position,is_active) VALUES (?,?,?,?,?,?,?,1)',
      [TENANT, fi, la, em, pwHash, ph, pos]
    );
    let userId = ur.insertId;
    if (!userId) {
      const [[ex]] = await pool.query('SELECT id FROM users WHERE email=? AND tenant_id=?', [em, TENANT]);
      if (!ex) continue;
      userId = ex.id;
    }
    const empId = `EMP${String(userId).padStart(5,'0')}`;
    const deptId = deptIds[deptName] || deptIds['Information Technology'];

    const basic = Math.round(grossSal * 0.4);
    const hra = Math.round(basic * 0.4);
    const med = 1500; const travel = 2000;
    const other = grossSal - basic - hra - med - travel;
    const pf = cat !== 'consultant' ? Math.round(basic * 0.12) : 0;
    const esic = grossSal <= 21000 ? Math.round(grossSal * 0.0075) : 0;
    const pt = 200;
    const net = grossSal - pf - esic - pt;

    const dob = dateStr(new Date(1990 + rnd(0, 8), rnd(0, 11), rnd(1, 28)));
    const bankAcc = `${rnd(100000000000, 999999999999)}`;
    const ifsc = `HDFC${String(rnd(1000000, 9999999))}`;
    const pan = `${String.fromCharCode(65+rnd(0,25))}${String.fromCharCode(65+rnd(0,25))}${String.fromCharCode(65+rnd(0,25))}${String.fromCharCode(65+rnd(0,25))}${String.fromCharCode(65+rnd(0,25))}${rnd(1000,9999)}${String.fromCharCode(65+rnd(0,25))}`;
    const aadhaar = `${rnd(2000,9999)} ${rnd(1000,9999)} ${rnd(1000,9999)}`;

    await pool.query(
      `INSERT INTO employee_details
        (id,tenant_id,employee_id,department_id,position,salary,joining_date,date_of_birth,emergency_contact,bank_account_number,ifsc_code,pan_number,aadhar_number,status,employment_category,
         salary_basic,salary_hra,salary_medical_allowance,salary_travel_allowance,salary_other_allowance,salary_gross,salary_pf,salary_esic,salary_professional_tax,salary_net,
         pf_applicable,experience_years,notice_period,work_location)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE department_id=VALUES(department_id),position=VALUES(position),salary=VALUES(salary),salary_gross=VALUES(salary_gross),salary_net=VALUES(salary_net),status='active'`,
      [empId, TENANT, userId, deptId, desig, grossSal, joining, dob, `98765${rnd(10000,99999)}`,
       bankAcc, ifsc, pan, aadhaar, cat,
       basic, hra, med, travel, other, grossSal, pf, esic, pt, net,
       cat === 'employee' ? 1 : 0, rnd(1,8), cat === 'intern' ? 0 : 30, 'Office']
    );

    createdUsers.push({userId, empId, firstName:fi, lastName:la, position:pos, deptId, salary:grossSal, designation:desig, employment_category:cat, joining});
  }

  console.log(`✅ Users/Employees: ${createdUsers.length} total`);

  // Filter usable employees (not clients)
  const allEmps = createdUsers.filter(u => u.position !== 'client');
  const teamLeads = allEmps.filter(u => u.position === 'team_lead');
  const projLeads = allEmps.filter(u => u.position === 'project_manager');
  const regularEmps = allEmps.filter(u => !['team_lead','project_manager','admin','hr','client'].includes(u.position));

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CLIENTS (12)
  // ─────────────────────────────────────────────────────────────────────────
  const clientData = [
    ['ABC Technologies','Technology','Rohan Kapoor','rohan@abctech.com','9811223344','Bengaluru','IT Services & Consulting','active','ABCT28K1234N','2024-01-01','2026-12-31'],
    ['Global Finance Ltd','Finance','Sunita Mehta','sunita@globalfinance.com','9822334455','Mumbai','Banking & Financial Services','active','GFIN29M5678P','2024-03-01','2026-03-31'],
    ['Smart Retail Pvt Ltd','Retail','Amit Sharma','amit@smartretail.com','9833445566','Delhi','Retail & E-Commerce','active','SMRT30L9012Q','2024-06-01','2026-06-30'],
    ['Healthcare Systems Inc','Healthcare','Dr. Kavitha Rao','kavitha@healthsys.com','9844556677','Hyderabad','Healthcare & MedTech','active','HLTH31H3456R','2024-09-01','2026-09-30'],
    ['TechNova Solutions','Technology','Pradeep Jain','pradeep@technova.com','9855667788','Pune','SaaS & Cloud Services','active','TNOV32T7890S','2025-01-01','2027-01-31'],
    ['Future AI Labs','Technology','Aisha Khan','aisha@futureai.com','9866778899','Bengaluru','Artificial Intelligence','active','FAIL33A2345T','2025-03-01','2027-03-31'],
    ['Skyline Infrastructure','Construction','Suresh Nair','suresh@skyline.com','9877889900','Chennai','Infrastructure & Real Estate','active','SKYL34N6789U','2025-06-01','2027-06-30'],
    ['Digital Commerce Hub','E-Commerce','Neha Gupta','neha@digitalcomm.com','9888990011','Noida','Digital Commerce','active','DCOM35G1234V','2025-07-01','2027-07-31'],
    ['EduTech Solutions','Education','Ramesh Pillai','ramesh@edutech.com','9899001122','Kochi','EdTech & E-Learning','active','EDUT36P5678W','2025-09-01','2027-09-30'],
    ['Logistics Pro India','Logistics','Vikrant Singh','vikrant@logipro.com','9900112233','Ahmedabad','Logistics & Supply Chain','active','LOGI37S9012X','2025-10-01','2027-10-31'],
    ['CloudServe Technologies','Technology','Divya Krishnan','divya@cloudserve.com','9911223344','Bengaluru','Cloud & DevOps','active','CLSV38K3456Y','2025-11-01','2027-11-30'],
    ['Enterprise Vision Corp','Consulting','Manish Agarwal','manish@entvis.com','9922334455','Gurugram','Business Consulting','prospective','ENTR39A7890Z','2026-01-01','2027-12-31'],
  ];

  const clientIds = {};
  for (const [name,ind,cp,ce,cph,loc,indDetails,status,gst,cs,ce2] of clientData) {
    const [r] = await pool.query(
      'INSERT INTO clients (tenant_id,name,industry,contact_person,contact_email,contact_phone,location,status,gst_number,gst_type,contract_start_date,contract_end_date,assigned_manager_user_id) VALUES (?,?,?,?,?,?,?,?,?,"Regular",?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)',
      [TENANT,name,ind,cp,ce,cph,loc,status,gst,cs,ce2,ADMIN_ID]
    );
    let cid = r.insertId;
    if (!cid) {
      const [[ex]] = await pool.query('SELECT id FROM clients WHERE tenant_id=? AND name=?', [TENANT, name]);
      if (ex) cid = ex.id;
    }
    clientIds[name] = cid;
  }
  console.log(`✅ Clients: ${Object.keys(clientIds).length}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PROJECTS (20)
  // ─────────────────────────────────────────────────────────────────────────
  const tl = teamLeads;
  const pl = projLeads;
  const tlId = (i) => (tl[i % tl.length] || allEmps.find(e=>e.position==='team_lead') || allEmps[0]).userId;
  const plId = (i) => (pl[i % pl.length] || allEmps.find(e=>e.position==='project_manager') || allEmps[1]).userId;

  const projectData = [
    // ABC Technologies (3)
    ['ERP Transformation','ABC Technologies','Enterprise ERP system modernisation and cloud migration','2025-01-15','2026-06-30','In Progress','high',4500000,'t&m',82,0,'#5B4FF7',['SAP','Node.js','React','AWS']],
    ['HRMS Modernization','ABC Technologies','Complete HR module redesign with AI features','2025-03-01','2025-12-31','In Progress','medium',2800000,'fixed',60,1,'#10b981',['React','Node.js','MySQL','Redis']],
    ['Mobile Workforce App','ABC Technologies','Cross-platform mobile app for field employees','2025-06-01','2026-03-31','Planning','high',1800000,'fixed',25,2,'#f59e0b',['React Native','Firebase','Node.js']],
    // Future AI Labs (3)
    ['AI Analytics Platform','Future AI Labs','Real-time analytics with ML-powered insights','2025-04-01','2026-04-30','In Progress','critical',6000000,'t&m',55,0,'#ef4444',['Python','TensorFlow','Kafka','Elasticsearch']],
    ['Intelligent Chatbot','Future AI Labs','NLP-based enterprise customer service chatbot','2025-07-01','2025-12-31','In Progress','high',2200000,'fixed',70,1,'#8b5cf6',['Python','GPT-4','FastAPI','PostgreSQL']],
    ['Data Warehouse Migration','Future AI Labs','Migrate on-prem DW to Snowflake cloud platform','2026-01-01','2026-09-30','Planning','medium',3500000,'t&m',10,2,'#06b6d4',['Snowflake','dbt','Airflow','Python']],
    // Global Finance (2)
    ['CRM Portal Revamp','Global Finance Ltd','Modern CRM with loan tracking and dashboards','2024-10-01','2025-09-30','In Progress','high',3200000,'fixed',68,0,'#3b82f6',['React','Node.js','Oracle','Salesforce']],
    ['Loan Management System','Global Finance Ltd','End-to-end loan origination and servicing system','2025-05-01','2026-05-31','In Progress','critical',5500000,'t&m',35,1,'#f97316',['Java','Spring Boot','Oracle','Kafka']],
    // Smart Retail (2)
    ['E-Commerce Platform 2.0','Smart Retail Pvt Ltd','Next-gen e-commerce with AI recommendations','2025-02-01','2026-01-31','In Progress','high',4200000,'t&m',48,2,'#ec4899',['Next.js','Node.js','MongoDB','Redis']],
    ['Inventory Management','Smart Retail Pvt Ltd','Real-time inventory with barcode/RFID tracking','2025-09-01','2026-06-30','Planning','medium',1600000,'fixed',15,0,'#10b981',['React','Python','PostgreSQL','IoT']],
    // Healthcare Systems (2)
    ['Patient Portal','Healthcare Systems Inc','Online patient records and appointment system','2025-01-01','2025-12-31','Completed','high',2800000,'fixed',100,1,'#10b981',['React','Node.js','FHIR','PostgreSQL']],
    ['Telemedicine Platform','Healthcare Systems Inc','Video consultation and e-prescription platform','2025-08-01','2026-08-31','In Progress','critical',4800000,'t&m',30,2,'#3b82f6',['React','WebRTC','Node.js','AWS']],
    // TechNova (2)
    ['SaaS Dashboard','TechNova Solutions','Multi-tenant SaaS analytics dashboard','2025-06-01','2026-06-30','In Progress','high',2400000,'fixed',45,0,'#8b5cf6',['React','Node.js','TimescaleDB','Grafana']],
    ['API Gateway','TechNova Solutions','Centralised API management and rate limiting platform','2026-02-01','2026-10-31','Planning','medium',1800000,'t&m',5,1,'#f59e0b',['Kong','Node.js','Redis','Docker']],
    // Skyline (1)
    ['Project Management Suite','Skyline Infrastructure','End-to-end construction project tracking tool','2025-11-01','2026-11-30','Planning','high',3800000,'fixed',8,2,'#06b6d4',['React','Node.js','PostgreSQL','Mapbox']],
    // Digital Commerce (1)
    ['Payment Gateway Integration','Digital Commerce Hub','Unified payment orchestration with 15+ providers','2025-10-01','2026-04-30','In Progress','critical',2600000,'t&m',52,0,'#ef4444',['Node.js','Stripe','Razorpay','Redis']],
    // EduTech (1)
    ['LMS Platform','EduTech Solutions','Full-featured LMS with live classes and assessments','2025-12-01','2026-12-31','Planning','high',3200000,'fixed',12,1,'#ec4899',['React','Node.js','WebRTC','PostgreSQL']],
    // Logistics Pro (1)
    ['Fleet Management System','Logistics Pro India','Real-time fleet tracking with route optimisation','2026-01-15','2026-12-31','In Progress','high',4100000,'t&m',22,2,'#f97316',['React','Node.js','Google Maps API','MQTT']],
    // CloudServe (1)
    ['Cloud Migration Accelerator','CloudServe Technologies','AWS/Azure migration factory for enterprise clients','2025-09-01','2026-09-30','In Progress','medium',5000000,'t&m',38,0,'#3b82f6',['Terraform','Ansible','AWS','Azure']],
    // Enterprise Vision (1)
    ['Digital Transformation Roadmap','Enterprise Vision Corp','Strategic consulting and digital transformation planning','2026-03-01','2026-08-31','On Hold','low',1200000,'retainer',0,1,'#94a3b8',['Confluence','PowerBI','Excel']],
  ];

  const projectIds = [];
  let projIdx = 0;

  for (const [name, clientName, desc, sd, ed, status, priority, budget, billing, progress, tlIdx, color, techStack] of projectData) {
    const cid = clientIds[clientName];
    const thisTL = tlId(tlIdx);
    const thisPL = plId(projIdx);
    const code = `PROJ-${String(projIdx+1).padStart(3,'0')}`;

    const [r] = await pool.query(
      `INSERT INTO projects (tenant_id,client_id,name,description,start_date,end_date,status,priority,budget,billing_type,progress_pct,color,tech_stack,project_code,team_lead_id,project_lead_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE status=VALUES(status),progress_pct=VALUES(progress_pct)`,
      [TENANT,cid,name,desc,sd,ed,status,priority,budget,billing,progress,color,JSON.stringify(techStack),code,thisTL,thisPL]
    );
    let pid = r.insertId;
    if (!pid) {
      const [[ex]] = await pool.query('SELECT id FROM projects WHERE tenant_id=? AND name=?', [TENANT,name]);
      if (ex) pid = ex.id;
    }
    projectIds.push({id:pid, name, tlUserId:thisTL, plUserId:thisPL, tlIdx, projIdx});
    projIdx++;
  }
  console.log(`✅ Projects: ${projectIds.length}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. PROJECT MEMBERS
  // ─────────────────────────────────────────────────────────────────────────
  await pool.query('DELETE FROM project_members WHERE tenant_id=?', [TENANT]);

  const memberPool = regularEmps.map(e => e.userId);
  let memberPtr = 0;

  for (const proj of projectIds) {
    const memberCount = rnd(3, 7);
    const usedInProject = new Set([proj.tlUserId, proj.plUserId]);

    // Team lead
    await pool.query('INSERT IGNORE INTO project_members (tenant_id,project_id,user_id,role,joined_at,is_active) VALUES (?,?,?,"team_lead",NOW(),1)',
      [TENANT, proj.id, proj.tlUserId]);
    // Project lead
    await pool.query('INSERT IGNORE INTO project_members (tenant_id,project_id,user_id,role,joined_at,is_active) VALUES (?,?,?,"project_lead",NOW(),1)',
      [TENANT, proj.id, proj.plUserId]);
    // Members
    for (let m = 0; m < memberCount; m++) {
      const uid = memberPool[memberPtr % memberPool.length];
      memberPtr++;
      if (usedInProject.has(uid)) continue;
      usedInProject.add(uid);
      await pool.query('INSERT IGNORE INTO project_members (tenant_id,project_id,user_id,role,joined_at,is_active) VALUES (?,?,?,"member",NOW(),1)',
        [TENANT, proj.id, uid]);
    }
  }
  console.log('✅ Project members mapped');

  // ─────────────────────────────────────────────────────────────────────────
  // 6. LEAVE TYPES (ensure exist)
  // ─────────────────────────────────────────────────────────────────────────
  const leaveTypes = ['Casual','Sick','Earned','Unpaid','Maternity','Privilege Leave','Compensatory Off','Paternity Leave'];

  // ─────────────────────────────────────────────────────────────────────────
  // 7. LEAVE BALANCES for all employees
  // ─────────────────────────────────────────────────────────────────────────
  const currentYear = 2026;
  for (const emp of allEmps) {
    for (const lt of ['Casual','Sick','Earned','Privilege Leave','Compensatory Off']) {
      const alloc = lt === 'Earned' ? 15 : lt === 'Casual' ? 12 : lt === 'Sick' ? 10 : lt === 'Privilege Leave' ? 8 : 5;
      const used = rnd(0, Math.floor(alloc * 0.6));
      await pool.query(
        'INSERT INTO leave_balances (tenant_id,employee_id,leave_type,year,allocated,used,pending) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE allocated=VALUES(allocated),used=VALUES(used)',
        [TENANT, emp.empId, lt, currentYear, alloc, used, rnd(0,2)]
      );
    }
  }
  console.log('✅ Leave balances set');

  // ─────────────────────────────────────────────────────────────────────────
  // 8. LEAVE REQUESTS (50)
  // ─────────────────────────────────────────────────────────────────────────
  const leaveStatuses = ['Pending','Approved','Approved','Approved','Rejected'];
  const leaveReasons = [
    'Fever and cold, need rest','Personal family commitment','Annual vacation planned','Medical appointment','Attending sibling wedding',
    'Parents anniversary celebration','Child school admission process','Home renovation work','Out-of-town for official work',
    'Medical emergency of parent','Visa stamping appointment','Bank-related urgent work','Religious festival observance',
    'Mental health break required','Post-surgery recovery',
  ];

  let leaveCount = 0;
  for (let i = 0; i < 50; i++) {
    const emp = pick(allEmps);
    const lt = pick(['Casual','Sick','Earned','Privilege Leave','Compensatory Off','Unpaid']);
    const startDate = addDays(new Date('2026-01-01'), rnd(0, 170));
    const days = rnd(1, 4);
    const endDate = addDays(startDate, days - 1);
    const status = pick(leaveStatuses);
    const hrUserId = HR_ID;
    const tlApprover = pick(teamLeads)?.userId || ADMIN_ID;
    const reason = pick(leaveReasons);

    try {
      await pool.query(
        `INSERT INTO leave_requests (tenant_id,employee_id,leave_type,is_paid,description,start_date,end_date,status,approved_by,approved_at,tl_status,tl_approved_by,tl_approved_at,hr_status,hr_approved_by,hr_approved_at,approval_level,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [TENANT, emp.empId, lt, lt==='Unpaid'?0:1, reason, dateStr(startDate), dateStr(endDate),
         status, status==='Pending'?null:hrUserId, status==='Pending'?null:dtStr(TODAY),
         status==='Pending'?'pending':'approved', tlApprover, dtStr(TODAY),
         status==='Approved'?'approved':status==='Rejected'?'rejected':'pending',
         status==='Approved'?hrUserId:null, status==='Approved'?dtStr(TODAY):null,
         status==='Pending'?'tl':'done', dtStr(addDays(startDate, -rnd(3,15)))]
      );
      leaveCount++;
    } catch (_) {}
  }
  console.log(`✅ Leave requests: ${leaveCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 9. ATTENDANCE (90 days for all employees)
  // ─────────────────────────────────────────────────────────────────────────
  const attStart = addDays(TODAY, -90);
  const attStatuses = ['Present','Present','Present','Present','Present','Present','Present','Half Day','Delayed','On Leave','Absent','Present','Present','Present'];
  let attCount = 0;

  for (const emp of allEmps) {
    let d = new Date(attStart);
    while (d <= TODAY) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) { d = addDays(d, 1); continue; } // skip weekends

      const status = pick(attStatuses);
      const checkInHour = status === 'Absent' || status === 'On Leave' ? null : (status === 'Delayed' ? rnd(10,11) : rnd(9,10));
      const checkInMin = status === 'Absent' || status === 'On Leave' ? null : rnd(0,59);
      const workedHrs = status === 'Half Day' ? rnd(3,5) + 0.5 : status === 'Present' || status === 'Delayed' ? rnd(7,9) + 0.5 : 0;
      const checkIn = checkInHour !== null ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), checkInHour, checkInMin) : null;
      const checkOut = checkIn ? new Date(checkIn.getTime() + workedHrs * 3600000) : null;

      try {
        await pool.query(
          `INSERT IGNORE INTO tb_attendance (tenant_id,employee_id,shift_id,date,check_in,check_out,status,is_half_day,is_late,worked_hours,approved_by,approved_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [TENANT, emp.empId, DEFAULT_SHIFT, dateStr(d),
           checkIn ? dtStr(checkIn) : null, checkOut ? dtStr(checkOut) : null,
           status, status==='Half Day'?1:0, status==='Delayed'?1:0,
           workedHrs, HR_ID, dtStr(d)]
        );
        attCount++;
      } catch (_) {}
      d = addDays(d, 1);
    }
  }
  console.log(`✅ Attendance records: ${attCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 10. SALARY RECORDS + SALARY SLIPS (6 months)
  // ─────────────────────────────────────────────────────────────────────────
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let salCount = 0; let slipCount = 0;

  for (let mo = 5; mo >= 0; mo--) {
    const payDate = subMonths(TODAY, mo);
    const monthName = monthNames[payDate.getMonth()];
    const year = payDate.getFullYear().toString();

    for (const emp of allEmps.filter(e => e.employment_category !== 'consultant' || mo < 3)) {
      const gross = emp.salary;
      const basic = Math.round(gross * 0.4);
      const hra = Math.round(basic * 0.4);
      const med = 1500; const travel = 2000;
      const other = gross - basic - hra - med - travel;
      const pf = basic > 0 ? Math.round(Math.min(basic, 15000) * 0.12) : 0;
      const esic = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
      const pt = 200;
      const tds = gross > 83333 ? Math.round((gross * 0.3) / 12) : 0;
      const net = gross - pf - esic - pt - tds;

      const allowances = JSON.stringify({hra, medical: med, travel, other});
      const deductions = JSON.stringify({pf, esic, professional_tax: pt, tds});

      try {
        const [sr] = await pool.query(
          `INSERT INTO salary_records (tenant_id,employee_id,department_id,basic_salary,allowances,deductions,net_salary,payment_date,month,year,status,payment_status,paid_amount,balance_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?,'paid','paid',?,0)
           ON DUPLICATE KEY UPDATE status='paid',paid_amount=VALUES(paid_amount)`,
          [TENANT, emp.empId, emp.deptId||2, basic, allowances, deductions, net,
           dateStr(addDays(payDate, 28)), monthName, year, net]
        );
        const srId = sr.insertId || 0;
        salCount++;

        if (srId) {
          await pool.query(
            `INSERT IGNORE INTO salary_slips (tenant_id,employee_id,salary_record_id,month,year,month_number,net_salary,generated_by)
             VALUES (?,?,?,?,?,?,?,?)`,
            [TENANT, emp.empId, srId, monthName, parseInt(year), payDate.getMonth()+1, net, ADMIN_ID]
          );
          slipCount++;
        }
      } catch (_) {}
    }
  }
  console.log(`✅ Salary records: ${salCount}, Salary slips: ${slipCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 11. WORK REPORTS (300)
  // ─────────────────────────────────────────────────────────────────────────
  const taskTitles = [
    'API development for user authentication module','UI component library updates','Bug fixes in payment flow',
    'Code review and PR merges','Sprint planning and backlog grooming','Database query optimisation',
    'Integration testing for third-party APIs','Documentation update for REST endpoints','Performance profiling and fix',
    'Deployment to staging environment','Client demo preparation and walkthrough','Security vulnerability patch',
    'Mobile responsive design fixes','Unit test coverage improvement','CI/CD pipeline setup',
    'Requirements gathering with client','Microservices architecture design','Redis cache implementation',
    'Load testing and capacity planning','Error monitoring setup with Sentry',
  ];
  const workDescriptions = [
    'Completed implementation and wrote unit tests. Reviewed code with team lead and addressed feedback.',
    'Worked on UI enhancements, resolved 3 bugs, and updated component documentation.',
    'Attended stand-up, completed assigned tasks, and helped junior developer debug API issues.',
    'Refactored module for better readability, improved test coverage from 60% to 85%.',
    'Coordinated with client team for requirement clarification and updated project tracker.',
    'Deployed hotfix to production, monitored logs, and resolved post-deployment issues.',
    'Completed sprint retrospective, groomed backlog for next sprint, updated Jira tickets.',
    'Reviewed pull requests, provided detailed feedback, and merged 4 approved PRs.',
  ];

  const wrStatuses = ['submitted','approved','approved','approved','needs_revision'];
  let wrCount = 0;

  for (let i = 0; i < 300; i++) {
    const emp = pick(allEmps.filter(e => !['admin','client'].includes(e.position)));
    const proj = pick(projectIds);
    const repDate = addDays(new Date('2026-01-01'), rnd(0, 170));
    const reviewer = pick([...teamLeads, ...projLeads])?.userId || HR_ID;
    const status = pick(wrStatuses);
    const hrs = rnd(5, 9) + 0.5;

    try {
      await pool.query(
        `INSERT INTO work_reports (tenant_id,employee_id,user_id,report_date,project_id,project_name,task_title,work_done,challenges,tomorrow_plan,hours_worked,status,reviewed_by,reviewed_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [TENANT, emp.empId, emp.userId, dateStr(repDate), proj.id, proj.name,
         pick(taskTitles), pick(workDescriptions),
         rnd(0,3) > 0 ? 'No major blockers encountered' : 'Awaiting response from third-party vendor API team',
         'Continue with current module, start working on integration tests',
         hrs, status, status==='submitted'?null:reviewer, status==='submitted'?null:dtStr(TODAY),
         dtStr(repDate), dtStr(repDate)]
      );
      wrCount++;
    } catch (_) {}
  }
  console.log(`✅ Work reports: ${wrCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 12. PERFORMANCE REVIEWS
  // ─────────────────────────────────────────────────────────────────────────
  const perfPeriods = [
    {label:'Q1 2026',start:'2026-01-01',end:'2026-03-31'},
    {label:'Q4 2025',start:'2025-10-01',end:'2025-12-31'},
    {label:'Q3 2025',start:'2025-07-01',end:'2025-09-30'},
    {label:'Annual Review 2025',start:'2025-01-01',end:'2025-12-31'},
  ];
  const perfComments = [
    'Consistently delivers high quality work, exceeds expectations in most areas.',
    'Good team player, strong technical skills, can improve on communication.',
    'Shows great initiative and has taken ownership of critical modules.',
    'Needs improvement in time management, otherwise technically competent.',
    'Outstanding performance this quarter, promoted to senior role recommendation.',
    'Meets all expectations, reliable and punctual, continues to grow.',
    'Excellent problem-solving skills, resolves complex issues independently.',
    'Growing steadily, would benefit from more cross-functional exposure.',
  ];

  let perfCount = 0;
  for (const emp of allEmps.filter(e => !['admin','client'].includes(e.position))) {
    const period = pick(perfPeriods);
    const reviewer = pick([...teamLeads, ...projLeads])?.userId || ADMIN_ID;
    const rating = (rnd(25, 50) / 10).toFixed(1);
    const status = pick(['submitted','submitted','acknowledged']);
    try {
      await pool.query(
        `INSERT INTO performance_reviews (tenant_id,employee_id,reviewer_id,period_label,period_start,period_end,overall_rating,comments,status) VALUES (?,?,?,?,?,?,?,?,?)`,
        [TENANT, emp.empId, reviewer, period.label, period.start, period.end, rating, pick(perfComments), status]
      );
      perfCount++;
    } catch (_) {}
  }
  console.log(`✅ Performance reviews: ${perfCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 13. ASSETS
  // ─────────────────────────────────────────────────────────────────────────
  const assetTypes = [
    {type:'Laptop',names:['Dell XPS 15','MacBook Pro 14"','Lenovo ThinkPad X1','HP EliteBook 850','Asus ZenBook 14']},
    {type:'Monitor',names:['Dell UltraSharp 27"','LG 4K 27UK850','Samsung 27" Curved','BenQ 24" IPS','HP 24mh Display']},
    {type:'Keyboard',names:['Logitech MX Keys','Apple Magic Keyboard','Keychron K2','Dell KB216','HP Wireless Keyboard']},
    {type:'Mouse',names:['Logitech MX Master 3','Apple Magic Mouse','Microsoft Arc Mouse','Dell WM126','HP X4000']},
    {type:'Headset',names:['Sony WH-1000XM5','Jabra Evolve2 55','Bose 700','Plantronics Voyager','Logitech H390']},
  ];

  let assetCount = 0;
  for (const emp of allEmps.filter(e => !['client','intern'].includes(e.position))) {
    // Laptop for everyone
    const laptop = assetTypes[0];
    const assetName = pick(laptop.names);
    const serial = `SN${rnd(100000000,999999999)}`;
    const assignDate = emp.joining;
    try {
      await pool.query(
        `INSERT INTO employee_assets (tenant_id,employee_id,asset_type,asset_name,serial_number,assigned_date,status,notes) VALUES (?,?,?,?,?,?,'assigned',?)`,
        [TENANT, emp.userId, laptop.type, assetName, serial, assignDate, `Assigned on joining date`]
      );
      assetCount++;
    } catch (_) {}

    // Monitor for devs and leads
    if (['team_lead','project_manager','employee'].includes(emp.position) && rnd(0,1)) {
      const monitor = assetTypes[1];
      try {
        await pool.query(
          `INSERT INTO employee_assets (tenant_id,employee_id,asset_type,asset_name,serial_number,assigned_date,status) VALUES (?,?,?,?,?,?,'assigned')`,
          [TENANT, emp.userId, monitor.type, pick(monitor.names), `MON${rnd(10000000,99999999)}`, assignDate]
        );
        assetCount++;
      } catch (_) {}
    }
    // Accessories for some
    if (rnd(0,2) > 0) {
      const kb = assetTypes[2];
      try {
        await pool.query(
          `INSERT INTO employee_assets (tenant_id,employee_id,asset_type,asset_name,serial_number,assigned_date,status) VALUES (?,?,?,?,?,?,'assigned')`,
          [TENANT, emp.userId, kb.type, pick(kb.names), `KB${rnd(10000000,99999999)}`, assignDate]
        );
        assetCount++;
      } catch (_) {}
    }
  }
  console.log(`✅ Assets: ${assetCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 14. RESIGNATION REQUESTS (5)
  // ─────────────────────────────────────────────────────────────────────────
  await pool.query("DELETE FROM resignation_requests WHERE tenant_id=? AND status NOT IN ('approved','rejected')", [TENANT]);
  const resignReasons = [
    'Pursuing higher education at IIM Bangalore. This has been a wonderful journey.',
    'Received a senior role opportunity closer to my hometown. Thank you for the growth.',
    'Personal health reasons require a break from full-time employment.',
    'Starting my own venture in the fintech space. Grateful for all learnings here.',
    'Relocating to Singapore for spouse employment. Had to make this difficult decision.',
  ];
  const resignStatuses = ['pending','under_review','approved','rejected','pending'];
  const resignEmps = allEmps.filter(e => e.employment_category === 'employee' && !['admin','hr'].includes(e.position)).slice(0, 5);

  for (let i = 0; i < resignEmps.length; i++) {
    const emp = resignEmps[i];
    const rs = resignStatuses[i];
    const resignDate = addDays(TODAY, -rnd(5, 45));
    const lastDay = addDays(resignDate, 30);
    const refNo = `RES-2026-${String(i+1).padStart(3,'0')}`;
    try {
      await pool.query(
        `INSERT INTO resignation_requests (tenant_id,employee_id,employee_name,department_id,department_name,designation,requested_last_day,reason,status,ref_number,resignation_date,notice_period_days,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [TENANT, emp.empId, `${emp.firstName} ${emp.lastName}`, emp.deptId||2,
         Object.keys(deptIds).find(k=>deptIds[k]===emp.deptId)||'Information Technology',
         emp.designation, dateStr(lastDay), resignReasons[i], rs, refNo, dateStr(resignDate), 30,
         dtStr(resignDate), dtStr(TODAY)]
      );
    } catch (_) {}
  }
  console.log('✅ Resignation requests: 5');

  // ─────────────────────────────────────────────────────────────────────────
  // 15. CANDIDATES (20 recruitment)
  // ─────────────────────────────────────────────────────────────────────────
  // First ensure job postings exist
  const jobRoles = ['Senior Software Engineer','UI/UX Designer','DevOps Engineer','Product Manager','QA Lead','Data Scientist','React Developer','Node.js Developer'];
  const jobIds = [];
  for (const role of jobRoles) {
    const [jr] = await pool.query(
      `INSERT INTO job_postings (tenant_id,title,department,experience_min,experience_max,location,job_type,status,description,created_by) VALUES (?,?,?,?,?,?,'full_time','open',?,?)
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

  const candNames = [
    ['Suraj','Bansode'],['Priyanka','Deshpande'],['Abhishek','Thodge'],['Anita','Wakode'],['Rohan','Fulke'],
    ['Smita','Khandare'],['Rajesh','Pawar'],['Pooja','Waghmode'],['Nitin','Jagtap'],['Prachi','Sawant'],
    ['Amol','Gaikwad'],['Sunita','Mane'],['Tejas','Shinde'],['Roshani','More'],['Vivek','Kadam'],
    ['Swapnil','Jadhav'],['Sonali','Bhosale'],['Vinayak','Pisal'],['Nandini','Chavan'],['Sachin','Sutar'],
  ];
  const stages = ['applied','screening','interview','technical','hr_round','offer','selected','rejected','rejected','withdrawn','applied','screening','interview','selected','rejected','applied','screening','interview','technical','hr_round'];
  const sources = ['linkedin','referral','job_portal','direct','agency','campus'];

  let candCount = 0;
  for (let i = 0; i < 20; i++) {
    const [fn, ln] = candNames[i];
    const jid = pick(jobIds);
    const exp = rnd(2, 8) + 0.5;
    const currSal = rnd(40, 120) * 10000;
    const expSal = Math.round(currSal * 1.3);
    try {
      await pool.query(
        `INSERT INTO candidates (tenant_id,job_id,name,email,phone,current_company,current_designation,experience_years,current_salary,expected_salary,notice_period,source,stage,assigned_to,rating,applied_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [TENANT, jid, `${fn} ${ln}`, `${fn.toLowerCase()}.${ln.toLowerCase()}@email.com`, `98${rnd(10000000,99999999)}`,
         pick(['TCS','Infosys','Wipro','HCL','Tech Mahindra','Accenture','Cognizant','LTI']),
         pick(['Software Engineer','Senior Developer','Tech Lead','Associate','Consultant']),
         exp, currSal, expSal, pick([0,15,30,60]), pick(sources), stages[i],
         pick([...teamLeads,...projLeads])?.userId||ADMIN_ID, rnd(2,5), dtStr(addDays(TODAY, -rnd(5,90)))]
      );
      candCount++;
    } catch (_) {}
  }
  console.log(`✅ Candidates: ${candCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 16. ONBOARDING (10)
  // ─────────────────────────────────────────────────────────────────────────
  // Create a template first
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

  const recentEmps = allEmps.filter(e => e.joining >= '2025-06-01').slice(0, 10);
  const obStatuses = ['completed','completed','in_progress','in_progress','in_progress','pending','pending','completed','in_progress','pending'];

  let obCount = 0;
  for (let i = 0; i < recentEmps.length; i++) {
    const emp = recentEmps[i];
    const status = obStatuses[i] || 'pending';
    try {
      await pool.query(
        `INSERT IGNORE INTO onboarding_processes (tenant_id,employee_id,template_id,type,status,start_date,expected_end_date,actual_end_date,created_by)
         VALUES (?,?,?,'onboarding',?,?,?,?,?)`,
        [TENANT, emp.userId, tmplId, status, emp.joining, addDays(new Date(emp.joining), 30),
         status==='completed'?dateStr(addDays(new Date(emp.joining), 28)):null, ADMIN_ID]
      );
      obCount++;
    } catch (_) {}
  }
  console.log(`✅ Onboarding records: ${obCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 17. MOM — Meeting Minutes (25)
  // ─────────────────────────────────────────────────────────────────────────
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
  const agenda_list = [
    'Review project milestones and blockers','Discuss team capacity and upcoming sprint','Gather client feedback and requirements',
    'Review security findings and action items','Process improvements and policy updates','Risk identification and mitigation strategies',
  ];

  let momCount = 0;
  for (let i = 0; i < 25; i++) {
    const organizer = pick([...teamLeads,...projLeads,...allEmps.filter(e=>e.position==='hr')])?.userId || ADMIN_ID;
    const attendeeUsers = allEmps.filter(e => !['client'].includes(e.position)).slice(0, rnd(4,10)).map(e => e.userId);
    const meetDate = addDays(new Date('2026-01-01'), rnd(0, 170));
    try {
      const [mr] = await pool.query(
        `INSERT INTO meeting_minutes (tenant_id,meeting_date,title,location,meeting_type,organizer_id,attendees,agenda,notes,status,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,'published',?)`,
        [TENANT, dateStr(meetDate), meetingTitles[i], pick(locations), pick(meetingTypes), organizer,
         JSON.stringify(attendeeUsers), pick(agenda_list),
         'Meeting conducted as planned. All agenda items discussed. Action items assigned to respective owners.',
         organizer]
      );
      const momId = mr.insertId;
      // Add action items
      const actionOwner = pick(allEmps)?.userId || ADMIN_ID;
      await pool.query(
        `INSERT INTO mom_action_items (mom_id,tenant_id,description,assigned_to,due_date,status) VALUES (?,?,?,?,?,?)`,
        [momId, TENANT, 'Share meeting notes with all stakeholders', actionOwner, dateStr(addDays(meetDate, 3)), 'pending']
      );
      await pool.query(
        `INSERT INTO mom_action_items (mom_id,tenant_id,description,assigned_to,due_date,status) VALUES (?,?,?,?,?,?)`,
        [momId, TENANT, 'Update project tracker with discussed changes', pick(allEmps)?.userId||ADMIN_ID, dateStr(addDays(meetDate, 7)), 'in_progress']
      );
      momCount++;
    } catch (_) {}
  }
  console.log(`✅ MOM records: ${momCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 18. COMPANY EVENTS (10)
  // ─────────────────────────────────────────────────────────────────────────
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
    } catch (_) {}
  }
  console.log(`✅ Company events: ${eventCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 19. NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────────────
  const notifTemplates = [
    {title:'Leave Request Approved',msg:'Your Casual Leave request for June 15-16 has been approved by HR.',type:'leave'},
    {title:'Salary Processed',msg:'Your salary for May 2026 has been processed and credited.',type:'payroll'},
    {title:'Work Report Reviewed',msg:'Your work report for June 12 has been reviewed and approved.',type:'work_report'},
    {title:'New Project Assigned',msg:'You have been assigned to the ERP Transformation project as a member.',type:'project'},
    {title:'Performance Review Due',msg:'Your Q1 2026 performance review is pending acknowledgement.',type:'performance'},
    {title:'Asset Assigned',msg:'A MacBook Pro 14" has been assigned to you. Please collect from IT desk.',type:'asset'},
    {title:'Meeting Scheduled',msg:'A team meeting has been scheduled for tomorrow at 10:00 AM.',type:'meeting'},
    {title:'Leave Balance Updated',msg:'Your annual leave balance has been updated for the new year.',type:'leave'},
    {title:'Document Uploaded',msg:'Your offer letter has been uploaded to your profile.',type:'document'},
    {title:'Birthday Wishes',msg:'Wishing you a very Happy Birthday from the entire team! 🎂',type:'general'},
    {title:'Holiday Announcement',msg:'Office will remain closed on June 26, 2026 for Eid Al-Adha.',type:'announcement'},
    {title:'Training Session Reminder',msg:'Mandatory cyber security training scheduled for June 25 at 2 PM.',type:'general'},
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

  // ─────────────────────────────────────────────────────────────────────────
  // 20. EMPLOYEE LEADS (50)
  // ─────────────────────────────────────────────────────────────────────────
  const leadCompanies = [
    'Mahindra Finance','Reliance Retail','HDFC Life Insurance','Tata Consultancy','Bharti Airtel',
    'ICICI Lombard','Larsen & Toubro','Sun Pharma','Bajaj Auto','Hindustan Unilever',
    'IndusInd Bank','Muthoot Finance','Kotak Mahindra','JSW Steel','Maruti Suzuki',
    'Adani Enterprises','Godrej Industries','Pidilite Industries','Asian Paints','Havells India',
    'Titan Company','Marico','Dabur India','Berger Paints','Page Industries',
  ];
  const leadNames = [
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
  const leadStatuses = ['new','contacted','qualified','lost','converted','new','contacted','qualified','contacted','new'];
  const leadSources = ['referral','linkedin','website','cold_call','event','partner'];
  const leadIndustries = ['Technology','Finance','Healthcare','Retail','Manufacturing','Education','Logistics','Real Estate'];
  const leadRequirements = [
    'Looking for a custom CRM with WhatsApp integration','Need ERP implementation for 500 users',
    'Require mobile app for field sales team','Want cloud migration from on-premise to AWS',
    'Need AI-powered analytics dashboard','Require payroll automation for 2000 employees',
    'Looking for e-commerce platform with inventory','Need cybersecurity audit and compliance setup',
    'Require multi-tenant SaaS platform','Want data warehouse and BI reporting solution',
  ];

  let leadCount = 0;
  const submitters = allEmps.filter(e => !['client','intern'].includes(e.position));

  for (let i = 0; i < 50; i++) {
    const submitter = pick(submitters);
    const company = leadCompanies[i % leadCompanies.length];
    const name = leadNames[i];
    const status = leadStatuses[i % leadStatuses.length];
    const budget = rnd(5,200) * 50000;
    try {
      await pool.query(
        `INSERT INTO employee_leads (tenant_id,submitted_by,lead_name,company_name,email,phone,source,industry,budget,requirements,status,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [TENANT, submitter.userId, name, company,
         `${name.toLowerCase().replace(' ','.')}@${company.toLowerCase().replace(/\s+/g,'')}.com`,
         `9${rnd(100000000,999999999)}`, pick(leadSources), pick(leadIndustries),
         budget, pick(leadRequirements), status, dtStr(addDays(TODAY, -rnd(1,150)))]
      );
      leadCount++;
    } catch (_) {}
  }
  console.log(`✅ Employee leads: ${leadCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 21. ANNOUNCEMENTS
  // ─────────────────────────────────────────────────────────────────────────
  const announcements = [
    ['Work From Home Policy Update','Effective July 2026, employees can opt for 2 WFH days per week with team lead approval. Please review the updated policy on HR portal.'],
    ['New Leave Policy - 2026','Annual leave entitlement increased to 20 days. Earned leave can now be carried forward up to 10 days. Refer to the policy document for details.'],
    ['Office Renovation - Floor 2','Floor 2 will undergo renovation from July 10-20. Teams on that floor please coordinate with admin for temporary seating.'],
    ['Mandatory Security Training','All employees must complete the cyber security awareness training by June 30, 2026. Certificate required for compliance audit.'],
    ['Health Insurance Renewal','Medical insurance policies have been renewed for FY2026-27. Cashless facility now extended to 5000+ hospitals. Documents shared on email.'],
    ['Performance Appraisal Cycle Begins','The annual performance appraisal cycle for FY2025-26 starts July 1. Managers to submit reviews by July 31.'],
  ];

  for (const [title, content] of announcements) {
    await pool.query(
      `INSERT INTO announcements (tenant_id,title,content,priority,audience,is_active,created_by,start_date) VALUES (?,?,?,'medium','all',1,?,?)`,
      [TENANT, title, content, ADMIN_ID, dateStr(addDays(TODAY, -rnd(1,60)))]
    ).catch(() => {});
  }
  console.log('✅ Announcements: 6');

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  const counts = {};
  for (const [tbl, col] of [
    ['users','tenant_id'],['employee_details','tenant_id'],['clients','tenant_id'],['projects','tenant_id'],
    ['project_members','tenant_id'],['tb_attendance','tenant_id'],['leave_requests','tenant_id'],
    ['salary_records','tenant_id'],['salary_slips','tenant_id'],['work_reports','tenant_id'],
    ['performance_reviews','tenant_id'],['employee_assets','tenant_id'],['resignation_requests','tenant_id'],
    ['candidates','tenant_id'],['onboarding_processes','tenant_id'],['meeting_minutes','tenant_id'],
    ['company_events','tenant_id'],['in_app_notifications','tenant_id'],['employee_leads','tenant_id'],
  ]) {
    const [[{c}]] = await pool.query(`SELECT COUNT(*) as c FROM ${tbl} WHERE ${col}=${TENANT}`);
    counts[tbl] = c;
  }

  console.log('\n' + '═'.repeat(55));
  console.log('  ENTERPRISE DEMO SEED — FINAL REPORT');
  console.log('═'.repeat(55));
  console.log(`  Total Users (incl. admin/hr/clients) : ${counts.users}`);
  console.log(`  Employee Records                     : ${counts.employee_details}`);
  console.log(`  Clients                              : ${counts.clients}`);
  console.log(`  Projects                             : ${counts.projects}`);
  console.log(`  Project Member Assignments           : ${counts.project_members}`);
  console.log(`  Attendance Records (90 days)         : ${counts.tb_attendance}`);
  console.log(`  Leave Requests                       : ${counts.leave_requests}`);
  console.log(`  Salary Records (6 months)            : ${counts.salary_records}`);
  console.log(`  Salary Slips                         : ${counts.salary_slips}`);
  console.log(`  Work Reports                         : ${counts.work_reports}`);
  console.log(`  Performance Reviews                  : ${counts.performance_reviews}`);
  console.log(`  Employee Assets                      : ${counts.employee_assets}`);
  console.log(`  Resignation Requests                 : ${counts.resignation_requests}`);
  console.log(`  Recruitment Candidates               : ${counts.candidates}`);
  console.log(`  Onboarding Processes                 : ${counts.onboarding_processes}`);
  console.log(`  Meeting Minutes (MOM)                : ${counts.meeting_minutes}`);
  console.log(`  Company Events                       : ${counts.company_events}`);
  console.log(`  Notifications                        : ${counts.in_app_notifications}`);
  console.log(`  Employee Leads                       : ${counts.employee_leads}`);
  console.log('═'.repeat(55));
  console.log('  ✅ SEED COMPLETE — All modules populated');
  console.log('═'.repeat(55) + '\n');

  process.exit(0);
}

run().catch(e => { console.error('❌ SEED FAILED:', e.message); console.error(e.stack); process.exit(1); });
