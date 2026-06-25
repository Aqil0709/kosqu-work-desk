// backend/src/features/pttm/pttmRoutes.js

const { Router } = require('express');
const pttmController = require('./pttmController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/requireAdmin');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const router = Router();

// Apply auth middleware globally to all task manager endpoints
router.use(authMiddleware.verifyToken);
router.use(requireModuleAccess('pttm', 'read'));

// Seeding endpoint
router.post('/seed', requireAdmin, pttmController.seedDatabase);

// Projects endpoints removed (handled by Service Management module)

// Team members (users)
router.get('/users', pttmController.getUsers);

// Teams
router.get('/teams', pttmController.getTeams);
router.post('/teams', requireModuleAccess('pttm', 'write'), pttmController.createTeam);
router.delete('/teams/:id', requireModuleAccess('pttm', 'write'), pttmController.deleteTeam);

// Phases
router.get('/phases', pttmController.getPhases);
router.post('/phases', requireModuleAccess('pttm', 'write'), pttmController.createPhase);
router.delete('/phases/:id', requireModuleAccess('pttm', 'write'), pttmController.deletePhase);

// Tasks
router.get('/tasks', pttmController.getTasks);
router.post('/tasks', requireModuleAccess('pttm', 'write'), pttmController.createTask);
router.post('/tasks/insert', requireModuleAccess('pttm', 'write'), pttmController.insertTask);
router.put('/tasks/:id', requireModuleAccess('pttm', 'write'), pttmController.updateTask);
router.patch('/tasks/:id', requireModuleAccess('pttm', 'write'), pttmController.patchTaskField);
router.delete('/tasks/:id', requireModuleAccess('pttm', 'write'), pttmController.deleteTask);
router.post('/tasks/:id/duplicate', requireModuleAccess('pttm', 'write'), pttmController.duplicateTask);

// Docflow / Checklists
router.get('/docflow/:project_id', pttmController.getDocflow);
router.put('/docflow/:project_id/:phase_num', requireModuleAccess('pttm', 'write'), pttmController.upsertDocflow);
router.post('/docflow/:project_id/:phase_num/files', requireModuleAccess('pttm', 'write'), pttmController.uploadDocflowFile);
router.delete('/docflow/:project_id/:phase_num/files/:file_id', requireModuleAccess('pttm', 'write'), pttmController.deleteDocflowFile);

// ==================== NEW v2 ROUTES ====================

const { pool } = require('../../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure v2 tables exist (project docs + client teams)
;(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pttm_project_docs (
        id           INT          NOT NULL AUTO_INCREMENT,
        tenant_id    INT          NOT NULL,
        project_id   INT          NOT NULL,
        title        VARCHAR(200) NOT NULL,
        doc_type     VARCHAR(60)  NOT NULL DEFAULT 'Other',
        file_path    VARCHAR(500) NULL,
        url          VARCHAR(500) NULL,
        uploaded_by  INT          NOT NULL,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_pdoc_project (tenant_id, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pttm_client_teams (
        id          INT          NOT NULL AUTO_INCREMENT,
        tenant_id   INT          NOT NULL,
        client_id   INT          NOT NULL,
        team_name   VARCHAR(200) NOT NULL,
        lead_id     INT          NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_cteam_tenant (tenant_id, client_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    console.warn('[pttmRoutes] table init warning:', e.message);
  }
})();

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/project-docs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `pdoc_${Date.now()}_${file.originalname.replace(/\s/g, '_')}`);
  }
});
const docUpload = multer({ storage: docStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// Project Documentation
// GET /api/pttm/project-docs/:projectId
router.get('/project-docs/:projectId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT pd.*, u.first_name, u.last_name
       FROM pttm_project_docs pd
       JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.tenant_id = ? AND pd.project_id = ?
       ORDER BY pd.created_at DESC`,
      [tenantId, req.params.projectId]
    );
    return res.json({ success: true, docs: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pttm/project-docs — upload a project document
router.post('/project-docs', requireModuleAccess('pttm', 'write'), docUpload.single('file'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { project_id, title, doc_type, url } = req.body;
    if (!project_id || !title) return res.status(400).json({ success: false, message: 'project_id and title are required' });
    const filePath = req.file ? `/uploads/project-docs/${req.file.filename}` : null;
    const [result] = await pool.execute(
      `INSERT INTO pttm_project_docs (tenant_id, project_id, title, doc_type, file_path, url, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, project_id, title, doc_type || 'Other', filePath, url || null, req.user.id]
    );
    return res.json({ success: true, message: 'Document added', id: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/pttm/project-docs/:id
router.delete('/project-docs/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('DELETE FROM pttm_project_docs WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    return res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Client-wise Teams
// GET /api/pttm/client-teams
router.get('/client-teams', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { client_id } = req.query;
    let sql = `
      SELECT ct.*, c.name as client_name, u.first_name as lead_first, u.last_name as lead_last
      FROM pttm_client_teams ct
      LEFT JOIN clients c ON c.id = ct.client_id
      LEFT JOIN users u ON u.id = ct.lead_id
      WHERE ct.tenant_id = ?
    `;
    const params = [tenantId];
    if (client_id) { sql += ' AND ct.client_id = ?'; params.push(client_id); }
    sql += ' ORDER BY ct.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, teams: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pttm/client-teams
router.post('/client-teams', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { client_id, team_name, lead_id } = req.body;
    if (!client_id || !team_name) return res.status(400).json({ success: false, message: 'client_id and team_name are required' });
    const [result] = await pool.execute(
      'INSERT INTO pttm_client_teams (tenant_id, client_id, team_name, lead_id) VALUES (?,?,?,?)',
      [tenantId, client_id, team_name, lead_id || null]
    );
    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/pttm/client-teams/:id
router.delete('/client-teams/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('DELETE FROM pttm_client_teams WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Team Members ──────────────────────────────────────────────────────────────

// GET /api/pttm/client-teams/:id/members
router.get('/client-teams/:id/members', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const teamId = req.params.id;

    // Ensure pttm_team_members table exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pttm_team_members (
        id         INT NOT NULL AUTO_INCREMENT,
        tenant_id  INT NOT NULL,
        team_id    INT NOT NULL,
        user_id    INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_team_member (team_id, user_id),
        KEY idx_tm_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [members] = await pool.execute(
      `SELECT tm.user_id, u.first_name, u.last_name, u.position,
              ed.employee_id as emp_code
       FROM pttm_team_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN employee_details ed ON CAST(ed.employee_id AS UNSIGNED) = u.id AND ed.tenant_id = u.tenant_id
       WHERE tm.team_id = ? AND tm.tenant_id = ?`,
      [teamId, tenantId]
    );

    // Fetch task summary per member
    const memberIds = members.map(m => m.user_id);
    let projectMap = {};
    if (memberIds.length > 0) {
      const placeholders = memberIds.map(() => '?').join(',');
      const [taskRows] = await pool.execute(
        `SELECT assigned_user_id as user_id,
                COUNT(*) as task_count,
                SUM(status='Completed') as done_count,
                GROUP_CONCAT(DISTINCT SUBSTRING(task_title,1,30) ORDER BY id DESC SEPARATOR '||') as recent_tasks
         FROM pttm_tasks
         WHERE assigned_user_id IN (${placeholders}) AND tenant_id = ?
         GROUP BY assigned_user_id`,
        [...memberIds, tenantId]
      ).catch(() => [[]]);
      taskRows.forEach(r => {
        const tasks = (r.recent_tasks || '').split('||').filter(Boolean).slice(0, 3).map(t => ({ name: t }));
        projectMap[r.user_id] = tasks.length > 0 ? tasks : [];
        // Store counts too
        projectMap[r.user_id]._meta = { task_count: r.task_count, done_count: r.done_count };
      });
    }

    return res.json({ success: true, members: members.map(m => ({ ...m, projects: projectMap[m.user_id] || [] })) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pttm/client-teams/:id/members — add a member
router.post('/client-teams/:id/members', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    await pool.execute(
      'INSERT IGNORE INTO pttm_team_members (tenant_id, team_id, user_id) VALUES (?,?,?)',
      [tenantId, req.params.id, user_id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/pttm/client-teams/:id/members/:userId — remove a member
router.delete('/client-teams/:id/members/:userId', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute(
      'DELETE FROM pttm_team_members WHERE team_id=? AND user_id=? AND tenant_id=?',
      [req.params.id, req.params.userId, tenantId]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/pttm/client-teams/:id — update team name / lead
router.put('/client-teams/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { team_name, lead_id } = req.body;
    await pool.execute(
      'UPDATE pttm_client_teams SET team_name=?, lead_id=? WHERE id=? AND tenant_id=?',
      [team_name, lead_id || null, req.params.id, tenantId]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Create client directly within PTTM
// POST /api/pttm/clients
router.post('/clients', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { name, email, phone, gst_number, gst_type, billing_address, industry_id } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Client name is required' });
    const [result] = await pool.execute(
      `INSERT INTO clients (tenant_id, name, email, phone, gst_number, gst_type, billing_address, industry_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [tenantId, name, email || null, phone || null, gst_number || null, gst_type || 'Unregistered', billing_address || null, industry_id || null]
    );
    return res.json({ success: true, id: result.insertId, message: 'Client created' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== v3 ENTERPRISE ROUTES ====================

// ── Sprints ──────────────────────────────────────────────────────
router.get('/sprints', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { project_id } = req.query;
    let sql = `
      SELECT s.*, p.name AS project_name,
        (SELECT COUNT(*) FROM pttm_tasks t WHERE t.sprint_id = s.id AND t.tenant_id = s.tenant_id) AS task_count,
        (SELECT COUNT(*) FROM pttm_tasks t WHERE t.sprint_id = s.id AND t.tenant_id = s.tenant_id AND t.kanban_status = 'done') AS done_count
      FROM pttm_sprints s
      LEFT JOIN projects p ON p.id = s.project_id
      WHERE s.tenant_id = ?`;
    const params = [tenantId];
    if (project_id) { sql += ' AND s.project_id = ?'; params.push(project_id); }
    sql += ' ORDER BY s.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, sprints: rows });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/sprints', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { project_id, name, goal, start_date, end_date } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Sprint name is required' });
    const [result] = await pool.execute(
      'INSERT INTO pttm_sprints (tenant_id, project_id, name, goal, start_date, end_date) VALUES (?,?,?,?,?,?)',
      [tenantId, project_id || null, name, goal || null, start_date || null, end_date || null]
    );
    return res.json({ success: true, id: result.insertId, message: 'Sprint created' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/sprints/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { name, goal, start_date, end_date, status, velocity } = req.body;
    await pool.execute(
      'UPDATE pttm_sprints SET name=?, goal=?, start_date=?, end_date=?, status=?, velocity=? WHERE id=? AND tenant_id=?',
      [name, goal || null, start_date || null, end_date || null, status || 'planning', velocity || 0, req.params.id, tenantId]
    );
    return res.json({ success: true, message: 'Sprint updated' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/sprints/:id/status', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status } = req.body;
    await pool.execute('UPDATE pttm_sprints SET status=? WHERE id=? AND tenant_id=?', [status, req.params.id, tenantId]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/sprints/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('UPDATE pttm_tasks SET sprint_id=NULL WHERE sprint_id=? AND tenant_id=?', [req.params.id, tenantId]);
    await pool.execute('DELETE FROM pttm_sprints WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ── Milestones ───────────────────────────────────────────────────
router.get('/milestones', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { project_id } = req.query;
    let sql = `
      SELECT m.*, p.name AS project_name
      FROM pttm_milestones m
      LEFT JOIN projects p ON p.id = m.project_id
      WHERE m.tenant_id = ?`;
    const params = [tenantId];
    if (project_id) { sql += ' AND m.project_id = ?'; params.push(project_id); }
    sql += ' ORDER BY m.due_date ASC, m.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, milestones: rows });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/milestones', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { project_id, title, description, due_date, completion_pct, status } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const [result] = await pool.execute(
      'INSERT INTO pttm_milestones (tenant_id, project_id, title, description, due_date, completion_pct, status) VALUES (?,?,?,?,?,?,?)',
      [tenantId, project_id || null, title, description || null, due_date || null, completion_pct || 0, status || 'pending']
    );
    return res.json({ success: true, id: result.insertId, message: 'Milestone created' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/milestones/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { title, description, due_date, completion_pct, status } = req.body;
    await pool.execute(
      'UPDATE pttm_milestones SET title=?, description=?, due_date=?, completion_pct=?, status=? WHERE id=? AND tenant_id=?',
      [title, description || null, due_date || null, completion_pct || 0, status || 'pending', req.params.id, tenantId]
    );
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/milestones/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('DELETE FROM pttm_milestones WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ── Work Reports ─────────────────────────────────────────────────
router.get('/work-reports', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const loggedInUserId = req.user?.id;
    const roleOrPosition = req.user?.position || req.user?.role;

    const { project_id, user_id, date_from, date_to } = req.query;

    // Team Lead scope: only reports that belong to their assigned hierarchy (team lead → projects).
    // We scope by projects where the logged-in user is the team lead.
    // This guarantees hierarchy-based filtering while preserving all existing query params.
    const isTeamLead = roleOrPosition === 'team_lead' || roleOrPosition === 'team lead' || roleOrPosition === 'team_lead';

    let sql = `
      SELECT wr.*,
        TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name,
        p.name AS project_name,
        TRIM(CONCAT(COALESCE(rv.first_name,''),' ',COALESCE(rv.last_name,''))) AS reviewer_name
      FROM pttm_work_reports wr
      LEFT JOIN users u ON u.id = wr.user_id
      LEFT JOIN projects p ON p.id = wr.project_id
      LEFT JOIN users rv ON rv.id = wr.reviewed_by
      WHERE wr.tenant_id = ?`;

    const params = [tenantId];

    if (isTeamLead && loggedInUserId) {
      // Team lead can only see reports under projects they lead.
      // Keep this as a strict project ownership filter to avoid leaking other teams.
      sql += ' AND wr.project_id IN (SELECT pr.id FROM projects pr WHERE pr.tenant_id = ? AND pr.team_lead_id = ?)';
      params.push(tenantId, loggedInUserId);
    }

    if (project_id) { sql += ' AND wr.project_id = ?'; params.push(project_id); }
    if (user_id) { sql += ' AND wr.user_id = ?'; params.push(user_id); }
    if (date_from) { sql += ' AND wr.report_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND wr.report_date <= ?'; params.push(date_to); }

    sql += ' ORDER BY wr.report_date DESC, wr.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, reports: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/work-reports', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { project_id, report_date, tasks_done, hours_worked, progress_pct, challenges, blockers, tomorrow_plan, status } = req.body;
    if (!report_date) return res.status(400).json({ success: false, message: 'report_date is required' });
    const [result] = await pool.execute(
      `INSERT INTO pttm_work_reports (tenant_id, project_id, user_id, report_date, tasks_done, hours_worked, progress_pct, challenges, blockers, tomorrow_plan, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [tenantId, project_id || null, req.user.id, report_date, tasks_done || null, hours_worked || 0, progress_pct || 0, challenges || null, blockers || null, tomorrow_plan || null, status || 'submitted']
    );
    return res.json({ success: true, id: result.insertId, message: 'Report submitted' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/work-reports/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { tasks_done, hours_worked, progress_pct, challenges, blockers, tomorrow_plan, status, reviewer_notes } = req.body;
    const isReview = reviewer_notes !== undefined;
    if (isReview) {
      await pool.execute(
        'UPDATE pttm_work_reports SET status=?, reviewer_notes=?, reviewed_by=?, reviewed_at=NOW() WHERE id=? AND tenant_id=?',
        [status || 'reviewed', reviewer_notes, req.user.id, req.params.id, tenantId]
      );
    } else {
      await pool.execute(
        'UPDATE pttm_work_reports SET tasks_done=?, hours_worked=?, progress_pct=?, challenges=?, blockers=?, tomorrow_plan=?, status=? WHERE id=? AND tenant_id=?',
        [tasks_done || null, hours_worked || 0, progress_pct || 0, challenges || null, blockers || null, tomorrow_plan || null, status || 'submitted', req.params.id, tenantId]
      );
    }
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/work-reports/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('DELETE FROM pttm_work_reports WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ── Risks ────────────────────────────────────────────────────────
router.get('/risks', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { project_id } = req.query;
    let sql = `
      SELECT r.*, p.name AS project_name,
        TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS owner_name
      FROM pttm_risks r
      LEFT JOIN projects p ON p.id = r.project_id
      LEFT JOIN users u ON u.id = r.owner_id
      WHERE r.tenant_id = ?`;
    const params = [tenantId];
    if (project_id) { sql += ' AND r.project_id = ?'; params.push(project_id); }
    sql += ' ORDER BY FIELD(r.impact,"critical","high","medium","low"), r.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, risks: rows });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/risks', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { project_id, title, description, impact, probability, status, mitigation_plan, owner_id } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const [result] = await pool.execute(
      'INSERT INTO pttm_risks (tenant_id, project_id, title, description, impact, probability, status, mitigation_plan, owner_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [tenantId, project_id || null, title, description || null, impact || 'medium', probability || 'medium', status || 'open', mitigation_plan || null, owner_id || null, req.user.id]
    );
    return res.json({ success: true, id: result.insertId });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/risks/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { title, description, impact, probability, status, mitigation_plan, owner_id } = req.body;
    await pool.execute(
      'UPDATE pttm_risks SET title=?, description=?, impact=?, probability=?, status=?, mitigation_plan=?, owner_id=? WHERE id=? AND tenant_id=?',
      [title, description || null, impact || 'medium', probability || 'medium', status || 'open', mitigation_plan || null, owner_id || null, req.params.id, tenantId]
    );
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/risks/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('DELETE FROM pttm_risks WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ── Task Comments ────────────────────────────────────────────────
router.get('/tasks/:id/comments', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT c.*, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name
       FROM pttm_task_comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.task_id = ? AND c.tenant_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.id, tenantId]
    );
    return res.json({ success: true, comments: rows });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/tasks/:id/comments', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    const [result] = await pool.execute(
      'INSERT INTO pttm_task_comments (tenant_id, task_id, user_id, comment) VALUES (?,?,?,?)',
      [tenantId, req.params.id, req.user.id, comment.trim()]
    );
    return res.json({ success: true, id: result.insertId });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/tasks/:id/comments/:cid', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('DELETE FROM pttm_task_comments WHERE id=? AND task_id=? AND tenant_id=?', [req.params.cid, req.params.id, tenantId]);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ── Project info (GitHub / repo URL) ────────────────────────────
router.get('/project-info/:projectId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      'SELECT id, name, repo_url, github_url, description, status, start_date, end_date FROM projects WHERE id=? AND tenant_id=?',
      [req.params.projectId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });
    return res.json({ success: true, project: rows[0] });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/project-info/:projectId', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { repo_url, github_url } = req.body;
    await pool.execute(
      'UPDATE projects SET repo_url=?, github_url=? WHERE id=? AND tenant_id=?',
      [repo_url || null, github_url || null, req.params.projectId, tenantId]
    );
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ── Projects Overview (Teams/Projects/Docs dashboard) ──────────────────────

// GET /api/pttm/projects-overview — all projects with task stats + issue breakdown
router.get('/projects-overview', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const today = new Date().toISOString().split('T')[0];

    const [projects] = await pool.execute(
      `SELECT
         p.id, p.name, p.description, p.status, p.start_date, p.end_date,
         c.name AS client_name,
         COUNT(t.id)                                                       AS total_tasks,
         SUM(t.kanban_status = 'done' OR t.status = 'Completed')          AS done_tasks,
         SUM(t.kanban_status = 'in_progress')                             AS in_progress_tasks,
         SUM(
           (t.priority IN ('high','critical') AND (t.kanban_status IS NULL OR t.kanban_status != 'done'))
           OR (t.due_date IS NOT NULL AND t.due_date < ? AND (t.kanban_status IS NULL OR t.kanban_status != 'done'))
         )                                                                 AS issue_count,
         GROUP_CONCAT(DISTINCT CONCAT(au.first_name,' ',au.last_name) ORDER BY au.first_name SEPARATOR ', ') AS team_members,
         GROUP_CONCAT(DISTINCT CONCAT(lu.first_name,' ',lu.last_name) ORDER BY lu.first_name SEPARATOR ', ') AS team_leads
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id AND c.tenant_id = p.tenant_id
       LEFT JOIN pttm_tasks t  ON t.project_id = p.id AND t.tenant_id = p.tenant_id
       LEFT JOIN users au ON au.id = t.assigned_user_id AND au.tenant_id = p.tenant_id
       LEFT JOIN users lu ON lu.id = t.team_leader_id  AND lu.tenant_id = p.tenant_id
       WHERE p.tenant_id = ?
       GROUP BY p.id, p.name, p.description, p.status, p.start_date, p.end_date, c.name
       ORDER BY p.id DESC`,
      [today, tenantId]
    );

    return res.json({ success: true, projects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pttm/projects/:projectId/issues — issue task details for one project
router.get('/projects/:projectId/issues', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const today = new Date().toISOString().split('T')[0];

    const [issues] = await pool.execute(
      `SELECT
         t.id, t.task_title, t.priority, t.due_date, t.kanban_status, t.status,
         TRIM(CONCAT(COALESCE(au.first_name,''),' ',COALESCE(au.last_name,''))) AS assigned_to,
         TRIM(CONCAT(COALESCE(lu.first_name,''),' ',COALESCE(lu.last_name,''))) AS led_by,
         ph.phase_name
       FROM pttm_tasks t
       LEFT JOIN users au ON au.id = t.assigned_user_id AND au.tenant_id = t.tenant_id
       LEFT JOIN users lu ON lu.id = t.team_leader_id  AND lu.tenant_id = t.tenant_id
       LEFT JOIN pttm_phases ph ON ph.id = t.phase_id  AND ph.tenant_id = t.tenant_id
       WHERE t.project_id = ? AND t.tenant_id = ?
         AND (
           (t.priority IN ('high','critical') AND (t.kanban_status IS NULL OR t.kanban_status != 'done'))
           OR (t.due_date IS NOT NULL AND t.due_date < ? AND (t.kanban_status IS NULL OR t.kanban_status != 'done'))
         )
       ORDER BY FIELD(t.priority,'critical','high','medium','low'), t.due_date ASC
       LIMIT 30`,
      [req.params.projectId, tenantId, today]
    );

    return res.json({ success: true, issues });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pttm/all-docs — all project docs grouped by project_id
router.get('/all-docs', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT pd.*, p.name AS project_name, c.name AS client_name,
              TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS uploader_name
       FROM pttm_project_docs pd
       JOIN projects p ON p.id = pd.project_id
       LEFT JOIN clients c ON c.id = p.client_id AND c.tenant_id = p.tenant_id
       LEFT JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.tenant_id = ?
       ORDER BY pd.project_id, pd.created_at DESC`,
      [tenantId]
    );
    // Group by project_id
    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.project_id]) grouped[r.project_id] = [];
      grouped[r.project_id].push(r);
    });
    return res.json({ success: true, grouped });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== v4 ENTERPRISE PM ROUTES ====================
// New tables: project_members, project_hierarchy, project_activity_log, pttm_task_dependencies

;(async () => {
  try {
    // project_members — single source of truth for who is on each project
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS project_members (
        id            INT          NOT NULL AUTO_INCREMENT,
        tenant_id     INT          NOT NULL,
        project_id    INT          NOT NULL,
        user_id       INT          NOT NULL,
        role          ENUM('team_lead','project_lead','member','observer') NOT NULL DEFAULT 'member',
        joined_at     DATE         DEFAULT NULL,
        is_active     TINYINT(1)   NOT NULL DEFAULT 1,
        allocated_hrs DECIMAL(6,2) DEFAULT NULL,
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pm_project_user (project_id, user_id),
        KEY idx_pm_tenant  (tenant_id),
        KEY idx_pm_user    (user_id),
        KEY idx_pm_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // project_hierarchy — materialised tree for O(1) reads
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS project_hierarchy (
        id              INT      NOT NULL AUTO_INCREMENT,
        tenant_id       INT      NOT NULL,
        project_id      INT      NOT NULL,
        client_id       INT      DEFAULT NULL,
        team_lead_id    INT      DEFAULT NULL,
        project_lead_id INT      DEFAULT NULL,
        rebuilt_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_ph_project (tenant_id, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // project_activity_log — audit trail
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS project_activity_log (
        id          INT          NOT NULL AUTO_INCREMENT,
        tenant_id   INT          NOT NULL,
        project_id  INT          DEFAULT NULL,
        task_id     VARCHAR(36)  DEFAULT NULL,
        user_id     INT          NOT NULL,
        action      VARCHAR(120) NOT NULL,
        old_value   JSON         DEFAULT NULL,
        new_value   JSON         DEFAULT NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_pal_project (tenant_id, project_id),
        KEY idx_pal_user    (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // pttm_task_dependencies — for Gantt blocking relationships
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pttm_task_dependencies (
        id            INT         NOT NULL AUTO_INCREMENT,
        tenant_id     INT         NOT NULL,
        task_id       VARCHAR(36) NOT NULL,
        depends_on_id VARCHAR(36) NOT NULL,
        dep_type      ENUM('finish_to_start','start_to_start','finish_to_finish') DEFAULT 'finish_to_start',
        created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_dep (task_id, depends_on_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add missing columns to projects table — check existence first (pool.query for DDL)
    const [existingCols] = await pool.query('SHOW COLUMNS FROM projects');
    const existingColNames = new Set(existingCols.map(c => c.Field));
    const alterCols = [
      ['project_code',    'ALTER TABLE projects ADD COLUMN project_code VARCHAR(50) DEFAULT NULL'],
      ['team_lead_id',    'ALTER TABLE projects ADD COLUMN team_lead_id INT DEFAULT NULL'],
      ['project_lead_id', 'ALTER TABLE projects ADD COLUMN project_lead_id INT DEFAULT NULL'],
      ['priority',        'ALTER TABLE projects ADD COLUMN priority VARCHAR(20) DEFAULT NULL'],
      ['billing_type',    'ALTER TABLE projects ADD COLUMN billing_type VARCHAR(30) DEFAULT NULL'],
      ['budget',          'ALTER TABLE projects ADD COLUMN budget DECIMAL(15,2) DEFAULT NULL'],
      ['estimated_hours', 'ALTER TABLE projects ADD COLUMN estimated_hours DECIMAL(10,2) DEFAULT NULL'],
      ['tech_stack',      'ALTER TABLE projects ADD COLUMN tech_stack JSON DEFAULT NULL'],
      ['progress_pct',    'ALTER TABLE projects ADD COLUMN progress_pct TINYINT UNSIGNED DEFAULT 0'],
      ['color',           'ALTER TABLE projects ADD COLUMN color VARCHAR(7) DEFAULT NULL'],
    ];
    for (const [colName, sql] of alterCols) {
      if (!existingColNames.has(colName)) {
        await pool.query(sql).catch(() => {});
      }
    }

    console.log('[pttm v4] Enterprise PM tables ready');
  } catch (e) {
    console.warn('[pttm v4] init warning:', e.message);
  }
})();

// ── Helper: log activity ──────────────────────────────────────────────────────
async function logActivity(tenantId, userId, action, projectId = null, taskId = null, oldVal = null, newVal = null) {
  try {
    await pool.execute(
      `INSERT INTO project_activity_log (tenant_id, project_id, task_id, user_id, action, old_value, new_value)
       VALUES (?,?,?,?,?,?,?)`,
      [tenantId, projectId, taskId, userId, action,
       oldVal ? JSON.stringify(oldVal) : null,
       newVal ? JSON.stringify(newVal) : null]
    );
  } catch (_) {}
}

// ── Helper: rebuild hierarchy for a project ───────────────────────────────────
async function rebuildHierarchy(tenantId, projectId) {
  try {
    const [[proj]] = await pool.execute(
      `SELECT client_id, team_lead_id, project_lead_id FROM projects WHERE id=? AND tenant_id=?`,
      [projectId, tenantId]
    );
    if (!proj) return;
    await pool.execute(
      `INSERT INTO project_hierarchy (tenant_id, project_id, client_id, team_lead_id, project_lead_id)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         client_id=VALUES(client_id),
         team_lead_id=VALUES(team_lead_id),
         project_lead_id=VALUES(project_lead_id)`,
      [tenantId, projectId, proj.client_id, proj.team_lead_id, proj.project_lead_id]
    );
  } catch (_) {}
}

// ── POST /api/pttm/projects — create project (full enterprise form) ─────────
router.post('/projects', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      name, project_code, description, client_id,
      start_date, end_date, status, priority, billing_type,
      budget, estimated_hours, tech_stack,
      team_lead_id, project_lead_id, member_ids = [],
    } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Project name is required' });

    const [result] = await pool.execute(
      `INSERT INTO projects
         (tenant_id, name, project_code, description, client_id,
          start_date, end_date, status, priority, billing_type,
          budget, estimated_hours, tech_stack,
          team_lead_id, project_lead_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        tenantId, name, project_code || null, description || null, client_id || null,
        start_date || null, end_date || null, status || 'Planning', priority || 'medium',
        billing_type || 'fixed', budget || null, estimated_hours || null,
        tech_stack ? JSON.stringify(tech_stack) : null,
        team_lead_id || null, project_lead_id || null,
      ]
    );
    const projectId = result.insertId;

    // Add team_lead and project_lead to project_members
    const membersToAdd = [];
    if (team_lead_id) membersToAdd.push({ user_id: team_lead_id, role: 'team_lead' });
    if (project_lead_id) membersToAdd.push({ user_id: project_lead_id, role: 'project_lead' });
    for (const uid of member_ids) {
      if (uid !== team_lead_id && uid !== project_lead_id) membersToAdd.push({ user_id: uid, role: 'member' });
    }
    for (const m of membersToAdd) {
      await pool.execute(
        `INSERT IGNORE INTO project_members (tenant_id, project_id, user_id, role, joined_at)
         VALUES (?,?,?,?,CURDATE())`,
        [tenantId, projectId, m.user_id, m.role]
      );
    }

    await rebuildHierarchy(tenantId, projectId);
    await logActivity(tenantId, req.user.id, 'project.created', projectId, null, null, { name });

    return res.json({ success: true, id: projectId, message: 'Project created' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/pttm/projects/:id — update project ───────────────────────────────
router.put('/projects/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const projectId = req.params.id;
    const {
      name, project_code, description, client_id,
      start_date, end_date, status, priority, billing_type,
      budget, estimated_hours, tech_stack, progress_pct,
      team_lead_id, project_lead_id,
    } = req.body;

    await pool.execute(
      `UPDATE projects SET
         name=?, project_code=?, description=?, client_id=?,
         start_date=?, end_date=?, status=?, priority=?, billing_type=?,
         budget=?, estimated_hours=?, tech_stack=?, progress_pct=?,
         team_lead_id=?, project_lead_id=?
       WHERE id=? AND tenant_id=?`,
      [
        name, project_code || null, description || null, client_id || null,
        start_date || null, end_date || null, status || 'Planning', priority || 'medium',
        billing_type || 'fixed', budget || null, estimated_hours || null,
        tech_stack ? JSON.stringify(tech_stack) : null, progress_pct || 0,
        team_lead_id || null, project_lead_id || null,
        projectId, tenantId,
      ]
    );

    await rebuildHierarchy(tenantId, projectId);
    await logActivity(tenantId, req.user.id, 'project.updated', projectId);
    return res.json({ success: true, message: 'Project updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/pttm/projects/:id — soft-delete / hard-delete project ────────
router.delete('/projects/:id', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const projectId = req.params.id;
    // Remove members, hierarchy, then project
    await pool.execute('DELETE FROM project_members WHERE project_id=? AND tenant_id=?', [projectId, tenantId]);
    await pool.execute('DELETE FROM project_hierarchy WHERE project_id=? AND tenant_id=?', [projectId, tenantId]);
    await pool.execute('DELETE FROM projects WHERE id=? AND tenant_id=?', [projectId, tenantId]);
    await logActivity(tenantId, req.user.id, 'project.deleted', projectId);
    return res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/pttm/projects/:id/status — lifecycle transition ───────────────
router.patch('/projects/:id/status', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status } = req.body;
    const VALID = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Closed', 'Archived'];
    if (!VALID.includes(status)) return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID.join(', ')}` });
    await pool.execute(
      'UPDATE projects SET status=? WHERE id=? AND tenant_id=?',
      [status, req.params.id, tenantId]
    );
    await rebuildHierarchy(tenantId, req.params.id);
    await logActivity(tenantId, req.user.id, 'project.status_changed', req.params.id, null, null, { status });
    return res.json({ success: true, message: `Project status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/pttm/projects/:id/transfer-member — move member to another project
router.post('/projects/:id/transfer-member', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { user_id, target_project_id, role = 'member' } = req.body;
    if (!user_id || !target_project_id) return res.status(400).json({ success: false, message: 'user_id and target_project_id required' });
    // Remove from source project
    await pool.execute(
      'UPDATE project_members SET is_active=0 WHERE project_id=? AND user_id=? AND tenant_id=?',
      [req.params.id, user_id, tenantId]
    );
    // Add to target project
    await pool.execute(
      `INSERT INTO project_members (tenant_id, project_id, user_id, role, joined_at)
       VALUES (?,?,?,?,CURDATE())
       ON DUPLICATE KEY UPDATE role=VALUES(role), is_active=1`,
      [tenantId, target_project_id, user_id, role]
    );
    await rebuildHierarchy(tenantId, req.params.id);
    await rebuildHierarchy(tenantId, target_project_id);
    await logActivity(tenantId, req.user.id, 'member.transferred', req.params.id, null, null, { user_id, target_project_id });
    return res.json({ success: true, message: 'Member transferred' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/projects — list all projects with full details ───────────────
router.get('/projects', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status, client_id, priority, search } = req.query;

    let sql = `
      SELECT
        p.*,
        p.progress_pct AS progress,
        c.name  AS client_name,
        TRIM(CONCAT(COALESCE(tl.first_name,''),' ',COALESCE(tl.last_name,'')))  AS team_lead_name,
        TRIM(CONCAT(COALESCE(pl.first_name,''),' ',COALESCE(pl.last_name,''))) AS project_lead_name,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id=p.id AND pm.is_active=1) AS team_size,
        (SELECT COUNT(*) FROM pttm_tasks t WHERE t.project_id=p.id AND t.tenant_id=p.tenant_id) AS task_count,
        (SELECT COUNT(*) FROM pttm_tasks t WHERE t.project_id=p.id AND t.tenant_id=p.tenant_id
          AND (t.status='Completed' OR t.kanban_status='done')) AS done_tasks,
        (SELECT COUNT(*) FROM pttm_tasks t WHERE t.project_id=p.id AND t.tenant_id=p.tenant_id
          AND t.kanban_status='in_progress') AS in_progress_tasks
      FROM projects p
      LEFT JOIN clients c  ON c.id = p.client_id AND c.tenant_id = p.tenant_id
      LEFT JOIN users tl   ON tl.id = p.team_lead_id
      LEFT JOIN users pl   ON pl.id = p.project_lead_id
      WHERE p.tenant_id = ?
    `;
    const params = [tenantId];
    if (status)    { sql += ' AND p.status = ?';    params.push(status); }
    if (client_id) { sql += ' AND p.client_id = ?'; params.push(client_id); }
    if (priority)  { sql += ' AND p.priority = ?';  params.push(priority); }
    if (search)    { sql += ' AND p.name LIKE ?';   params.push(`%${search}%`); }
    sql += ' ORDER BY p.id DESC';

    const [rows] = await pool.execute(sql, params);
    // Parse tech_stack JSON
    const projects = rows.map(r => ({
      ...r,
      tech_stack: typeof r.tech_stack === 'string' ? JSON.parse(r.tech_stack || '[]') : (r.tech_stack || []),
    }));
    return res.json({ success: true, projects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/projects/:id — single project detail ───────────────────────
router.get('/projects/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [[proj]] = await pool.execute(
      `SELECT p.*,
         c.name AS client_name,
         TRIM(CONCAT(COALESCE(tl.first_name,''),' ',COALESCE(tl.last_name,''))) AS team_lead_name,
         TRIM(CONCAT(COALESCE(pl.first_name,''),' ',COALESCE(pl.last_name,''))) AS project_lead_name
       FROM projects p
       LEFT JOIN clients c ON c.id=p.client_id AND c.tenant_id=p.tenant_id
       LEFT JOIN users tl  ON tl.id=p.team_lead_id
       LEFT JOIN users pl  ON pl.id=p.project_lead_id
       WHERE p.id=? AND p.tenant_id=?`,
      [req.params.id, tenantId]
    );
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });

    const [members] = await pool.execute(
      `SELECT pm.*, u.first_name, u.last_name, u.email, u.position,
              pm.role, pm.allocated_hrs
       FROM project_members pm
       JOIN users u ON u.id=pm.user_id
       WHERE pm.project_id=? AND pm.tenant_id=? AND pm.is_active=1
       ORDER BY FIELD(pm.role,'team_lead','project_lead','member','observer'), u.first_name`,
      [req.params.id, tenantId]
    );

    return res.json({
      success: true,
      project: {
        ...proj,
        tech_stack: typeof proj.tech_stack === 'string' ? JSON.parse(proj.tech_stack || '[]') : (proj.tech_stack || []),
      },
      members,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/projects/:id/members ───────────────────────────────────────
router.get('/projects/:id/members', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [members] = await pool.execute(
      `SELECT pm.*, u.first_name, u.last_name, u.email, u.position,
              (SELECT COUNT(*) FROM pttm_tasks t WHERE t.assigned_user_id=pm.user_id AND t.project_id=pm.project_id) AS task_count,
              (SELECT COUNT(*) FROM pttm_tasks t WHERE t.assigned_user_id=pm.user_id AND t.project_id=pm.project_id AND (t.status='Completed' OR t.kanban_status='done')) AS done_count
       FROM project_members pm
       JOIN users u ON u.id=pm.user_id
       WHERE pm.project_id=? AND pm.tenant_id=? AND pm.is_active=1
       ORDER BY FIELD(pm.role,'team_lead','project_lead','member','observer'), u.first_name`,
      [req.params.id, tenantId]
    );
    return res.json({ success: true, members });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/pttm/projects/:id/members — add member ────────────────────────
router.post('/projects/:id/members', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { user_id, role = 'member', allocated_hrs } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    await pool.execute(
      `INSERT INTO project_members (tenant_id, project_id, user_id, role, joined_at, allocated_hrs)
       VALUES (?,?,?,?,CURDATE(),?)
       ON DUPLICATE KEY UPDATE role=VALUES(role), is_active=1, allocated_hrs=VALUES(allocated_hrs)`,
      [tenantId, req.params.id, user_id, role, allocated_hrs || null]
    );
    await logActivity(tenantId, req.user.id, 'member.added', req.params.id, null, null, { user_id, role });
    return res.json({ success: true, message: 'Member added' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/pttm/projects/:id/members/:userId — change role ─────────────────
router.put('/projects/:id/members/:userId', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { role, allocated_hrs } = req.body;
    await pool.execute(
      `UPDATE project_members SET role=?, allocated_hrs=? WHERE project_id=? AND user_id=? AND tenant_id=?`,
      [role, allocated_hrs || null, req.params.id, req.params.userId, tenantId]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/pttm/projects/:id/members/:userId ────────────────────────────
router.delete('/projects/:id/members/:userId', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute(
      `UPDATE project_members SET is_active=0 WHERE project_id=? AND user_id=? AND tenant_id=?`,
      [req.params.id, req.params.userId, tenantId]
    );
    await logActivity(tenantId, req.user.id, 'member.removed', req.params.id, null, { user_id: req.params.userId });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/projects/:id/activity ──────────────────────────────────────
router.get('/projects/:id/activity', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT pal.*, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name
       FROM project_activity_log pal
       LEFT JOIN users u ON u.id=pal.user_id
       WHERE pal.project_id=? AND pal.tenant_id=?
       ORDER BY pal.created_at DESC LIMIT 50`,
      [req.params.id, tenantId]
    );
    return res.json({ success: true, activity: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/hierarchy/tree — React Flow payload ─────────────────────────
router.get('/hierarchy/tree', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const loggedInUserId = req.user?.id;
    const roleOrPosition = req.user?.position || req.user?.role;

    let { client_id, team_lead_id: tlFilter, project_id } = req.query;

    const isTeamLead = roleOrPosition === 'team_lead' || roleOrPosition === 'team lead' || roleOrPosition === 'team_lead';

    // Team Lead scope: never allow cross-team hierarchy.
    // Override tlFilter with logged-in user id and keep tenant isolation.
    if (isTeamLead && loggedInUserId) {
      tlFilter = loggedInUserId;
      // client_id is intentionally ignored for scoping; the SQL filter below
      // ensures only the logged-in team's projects are returned.
      // (UI may or may not provide client selection.)
      client_id = client_id || null;
    }

    // Fetch all projects with their leads and client
    let projSql = `
      SELECT p.id, p.name, p.status, p.progress_pct, p.color, p.priority,
             p.client_id, p.team_lead_id, p.project_lead_id,
             DATE_FORMAT(p.start_date, '%Y-%m-%d') AS start_date,
             DATE_FORMAT(p.end_date,   '%Y-%m-%d') AS end_date,
             c.name AS client_name,
             TRIM(CONCAT(COALESCE(tl.first_name,''),' ',COALESCE(tl.last_name,''))) AS team_lead_name,
             TRIM(CONCAT(COALESCE(pl.first_name,''),' ',COALESCE(pl.last_name,''))) AS project_lead_name,
             (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id=p.id AND pm.is_active=1) AS team_size,
             (SELECT COUNT(*) FROM pttm_tasks t  WHERE t.project_id=p.id AND t.tenant_id=p.tenant_id) AS task_count
      FROM projects p
      LEFT JOIN clients c  ON c.id=p.client_id AND c.tenant_id=p.tenant_id
      LEFT JOIN users tl   ON tl.id=p.team_lead_id
      LEFT JOIN users pl   ON pl.id=p.project_lead_id
      WHERE p.tenant_id=?
    `;
    const params = [tenantId];
    if (client_id)  { projSql += ' AND p.client_id=?';     params.push(client_id); }
    if (tlFilter)   { projSql += ' AND p.team_lead_id=?';  params.push(tlFilter); }
    if (project_id) { projSql += ' AND p.id=?';            params.push(project_id); }
    projSql += ' ORDER BY p.client_id, p.team_lead_id, p.id';

    const [projects] = await pool.execute(projSql, params);


    // Fetch all active members for these projects
    const projectIds = projects.map(p => p.id);
    let members = [];
    if (projectIds.length > 0) {
      const ph = projectIds.map(() => '?').join(',');
      const [mRows] = await pool.execute(
        `SELECT pm.project_id, pm.user_id, pm.role,
                TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS name,
                u.position,
                p.name AS project_name,
                p.status AS project_status,
                (SELECT COUNT(*) FROM pttm_tasks t WHERE t.assigned_user_id=pm.user_id AND t.project_id=pm.project_id) AS task_count
         FROM project_members pm
         JOIN users u ON u.id=pm.user_id
         JOIN projects p ON p.id=pm.project_id
         WHERE pm.project_id IN (${ph}) AND pm.tenant_id=? AND pm.is_active=1 AND pm.role='member'`,
        [...projectIds, tenantId]
      );
      members = mRows;
    }

    // Build React Flow nodes + edges
    const nodes = [];
    const edges = [];
    const seenClients = new Set();
    const seenTLs = new Set();

    for (const p of projects) {
      // Client node
      if (p.client_id && !seenClients.has(p.client_id)) {
        seenClients.add(p.client_id);
        nodes.push({
          id: `client-${p.client_id}`,
          type: 'clientNode',
          data: { name: p.client_name || 'No Client', clientId: p.client_id, projectCount: projects.filter(x => x.client_id === p.client_id).length },
          position: { x: 0, y: 0 },
        });
      }

      // Team Lead node
      const tlKey = `tl-${p.team_lead_id || 'none'}-c${p.client_id}`;
      if (!seenTLs.has(tlKey)) {
        seenTLs.add(tlKey);
        const tlId = p.team_lead_id ? `tl-${p.team_lead_id}` : `tl-unassigned-c${p.client_id}`;
        nodes.push({
          id: tlId,
          type: 'teamLeadNode',
          data: {
            name: p.team_lead_name || 'Unassigned',
            userId: p.team_lead_id,
            projectId: p.id,
            clientId: p.client_id,
            projectCount: projects.filter(x => x.team_lead_id === p.team_lead_id && x.client_id === p.client_id).length,
          },
          position: { x: 0, y: 0 },
        });
        // edge: client → TL
        if (p.client_id) {
          edges.push({ id: `e-c${p.client_id}-${tlId}`, source: `client-${p.client_id}`, target: tlId, type: 'smoothstep', animated: false, data: { edgeType: 'client-to-lead' } });
        }
      }
      const tlNodeId = p.team_lead_id ? `tl-${p.team_lead_id}` : `tl-unassigned-c${p.client_id}`;

      // Project node
      nodes.push({
        id: `proj-${p.id}`,
        type: 'projectNode',
        data: {
          id: p.id, projectId: p.id, name: p.name, status: p.status, progress: p.progress_pct || 0,
          color: p.color || '#5B4FF7', priority: p.priority, teamSize: p.team_size, taskCount: p.task_count,
          projectLeadName: p.project_lead_name, projectLeadId: p.project_lead_id,
          teamLeadId: p.team_lead_id, clientId: p.client_id,
          startDate: p.start_date, endDate: p.end_date,
        },
        position: { x: 0, y: 0 },
      });
      edges.push({ id: `e-${tlNodeId}-proj${p.id}`, source: tlNodeId, target: `proj-${p.id}`, type: 'smoothstep', data: { edgeType: 'lead-to-project' } });

      // Member nodes (collect first so PL can show count)
      const projMembers = members.filter(m => m.project_id === p.id);

      // Project Lead node
      if (p.project_lead_id) {
        nodes.push({
          id: `pl-${p.project_lead_id}-p${p.id}`,
          type: 'projectLeadNode',
          data: {
            name: p.project_lead_name,
            userId: p.project_lead_id,
            projectId: p.id,
            projectName: p.name,
            memberCount: projMembers.length,
            // position fetched separately if needed — set via pl join
          },
          position: { x: 0, y: 0 },
        });
        edges.push({
          id: `e-proj${p.id}-pl${p.project_lead_id}`,
          source: `proj-${p.id}`,
          target: `pl-${p.project_lead_id}-p${p.id}`,
          type: 'smoothstep',
          data: { edgeType: 'project-to-lead' },
        });
      }

      const parentNode = p.project_lead_id ? `pl-${p.project_lead_id}-p${p.id}` : `proj-${p.id}`;
      for (const m of projMembers) {
        const memNodeId = `mem-${m.user_id}-p${p.id}`;
        nodes.push({
          id: memNodeId,
          type: 'memberNode',
          data: {
            name: m.name, userId: m.user_id, position: m.position,
            taskCount: m.task_count, projectId: p.id,
            projectName: m.project_name, projectStatus: m.project_status,
          },
          position: { x: 0, y: 0 },
        });
        edges.push({
          id: `e-${parentNode}-${memNodeId}`,
          source: parentNode,
          target: memNodeId,
          type: 'smoothstep',
          data: { edgeType: 'lead-to-member' },
        });
      }
    }

    return res.json({ success: true, nodes, edges, projectCount: projects.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/clients — list clients with project counts ─────────────────
router.get('/clients', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT c.*,
              COUNT(DISTINCT p.id) AS project_count,
              SUM(p.status='In Progress' OR p.status='On Going') AS active_count
       FROM clients c
       LEFT JOIN projects p ON p.client_id=c.id AND p.tenant_id=c.tenant_id
       WHERE c.tenant_id=?
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [tenantId]
    );
    return res.json({ success: true, clients: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/clients/:id/projects ───────────────────────────────────────
router.get('/clients/:id/projects', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT p.*, c.name AS client_name,
              TRIM(CONCAT(COALESCE(tl.first_name,''),' ',COALESCE(tl.last_name,''))) AS team_lead_name,
              TRIM(CONCAT(COALESCE(pl.first_name,''),' ',COALESCE(pl.last_name,''))) AS project_lead_name
       FROM projects p
       LEFT JOIN clients c ON c.id=p.client_id
       LEFT JOIN users tl  ON tl.id=p.team_lead_id
       LEFT JOIN users pl  ON pl.id=p.project_lead_id
       WHERE p.client_id=? AND p.tenant_id=?
       ORDER BY p.id DESC`,
      [req.params.id, tenantId]
    );
    return res.json({ success: true, projects: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/members/workload — cross-project workload ─────────────────
router.get('/members/workload', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.position,
              COUNT(DISTINCT pm.project_id) AS project_count,
              COUNT(t.id) AS total_tasks,
              SUM(t.status='Completed' OR t.kanban_status='done') AS done_tasks,
              SUM(t.kanban_status='in_progress') AS active_tasks,
              SUM(COALESCE(t.estimated_hours,0)) AS estimated_hrs,
              SUM(COALESCE(t.actual_hours,0)) AS actual_hrs
       FROM users u
       JOIN project_members pm ON pm.user_id=u.id AND pm.tenant_id=u.tenant_id AND pm.is_active=1
       LEFT JOIN pttm_tasks t  ON t.assigned_user_id=u.id AND t.tenant_id=u.tenant_id
       WHERE u.tenant_id=?
       GROUP BY u.id, u.first_name, u.last_name, u.position
       ORDER BY total_tasks DESC`,
      [tenantId]
    );
    return res.json({ success: true, workload: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/pttm/projects/:id/stats — per-project KPIs ─────────────────────
router.get('/projects/:id/stats', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const pid = req.params.id;

    const [[taskStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(status='Completed' OR kanban_status='done') AS done,
         SUM(kanban_status='in_progress') AS in_progress,
         SUM(kanban_status='review' OR kanban_status='testing') AS review,
         SUM(kanban_status='backlog' OR kanban_status='todo') AS backlog,
         SUM(priority='critical') AS critical,
         SUM(priority='high') AS high,
         SUM(due_date IS NOT NULL AND due_date < CURDATE() AND (kanban_status IS NULL OR kanban_status!='done')) AS overdue,
         SUM(COALESCE(estimated_hours,0)) AS est_hours,
         SUM(COALESCE(actual_hours,0))   AS actual_hours
       FROM pttm_tasks WHERE project_id=? AND tenant_id=?`,
      [pid, tenantId]
    );

    const [[memberCount]] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM project_members WHERE project_id=? AND tenant_id=? AND is_active=1`,
      [pid, tenantId]
    );

    const [[projRow]] = await pool.execute(
      `SELECT progress_pct, start_date, end_date, budget, estimated_hours FROM projects WHERE id=? AND tenant_id=?`,
      [pid, tenantId]
    );

    return res.json({
      success: true,
      stats: {
        ...taskStats,
        member_count: memberCount.cnt,
        progress_pct: projRow?.progress_pct || 0,
        start_date: projRow?.start_date,
        end_date: projRow?.end_date,
        budget: projRow?.budget,
        estimated_hours: projRow?.estimated_hours,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/pttm/hierarchy/rebuild ─────────────────────────────────────────
router.post('/hierarchy/rebuild', requireModuleAccess('pttm', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [projects] = await pool.execute(`SELECT id FROM projects WHERE tenant_id=?`, [tenantId]);
    for (const p of projects) await rebuildHierarchy(tenantId, p.id);
    return res.json({ success: true, message: `Rebuilt hierarchy for ${projects.length} projects` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/pttm/team-tree
// Returns the full organisational hierarchy:
//   Team Lead → Project Lead → Project → Members
// Sourced from project_members (role-based) and projects table.
// ═══════════════════════════════════════════════════════════════════════════
router.get('/team-tree', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // ── 1. All active projects (with client + progress) ────────────────────
    const [projects] = await pool.query(
      `SELECT p.id, p.name, p.status, p.priority, p.progress_pct,
              p.start_date, p.end_date, p.color,
              c.id AS client_id, c.name AS client_name
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id AND c.tenant_id = p.tenant_id
       WHERE p.tenant_id = ?
       ORDER BY p.id`,
      [tenantId]
    );

    if (projects.length === 0) {
      return res.json({ success: true, teamLeads: [], stats: { teamLeads: 0, projectLeads: 0, projects: 0, members: 0 } });
    }

    const projectIds = projects.map(p => p.id);
    const ph = projectIds.map(() => '?').join(',');

    // ── 2. All active members for these projects ───────────────────────────
    const [allMembers] = await pool.query(
      `SELECT pm.project_id, pm.user_id, pm.role, pm.allocated_hrs,
              u.first_name, u.last_name, u.position, u.profile_photo
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id IN (${ph}) AND pm.tenant_id = ? AND pm.is_active = 1
       ORDER BY FIELD(pm.role,'team_lead','project_lead','member','observer'), u.first_name`,
      [...projectIds, tenantId]
    );

    // ── 3. Build lookup maps ───────────────────────────────────────────────
    const membersByProject = {};  // project_id → { team_leads:[], project_leads:[], members:[] }
    const teamLeadMap = {};       // user_id → teamLead node
    const projectLeadMap = {};    // `${user_id}-${project_id}` → projectLead node

    for (const pid of projectIds) membersByProject[pid] = { team_leads: [], project_leads: [], members: [] };

    for (const m of allMembers) {
      const bucket = membersByProject[m.project_id];
      if (!bucket) continue;
      const person = {
        user_id: m.user_id,
        name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
        position: m.position || '',
        profile_photo: m.profile_photo || null,
        role: m.role,
        allocated_hrs: m.allocated_hrs,
        project_id: m.project_id,
      };
      if (m.role === 'team_lead')    bucket.team_leads.push(person);
      else if (m.role === 'project_lead') bucket.project_leads.push(person);
      else bucket.members.push(person);
    }

    // ── 4. Build tree: Team Lead → ProjectLeads → Projects → Members ───────
    // Each team lead can span multiple projects.
    // Key grouping: team_lead.user_id

    // Collect all team leads across all projects
    const tlUserIds = new Set();
    for (const pid of projectIds) {
      membersByProject[pid].team_leads.forEach(tl => tlUserIds.add(tl.user_id));
    }

    // Projects with no team lead get grouped under a synthetic "Unassigned" lead
    const UNASSIGNED_TL_ID = -1;

    const teamLeadNodes = [];

    const buildTL = (tlUserId) => {
      // All projects where this person is team_lead
      const myProjects = projects.filter(p =>
        membersByProject[p.id].team_leads.some(tl => tl.user_id === tlUserId)
      );

      const tlPerson = allMembers.find(m => m.user_id === tlUserId && m.role === 'team_lead') || null;
      const tlName = tlPerson ? `${tlPerson.first_name || ''} ${tlPerson.last_name || ''}`.trim() : 'Unassigned';

      // Build project-lead sub-groups per project
      const projectNodes = myProjects.map(proj => {
        const bucket = membersByProject[proj.id];
        // Group members by project lead
        const plUsers = bucket.project_leads;

        // Build PL → member groups
        const plNodes = plUsers.map(pl => ({
          user_id:      pl.user_id,
          name:         pl.name,
          position:     pl.position,
          profile_photo:pl.profile_photo,
          // members assigned to this project (all members, since we don't track per-pl within a project yet)
          members: bucket.members,
        }));

        // Members not under any project lead
        const orphanMembers = plUsers.length === 0 ? bucket.members : [];

        return {
          id:           proj.id,
          name:         proj.name,
          status:       proj.status,
          priority:     proj.priority,
          progress:     proj.progress_pct || 0,
          color:        proj.color || '#5B4FF7',
          client_id:    proj.client_id,
          client_name:  proj.client_name,
          start_date:   proj.start_date,
          end_date:     proj.end_date,
          projectLeads: plNodes,
          members:      orphanMembers,
          memberCount:  bucket.members.length,
          allMembers:   bucket.members,
        };
      });

      return {
        user_id:      tlUserId,
        name:         tlName,
        position:     tlPerson?.position || 'Team Lead',
        profile_photo:tlPerson?.profile_photo || null,
        projects:     projectNodes,
        projectCount: projectNodes.length,
        memberCount:  projectNodes.reduce((s, p) => s + p.memberCount, 0),
      };
    };

    // Process real team leads
    for (const tlId of tlUserIds) {
      teamLeadNodes.push(buildTL(tlId));
    }

    // Projects with no team lead assigned
    const unownedProjects = projects.filter(p => membersByProject[p.id].team_leads.length === 0);
    if (unownedProjects.length > 0) {
      const bucket_fn = (proj) => {
        const bucket = membersByProject[proj.id];
        const plUsers = bucket.project_leads;
        return {
          id: proj.id, name: proj.name, status: proj.status, priority: proj.priority,
          progress: proj.progress_pct || 0, color: proj.color || '#5B4FF7',
          client_id: proj.client_id, client_name: proj.client_name,
          start_date: proj.start_date, end_date: proj.end_date,
          projectLeads: plUsers.map(pl => ({ ...pl, members: bucket.members })),
          members: plUsers.length === 0 ? bucket.members : [],
          memberCount: bucket.members.length,
          allMembers: bucket.members,
        };
      };
      teamLeadNodes.push({
        user_id: UNASSIGNED_TL_ID,
        name: 'Unassigned Projects',
        position: '',
        profile_photo: null,
        projects: unownedProjects.map(bucket_fn),
        projectCount: unownedProjects.length,
        memberCount: unownedProjects.reduce((s, p) => s + membersByProject[p.id].members.length, 0),
      });
    }

    // ── 5. Stats ──────────────────────────────────────────────────────────
    const uniquePLs = new Set(allMembers.filter(m => m.role === 'project_lead').map(m => m.user_id));
    const uniqueMembers = new Set(allMembers.filter(m => m.role === 'member').map(m => m.user_id));

    return res.json({
      success: true,
      teamLeads: teamLeadNodes,
      stats: {
        teamLeads:    tlUserIds.size,
        projectLeads: uniquePLs.size,
        projects:     projects.length,
        members:      uniqueMembers.size,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.ensureSchema = () => require('./pttmModel').ensureSchema();
