// backend/src/features/pttm/pttmModel.js

const { query } = require('../../config/db');
const { randomUUID } = require('crypto');
const seedData = require('./seedData');
const { ensureCrmSchema } = require('../services/crmSchema');
const { ensureProjectSchema } = require('../projects/projectSchema');
const {
  addForeignKeyIfMissing,
  columnExists,
  dropForeignKeysForColumn,
  modifyColumnIfExists,
  tableExists,
} = require('../../utils/schemaHelpers');

const pttmStatuses = new Set(['In Progress', 'Planning', 'Completed', 'On Going', 'On Hold']);

function legacyMemberEmail(legacyId) {
  const safeId = String(legacyId).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `pttm.${safeId || Date.now()}@local.invalid`;
}

function normalizeProjectStatus(status) {
  if (!status) return 'In Progress';
  return pttmStatuses.has(status) ? status : String(status);
}

function toStringId(value) {
  return value === null || value === undefined ? null : String(value);
}

function shapeProject(row) {
  return { ...row, id: toStringId(row.id), client_id: toStringId(row.client_id) };
}

function shapeMember(row) {
  return { ...row, id: toStringId(row.id) };
}

function shapeTeam(row) {
  return { ...row, id: toStringId(row.id), project_id: toStringId(row.project_id) };
}

function shapePhase(row) {
  return { ...row, id: toStringId(row.id), project_id: toStringId(row.project_id) };
}

async function findOrCreateProject(tenantId, project) {
  const name = String(project.name || 'Unnamed Project').trim();
  const existing = await query(
    `SELECT id FROM projects
     WHERE tenant_id = ? AND LOWER(name) = LOWER(?)
     ORDER BY id ASC
     LIMIT 1`,
    [tenantId, name]
  );
  if (existing.length > 0) return existing[0].id;

  const result = await query(
    `INSERT INTO projects (tenant_id, client_id, name, description, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      project.client_id || project.clientId || null,
      name,
      project.description || null,
      project.start_date || project.startDate || null,
      project.end_date || project.endDate || null,
      normalizeProjectStatus(project.status),
    ]
  );
  return result.insertId;
}

async function findExistingEmployeeUser(tenantId, member) {
  const name = String(member.name || '').trim();
  const email = member.email || null;
  if (email) {
    const byEmail = await query(
      `SELECT u.id
       FROM users u
       JOIN employee_details ed ON ed.employee_id = u.id AND ed.tenant_id = u.tenant_id
       WHERE u.tenant_id = ? AND LOWER(u.email) = LOWER(?)
       LIMIT 1`,
      [tenantId, email]
    );
    if (byEmail.length > 0) return byEmail[0].id;
  }

  if (name) {
    const byName = await query(
      `SELECT u.id
       FROM users u
       JOIN employee_details ed ON ed.employee_id = u.id AND ed.tenant_id = u.tenant_id
       WHERE u.tenant_id = ?
         AND LOWER(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) = LOWER(?)
       LIMIT 1`,
      [tenantId, name]
    );
    if (byName.length > 0) return byName[0].id;
  }

  return null;
}

async function migrateLegacyProjects() {
  if (!(await tableExists('pttm_projects'))) return;

  const legacyRows = await query('SELECT * FROM pttm_projects');
  if (legacyRows.length === 0) return;

  for (const tableName of ['pttm_teams', 'pttm_phases', 'pttm_tasks', 'pttm_docflow_entries']) {
    if (await tableExists(tableName)) {
      await dropForeignKeysForColumn(tableName, 'project_id');
    }
  }

  const idMap = new Map();
  for (const row of legacyRows) {
    const projectId = await findOrCreateProject(row.tenant_id || 1, row);
    idMap.set(String(row.id), projectId);
  }

  for (const [legacyId, projectId] of idMap.entries()) {
    for (const tableName of ['pttm_teams', 'pttm_phases', 'pttm_tasks', 'pttm_docflow_entries']) {
      if (await tableExists(tableName) && await columnExists(tableName, 'project_id')) {
        await query(`UPDATE \`${tableName}\` SET project_id = ? WHERE CAST(project_id AS CHAR) = ?`, [projectId, legacyId]);
      }
    }
  }
}

async function migrateLegacyUsers() {
  if (!(await tableExists('pttm_users'))) return;

  const legacyRows = await query('SELECT * FROM pttm_users');
  if (legacyRows.length === 0 || !(await tableExists('pttm_tasks'))) return;

  await dropForeignKeysForColumn('pttm_tasks', 'assigned_user_id');
  if (await columnExists('pttm_tasks', 'team_leader_id')) {
    await dropForeignKeysForColumn('pttm_tasks', 'team_leader_id');
  }

  const idMap = new Map();
  for (const row of legacyRows) {
    const email = legacyMemberEmail(row.id);
    const userId = await findExistingEmployeeUser(row.tenant_id || 1, { name: row.name, email });
    idMap.set(String(row.id), userId || null);
  }

  for (const [legacyId, userId] of idMap.entries()) {
    await query('UPDATE pttm_tasks SET assigned_user_id = ? WHERE CAST(assigned_user_id AS CHAR) = ?', [userId || null, legacyId]);
    if (await columnExists('pttm_tasks', 'team_leader_id')) {
      await query('UPDATE pttm_tasks SET team_leader_id = ? WHERE CAST(team_leader_id AS CHAR) = ?', [userId || null, legacyId]);
    }
  }
}

async function normalizePttmColumns() {
  for (const tableName of ['pttm_teams', 'pttm_phases', 'pttm_tasks']) {
    if (await tableExists(tableName) && await columnExists(tableName, 'project_id')) {
      await query(`UPDATE \`${tableName}\` SET project_id = NULL WHERE project_id IS NOT NULL AND project_id NOT REGEXP '^[0-9]+$'`);
    }
  }

  if (await tableExists('pttm_docflow_entries') && await columnExists('pttm_docflow_entries', 'project_id')) {
    await query("DELETE FROM pttm_docflow_entries WHERE project_id IS NOT NULL AND project_id NOT REGEXP '^[0-9]+$'");
  }

  if (await tableExists('pttm_tasks')) {
    await query("UPDATE pttm_tasks SET assigned_user_id = NULL WHERE assigned_user_id IS NOT NULL AND assigned_user_id NOT REGEXP '^[0-9]+$'");
    if (await columnExists('pttm_tasks', 'team_leader_id')) {
      await query("UPDATE pttm_tasks SET team_leader_id = NULL WHERE team_leader_id IS NOT NULL AND team_leader_id NOT REGEXP '^[0-9]+$'");
    }
  }

  for (const tableName of ['pttm_teams', 'pttm_phases', 'pttm_tasks']) {
    if (await tableExists(tableName) && await columnExists(tableName, 'project_id')) {
      await modifyColumnIfExists(tableName, 'project_id', 'project_id INT NULL');
    }
  }

  if (await tableExists('pttm_docflow_entries') && await columnExists('pttm_docflow_entries', 'project_id')) {
    await modifyColumnIfExists('pttm_docflow_entries', 'project_id', 'project_id INT NOT NULL');
  }

  if (await tableExists('pttm_tasks')) {
    await modifyColumnIfExists('pttm_tasks', 'assigned_user_id', 'assigned_user_id INT NULL');
    if (await columnExists('pttm_tasks', 'team_leader_id')) {
      await modifyColumnIfExists('pttm_tasks', 'team_leader_id', 'team_leader_id INT NULL');
    }
  }
}

async function ensurePttmForeignKeys() {
  await addForeignKeyIfMissing(
    'pttm_teams',
    'fk_pttm_teams_project',
    'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE'
  );
  await addForeignKeyIfMissing(
    'pttm_phases',
    'fk_pttm_phases_project',
    'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE'
  );
  await addForeignKeyIfMissing(
    'pttm_tasks',
    'fk_pttm_tasks_project',
    'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE'
  );
  await addForeignKeyIfMissing(
    'pttm_tasks',
    'fk_pttm_tasks_user',
    'FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE'
  );
  await addForeignKeyIfMissing(
    'pttm_tasks',
    'fk_pttm_tasks_leader',
    'FOREIGN KEY (team_leader_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE'
  );
  await addForeignKeyIfMissing(
    'pttm_docflow_entries',
    'fk_pttm_docflow_project',
    'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE'
  );
}

const pttmModel = {
  async ensureSchema() {
    console.log('[PTTM] Checking and initializing database tables...');

    await ensureCrmSchema();
    await ensureProjectSchema();
    await migrateLegacyProjects();
    await migrateLegacyUsers();

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_teams (
        id CHAR(36) NOT NULL,
        tenant_id INT DEFAULT 1,
        name VARCHAR(255) NOT NULL,
        project_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_teams_tenant (tenant_id),
        INDEX idx_pttm_teams_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_phases (
        id CHAR(36) NOT NULL,
        tenant_id INT DEFAULT 1,
        name VARCHAR(255) NOT NULL,
        project_id INT DEFAULT NULL,
        order_num INT DEFAULT 1,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_phases_tenant (tenant_id),
        INDEX idx_pttm_phases_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_tasks (
        id CHAR(36) NOT NULL,
        tenant_id INT DEFAULT 1,
        project_id INT DEFAULT NULL,
        phase_id CHAR(36) DEFAULT NULL,
        team_id CHAR(36) DEFAULT NULL,
        assigned_user_id INT DEFAULT NULL,
        team_leader_id INT DEFAULT NULL,
        date VARCHAR(20) DEFAULT NULL,
        task_title VARCHAR(500) DEFAULT NULL,
        description TEXT,
        status ENUM('Pending', 'In Progress', 'Completed', 'Not Started', 'On Going') DEFAULT 'Pending',
        remarks TEXT,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_tasks_tenant (tenant_id),
        INDEX idx_pttm_tasks_project (project_id),
        INDEX idx_pttm_tasks_assigned_user (assigned_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (!(await columnExists('pttm_tasks', 'team_leader_id'))) {
      await query('ALTER TABLE pttm_tasks ADD COLUMN team_leader_id INT DEFAULT NULL AFTER assigned_user_id');
    }

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_docflow_entries (
        id CHAR(36) NOT NULL,
        tenant_id INT DEFAULT 1,
        project_id INT NOT NULL,
        phase_num INT NOT NULL,
        status ENUM('Not Started', 'In Progress', 'Waiting for Client', 'Completed') DEFAULT 'Not Started',
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pttm_proj_phase (project_id, phase_num),
        INDEX idx_pttm_docflow_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_docflow_files (
        id CHAR(36) NOT NULL,
        tenant_id INT DEFAULT 1,
        docflow_entry_id CHAR(36) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_data LONGTEXT NOT NULL,
        file_size INT DEFAULT 0,
        upload_date VARCHAR(20) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_files_tenant (tenant_id),
        CONSTRAINT fk_pttm_files_entry FOREIGN KEY (docflow_entry_id) REFERENCES pttm_docflow_entries(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── Enterprise v3 tables ────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS pttm_sprints (
        id INT NOT NULL AUTO_INCREMENT,
        tenant_id INT DEFAULT 1,
        project_id INT DEFAULT NULL,
        name VARCHAR(255) NOT NULL,
        goal TEXT,
        start_date DATE NULL,
        end_date DATE NULL,
        status ENUM('planning','active','completed','cancelled') DEFAULT 'planning',
        velocity INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_sprints_tenant (tenant_id),
        INDEX idx_pttm_sprints_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_milestones (
        id INT NOT NULL AUTO_INCREMENT,
        tenant_id INT DEFAULT 1,
        project_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE NULL,
        completion_pct INT DEFAULT 0,
        status ENUM('pending','in_progress','completed','overdue') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_milestones_tenant (tenant_id),
        INDEX idx_pttm_milestones_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_work_reports (
        id INT NOT NULL AUTO_INCREMENT,
        tenant_id INT DEFAULT 1,
        project_id INT DEFAULT NULL,
        user_id INT NOT NULL,
        report_date DATE NOT NULL,
        tasks_done TEXT,
        hours_worked DECIMAL(4,2) DEFAULT 0,
        progress_pct INT DEFAULT 0,
        challenges TEXT,
        blockers TEXT,
        tomorrow_plan TEXT,
        status ENUM('draft','submitted','reviewed') DEFAULT 'draft',
        reviewer_notes TEXT,
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_wr_tenant (tenant_id),
        INDEX idx_pttm_wr_project (project_id),
        INDEX idx_pttm_wr_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_risks (
        id INT NOT NULL AUTO_INCREMENT,
        tenant_id INT DEFAULT 1,
        project_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        impact ENUM('low','medium','high','critical') DEFAULT 'medium',
        probability ENUM('low','medium','high') DEFAULT 'medium',
        status ENUM('open','mitigated','closed') DEFAULT 'open',
        mitigation_plan TEXT,
        owner_id INT NULL,
        created_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_risks_tenant (tenant_id),
        INDEX idx_pttm_risks_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pttm_task_comments (
        id INT NOT NULL AUTO_INCREMENT,
        tenant_id INT DEFAULT 1,
        task_id CHAR(36) NOT NULL,
        user_id INT NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_pttm_comments_tenant (tenant_id),
        INDEX idx_pttm_comments_task (task_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Enterprise columns on pttm_tasks
    if (!(await columnExists('pttm_tasks', 'priority'))) {
      await query("ALTER TABLE pttm_tasks ADD COLUMN priority ENUM('low','medium','high','critical') DEFAULT 'medium' AFTER status");
    }
    if (!(await columnExists('pttm_tasks', 'due_date'))) {
      await query('ALTER TABLE pttm_tasks ADD COLUMN due_date DATE NULL AFTER priority');
    }
    if (!(await columnExists('pttm_tasks', 'estimated_hours'))) {
      await query('ALTER TABLE pttm_tasks ADD COLUMN estimated_hours DECIMAL(6,2) DEFAULT 0 AFTER due_date');
    }
    if (!(await columnExists('pttm_tasks', 'actual_hours'))) {
      await query('ALTER TABLE pttm_tasks ADD COLUMN actual_hours DECIMAL(6,2) DEFAULT 0 AFTER estimated_hours');
    }
    if (!(await columnExists('pttm_tasks', 'kanban_status'))) {
      await query("ALTER TABLE pttm_tasks ADD COLUMN kanban_status ENUM('backlog','todo','in_progress','review','testing','done') DEFAULT 'backlog' AFTER actual_hours");
    }
    if (!(await columnExists('pttm_tasks', 'sprint_id'))) {
      await query('ALTER TABLE pttm_tasks ADD COLUMN sprint_id INT NULL AFTER kanban_status');
    }

    // Project GitHub / repo metadata
    if (!(await columnExists('projects', 'repo_url'))) {
      await query('ALTER TABLE projects ADD COLUMN repo_url VARCHAR(512) NULL');
    }
    if (!(await columnExists('projects', 'github_url'))) {
      await query('ALTER TABLE projects ADD COLUMN github_url VARCHAR(512) NULL');
    }

    await normalizePttmColumns();
    await ensurePttmForeignKeys();

    console.log('[PTTM] All database tables checked/created successfully.');
  },

  async seedDatabase(tenantId) {
    await query('DELETE FROM pttm_docflow_files WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM pttm_docflow_entries WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM pttm_tasks WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM pttm_teams WHERE tenant_id = ?', [tenantId]);
    await query('DELETE FROM pttm_phases WHERE tenant_id = ?', [tenantId]);

    const pids = {};
    const tids = {};
    const uids = {};
    const phids = {};

    for (const p of seedData.projects) {
      pids[p.key] = await findOrCreateProject(tenantId, p);
    }

    for (const u of seedData.users) {
      uids[u.key] = await findExistingEmployeeUser(tenantId, u);
    }

    for (const t of seedData.teams) {
      tids[t.key] = randomUUID();
      await query(
        'INSERT INTO pttm_teams (id, tenant_id, name, project_id) VALUES (?, ?, ?, ?)',
        [tids[t.key], tenantId, t.name, pids[t.project]]
      );
    }

    for (const ph of seedData.phases) {
      phids[ph.key] = randomUUID();
      await query(
        `INSERT INTO pttm_phases (id, tenant_id, name, project_id, order_num, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [phids[ph.key], tenantId, ph.name, pids[ph.project], ph.order_num, ph.description]
      );
    }

    let sortOrder = 1;
    for (const task of seedData.tasks) {
      await query(
        `INSERT INTO pttm_tasks
         (id, tenant_id, project_id, phase_id, team_id, assigned_user_id, team_leader_id, date, task_title, description, status, remarks, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          tenantId,
          pids[task.project] || null,
          null,
          tids[task.team] || null,
          uids[task.user] || null,
          null,
          task.date,
          task.task_title,
          task.description,
          task.status,
          task.remarks,
          sortOrder++,
        ]
      );
    }

    return {
      projects: seedData.projects.length,
      users: Object.values(uids).filter(Boolean).length,
      teams: seedData.teams.length,
      phases: seedData.phases.length,
      tasks: seedData.tasks.length,
    };
  },

  async getProjects(tenantId) {
    const rows = await query(
      `SELECT p.*
       FROM projects p
       WHERE p.tenant_id = ?
       ORDER BY p.name ASC`,
      [tenantId]
    );
    return rows.map(shapeProject);
  },

  async getProjectById(id, tenantId) {
    const rows = await query('SELECT * FROM projects WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return rows[0] ? shapeProject(rows[0]) : null;
  },

  async createProject(project, tenantId) {
    const id = await findOrCreateProject(tenantId, project);
    return this.getProjectById(id, tenantId);
  },

  async deleteProject(id, tenantId) {
    await query('DELETE FROM projects WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return true;
  },

  async getUsers(tenantId) {
    const rows = await query(
      `SELECT u.id,
              u.tenant_id,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name,
              COALESCE(ed.position, u.position, 'Employee') AS role,
              u.email,
              u.profile_photo,
              CONCAT('EMP', LPAD(u.id, 5, '0')) AS employee_code,
              COALESCE(d.name, 'General') AS department,
              u.created_at
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       LEFT JOIN departments d ON d.id = ed.department_id AND d.tenant_id = ed.tenant_id
       WHERE u.tenant_id = ? AND u.is_active = 1 AND ed.status = 'active'
       ORDER BY u.first_name, u.last_name`,
      [tenantId]
    );
    return rows.map(shapeMember);
  },

  async getUserById(id, tenantId) {
    const rows = await query(
      `SELECT u.id,
              u.tenant_id,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name,
              COALESCE(ed.position, u.position, 'Developer') AS role,
              u.email,
              u.created_at
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       WHERE u.id = ? AND u.tenant_id = ?`,
      [id, tenantId]
    );
    return rows[0] ? shapeMember(rows[0]) : null;
  },

  async getTeams(tenantId) {
    const rows = await query('SELECT * FROM pttm_teams WHERE tenant_id = ? ORDER BY name ASC', [tenantId]);
    return rows.map(shapeTeam);
  },

  async getTeamById(id, tenantId) {
    const rows = await query('SELECT * FROM pttm_teams WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return rows[0] ? shapeTeam(rows[0]) : null;
  },

  async createTeam(team, tenantId) {
    const id = randomUUID();
    await query(
      'INSERT INTO pttm_teams (id, tenant_id, name, project_id) VALUES (?, ?, ?, ?)',
      [id, tenantId, team.name, team.project_id || null]
    );
    return this.getTeamById(id, tenantId);
  },

  async deleteTeam(id, tenantId) {
    await query('DELETE FROM pttm_teams WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return true;
  },

  async getPhases(tenantId) {
    const rows = await query('SELECT * FROM pttm_phases WHERE tenant_id = ? ORDER BY order_num ASC', [tenantId]);
    return rows.map(shapePhase);
  },

  async getPhaseById(id, tenantId) {
    const rows = await query('SELECT * FROM pttm_phases WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return rows[0] ? shapePhase(rows[0]) : null;
  },

  async createPhase(phase, tenantId) {
    const id = randomUUID();
    await query(
      `INSERT INTO pttm_phases (id, tenant_id, name, project_id, order_num, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tenantId, phase.name, phase.project_id || null, phase.order_num || 1, phase.description || null]
    );
    return this.getPhaseById(id, tenantId);
  },

  async deletePhase(id, tenantId) {
    await query('DELETE FROM pttm_phases WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return true;
  },

  async reindexTasks(tenantId) {
    const rows = await query(
      'SELECT id FROM pttm_tasks WHERE tenant_id = ? ORDER BY sort_order ASC, created_at ASC',
      [tenantId]
    );
    for (let i = 0; i < rows.length; i++) {
      await query('UPDATE pttm_tasks SET sort_order = ? WHERE id = ?', [i + 1, rows[i].id]);
    }
  },

  async getTasks(tenantId, filters = {}) {
    let sql = `
      SELECT t.*,
             p.name AS project_name,
             ph.name AS phase_name, ph.order_num AS phase_order_num,
             tm.name AS team_name,
             TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS assigned_user_name,
             COALESCE(eu.position, u.position, 'Developer') AS assigned_user_role,
             TRIM(CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, ''))) AS team_leader_name,
             COALESCE(el.position, l.position, 'Developer') AS team_leader_role
      FROM pttm_tasks t
      LEFT JOIN projects p ON t.project_id = p.id AND p.tenant_id = t.tenant_id
      LEFT JOIN pttm_phases ph ON t.phase_id = ph.id AND ph.tenant_id = t.tenant_id
      LEFT JOIN pttm_teams tm ON t.team_id = tm.id AND tm.tenant_id = t.tenant_id
      LEFT JOIN users u ON t.assigned_user_id = u.id AND u.tenant_id = t.tenant_id
      LEFT JOIN employee_details eu ON eu.employee_id = u.id AND eu.tenant_id = t.tenant_id
      LEFT JOIN users l ON t.team_leader_id = l.id AND l.tenant_id = t.tenant_id
      LEFT JOIN employee_details el ON el.employee_id = l.id AND el.tenant_id = t.tenant_id
      WHERE t.tenant_id = ?
    `;
    const params = [tenantId];

    const filterFields = ['id', 'project_id', 'phase_id', 'team_id', 'assigned_user_id', 'team_leader_id', 'status'];
    filterFields.forEach((field) => {
      if (filters[field]) {
        sql += ` AND t.${field} = ?`;
        params.push(filters[field]);
      }
    });

    if (filters.date_from) {
      sql += ' AND t.date >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      sql += ' AND t.date <= ?';
      params.push(filters.date_to);
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      sql += `
        AND (
          t.task_title LIKE ?
          OR t.description LIKE ?
          OR t.remarks LIKE ?
          OR p.name LIKE ?
          OR ph.name LIKE ?
          OR tm.name LIKE ?
          OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE ?
          OR CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, '')) LIKE ?
        )
      `;
      params.push(term, term, term, term, term, term, term, term);
    }

    sql += ' ORDER BY t.sort_order ASC, t.created_at ASC';
    const rows = await query(sql, params);

    return rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      project_id: toStringId(r.project_id),
      phase_id: r.phase_id,
      team_id: r.team_id,
      assigned_user_id: toStringId(r.assigned_user_id),
      team_leader_id: toStringId(r.team_leader_id),
      date: r.date,
      task_title: r.task_title,
      description: r.description,
      status: r.status,
      remarks: r.remarks,
      sort_order: r.sort_order,
      created_at: r.created_at,
      updated_at: r.updated_at,
      Project: r.project_id ? { id: toStringId(r.project_id), name: r.project_name } : null,
      Phase: r.phase_id ? { id: r.phase_id, name: r.phase_name, order_num: r.phase_order_num } : null,
      Team: r.team_id ? { id: r.team_id, name: r.team_name } : null,
      assignedUser: r.assigned_user_id ? { id: toStringId(r.assigned_user_id), name: r.assigned_user_name, role: r.assigned_user_role } : null,
      teamLeader: r.team_leader_id ? { id: toStringId(r.team_leader_id), name: r.team_leader_name, role: r.team_leader_role } : null,
      priority: r.priority || 'medium',
      due_date: r.due_date,
      estimated_hours: r.estimated_hours,
      actual_hours: r.actual_hours,
      kanban_status: r.kanban_status || 'backlog',
      sprint_id: r.sprint_id,
    }));
  },

  async getTaskById(id, tenantId) {
    const rows = await this.getTasks(tenantId, { id });
    return rows[0] || null;
  },

  async createTask(task, tenantId) {
    const id = randomUUID();
    const maxOrderRows = await query('SELECT MAX(sort_order) AS max_order FROM pttm_tasks WHERE tenant_id = ?', [tenantId]);
    const maxOrder = Number(maxOrderRows[0]?.max_order || 0);

    await query(
      `INSERT INTO pttm_tasks
       (id, tenant_id, project_id, phase_id, team_id, assigned_user_id, team_leader_id, date, task_title, description, status, remarks, sort_order, priority, due_date, estimated_hours, actual_hours, kanban_status, sprint_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, tenantId,
        task.project_id || null, task.phase_id || null, task.team_id || null,
        task.assigned_user_id || null, task.team_leader_id || null,
        task.date || new Date().toISOString().slice(0, 10),
        task.task_title || '', task.description || null,
        task.status || 'Pending', task.remarks || null, task.sort_order ?? (maxOrder + 1),
        task.priority || 'medium', task.due_date || null,
        task.estimated_hours || 0, task.actual_hours || 0,
        task.kanban_status || 'backlog', task.sprint_id || null,
      ]
    );

    return this.getTaskById(id, tenantId);
  },

  async updateTask(id, payload, tenantId) {
    const allowed = ['project_id', 'phase_id', 'team_id', 'assigned_user_id', 'team_leader_id', 'date', 'task_title', 'description', 'status', 'remarks', 'sort_order', 'priority', 'due_date', 'estimated_hours', 'actual_hours', 'kanban_status', 'sprint_id'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (payload[key] !== undefined) {
        updates.push(`\`${key}\` = ?`);
        params.push(payload[key] === '' ? null : payload[key]);
      }
    }

    if (updates.length > 0) {
      params.push(id, tenantId);
      await query(`UPDATE pttm_tasks SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
    }

    return this.getTaskById(id, tenantId);
  },

  async patchTaskField(id, field, value, tenantId) {
    const patch = { [field]: value === '' ? null : value };
    await this.updateTask(id, patch, tenantId);
    return this.getTaskById(id, tenantId);
  },

  async deleteTask(id, tenantId) {
    await query('DELETE FROM pttm_tasks WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    await this.reindexTasks(tenantId);
    return true;
  },

  async duplicateTask(id, tenantId) {
    const task = await query('SELECT * FROM pttm_tasks WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (task.length === 0) return null;

    const copy = { ...task[0], id: randomUUID(), date: new Date().toISOString().slice(0, 10), sort_order: Number(task[0].sort_order || 0) + 0.5 };
    await query(
      `INSERT INTO pttm_tasks
       (id, tenant_id, project_id, phase_id, team_id, assigned_user_id, team_leader_id, date, task_title, description, status, remarks, sort_order, priority, due_date, estimated_hours, actual_hours, kanban_status, sprint_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        copy.id, tenantId,
        copy.project_id, copy.phase_id, copy.team_id,
        copy.assigned_user_id, copy.team_leader_id,
        copy.date, copy.task_title, copy.description,
        copy.status, copy.remarks, copy.sort_order,
        copy.priority || 'medium', copy.due_date || null,
        copy.estimated_hours || 0, copy.actual_hours || 0,
        copy.kanban_status || 'backlog', copy.sprint_id || null,
      ]
    );

    await this.reindexTasks(tenantId);
    return this.getTaskById(copy.id, tenantId);
  },

  async insertTask(taskData, afterId, beforeId, tenantId) {
    const maxOrderRows = await query('SELECT MAX(sort_order) AS max_order FROM pttm_tasks WHERE tenant_id = ?', [tenantId]);
    let sortOrder = Number(maxOrderRows[0]?.max_order || 0) + 1;

    if (afterId || beforeId) {
      const refRows = await query('SELECT sort_order FROM pttm_tasks WHERE id = ? AND tenant_id = ?', [afterId || beforeId, tenantId]);
      if (refRows.length > 0) sortOrder = Number(refRows[0].sort_order || 0) + (afterId ? 0.5 : -0.5);
    }

    const id = randomUUID();
    await query(
      `INSERT INTO pttm_tasks
       (id, tenant_id, project_id, phase_id, team_id, assigned_user_id, team_leader_id, date, task_title, description, status, remarks, sort_order, priority, due_date, estimated_hours, actual_hours, kanban_status, sprint_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, tenantId,
        taskData.project_id || null, taskData.phase_id || null, taskData.team_id || null,
        taskData.assigned_user_id || null, taskData.team_leader_id || null,
        taskData.date || new Date().toISOString().slice(0, 10),
        taskData.task_title || '', taskData.description || null,
        taskData.status || 'Pending', taskData.remarks || null, sortOrder,
        taskData.priority || 'medium', taskData.due_date || null,
        taskData.estimated_hours || 0, taskData.actual_hours || 0,
        taskData.kanban_status || 'backlog', taskData.sprint_id || null,
      ]
    );

    await this.reindexTasks(tenantId);
    return this.getTaskById(id, tenantId);
  },

  async getDocflowEntry(projectId, phaseNum, tenantId) {
    const rows = await query(
      'SELECT * FROM pttm_docflow_entries WHERE project_id = ? AND phase_num = ? AND tenant_id = ?',
      [projectId, phaseNum, tenantId]
    );
    return rows[0] || null;
  },

  async saveDocflowEntry(projectId, phaseNum, status, remarks, tenantId) {
    const existing = await this.getDocflowEntry(projectId, phaseNum, tenantId);
    if (existing) {
      await query('UPDATE pttm_docflow_entries SET status = ?, remarks = ? WHERE id = ?', [status, remarks, existing.id]);
      return this.getDocflowEntry(projectId, phaseNum, tenantId);
    }

    const id = randomUUID();
    await query(
      `INSERT INTO pttm_docflow_entries (id, tenant_id, project_id, phase_num, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tenantId, projectId, phaseNum, status, remarks || null]
    );
    return this.getDocflowEntry(projectId, phaseNum, tenantId);
  },

  async getDocflowFiles(entryId, tenantId) {
    return query(
      `SELECT id, docflow_entry_id, file_name, file_size, upload_date
       FROM pttm_docflow_files
       WHERE docflow_entry_id = ? AND tenant_id = ?
       ORDER BY upload_date DESC`,
      [entryId, tenantId]
    );
  },

  async getDocflowFileContent(id, tenantId) {
    const rows = await query('SELECT * FROM pttm_docflow_files WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return rows[0] || null;
  },

  async addDocflowFile(entryId, fileName, fileData, fileSize, tenantId) {
    const id = randomUUID();
    const uploadDate = new Date().toISOString().slice(0, 10);
    await query(
      `INSERT INTO pttm_docflow_files (id, tenant_id, docflow_entry_id, file_name, file_data, file_size, upload_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, entryId, fileName, fileData, fileSize, uploadDate]
    );
    return { id, docflow_entry_id: entryId, file_name: fileName, file_size: fileSize, upload_date: uploadDate };
  },

  async deleteDocflowFile(id, tenantId) {
    await query('DELETE FROM pttm_docflow_files WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return true;
  },
};

module.exports = pttmModel;
