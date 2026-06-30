/**
 * Routes for face enrollment management (HR/Admin use).
 * Mounted at /api/attendance/face
 */
const express = require('express');
const multer  = require('multer');
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { pool } = require('../../config/db');
const { enrollFace, unenrollFace, healthCheck } = require('./faceServiceClient');

const router = express.Router();
router.use(verifyToken);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

// GET /api/attendance/face/health — check if face service is running
router.get('/health', async (req, res) => {
  const alive = await healthCheck();
  res.json({ success: true, face_service_online: alive });
});

// POST /api/attendance/face/enroll/:employeeId — enroll face for an employee (HR/Admin only)
// Body: multipart form-data { photo: <image> }
router.post('/enroll/:employeeId', requireModuleAccess('attendance_management', 'write'), upload.single('photo'), async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const { employeeId } = req.params; // employee_details.id (PK)

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo is required.' });
    }

    // Verify employee belongs to this tenant
    const [rows] = await pool.execute(
      'SELECT id FROM employee_details WHERE id = ? AND tenant_id = ?',
      [employeeId, tenantId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const result = await enrollFace(tenantId, employeeId, req.file.buffer, req.file.originalname || 'photo.jpg');

    if (!result.success) {
      return res.status(422).json(result);
    }

    // Record enrollment in DB
    await pool.execute(
      `UPDATE employee_details SET face_enrolled = 1, face_enrolled_at = NOW() WHERE id = ? AND tenant_id = ?`,
      [employeeId, tenantId]
    ).catch(() => {}); // column may not exist yet — handled by migration below

    return res.json(result);
  } catch (err) {
    console.error('[FaceEnroll] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/face/enroll-self — employee enrolls their own face
// Body: multipart form-data { photo: <image> }
router.post('/enroll-self', upload.single('photo'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId   = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo is required.' });
    }

    const [rows] = await pool.execute(
      'SELECT id FROM employee_details WHERE employee_id = ? AND tenant_id = ?',
      [userId, tenantId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Employee record not found.' });
    }
    const employeeId = rows[0].id;

    const result = await enrollFace(tenantId, employeeId, req.file.buffer, req.file.originalname || 'photo.jpg');
    if (!result.success) return res.status(422).json(result);

    await pool.execute(
      `UPDATE employee_details SET face_enrolled = 1, face_enrolled_at = NOW() WHERE id = ? AND tenant_id = ?`,
      [employeeId, tenantId]
    ).catch(() => {});

    return res.json(result);
  } catch (err) {
    console.error('[FaceEnrollSelf] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/attendance/face/unenroll/:employeeId — remove face data (HR/Admin only)
router.delete('/unenroll/:employeeId', requireModuleAccess('attendance_management', 'write'), async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const { employeeId } = req.params;

    const [rows] = await pool.execute(
      'SELECT id FROM employee_details WHERE id = ? AND tenant_id = ?',
      [employeeId, tenantId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const result = await unenrollFace(tenantId, employeeId);

    await pool.execute(
      `UPDATE employee_details SET face_enrolled = 0, face_enrolled_at = NULL WHERE id = ? AND tenant_id = ?`,
      [employeeId, tenantId]
    ).catch(() => {});

    return res.json(result);
  } catch (err) {
    console.error('[FaceUnenroll] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DB migration: add face_enrolled columns if not present
async function ensureFaceColumns() {
  const cols = [
    `ALTER TABLE employee_details ADD COLUMN face_enrolled TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE employee_details ADD COLUMN face_enrolled_at DATETIME NULL DEFAULT NULL`,
  ];
  for (const sql of cols) {
    try {
      await pool.execute(sql);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[FaceEnroll schema]', e.message);
    }
  }
}
ensureFaceColumns();

module.exports = router;
