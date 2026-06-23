const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Attachment storage
const momAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/mom-attachments');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `mom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const ALLOWED_MOM_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif',
  'text/plain',
];
const momUpload = multer({
  storage: momAttachmentStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MOM_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, images, TXT'));
  },
});

const ensureMOMSchema = async (pool) => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS meeting_minutes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        meeting_date DATE NOT NULL,
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        meeting_type VARCHAR(100),
        organizer_id INT NOT NULL,
        attendees JSON,
        agenda TEXT,
        notes TEXT,
        status ENUM('draft', 'published') DEFAULT 'draft',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id),
        INDEX idx_date (tenant_id, meeting_date),
        INDEX idx_status (tenant_id, status)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS mom_action_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mom_id INT NOT NULL,
        tenant_id INT NOT NULL,
        description VARCHAR(500) NOT NULL,
        assigned_to INT,
        due_date DATE,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('open', 'in_progress', 'completed', 'cancelled') DEFAULT 'open',
        follow_up_notes TEXT,
        completed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (mom_id) REFERENCES meeting_minutes(id) ON DELETE CASCADE,
        INDEX idx_mom (mom_id),
        INDEX idx_assigned (tenant_id, assigned_to),
        INDEX idx_due (tenant_id, due_date)
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS mom_attachments (
        id           INT          NOT NULL AUTO_INCREMENT,
        mom_id       INT          NOT NULL,
        tenant_id    INT          NOT NULL,
        file_name    VARCHAR(300) NOT NULL,
        file_path    VARCHAR(500) NOT NULL,
        file_size    INT          NULL,
        mime_type    VARCHAR(100) NULL,
        uploaded_by  INT          NOT NULL,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_mom_attach (mom_id, tenant_id),
        FOREIGN KEY (mom_id) REFERENCES meeting_minutes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    if (err.code !== 'ER_TABLE_EXISTS_ERROR') console.error('MOM Schema error:', err);
  }
};

// GET /api/mom - list meetings
// Published MOMs visible to all authenticated users in tenant.
// Draft MOMs visible only to the creator or admin/HR.
router.get('/', verifyToken, async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const isHrAdmin = ['admin', 'hr'].includes(req.user.position);

    const visibilityClause = isHrAdmin
      ? ''
      : " AND (mm.status = 'published' OR mm.created_by = ?)";
    const params = isHrAdmin ? [tenantId] : [tenantId, userId];

    const [meetings] = await pool.execute(
      `SELECT mm.*, u.first_name, u.last_name FROM meeting_minutes mm
       JOIN users u ON u.id = mm.organizer_id
       WHERE mm.tenant_id = ?${visibilityClause}
       ORDER BY mm.meeting_date DESC LIMIT 100`,
      params
    );

    res.json({ success: true, meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mom - create meeting
router.post('/', verifyToken, requireModuleAccess('mom_management', 'write'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const { title, meeting_date, location, meeting_type, attendees, agenda, notes } = req.body;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    const [result] = await pool.execute(
      `INSERT INTO meeting_minutes
        (tenant_id, title, meeting_date, location, meeting_type, organizer_id, attendees, agenda, notes, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [tenantId, title, meeting_date, location || '', meeting_type || '', userId, JSON.stringify(attendees || []), agenda || '', notes || '', userId]
    );

    res.json({ success: true, message: 'MOM created', mom_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/mom/:id - update meeting
router.put('/:id', verifyToken, requireModuleAccess('mom_management', 'write'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const { id } = req.params;
    const { title, agenda, notes, status } = req.body;
    const tenantId = req.user.tenant_id;

    await pool.execute(
      `UPDATE meeting_minutes SET title=?, agenda=?, notes=?, status=?, updated_at=NOW()
       WHERE id=? AND tenant_id=?`,
      [title, agenda || '', notes || '', status || 'draft', id, tenantId]
    );

    res.json({ success: true, message: 'MOM updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/mom/:id/action-items - list action items
router.get('/:id/action-items', verifyToken, async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const [items] = await pool.execute(
      `SELECT mai.*, u.first_name, u.last_name FROM mom_action_items mai
       LEFT JOIN users u ON u.id = mai.assigned_to
       WHERE mai.mom_id=? AND mai.tenant_id=? ORDER BY mai.due_date`,
      [id, tenantId]
    );

    res.json({ success: true, action_items: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mom/:id/action-items - add action item
router.post('/:id/action-items', verifyToken, requireModuleAccess('mom_management', 'write'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const { id } = req.params;
    const { description, assigned_to, due_date, priority } = req.body;
    const tenantId = req.user.tenant_id;

    await pool.execute(
      `INSERT INTO mom_action_items
        (mom_id, tenant_id, description, assigned_to, due_date, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [id, tenantId, description, assigned_to || null, due_date || null, priority || 'medium']
    );

    res.json({ success: true, message: 'Action item added' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/mom/action-items/:itemId - update action item
router.put('/action-items/:itemId', verifyToken, requireModuleAccess('mom_management', 'write'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const { itemId } = req.params;
    const { status, follow_up_notes } = req.body;
    const tenantId = req.user.tenant_id;

    const completedAt = status === 'completed' ? new Date() : null;

    await pool.execute(
      `UPDATE mom_action_items SET status=?, follow_up_notes=?, completed_at=?
       WHERE id=? AND tenant_id=?`,
      [status, follow_up_notes || '', completedAt, itemId, tenantId]
    );

    res.json({ success: true, message: 'Action item updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── MOM Attachment Routes ──────────────────────────────────────────────────────

// GET /api/mom/:id/attachments — list attachments for a MOM
router.get('/:id/attachments', verifyToken, async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT ma.*, CONCAT(u.first_name,' ',u.last_name) AS uploader_name
       FROM mom_attachments ma
       JOIN users u ON u.id = ma.uploaded_by
       WHERE ma.mom_id=? AND ma.tenant_id=?
       ORDER BY ma.created_at DESC`,
      [req.params.id, tenantId]
    );
    return res.json({ success: true, attachments: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mom/:id/attachments — upload one or more files to a MOM
router.post('/:id/attachments', verifyToken, requireModuleAccess('mom_management', 'write'),
  momUpload.array('files', 5), async (req, res) => {
    try {
      const { pool } = require('../../config/db');
      const tenantId = req.user.tenant_id;
      const momId = req.params.id;

      // Verify the MOM belongs to this tenant
      const [momRows] = await pool.execute(
        'SELECT id FROM meeting_minutes WHERE id=? AND tenant_id=? LIMIT 1',
        [momId, tenantId]
      );
      if (!momRows.length) return res.status(404).json({ success: false, message: 'MOM not found' });
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
      }

      const inserted = [];
      for (const file of req.files) {
        const filePath = `/uploads/mom-attachments/${file.filename}`;
        const [result] = await pool.execute(
          `INSERT INTO mom_attachments (mom_id, tenant_id, file_name, file_path, file_size, mime_type, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [momId, tenantId, file.originalname, filePath, file.size || null, file.mimetype, req.user.id]
        );
        inserted.push({ id: result.insertId, file_name: file.originalname, file_path: filePath });
      }

      return res.status(201).json({ success: true, message: `${inserted.length} file(s) uploaded`, attachments: inserted });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// DELETE /api/mom/attachments/:attachmentId — delete an attachment
router.delete('/attachments/:attachmentId', verifyToken, requireModuleAccess('mom_management', 'write'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;

    const [rows] = await pool.execute(
      'SELECT file_path FROM mom_attachments WHERE id=? AND tenant_id=? LIMIT 1',
      [req.params.attachmentId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Attachment not found' });

    // Remove file from disk
    const absPath = path.join(__dirname, '../', rows[0].file_path.replace(/^\/uploads/, 'uploads'));
    fs.unlink(absPath, () => {}); // non-blocking, ignore error if already removed

    await pool.execute('DELETE FROM mom_attachments WHERE id=? AND tenant_id=?', [req.params.attachmentId, tenantId]);
    return res.json({ success: true, message: 'Attachment deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { router, ensureMOMSchema };
