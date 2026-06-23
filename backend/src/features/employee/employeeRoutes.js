// backend/src/features/employee/employeeRoutes.js
const express = require('express');
const router = express.Router();
const employeeController = require('./employeeController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const multer = require('multer');
const path = require('path');
const { getNotificationRecipients, sendToMany } = require('../notifications/notificationHelper');
const {
  MAX_BULK_UPLOAD_FILE_SIZE,
  ALLOWED_BULK_UPLOAD_EXTENSIONS,
  ALLOWED_BULK_UPLOAD_MIME_TYPES
} = require('./employeeBulkUploadConfig');


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BULK_UPLOAD_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const hasAllowedExtension = ALLOWED_BULK_UPLOAD_EXTENSIONS.includes(extension);
    const hasAllowedMimeType = ALLOWED_BULK_UPLOAD_MIME_TYPES.includes(file.mimetype);

    if (!hasAllowedExtension || !hasAllowedMimeType) {
      return cb(new Error('Only CSV and XLSX files are allowed'));
    }

    return cb(null, true);
  }
});

const handleBulkUploadFile = (req, res, next) => {
  bulkUpload.single('file')(req, res, (error) => {
    if (!error) return next();

    const message = error.code === 'LIMIT_FILE_SIZE'
      ? `File size must be ${Math.floor(MAX_BULK_UPLOAD_FILE_SIZE / 1024 / 1024)}MB or less`
      : error.message;

    return res.status(400).json({
      success: false,
      totalRows: 0,
      insertedRows: 0,
      failedRows: 0,
      errors: [{ row: null, message }]
    });
  });
};

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== EMPLOYEE ROUTES ====================

// GET /api/employees - Get all employees
router.get('/', requireModuleAccess('employee_management', 'read'), employeeController.getAllEmployees);

// GET /api/employees/departments - Get departments
router.get('/departments', requireModuleAccess('employee_management', 'read'), employeeController.getDepartments);

// POST /api/employees/departments - Create department
router.post('/departments', requireModuleAccess('employee_management', 'write'), employeeController.createDepartment);

// PUT /api/employees/departments/:departmentId - Update department
router.put('/departments/:departmentId', requireModuleAccess('employee_management', 'write'), employeeController.updateDepartment);

// DELETE /api/employees/departments/:departmentId - Delete department
router.delete('/departments/:departmentId', requireModuleAccess('employee_management', 'write'), employeeController.deleteDepartment);

// GET /api/employees/my-profile - Get current employee profile
router.get('/my-profile', employeeController.getMyProfile);

// GET /api/employees/positions/suggested - Get suggested positions
router.get('/positions/suggested', requireModuleAccess('employee_management', 'read'), employeeController.getSuggestedPositions);

// POST /api/employees/positions/suggested - Add new suggested position
router.post('/positions/suggested', requireModuleAccess('employee_management', 'write'), employeeController.addSuggestedPosition);

// POST /api/employees - Create new employee
router.post('/', requireModuleAccess('employee_management', 'write'), employeeController.createEmployee);

// POST /api/employees/bulk-upload - Upload CSV/XLSX file and create employees
router.post('/bulk-upload', requireModuleAccess('employee_management', 'write'), handleBulkUploadFile, employeeController.bulkUploadEmployees);

// POST /api/employees/bulk - Bulk create employees
router.post('/bulk', requireModuleAccess('employee_management', 'write'), employeeController.bulkCreateEmployee);

// GET /api/employees/my/documents — employee views their own upload history
router.get('/my/documents', async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const [rows] = await pool.execute(
      `SELECT id, doc_type, original_filename, file_path, file_size, mime_type, created_at
       FROM employee_documents
       WHERE tenant_id=? AND employee_user_id=?
       ORDER BY created_at DESC`,
      [req.user.tenant_id, req.user.id]
    );
    return res.json({ success: true, documents: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/documents/all — admin views all employees' uploads
router.get('/documents/all', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const [rows] = await pool.execute(
      `SELECT ed.id, ed.doc_type, ed.original_filename, ed.file_path, ed.file_size,
              ed.mime_type, ed.created_at,
              u.first_name, u.last_name, u.email,
              emp.employee_id as emp_number
       FROM employee_documents ed
       JOIN users u ON u.id = ed.employee_user_id
       LEFT JOIN employee_details emp ON emp.employee_id = ed.employee_user_id AND emp.tenant_id = ed.tenant_id
       WHERE ed.tenant_id=?
       ORDER BY ed.created_at DESC`,
      [req.user.tenant_id]
    );
    return res.json({ success: true, documents: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/next-id - Preview next auto-generated employee ID
router.get('/next-id', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const Employee = require('./employeeModel');
    const id = await Employee.previewNextId(req.user.tenant_id);
    return res.json({ success: true, next_id: id });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/positions — distinct positions used in this tenant
router.get('/positions', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const [rows] = await pool.execute(
      `SELECT DISTINCT position as name FROM employee_details
       WHERE tenant_id=? AND position IS NOT NULL AND position != ''
       ORDER BY position ASC`,
      [req.user.tenant_id]
    );
    return res.json({ success: true, positions: rows.map(r => r.name) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/roles — alias: returns same distinct positions list for role dropdowns
router.get('/roles', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const [rows] = await pool.execute(
      `SELECT DISTINCT position as name FROM employee_details
       WHERE tenant_id=? AND position IS NOT NULL AND position != ''
       ORDER BY position ASC`,
      [req.user.tenant_id]
    );
    return res.json({ success: true, roles: rows.map(r => ({ id: r.name, name: r.name })) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/my-team — Team Lead views their direct reports
// IMPORTANT: must be BEFORE /:id wildcard to avoid route collision
router.get('/my-team', async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT ed.id AS emp_number, u.first_name, u.last_name, u.email, u.phone,
              ed.position, ed.department_id, ed.employment_type, ed.joining_date, ed.status,
              d.name AS department
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id
       LEFT JOIN departments d ON d.id = ed.department_id
       WHERE ed.tenant_id = ? AND ed.team_lead_id = ?
         AND LOWER(COALESCE(ed.status,'active')) NOT IN ('inactive','deleted')
       ORDER BY u.first_name ASC`,
      [tenantId, userId]
    );
    return res.json({ success: true, team: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/my-id-card — employee fetches their own ID card data (MUST be before /:id)
router.get('/my-id-card', async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    const userId   = req.user.id;
    const [rows] = await pool.execute(
      `SELECT u.first_name, u.last_name, u.email, u.phone, u.profile_photo,
              ed.id as emp_number, ed.position, ed.joining_date,
              d.name as department_name, ed.employment_category,
              tb.company_name, tb.logo_url
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       LEFT JOIN departments d ON d.id = ed.department_id
       LEFT JOIN tenant_branding tb ON tb.tenant_id = ed.tenant_id
       WHERE ed.employee_id = ? AND ed.tenant_id = ?`,
      [userId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Profile not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', requireModuleAccess('employee_management', 'read'), employeeController.getEmployee);

// GET /api/employees/:id/face-status - Get face enrollment status
router.get('/:id/face-status', requireModuleAccess('employee_management', 'read'), employeeController.getFaceStatus);

// PUT /api/employees/:id - Update employee
router.put('/:id', requireModuleAccess('employee_management', 'write'), employeeController.updateEmployee);

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', requireModuleAccess('employee_management', 'write'), employeeController.deleteEmployee);

// POST /api/employees/:id/reset-password - Reset employee password
router.post('/:id/reset-password', requireModuleAccess('employee_management', 'write'), employeeController.resetPassword);

// POST /api/employees/:id/enroll-face - Enroll face for employee
router.post('/:id/enroll-face', requireModuleAccess('employee_management', 'write'), upload.single('faceImage'), employeeController.enrollFace);

// ==================== NEW v2 ROUTES ====================

const fs = require('fs');
const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/cvs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const ownerId = req.params.id || `u${req.user?.id || 'unknown'}`;
    cb(null, `cv_${ownerId}_${Date.now()}${ext}`);
  }
});
const ALLOWED_CV_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ALLOWED_CV_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const cvUpload = multer({
  storage: cvStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = ALLOWED_CV_MIMES.includes(file.mimetype);
    const extOk  = ALLOWED_CV_EXTENSIONS.includes(ext);
    if (mimeOk && extOk) cb(null, true);
    else cb(new Error('Only PDF, DOC, or DOCX files are allowed (extension and MIME type must match)'));
  }
});

// GET /api/employees/:id/documents — admin views a specific employee's upload history
router.get('/:id/documents', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    // resolve the user_id from employee_details.id or employee_id
    const [empRows] = await pool.execute(
      'SELECT employee_id FROM employee_details WHERE (id=? OR employee_id=?) AND tenant_id=? LIMIT 1',
      [req.params.id, req.params.id, tenantId]
    );
    const userId = empRows[0]?.employee_id || req.params.id;
    const [rows] = await pool.execute(
      `SELECT id, doc_type, original_filename, file_path, file_size, mime_type, created_at
       FROM employee_documents
       WHERE tenant_id=? AND employee_user_id=?
       ORDER BY created_at DESC`,
      [tenantId, userId]
    );
    return res.json({ success: true, documents: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employees/:id/cv — upload CV for an employee (admin)
router.post('/:id/cv', requireModuleAccess('employee_management', 'write'), cvUpload.single('cv'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const cvPath = `/uploads/cvs/${req.file.filename}`;
    // resolve actual user_id for this employee record
    const [empRows] = await pool.execute(
      'SELECT employee_id FROM employee_details WHERE (id=? OR employee_id=?) AND tenant_id=? LIMIT 1',
      [req.params.id, req.params.id, tenantId]
    );
    const empUserId = empRows[0]?.employee_id || req.params.id;
    await pool.execute(
      'UPDATE employee_details SET cv_path=? WHERE employee_id=? AND tenant_id=?',
      [cvPath, empUserId, tenantId]
    );
    await pool.execute(
      `INSERT INTO employee_documents (tenant_id, employee_user_id, doc_type, original_filename, file_path, file_size, mime_type, uploaded_by)
       VALUES (?, ?, 'cv', ?, ?, ?, ?, ?)`,
      [tenantId, empUserId, req.file.originalname, cvPath, req.file.size || null, req.file.mimetype, req.user.id]
    );
    return res.json({ success: true, message: 'CV uploaded', cv_path: cvPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/:id/cv — get CV path for an employee
router.get('/:id/cv', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      'SELECT cv_path FROM employee_details WHERE employee_id=? AND tenant_id=?',
      [req.params.id, tenantId]
    );
    if (!rows.length || !rows[0].cv_path) return res.status(404).json({ success: false, message: 'No CV found' });
    return res.json({ success: true, cv_path: rows[0].cv_path });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});



// GET /api/employees/:id/id-card — generate ID card data for an employee
router.get('/:id/id-card', requireModuleAccess('employee_management', 'read'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT u.first_name, u.last_name, u.email, u.phone, u.profile_photo,
              ed.id as emp_number, ed.position, ed.joining_date,
              d.name as department_name, ed.employment_category,
              tb.company_name, tb.logo_url
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
       LEFT JOIN departments d ON d.id = ed.department_id
       LEFT JOIN tenant_branding tb ON tb.tenant_id = ed.tenant_id
       WHERE ed.employee_id = ? AND ed.tenant_id = ?`,
      [req.params.id, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Employee not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employees/my/cv — employee uploads their own CV
router.post('/my/cv', cvUpload.single('cv'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const cvPath = `/uploads/cvs/${req.file.filename}`;
    await pool.execute(
      'UPDATE employee_details SET cv_path=? WHERE employee_id=? AND tenant_id=?',
      [cvPath, userId, tenantId]
    );
    await pool.execute(
      `INSERT INTO employee_documents (tenant_id, employee_user_id, doc_type, original_filename, file_path, file_size, mime_type, uploaded_by)
       VALUES (?, ?, 'cv', ?, ?, ?, ?, ?)`,
      [tenantId, userId, req.file.originalname, cvPath, req.file.size || null, req.file.mimetype, userId]
    );
    try {
      const { userIds, employeeName } = await getNotificationRecipients(tenantId, userId, { includeClient: false });
      await sendToMany(tenantId, userIds.filter(id => id !== userId), {
        title: 'Document Uploaded',
        message: `${employeeName} has uploaded their CV (${req.file.originalname}).`,
        type: 'general',
      });
    } catch (_) {}
    return res.json({ success: true, message: 'CV uploaded', cv_path: cvPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Photo upload storage
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/photos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${Date.now()}${ext}`);
  }
});
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// POST /api/employees/my/photo — employee uploads own profile photo
router.post('/my/photo', photoUpload.single('photo'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const photoPath = `/uploads/photos/${req.file.filename}`;
    await pool.execute('UPDATE users SET profile_photo=? WHERE id=?', [photoPath, userId]);
    await pool.execute(
      `INSERT INTO employee_documents (tenant_id, employee_user_id, doc_type, original_filename, file_path, file_size, mime_type, uploaded_by)
       VALUES (?, ?, 'photo', ?, ?, ?, ?, ?)`,
      [tenantId, userId, req.file.originalname, photoPath, req.file.size || null, req.file.mimetype, userId]
    );
    return res.json({ success: true, message: 'Photo uploaded', photo_path: photoPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employees/:id/photo — admin uploads photo for any employee
router.post('/:id/photo', requireModuleAccess('employee_management', 'write'), photoUpload.single('photo'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const photoPath = `/uploads/photos/${req.file.filename}`;
    const [rows] = await pool.execute(
      'SELECT employee_id FROM employee_details WHERE id=? AND tenant_id=?',
      [req.params.id, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Employee not found' });
    const empUserId = rows[0].employee_id;
    await pool.execute('UPDATE users SET profile_photo=? WHERE id=?', [photoPath, empUserId]);
    await pool.execute(
      `INSERT INTO employee_documents (tenant_id, employee_user_id, doc_type, original_filename, file_path, file_size, mime_type, uploaded_by)
       VALUES (?, ?, 'photo', ?, ?, ?, ?, ?)`,
      [tenantId, empUserId, req.file.originalname, photoPath, req.file.size || null, req.file.mimetype, req.user.id]
    );
    return res.json({ success: true, message: 'Photo uploaded', photo_path: photoPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ════ AADHAAR UPLOAD ════

const aadhaarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/aadhaar');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `aadhaar_${Date.now()}${ext}`);
  }
});
const aadhaarUpload = multer({
  storage: aadhaarStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPG, PNG files are allowed'));
  }
});

// POST /api/employees/my/aadhaar — employee uploads own Aadhaar
router.post('/my/aadhaar', aadhaarUpload.single('aadhaar'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const aadhaarPath = `/uploads/aadhaar/${req.file.filename}`;
    const [empRows] = await pool.execute('SELECT id FROM employee_details WHERE employee_id=? AND tenant_id=?', [userId, tenantId]);
    if (empRows.length) {
      await pool.execute('UPDATE employee_details SET aadhaar_doc_path=? WHERE id=?', [aadhaarPath, empRows[0].id]);
    }
    await pool.execute(
      `INSERT INTO employee_documents (tenant_id, employee_user_id, doc_type, original_filename, file_path, file_size, mime_type, uploaded_by)
       VALUES (?, ?, 'aadhaar', ?, ?, ?, ?, ?)`,
      [tenantId, userId, req.file.originalname, aadhaarPath, req.file.size || null, req.file.mimetype, userId]
    );
    try {
      const { userIds, employeeName } = await getNotificationRecipients(tenantId, userId, { includeClient: false });
      await sendToMany(tenantId, userIds.filter(id => id !== userId), {
        title: 'Document Uploaded',
        message: `${employeeName} has uploaded their Aadhaar card.`,
        type: 'general',
      });
    } catch (_) {}
    return res.json({ success: true, message: 'Aadhaar uploaded', aadhaar_path: aadhaarPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ════ PAN UPLOAD ════

const panStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/pan');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pan_${Date.now()}${ext}`);
  }
});
const panUpload = multer({
  storage: panStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPG, PNG files are allowed'));
  }
});

// POST /api/employees/my/pan — employee uploads own PAN
router.post('/my/pan', panUpload.single('pan'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const panPath = `/uploads/pan/${req.file.filename}`;
    const [empRows] = await pool.execute('SELECT id FROM employee_details WHERE employee_id=? AND tenant_id=?', [userId, tenantId]);
    if (empRows.length) {
      await pool.execute('UPDATE employee_details SET pan_doc_path=? WHERE id=?', [panPath, empRows[0].id]);
    }
    await pool.execute(
      `INSERT INTO employee_documents (tenant_id, employee_user_id, doc_type, original_filename, file_path, file_size, mime_type, uploaded_by)
       VALUES (?, ?, 'pan', ?, ?, ?, ?, ?)`,
      [tenantId, userId, req.file.originalname, panPath, req.file.size || null, req.file.mimetype, userId]
    );
    try {
      const { userIds, employeeName } = await getNotificationRecipients(tenantId, userId, { includeClient: false });
      await sendToMany(tenantId, userIds.filter(id => id !== userId), {
        title: 'Document Uploaded',
        message: `${employeeName} has uploaded their PAN card.`,
        type: 'general',
      });
    } catch (_) {}
    return res.json({ success: true, message: 'PAN uploaded', pan_path: panPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;
