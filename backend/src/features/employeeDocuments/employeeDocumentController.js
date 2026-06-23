const path = require('path');
const fs = require('fs');
const { pool } = require('../../config/db');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads/employee-docs');

const DOC_TYPES = ['photo','cv','aadhaar','pan','resume','bank_passbook','experience_certificate','education_certificate','offer_letter','other'];

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const docController = {
  // Employee: upload own document
  upload: async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const userId = req.user.id;
      const { doc_type = 'other' } = req.body;

      if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });

      const ext = path.extname(req.file.originalname);
      const safeName = `${tenantId}_${userId}_${doc_type}_${Date.now()}${ext}`;
      const destDir = path.join(UPLOAD_DIR, String(tenantId), String(userId));
      ensureDir(destDir);
      const destPath = path.join(destDir, safeName);
      fs.writeFileSync(destPath, req.file.buffer);

      const relativePath = `/uploads/employee-docs/${tenantId}/${userId}/${safeName}`;

      await pool.execute(
        `INSERT INTO employee_documents (tenant_id, employee_user_id, doc_type, original_filename, file_path, file_size, mime_type, uploaded_by)
         VALUES (?,?,?,?,?,?,?,?)`,
        [tenantId, userId, doc_type, req.file.originalname, relativePath, req.file.size, req.file.mimetype, userId]
      );

      res.status(201).json({ success: true, message: 'Document uploaded successfully', file_path: relativePath });
    } catch (err) {
      console.error('[EmployeeDocs] upload error:', err);
      res.status(500).json({ success: false, message: 'Upload failed' });
    }
  },

  // Employee: get own documents
  getMyDocuments: async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT id, doc_type, original_filename AS file_name, file_path, file_size, mime_type, created_at AS uploaded_at
         FROM employee_documents
         WHERE tenant_id=? AND employee_user_id=?
         ORDER BY created_at DESC`,
        [req.tenantId, req.user.id]
      );
      res.json({ success: true, documents: rows });
    } catch (err) {
      console.error('[EmployeeDocs] getMyDocuments error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
  },

  // Employee: delete own document
  deleteMyDocument: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute(
        `SELECT * FROM employee_documents WHERE id=? AND tenant_id=? AND employee_user_id=?`,
        [id, req.tenantId, req.user.id]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Document not found' });

      const doc = rows[0];
      const fullPath = path.join(__dirname, '../../../', doc.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

      await pool.execute('DELETE FROM employee_documents WHERE id=?', [id]);
      res.json({ success: true });
    } catch (err) {
      console.error('[EmployeeDocs] delete error:', err);
      res.status(500).json({ success: false, message: 'Delete failed' });
    }
  },

  // Admin/HR: get all documents for a specific employee
  getEmployeeDocuments: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const [rows] = await pool.execute(
        `SELECT d.id, d.doc_type, d.original_filename AS file_name, d.file_path, d.file_size, d.mime_type,
                d.created_at AS uploaded_at, CONCAT(u.first_name,' ',u.last_name) AS employee_name
         FROM employee_documents d
         JOIN users u ON u.id = d.employee_user_id
         WHERE d.tenant_id=? AND d.employee_user_id=?
         ORDER BY d.created_at DESC`,
        [req.tenantId, employeeId]
      );
      res.json({ success: true, documents: rows });
    } catch (err) {
      console.error('[EmployeeDocs] getEmployeeDocuments error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
  },

  // Admin/HR: get all documents across all employees
  getAllDocuments: async (req, res) => {
    try {
      const { doc_type, employee_id } = req.query;
      let query = `
        SELECT d.id, d.doc_type, d.original_filename AS file_name, d.file_path, d.file_size,
               d.mime_type, d.created_at AS uploaded_at,
               CONCAT(u.first_name,' ',u.last_name) AS employee_name
        FROM employee_documents d
        JOIN users u ON u.id = d.employee_user_id
        WHERE d.tenant_id=?`;
      const params = [req.tenantId];

      if (doc_type && DOC_TYPES.includes(doc_type)) { query += ' AND d.doc_type=?'; params.push(doc_type); }
      if (employee_id) { query += ' AND d.employee_user_id=?'; params.push(employee_id); }
      query += ' ORDER BY d.created_at DESC';

      const [rows] = await pool.execute(query, params);
      res.json({ success: true, documents: rows });
    } catch (err) {
      console.error('[EmployeeDocs] getAllDocuments error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
  },
};

module.exports = docController;
