const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { getNotificationRecipients, sendToMany } = require('../notifications/notificationHelper');

// ── Project-docs file storage ──────────────────────────────────────────────────
const PROJECT_DOCS_DIR = path.join(__dirname, '../uploads/project-docs');

const projectDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(PROJECT_DOCS_DIR, { recursive: true });
    cb(null, PROJECT_DOCS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const ALLOWED_DOC_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'text/plain', 'text/csv',
];

const projectDocUpload = multer({
  storage: projectDocStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_DOC_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed. Allowed: PDF, Word, Excel, PowerPoint, images, TXT, CSV'));
  },
});

const ensureWorkReportSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS work_reports (
      id              INT          NOT NULL AUTO_INCREMENT,
      tenant_id       INT          NOT NULL,
      employee_id     VARCHAR(20)  NOT NULL,
      user_id         INT          NOT NULL,
      report_date     DATE         NOT NULL,
      project_id      INT          NULL,
      project_name    VARCHAR(200) NULL,
      task_title      VARCHAR(300) NOT NULL,
      work_done       TEXT         NOT NULL,
      challenges      TEXT         NULL,
      tomorrow_plan   TEXT         NULL,
      hours_worked    DECIMAL(4,1) NOT NULL DEFAULT 0,
      status          ENUM('draft','submitted','approved','needs_revision') NOT NULL DEFAULT 'submitted',
      manager_feedback TEXT        NULL,
      reviewed_by     INT          NULL,
      reviewed_at     DATETIME     NULL,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_wr_tenant_emp  (tenant_id, employee_id),
      KEY idx_wr_tenant_date (tenant_id, report_date),
      KEY idx_wr_status      (tenant_id, status),
      KEY idx_wr_user        (tenant_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

router.use(verifyToken);

// ── helpers ────────────────────────────────────────────────────────────────────

const resolveEmployeeId = async (tenantId, userId) => {
  const [rows] = await pool.execute(
    'SELECT id FROM employee_details WHERE employee_id=? AND tenant_id=? LIMIT 1',
    [userId, tenantId]
  );
  return rows[0]?.id || null;
};

// ── Employee self-service routes ───────────────────────────────────────────────

// GET /api/work-reports/my — employee lists their own reports
router.get('/my', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId   = req.user.id;
    const { month, year, status } = req.query;

    let sql = `
      SELECT wr.*, p.name AS project_name_ref,
             CONCAT(u2.first_name,' ',u2.last_name) AS reviewer_name
      FROM work_reports wr
      LEFT JOIN projects p ON p.id = wr.project_id AND p.tenant_id = wr.tenant_id
      LEFT JOIN users u2 ON u2.id = wr.reviewed_by
      WHERE wr.tenant_id=? AND wr.user_id=?
    `;
    const params = [tenantId, userId];

    if (month && year) {
      sql += ' AND MONTH(wr.report_date)=? AND YEAR(wr.report_date)=?';
      params.push(Number(month), Number(year));
    } else if (year) {
      sql += ' AND YEAR(wr.report_date)=?';
      params.push(Number(year));
    }
    if (status) { sql += ' AND wr.status=?'; params.push(status); }

    sql += ' ORDER BY wr.report_date DESC LIMIT 100';

    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, reports: rows });
  } catch (err) {
    console.error('GET /work-reports/my error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/work-reports — employee submits a daily work report
router.post('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId   = req.user.id;
    const { report_date, project_id, project_name, task_title, work_done, challenges, tomorrow_plan, hours_worked, status } = req.body;

    if (!report_date || !task_title || !work_done) {
      return res.status(400).json({ success: false, message: 'report_date, task_title, and work_done are required' });
    }

    const empId = await resolveEmployeeId(tenantId, userId);

    const [result] = await pool.execute(
      `INSERT INTO work_reports
        (tenant_id, employee_id, user_id, report_date, project_id, project_name, task_title, work_done, challenges, tomorrow_plan, hours_worked, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, empId || '', userId,
        report_date,
        project_id || null,
        project_name || null,
        task_title, work_done,
        challenges || null,
        tomorrow_plan || null,
        Number(hours_worked) || 0,
        ['draft', 'submitted'].includes(status) ? status : 'submitted',
      ]
    );

    // Notify TL, admin/HR, and client
    try {
      const { userIds, employeeName } = await getNotificationRecipients(tenantId, userId, { includeClient: false });
      await sendToMany(tenantId, userIds.filter(id => id !== userId), {
        title: 'Work Report Submitted',
        message: `${employeeName} submitted a work report for ${report_date}${task_title ? `: ${task_title}` : ''}.`,
        type: 'work_report',
        related_id: result.insertId,
      });
    } catch (_) {}

    return res.status(201).json({ success: true, message: 'Work report submitted', id: result.insertId });
  } catch (err) {
    console.error('POST /work-reports error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/work-reports/:id — employee updates their own draft report
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId   = req.user.id;
    const { task_title, work_done, challenges, tomorrow_plan, hours_worked, status } = req.body;

    const [existing] = await pool.execute(
      'SELECT id, status FROM work_reports WHERE id=? AND tenant_id=? AND user_id=? LIMIT 1',
      [req.params.id, tenantId, userId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Report not found' });
    if (existing[0].status === 'approved') {
      return res.status(400).json({ success: false, message: 'Approved reports cannot be edited' });
    }

    await pool.execute(
      `UPDATE work_reports SET task_title=?, work_done=?, challenges=?, tomorrow_plan=?, hours_worked=?, status=?, updated_at=NOW()
       WHERE id=? AND tenant_id=? AND user_id=?`,
      [task_title, work_done, challenges || null, tomorrow_plan || null, Number(hours_worked) || 0,
       ['draft', 'submitted'].includes(status) ? status : 'submitted',
       req.params.id, tenantId, userId]
    );
    return res.json({ success: true, message: 'Report updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Team Lead routes (no module access required, auth only) ───────────────────

// GET /api/work-reports/team/members — TL gets list of their team members
router.get('/team/members', async (req, res) => {
  try {
    const tenantId    = req.user.tenant_id;
    const teamLeadId  = req.user.id;
    const [members] = await pool.execute(
      `SELECT u.id as user_id, u.first_name, u.last_name, u.email, u.position,
              ed.id as employee_id
       FROM employee_details ed
       JOIN users u ON u.id = CAST(ed.employee_id AS UNSIGNED) AND u.tenant_id = ed.tenant_id
       WHERE ed.tenant_id = ? AND ed.team_lead_id = ? AND u.is_active = 1
       ORDER BY u.first_name`,
      [tenantId, teamLeadId]
    );
    return res.json({ success: true, members });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/work-reports/team — TL views reports of their team (auth only, no module access needed)
router.get('/team', async (req, res) => {
  try {
    const tenantId   = req.user.tenant_id;
    const teamLeadId = req.user.id;
    const { user_id: filterUserId, month, year, status } = req.query;

    let sql = `
      SELECT wr.*,
             CONCAT(u.first_name,' ',u.last_name) AS employee_name,
             u.email, ed.id AS emp_number
      FROM work_reports wr
      JOIN users u ON u.id = wr.user_id
      LEFT JOIN employee_details ed ON CAST(ed.employee_id AS UNSIGNED) = wr.user_id AND ed.tenant_id = wr.tenant_id
      WHERE wr.tenant_id = ?
        AND EXISTS (
          SELECT 1 FROM employee_details ted
          WHERE CAST(ted.employee_id AS UNSIGNED) = wr.user_id
            AND ted.tenant_id = wr.tenant_id
            AND ted.team_lead_id = ?
        )
    `;
    const params = [tenantId, teamLeadId];

    if (filterUserId) { sql += ' AND wr.user_id=?'; params.push(Number(filterUserId)); }
    if (status)       { sql += ' AND wr.status=?';  params.push(status); }
    if (month && year) {
      sql += ' AND MONTH(wr.report_date)=? AND YEAR(wr.report_date)=?';
      params.push(Number(month), Number(year));
    }
    sql += ' ORDER BY wr.report_date DESC, wr.created_at DESC LIMIT 500';

    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, reports: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/work-reports/team/:id/review — TL reviews a team member's report
router.put('/team/:id/review', async (req, res) => {
  try {
    const tenantId   = req.user.tenant_id;
    const teamLeadId = req.user.id;
    const { status, manager_feedback } = req.body;
    if (!['approved', 'needs_revision'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or needs_revision' });
    }

    // Verify report belongs to a team member
    const [existing] = await pool.execute(
      `SELECT wr.id, wr.user_id, wr.report_date, wr.task_title FROM work_reports wr
       WHERE wr.id = ? AND wr.tenant_id = ?
         AND EXISTS (
           SELECT 1 FROM employee_details ed
           WHERE CAST(ed.employee_id AS UNSIGNED) = wr.user_id
             AND ed.tenant_id = wr.tenant_id AND ed.team_lead_id = ?
         ) LIMIT 1`,
      [req.params.id, tenantId, teamLeadId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Report not found or not in your team' });

    await pool.execute(
      `UPDATE work_reports SET status=?, manager_feedback=?, reviewed_by=?, reviewed_at=NOW(), updated_at=NOW()
       WHERE id=? AND tenant_id=?`,
      [status, manager_feedback || null, req.user.id, req.params.id, tenantId]
    );

    // Notify the employee
    try {
      const { sendNotification } = require('../notifications/notificationHelper');
      const reportDate = existing[0].report_date ? new Date(existing[0].report_date).toLocaleDateString('en-IN') : '';
      const taskTitle  = existing[0].task_title ? `: ${existing[0].task_title}` : '';
      await sendNotification(tenantId, existing[0].user_id, {
        title: status === 'approved' ? '✅ Work Report Approved' : '↩ Work Report Needs Revision',
        message: status === 'approved'
          ? `Your work report for ${reportDate}${taskTitle} has been approved.`
          : `Your work report for ${reportDate}${taskTitle} needs revision.${manager_feedback ? ` Feedback: ${manager_feedback}` : ''}`,
        type: 'work_report',
        related_id: Number(req.params.id),
      });
    } catch (_) {}

    return res.json({ success: true, message: 'Report reviewed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin / Manager routes ─────────────────────────────────────────────────────

// GET /api/work-reports — admin/HR/TL views reports (scoped by role)
router.get('/', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId   = req.user.id;
    const role     = (req.user?.position || req.user?.role || '').toLowerCase();
    const isAdminOrHr = ['admin', 'hr'].includes(role);

    const { employee_id, user_id: filterUserId, month, year, status, date } = req.query;

    let sql = `
      SELECT wr.*,
             CONCAT(u.first_name,' ',u.last_name)  AS employee_name,
             u.email,
             ed.id AS emp_number,
             CONCAT(u2.first_name,' ',u2.last_name) AS reviewer_name
      FROM work_reports wr
      JOIN users u ON u.id = wr.user_id
      LEFT JOIN employee_details ed ON CAST(ed.employee_id AS UNSIGNED) = wr.user_id AND ed.tenant_id = wr.tenant_id
      LEFT JOIN users u2 ON u2.id = wr.reviewed_by
      WHERE wr.tenant_id=?
    `;
    const params = [tenantId];

    // Non-admin/HR can only see reports from employees in their team
    if (!isAdminOrHr) {
      sql += ` AND EXISTS (
        SELECT 1 FROM employee_details ted
        WHERE CAST(ted.employee_id AS UNSIGNED) = wr.user_id
          AND ted.tenant_id = wr.tenant_id
          AND ted.team_lead_id = ?
      )`;
      params.push(userId);
    }

    // Filter by specific employee — prefer numeric user_id (always populated) over string employee_id
    if (filterUserId) { sql += ' AND wr.user_id=?'; params.push(Number(filterUserId)); }
    else if (employee_id) { sql += ' AND wr.employee_id=?'; params.push(employee_id); }
    if (status)      { sql += ' AND wr.status=?';      params.push(status); }
    if (date)        { sql += ' AND wr.report_date=?'; params.push(date); }
    if (month && year) {
      sql += ' AND MONTH(wr.report_date)=? AND YEAR(wr.report_date)=?';
      params.push(Number(month), Number(year));
    } else if (year) {
      sql += ' AND YEAR(wr.report_date)=?';
      params.push(Number(year));
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    sql += ' ORDER BY wr.report_date DESC, wr.created_at DESC';
    const [allRows] = await pool.execute(sql, params);
    const rows = allRows.slice(offset, offset + limit);
    return res.json({
      success: true,
      reports: rows,
      count: allRows.length,
      pagination: { page, limit, total: allRows.length, totalPages: Math.ceil(allRows.length / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/work-reports/:id/review — manager adds feedback + status
router.put('/:id/review', requireModuleAccess('employee_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status, manager_feedback } = req.body;
    const allowedStatuses = ['approved', 'needs_revision'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowedStatuses.join(', ')}` });
    }

    const [existing] = await pool.execute(
      'SELECT id, user_id, report_date, task_title FROM work_reports WHERE id=? AND tenant_id=? LIMIT 1',
      [req.params.id, tenantId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Report not found' });

    await pool.execute(
      `UPDATE work_reports SET status=?, manager_feedback=?, reviewed_by=?, reviewed_at=NOW(), updated_at=NOW()
       WHERE id=? AND tenant_id=?`,
      [status, manager_feedback || null, req.user.id, req.params.id, tenantId]
    );

    // Notify the employee about the review outcome
    try {
      const { sendNotification } = require('../notifications/notificationHelper');
      const reportDate = existing[0].report_date ? new Date(existing[0].report_date).toLocaleDateString('en-IN') : '';
      const taskTitle  = existing[0].task_title ? `: ${existing[0].task_title}` : '';
      if (status === 'approved') {
        await sendNotification(tenantId, existing[0].user_id, {
          title: '✅ Work Report Approved',
          message: `Your work report for ${reportDate}${taskTitle} has been approved.`,
          type: 'work_report',
          related_id: Number(req.params.id),
        });
      } else if (status === 'needs_revision') {
        await sendNotification(tenantId, existing[0].user_id, {
          title: '↩ Work Report Needs Revision',
          message: `Your work report for ${reportDate}${taskTitle} needs revision.${manager_feedback ? ` Feedback: ${manager_feedback}` : ''}`,
          type: 'work_report',
          related_id: Number(req.params.id),
        });
      }
    } catch (_) {}

    return res.json({ success: true, message: 'Report reviewed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/work-reports/stats — summary stats for dashboard
router.get('/stats', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { month, year } = req.query;
    const y = year  || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;

    const [rows] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(status='submitted') AS pending_review,
         SUM(status='approved')  AS approved,
         SUM(status='needs_revision') AS needs_revision,
         SUM(status='draft')     AS drafts,
         COUNT(DISTINCT user_id) AS unique_submitters,
         ROUND(AVG(hours_worked),1) AS avg_hours
       FROM work_reports
       WHERE tenant_id=? AND MONTH(report_date)=? AND YEAR(report_date)=?`,
      [tenantId, m, y]
    );
    return res.json({ success: true, stats: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Project Documents ──────────────────────────────────────────────────────────

const ensureProjectDocSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS project_docs (
      id           INT          NOT NULL AUTO_INCREMENT,
      tenant_id    INT          NOT NULL,
      employee_id  VARCHAR(20)  NOT NULL,
      user_id      INT          NOT NULL,
      project_id   INT          NULL,
      project_name VARCHAR(200) NULL,
      doc_name     VARCHAR(300) NOT NULL,
      file_path    VARCHAR(500) NOT NULL,
      file_size    INT          NULL,
      mime_type    VARCHAR(150) NULL,
      description  TEXT         NULL,
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_pd_tenant_user   (tenant_id, user_id),
      KEY idx_pd_tenant_proj   (tenant_id, project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// POST /api/work-reports/project-docs — employee uploads a project document
router.post('/project-docs', projectDocUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const tenantId = req.user.tenant_id;
    const userId   = req.user.id;
    const { project_id, project_name, doc_name, description } = req.body;

    const empId = await resolveEmployeeId(tenantId, userId);
    const filePath = `/uploads/project-docs/${req.file.filename}`;

    const [result] = await pool.execute(
      `INSERT INTO project_docs
         (tenant_id, employee_id, user_id, project_id, project_name, doc_name, file_path, file_size, mime_type, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, empId || '', userId,
        project_id ? Number(project_id) : null,
        project_name || null,
        doc_name || req.file.originalname,
        filePath, req.file.size || null, req.file.mimetype,
        description || null,
      ]
    );

    // Notify TL, admin/HR, and client
    try {
      const { userIds, employeeName } = await getNotificationRecipients(tenantId, userId, { includeClient: false });
      await sendToMany(tenantId, userIds.filter(id => id !== userId), {
        title: 'Project Document Uploaded',
        message: `${employeeName} uploaded a project document: ${doc_name || req.file.originalname}${project_name ? ` (${project_name})` : ''}.`,
        type: 'work_report',
        related_id: result.insertId,
      });
    } catch (_) {}

    return res.status(201).json({ success: true, id: result.insertId, file_path: filePath });
  } catch (err) {
    console.error('POST /work-reports/project-docs error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/work-reports/project-docs — list documents
// Employee: own uploads | Admin/HR: all with optional employee filter | TL: their team members
router.get('/project-docs', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId   = req.user.id;
    const role     = req.user.position || req.user.role;
    const isAdminHr = role === 'admin' || role === 'hr';
    const { employee_id, project_id } = req.query;

    let sql = `
      SELECT pd.*,
             CONCAT(u.first_name,' ',u.last_name) AS uploader_name,
             ed.id AS emp_number,
             ed.position AS job_title
      FROM project_docs pd
      JOIN users u ON u.id = pd.user_id
      LEFT JOIN employee_details ed ON ed.employee_id = pd.user_id AND ed.tenant_id = pd.tenant_id
      WHERE pd.tenant_id = ?
    `;
    const params = [tenantId];

    if (!isAdminHr) {
      // Non-admin: check if they are a TL for the uploader, or own the docs
      sql += ` AND (
        pd.user_id = ?
        OR pd.employee_id IN (
          SELECT ed2.id FROM employee_details ed2
          WHERE ed2.tenant_id = ? AND (ed2.reporting_manager_id = ? OR ed2.team_lead_id = ?)
        )
      )`;
      params.push(userId, tenantId, userId, userId);
    }

    if (employee_id) { sql += ' AND pd.employee_id = ?'; params.push(employee_id); }
    if (project_id)  { sql += ' AND pd.project_id = ?';  params.push(Number(project_id)); }

    sql += ' ORDER BY pd.created_at DESC LIMIT 200';
    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, docs: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/work-reports/project-docs/:id — delete a document (owner or admin)
router.delete('/project-docs/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId   = req.user.id;
    const role     = req.user.position || req.user.role;
    const isAdminHr = role === 'admin' || role === 'hr';

    const [rows] = await pool.execute(
      'SELECT id, user_id, file_path FROM project_docs WHERE id=? AND tenant_id=? LIMIT 1',
      [req.params.id, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Document not found' });

    if (!isAdminHr && rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete file from disk
    const absPath = path.join(__dirname, '../', rows[0].file_path.replace('/uploads/', 'uploads/'));
    try { fs.unlinkSync(absPath); } catch (_) {}

    await pool.execute('DELETE FROM project_docs WHERE id=?', [req.params.id]);
    return res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/work-reports/export ──────────────────────────────────────────────
// Export work reports as XLSX (admin/HR/TL with work_reports read access)
router.get('/export', requireModuleAccess('work_reports', 'read'), async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const tenantId = req.user.tenant_id;
    const { start_date, end_date, month, year, employee_id, status } = req.query;

    let sql = `SELECT u.first_name, u.last_name, u.email, u.position,
                      wr.report_date, wr.project_name, wr.task_title,
                      wr.work_done, wr.hours_worked, wr.status,
                      wr.challenges, wr.tomorrow_plan, wr.manager_feedback
               FROM work_reports wr
               JOIN users u ON u.id = wr.user_id
               WHERE wr.tenant_id = ?`;
    const params = [tenantId];

    // Team Lead sees only their team's reports
    if (req.user.position === 'team_lead') {
      sql += ` AND wr.user_id IN (
        SELECT u2.id FROM employee_details ed2
        JOIN users u2 ON u2.id = ed2.employee_id
        WHERE ed2.team_lead_id = ? AND ed2.tenant_id = ?
      )`;
      params.push(req.user.id, tenantId);
    }

    if (employee_id) { sql += ' AND wr.user_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND wr.status = ?'; params.push(status); }
    if (start_date && end_date) { sql += ' AND wr.report_date BETWEEN ? AND ?'; params.push(start_date, end_date); }
    else if (month && year) { sql += ' AND MONTH(wr.report_date) = ? AND YEAR(wr.report_date) = ?'; params.push(Number(month), Number(year)); }
    else if (year) { sql += ' AND YEAR(wr.report_date) = ?'; params.push(Number(year)); }
    sql += ' ORDER BY wr.report_date DESC, u.first_name ASC';

    const [rows] = await pool.execute(sql, params);

    const wsData = [
      ['Name', 'Email', 'Position', 'Date', 'Project', 'Task', 'Work Done', 'Hours', 'Status', 'Challenges', 'Tomorrow Plan', 'Manager Feedback'],
      ...rows.map(r => [
        `${r.first_name} ${r.last_name}`, r.email, r.position || '',
        r.report_date ? new Date(r.report_date).toLocaleDateString('en-IN') : '',
        r.project_name || '', r.task_title || '', r.work_done || '',
        r.hours_worked || 0, r.status || '',
        r.challenges || '', r.tomorrow_plan || '', r.manager_feedback || ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 13 }, { wch: 20 },
      { wch: 25 }, { wch: 50 }, { wch: 8 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 40 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Reports');

    const now = new Date();
    const fileName = `WorkReports_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`;
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('[WorkReportExport] error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});

router.ensureSchema = async () => {
  await ensureWorkReportSchema();
  await ensureProjectDocSchema();
};

module.exports = router;
