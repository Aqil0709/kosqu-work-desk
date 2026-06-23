// Demo seed script — run once: node seed_demo.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const { randomUUID } = require('crypto');
const TENANT = 2;
const ADMIN_ID = 58;

async function seed() {
  const db = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'Aqil@123',
    database: 'work-desk', port: 3306, multipleStatements: false,
  });

  const run = (sql, params = []) => db.execute(sql, params);
  const ins = async (sql, params = []) => { const [r] = await db.execute(sql, params); return r.insertId; };

  console.log('\n🌱 Seeding demo data for Work Desk...\n');

  // ── 1. EMPLOYEES (users) ───────────────────────────────────────────────────
  console.log('👤 Creating employees...');
  const employeeData = [
    ['Riya', 'Sharma',   'hr',       'riya.sharma@kosqu.com',    '$2b$10$example'],
    ['Mohit','Verma',    'employee', 'mohit.verma@kosqu.com',    '$2b$10$example'],
    ['Priya','Nair',     'employee', 'priya.nair@kosqu.com',     '$2b$10$example'],
    ['Arjun','Mehta',    'employee', 'arjun.mehta@kosqu.com',    '$2b$10$example'],
    ['Sneha','Patil',    'employee', 'sneha.patil@kosqu.com',    '$2b$10$example'],
    ['Rahul','Joshi',    'employee', 'rahul.joshi@kosqu.com',    '$2b$10$example'],
    ['Kavya','Reddy',    'employee', 'kavya.reddy@kosqu.com',    '$2b$10$example'],
    ['Vivek','Gupta',    'employee', 'vivek.gupta@kosqu.com',    '$2b$10$example'],
    ['Pooja','Singh',    'employee', 'pooja.singh@kosqu.com',    '$2b$10$example'],
  ];

  const userIds = [ADMIN_ID, 59]; // existing
  for (const [fn, ln, pos, email, pwd] of employeeData) {
    // Check if user already exists
    const [existing] = await db.execute('SELECT id FROM users WHERE email=? AND tenant_id=?', [email, TENANT]);
    if (existing.length > 0) {
      userIds.push(existing[0].id);
      console.log(`  ↩ Existing: ${fn} ${ln} (id=${existing[0].id})`);
    } else {
      const id = await ins(
        'INSERT INTO users (tenant_id, first_name, last_name, position, email, password_hash, is_active) VALUES (?,?,?,?,?,?,1)',
        [TENANT, fn, ln, pos, email, pwd]
      );
      userIds.push(id);
      console.log(`  ✓ Created: ${fn} ${ln} (id=${id})`);
    }
  }

  // ── 2. CLIENTS ────────────────────────────────────────────────────────────
  console.log('\n🏢 Creating clients...');
  const clientData = [
    ['Godrej Industries',    'tech@godrej.com',    '+91-22-6796-1000', 'Manufacturing'],
    ['TechNova Solutions',   'contact@technova.io','', 'Information Technology'],
    ['InfraGroup Pvt Ltd',   'bd@infragroup.in',   '', 'Infrastructure'],
    ['RetailMax Corp',       'ops@retailmax.com',  '', 'Retail'],
  ];

  const clientIds = [];
  for (const [name, email, phone, industry] of clientData) {
    const [ex] = await db.execute('SELECT id FROM clients WHERE name=? AND tenant_id=?', [name, TENANT]);
    if (ex.length > 0) {
      clientIds.push(ex[0].id);
      console.log(`  ↩ Existing: ${name} (id=${ex[0].id})`);
    } else {
      const id = await ins(
        "INSERT INTO clients (tenant_id, name, contact_email, contact_phone, industry, status) VALUES (?,?,?,?,?,'active')",
        [TENANT, name, email, phone, industry]
      );
      clientIds.push(id);
      console.log(`  ✓ Created: ${name} (id=${id})`);
    }
  }

  // ── 3. PTTM CLIENT TEAMS ─────────────────────────────────────────────────
  console.log('\n👥 Creating teams...');

  // Ensure table exists
  await run(`
    CREATE TABLE IF NOT EXISTS pttm_client_teams (
      id INT NOT NULL AUTO_INCREMENT, tenant_id INT NOT NULL, client_id INT NOT NULL,
      team_name VARCHAR(200) NOT NULL, lead_id INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY idx_ct_tenant (tenant_id, client_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const teamDefs = [
    // [client_index, team_name, lead_user_index_in_userIds]
    [0, 'Backend Development',  2],  // Mohit Verma
    [1, 'Frontend Team',        3],  // Priya Nair
    [1, 'QA & Testing',         4],  // Arjun Mehta
    [2, 'DevOps & Cloud',       5],  // Sneha Patil
    [3, 'Mobile Apps',          6],  // Rahul Joshi
    [0, 'UI/UX Design',         7],  // Kavya Reddy
  ];

  const teamIds = [];
  for (const [ci, teamName, leadIdx] of teamDefs) {
    const clientId = clientIds[ci];
    const leadId   = userIds[leadIdx] || null;
    const [ex] = await db.execute('SELECT id FROM pttm_client_teams WHERE team_name=? AND client_id=? AND tenant_id=?', [teamName, clientId, TENANT]);
    if (ex.length > 0) {
      teamIds.push(ex[0].id);
      console.log(`  ↩ Existing team: ${teamName}`);
    } else {
      const id = await ins(
        'INSERT INTO pttm_client_teams (tenant_id, client_id, team_name, lead_id) VALUES (?,?,?,?)',
        [TENANT, clientId, teamName, leadId]
      );
      teamIds.push(id);
      console.log(`  ✓ Team: ${teamName} → Client[${ci}], Lead=user${leadId}`);
    }
  }

  // ── 4. TEAM MEMBERS ───────────────────────────────────────────────────────
  console.log('\n🧑‍🤝‍🧑 Adding team members...');
  await run(`
    CREATE TABLE IF NOT EXISTS pttm_team_members (
      id INT NOT NULL AUTO_INCREMENT, tenant_id INT NOT NULL, team_id INT NOT NULL, user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY uq_team_member (team_id, user_id), KEY idx_tm_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const memberAssignments = [
    [0, [2,3,4]],  // Backend team: Mohit, Priya, Arjun
    [1, [3,4,8]],  // Frontend team: Priya, Arjun, Vivek
    [2, [4,5,9]],  // QA: Arjun, Sneha, Pooja
    [3, [5,6,7]],  // DevOps: Sneha, Rahul, Kavya
    [4, [6,8,9]],  // Mobile: Rahul, Vivek, Pooja
    [5, [7,8,3]],  // UI/UX: Kavya, Vivek, Priya
  ];

  for (const [ti, memberIndices] of memberAssignments) {
    const teamId = teamIds[ti];
    for (const mi of memberIndices) {
      const userId = userIds[mi];
      if (!userId || !teamId) continue;
      await run('INSERT IGNORE INTO pttm_team_members (tenant_id, team_id, user_id) VALUES (?,?,?)', [TENANT, teamId, userId]);
    }
  }
  console.log('  ✓ Team members assigned');

  // ── 5. PROJECTS ──────────────────────────────────────────────────────────
  console.log('\n📁 Creating projects...');

  const projectDefs = [
    // [client_index, name, status, start, end, description]
    [0, 'Godrej CRM Portal',           'In Progress', '2024-09-01', '2025-03-31', 'Customer relationship management portal for Godrej sales team with lead tracking and pipeline management.'],
    [0, 'ERP Integration Module',      'Planning',    '2025-01-15', '2025-08-31', 'Integration of SAP ERP with existing warehouse management system for real-time inventory sync.'],
    [0, 'Employee Self-Service App',   'Completed',   '2024-05-01', '2024-12-15', 'Mobile-first HRMS self-service app allowing employees to manage leaves, payslips and attendance.'],
    [1, 'TechNova Website Redesign',   'In Progress', '2025-02-01', '2025-06-30', 'Complete redesign of corporate website with modern UI, CMS backend and SEO optimization.'],
    [1, 'Cloud Migration Phase 1',     'In Progress', '2024-11-01', '2025-05-31', 'Migration of on-premise servers to AWS — Phase 1: Non-critical applications and databases.'],
    [1, 'AI Chatbot Development',      'Planning',    '2025-04-01', '2025-09-30', 'NLP-based customer support chatbot integrated with existing ticketing system.'],
    [1, 'Mobile App v2.0',             'On Hold',     '2024-08-01', '2025-02-28', 'Major version upgrade of TechNova mobile app with biometric login and push notifications.'],
    [2, 'Infrastructure Monitoring',   'In Progress', '2025-01-01', '2025-07-31', 'Real-time monitoring dashboard for construction site infrastructure with IoT sensor integration.'],
    [2, 'Tender Management System',    'Planning',    '2025-03-01', '2025-10-31', 'Digital tender submission, evaluation and award management portal for government contracts.'],
    [2, 'Site Safety Compliance App',  'In Progress', '2024-12-01', '2025-06-30', 'Mobile application for site safety audits, incident reporting and compliance tracking.'],
    [2, 'Supply Chain Tracker',        'Completed',   '2024-04-01', '2024-11-30', 'End-to-end supply chain visibility platform with vendor portal and delivery tracking.'],
    [3, 'RetailMax E-Commerce 2.0',    'In Progress', '2025-01-10', '2025-08-15', 'Full replatforming of e-commerce store with headless architecture and personalised recommendations.'],
    [3, 'Loyalty Rewards Program',     'In Progress', '2025-02-15', '2025-06-30', 'Customer loyalty program with points engine, redemption portal and partner integrations.'],
    [3, 'Inventory Dashboard',         'Completed',   '2024-06-01', '2024-10-31', 'Real-time inventory management dashboard with automated reorder triggers and supplier API.'],
    [3, 'POS System Upgrade',          'On Going',    '2025-03-01', '2025-07-31', 'Upgrade of point-of-sale systems across 50 retail stores with offline capability.'],
    [1, 'Data Analytics Platform',     'Planning',    '2025-05-01', '2025-12-31', 'Centralised BI platform with self-service dashboards, scheduled reports and anomaly detection.'],
    [0, 'Document Management System',  'On Hold',     '2024-10-01', '2025-04-30', 'Enterprise DMS with version control, OCR search and digital signature workflows.'],
    [3, 'Customer Support Portal',     'In Progress', '2025-02-01', '2025-07-31', 'Multi-channel support portal with live chat, ticket management and SLA tracking.'],
  ];

  const projectIds = [];
  for (const [ci, name, status, start, end, desc] of projectDefs) {
    const clientId = clientIds[ci];
    const [ex] = await db.execute('SELECT id FROM projects WHERE name=? AND tenant_id=?', [name, TENANT]);
    if (ex.length > 0) {
      projectIds.push(ex[0].id);
      console.log(`  ↩ Existing: ${name}`);
    } else {
      const id = await ins(
        'INSERT INTO projects (tenant_id, client_id, name, description, start_date, end_date, status) VALUES (?,?,?,?,?,?,?)',
        [TENANT, clientId, name, desc, start, end, status]
      );
      projectIds.push(id);
      console.log(`  ✓ Project: ${name} [${status}]`);
    }
  }

  // ── 6. TASKS ─────────────────────────────────────────────────────────────
  console.log('\n✅ Creating tasks...');

  // Ensure pttm_tasks table column exists check
  const [cols] = await db.execute("SHOW COLUMNS FROM pttm_tasks LIKE 'priority'");
  if (cols.length === 0) {
    await run("ALTER TABLE pttm_tasks ADD COLUMN priority ENUM('low','medium','high','critical') DEFAULT 'medium'");
    await run("ALTER TABLE pttm_tasks ADD COLUMN due_date DATE NULL");
    await run("ALTER TABLE pttm_tasks ADD COLUMN kanban_status ENUM('backlog','todo','in_progress','review','testing','done') DEFAULT 'backlog'");
  }

  const today = new Date().toISOString().split('T')[0];
  const past  = (d) => { const dt=new Date(); dt.setDate(dt.getDate()-d); return dt.toISOString().split('T')[0]; };
  const future= (d) => { const dt=new Date(); dt.setDate(dt.getDate()+d); return dt.toISOString().split('T')[0]; };

  // status ENUM: 'Pending','In Progress','Completed','Not Started','On Going'
  // Map Planning → Pending, On Hold tasks → Pending
  const S = { C:'Completed', I:'In Progress', P:'Pending', O:'On Going' };

  // Tasks per project: [task_title, status, priority, kanban_status, due_date, assigned_user_index]
  const taskSets = {
    0:  [ // Godrej CRM Portal
      ['Requirements gathering & BRD', S.C, 'high',     'done',        past(60),   2],
      ['Database schema design',        S.C, 'high',     'done',        past(45),   3],
      ['User authentication module',    S.C, 'medium',   'done',        past(30),   2],
      ['Lead management CRUD',          S.I, 'high',     'in_progress', future(7),  3],
      ['Pipeline analytics dashboard',  S.I, 'critical', 'in_progress', past(3),    4],
      ['Email notification system',     S.I, 'medium',   'in_progress', future(14), 2],
      ['Client portal UI',              S.P, 'medium',   'todo',        future(21), 7],
      ['API integration testing',       S.P, 'high',     'backlog',     future(28), 5],
      ['Mobile responsive design',      S.P, 'low',      'backlog',     future(35), 7],
      ['UAT & deployment',              S.P, 'high',     'backlog',     future(45), 2],
    ],
    1:  [ // ERP Integration
      ['Vendor evaluation',             S.C, 'medium',   'done',        past(20),   5],
      ['API mapping document',          S.I, 'high',     'in_progress', past(5),    2],
      ['SAP connector development',     S.P, 'critical', 'todo',        future(10), 3],
      ['Data migration scripts',        S.P, 'high',     'backlog',     future(30), 4],
      ['Integration testing',           S.P, 'medium',   'backlog',     future(45), 5],
    ],
    2:  [ // Employee Self-Service App
      ['UI/UX Design',                  S.C, 'medium',   'done',        past(180),  7],
      ['Leave module',                  S.C, 'high',     'done',        past(150),  2],
      ['Payslip generation',            S.C, 'high',     'done',        past(120),  3],
      ['Attendance integration',        S.C, 'medium',   'done',        past(90),   4],
      ['Testing & QA',                  S.C, 'medium',   'done',        past(60),   5],
      ['Production deployment',         S.C, 'high',     'done',        past(30),   2],
    ],
    3:  [ // TechNova Website Redesign
      ['Wireframes & mockups',          S.C, 'high',     'done',        past(30),   7],
      ['Homepage development',          S.C, 'medium',   'done',        past(15),   3],
      ['CMS backend setup',             S.I, 'high',     'in_progress', future(5),  2],
      ['Blog & news module',            S.I, 'medium',   'in_progress', future(12), 3],
      ['SEO optimisation',              S.P, 'medium',   'todo',        future(20), 8],
      ['Performance audit',             S.P, 'high',     'backlog',     past(2),    4],
      ['Browser testing',               S.P, 'low',      'backlog',     future(30), 5],
      ['Go-live & DNS',                 S.P, 'critical', 'backlog',     future(40), 2],
    ],
    4:  [ // Cloud Migration Phase 1
      ['Inventory audit',               S.C, 'high',     'done',        past(40),   5],
      ['AWS account setup',             S.C, 'medium',   'done',        past(30),   5],
      ['Network configuration',         S.I, 'high',     'review',      past(7),    5],
      ['Database migration',            S.I, 'critical', 'in_progress', past(1),    2],
      ['Application migration',         S.P, 'high',     'todo',        future(14), 3],
      ['Load testing',                  S.P, 'medium',   'backlog',     future(25), 4],
      ['Security audit',                S.P, 'high',     'backlog',     future(35), 5],
      ['Cutover plan',                  S.P, 'medium',   'backlog',     future(45), 2],
    ],
    5:  [ // AI Chatbot
      ['NLP model selection',           S.P, 'high',     'todo',        future(15), 2],
      ['Training data collection',      S.P, 'medium',   'backlog',     future(30), 3],
      ['Chatbot API development',       S.P, 'high',     'backlog',     future(50), 4],
      ['UI widget design',              S.P, 'low',      'backlog',     future(60), 7],
    ],
    6:  [ // Mobile App v2.0
      ['App architecture redesign',     S.C, 'high',     'done',        past(60),   2],
      ['Biometric login module',        S.I, 'high',     'in_progress', past(20),   3],
      ['Push notifications',            S.I, 'medium',   'in_progress', past(10),   4],
      ['Beta testing',                  S.P, 'medium',   'backlog',     future(30), 5],
    ],
    7:  [ // Infrastructure Monitoring
      ['Sensor data schema',            S.C, 'high',     'done',        past(25),   5],
      ['IoT gateway setup',             S.C, 'medium',   'done',        past(15),   5],
      ['Real-time dashboard UI',        S.I, 'high',     'in_progress', future(8),  7],
      ['Alert system',                  S.I, 'critical', 'review',      past(4),    2],
      ['Mobile app for foremen',        S.P, 'medium',   'todo',        future(20), 6],
      ['Reporting module',              S.P, 'low',      'backlog',     future(35), 3],
    ],
    8:  [ // Tender Management
      ['Stakeholder interviews',        S.P, 'high',     'todo',        future(10), 2],
      ['Workflow design',               S.P, 'medium',   'backlog',     future(25), 3],
      ['Portal development',            S.P, 'high',     'backlog',     future(60), 4],
      ['Document upload module',        S.P, 'medium',   'backlog',     future(75), 7],
    ],
    9:  [ // Site Safety App
      ['Safety checklist design',       S.C, 'high',     'done',        past(30),   5],
      ['Incident report module',        S.C, 'high',     'done',        past(20),   4],
      ['GPS tracking integration',      S.I, 'high',     'in_progress', future(5),  2],
      ['Offline sync capability',       S.I, 'critical', 'in_progress', past(6),    3],
      ['Dashboard for safety mgr',      S.P, 'medium',   'todo',        future(20), 7],
    ],
    10: [ // Supply Chain Tracker
      ['Vendor onboarding module',      S.C, 'high',     'done',        past(120),  2],
      ['Delivery tracking API',         S.C, 'high',     'done',        past(90),   3],
      ['Supplier portal',               S.C, 'medium',   'done',        past(60),   4],
      ['Analytics dashboard',           S.C, 'medium',   'done',        past(30),   7],
    ],
    11: [ // RetailMax E-Commerce 2.0
      ['Headless CMS setup',            S.C, 'high',     'done',        past(20),   3],
      ['Product catalogue migration',   S.I, 'high',     'in_progress', future(5),  4],
      ['Payment gateway integration',   S.I, 'critical', 'in_progress', past(3),    2],
      ['Recommendation engine',         S.P, 'high',     'todo',        future(15), 8],
      ['Performance optimisation',      S.P, 'medium',   'backlog',     future(25), 3],
      ['SEO & metadata migration',      S.P, 'medium',   'backlog',     future(35), 7],
      ['UAT with business team',        S.P, 'high',     'backlog',     future(45), 5],
    ],
    12: [ // Loyalty Rewards
      ['Points engine design',          S.C, 'high',     'done',        past(15),   2],
      ['Customer portal UI',            S.I, 'high',     'in_progress', future(8),  3],
      ['Partner API integration',       S.I, 'critical', 'review',      past(5),    4],
      ['Redemption workflow',           S.P, 'medium',   'todo',        future(18), 7],
      ['Admin dashboard',               S.P, 'medium',   'backlog',     future(30), 8],
    ],
    13: [ // Inventory Dashboard
      ['Warehouse data integration',    S.C, 'high',     'done',        past(90),   2],
      ['Real-time UI',                  S.C, 'high',     'done',        past(70),   3],
      ['Automated reorder alerts',      S.C, 'medium',   'done',        past(50),   4],
      ['Supplier API integration',      S.C, 'medium',   'done',        past(30),   5],
    ],
    14: [ // POS System Upgrade
      ['POS software evaluation',       S.C, 'high',     'done',        past(25),   2],
      ['Hardware procurement',          S.C, 'medium',   'done',        past(15),   5],
      ['Software installation rollout', S.I, 'high',     'in_progress', future(10), 3],
      ['Staff training programme',      S.I, 'high',     'in_progress', past(8),    4],
      ['Offline mode testing',          S.P, 'high',     'todo',        future(20), 5],
      ['50-store rollout completion',   S.P, 'medium',   'backlog',     future(35), 2],
    ],
    15: [ // Data Analytics Platform
      ['Requirements workshop',         S.P, 'medium',   'todo',        future(10), 2],
      ['Data warehouse design',         S.P, 'high',     'backlog',     future(25), 3],
      ['ETL pipeline',                  S.P, 'high',     'backlog',     future(50), 4],
      ['Dashboard templates',           S.P, 'medium',   'backlog',     future(70), 7],
    ],
    16: [ // Document Management
      ['DMS vendor shortlist',          S.C, 'medium',   'done',        past(50),   2],
      ['OCR integration POC',           S.I, 'high',     'in_progress', past(15),   3],
      ['Version control module',        S.P, 'medium',   'backlog',     future(20), 4],
    ],
    17: [ // Customer Support Portal
      ['Support flow mapping',          S.C, 'high',     'done',        past(20),   2],
      ['Live chat integration',         S.I, 'high',     'in_progress', future(6),  3],
      ['Ticket management system',      S.I, 'critical', 'review',      past(2),    4],
      ['SLA tracking module',           S.P, 'high',     'todo',        future(12), 5],
      ['Customer satisfaction survey',  S.P, 'medium',   'backlog',     future(25), 7],
    ],
  };

  let taskCount = 0;
  // Delete any existing demo tasks first to avoid partial duplicates
  for (const pId of projectIds) {
    if (pId) await run('DELETE FROM pttm_tasks WHERE project_id=? AND tenant_id=?', [pId, TENANT]);
  }

  for (const [pIdx, taskList] of Object.entries(taskSets)) {
    const projectId = projectIds[parseInt(pIdx)];
    if (!projectId) continue;
    for (const [title, status, priority, kanban, dueDate, uIdx] of taskList) {
      const assigned = userIds[uIdx] || ADMIN_ID;
      const uuid = randomUUID();
      await run(
        `INSERT INTO pttm_tasks (id, tenant_id, project_id, assigned_user_id, team_leader_id, date, task_title, status, priority, kanban_status, due_date, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,0)`,
        [uuid, TENANT, projectId, assigned, ADMIN_ID, today, title, status, priority, kanban, dueDate]
      );
      taskCount++;
    }
  }
  console.log(`  ✓ ${taskCount} tasks created`);

  // ── 7. PROJECT DOCS ───────────────────────────────────────────────────────
  console.log('\n📄 Creating project documents...');

  await run(`
    CREATE TABLE IF NOT EXISTS pttm_project_docs (
      id INT NOT NULL AUTO_INCREMENT, tenant_id INT NOT NULL, project_id INT NOT NULL,
      title VARCHAR(300) NOT NULL, doc_type VARCHAR(100) DEFAULT 'Other',
      file_path VARCHAR(500) NULL, url VARCHAR(1000) NULL, uploaded_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), KEY idx_pdocs (tenant_id, project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // doc_type ENUM: 'PRD','Design','SOW','Meeting Notes','Other'
  const docDefs = [
    [0,  'BRD - Godrej CRM Portal v1.2',           'PRD',          'https://docs.google.com/document/d/godrej-brd'],
    [0,  'SRS - Godrej CRM Portal v2.0',           'PRD',          'https://docs.google.com/document/d/godrej-srs'],
    [0,  'UI Wireframes - CRM',                     'Design',       'https://figma.com/godrej-crm-wireframes'],
    [1,  'ERP Integration Architecture Diagram',    'SOW',          'https://confluence.internal/erp-arch'],
    [3,  'Website Redesign Mockups',                'Design',       'https://figma.com/technova-redesign'],
    [3,  'Website Content Strategy Document',       'PRD',          'https://docs.google.com/technova-content'],
    [4,  'AWS Migration Runbook',                   'SOW',          'https://confluence.internal/aws-runbook'],
    [4,  'Network Security Policy',                 'Other',        null],
    [7,  'IoT Sensor Technical Specification',      'PRD',          'https://docs.infragroup.io/iot-spec'],
    [9,  'Safety Checklist Master Template',        'Other',        'https://docs.infragroup.io/safety-checklist'],
    [11, 'E-Commerce 2.0 Product Roadmap',          'PRD',          'https://notion.so/retailmax-roadmap'],
    [11, 'Headless CMS Architecture Design',        'Design',       'https://confluence.retailmax.com/cms-arch'],
    [12, 'Loyalty Programme Business Rules',        'PRD',          'https://docs.retailmax.com/loyalty-rules'],
    [17, 'Support Portal SoW & Scope',              'SOW',          'https://docs.retailmax.com/support-sow'],
    [5,  'AI Chatbot Requirements Meeting Notes',   'Meeting Notes','https://meet.google.com/notes/chatbot-kickoff'],
    [8,  'Tender Management SOW',                   'SOW',          'https://docs.infragroup.io/tender-sow'],
  ];

  for (const [pIdx, title, docType, url] of docDefs) {
    const projectId = projectIds[pIdx];
    if (!projectId) continue;
    await run(
      'INSERT INTO pttm_project_docs (tenant_id, project_id, title, doc_type, url, uploaded_by) VALUES (?,?,?,?,?,?)',
      [TENANT, projectId, title, docType, url || null, ADMIN_ID]
    );
  }
  console.log(`  ✓ ${docDefs.length} documents created`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────');
  const [[{u}]] = await db.execute('SELECT COUNT(*) as u FROM users WHERE tenant_id=?', [TENANT]);
  const [[{c}]] = await db.execute('SELECT COUNT(*) as c FROM clients WHERE tenant_id=?', [TENANT]);
  const [[{p}]] = await db.execute('SELECT COUNT(*) as p FROM projects WHERE tenant_id=?', [TENANT]);
  const [[{t}]] = await db.execute('SELECT COUNT(*) as t FROM pttm_tasks WHERE tenant_id=?', [TENANT]);
  const [[{d}]] = await db.execute('SELECT COUNT(*) as d FROM pttm_project_docs WHERE tenant_id=?', [TENANT]);
  const [[{tm}]] = await db.execute('SELECT COUNT(*) as tm FROM pttm_client_teams WHERE tenant_id=?', [TENANT]);

  console.log(`✅ Seed complete!`);
  console.log(`   Users:    ${u}`);
  console.log(`   Clients:  ${c}`);
  console.log(`   Teams:    ${tm}`);
  console.log(`   Projects: ${p}`);
  console.log(`   Tasks:    ${t}`);
  console.log(`   Docs:     ${d}`);
  console.log('─────────────────────────────────────────────────────\n');

  await db.end();
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
