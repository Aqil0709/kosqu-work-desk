const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth.middleware');

const ensureLocationsSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tb_work_locations (
      id            INT          NOT NULL AUTO_INCREMENT,
      tenant_id     INT          NOT NULL,
      name          VARCHAR(200) NOT NULL,
      location_type ENUM('head_office','client_site') NOT NULL DEFAULT 'head_office',
      latitude      DECIMAL(10,8) NOT NULL,
      longitude     DECIMAL(11,8) NOT NULL,
      radius_meters INT          NOT NULL DEFAULT 100,
      address             TEXT         NULL,
      check_in_time       TIME         NULL DEFAULT NULL,
      check_out_time      TIME         NULL DEFAULT NULL,
      grace_period_minutes INT         NOT NULL DEFAULT 15,
      is_active     TINYINT(1)   NOT NULL DEFAULT 1,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_loc_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Add work_location_id to employee_details (MySQL 5.7 compatible)
  try {
    await pool.execute(
      `ALTER TABLE employee_details ADD COLUMN work_location_id INT NULL DEFAULT NULL`
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.warn('[locations schema]', e.message);
  }
};

router.use(verifyToken);

// GET /api/locations — all locations for tenant (all authenticated users)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM tb_work_locations WHERE tenant_id = ? AND is_active = 1 ORDER BY location_type, name`,
      [req.tenantId || req.user?.tenant_id]
    );
    res.json({ success: true, locations: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/locations/my — current employee's assigned location
router.get('/my', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT wl.* FROM tb_work_locations wl
       JOIN employee_details ed ON ed.work_location_id = wl.id
       WHERE CAST(ed.employee_id AS UNSIGNED) = ? AND ed.tenant_id = ?
       LIMIT 1`,
      [req.user.id, req.tenantId]
    );
    res.json({ success: true, location: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/locations — create location (admin only)
router.post('/', async (req, res) => {
  if (!['admin', 'hr'].includes((req.user.position || '').toLowerCase())) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  try {
    const { name, location_type, latitude, longitude, radius_meters = 100, address, check_in_time, check_out_time, grace_period_minutes } = req.body;
    if (!name || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'name, latitude and longitude are required' });
    }
    const [result] = await pool.execute(
      `INSERT INTO tb_work_locations (tenant_id, name, location_type, latitude, longitude, radius_meters, address, check_in_time, check_out_time, grace_period_minutes)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.tenantId, name, location_type || 'head_office', latitude, longitude, radius_meters, address || null,
       check_in_time || null, check_out_time || null, grace_period_minutes ?? 15]
    );
    const [inserted] = await pool.execute('SELECT * FROM tb_work_locations WHERE id = ?', [result.insertId]);
    res.json({ success: true, location: inserted[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/locations/assign/employee — assign employee to location (must be before /:id)
router.put('/assign/employee', async (req, res) => {
  if (!['admin', 'hr'].includes((req.user.position || '').toLowerCase())) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  try {
    const { employee_id, location_id } = req.body; // employee_id = employee_details.id (PK)
    if (!employee_id) return res.status(400).json({ success: false, message: 'employee_id is required' });

    // Ensure column exists (safe re-run if schema migration was missed)
    try {
      await pool.execute(`ALTER TABLE employee_details ADD COLUMN work_location_id INT NULL DEFAULT NULL`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    const [result] = await pool.execute(
      'UPDATE employee_details SET work_location_id = ? WHERE id = ? AND tenant_id = ?',
      [location_id || null, employee_id, req.tenantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[assign employee location]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/locations/:id — update
router.put('/:id', async (req, res) => {
  if (!['admin', 'hr'].includes((req.user.position || '').toLowerCase())) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  try {
    const { name, location_type, latitude, longitude, radius_meters, address, is_active, check_in_time, check_out_time, grace_period_minutes } = req.body;
    await pool.execute(
      `UPDATE tb_work_locations SET name=?, location_type=?, latitude=?, longitude=?, radius_meters=?, address=?, is_active=?,
       check_in_time=?, check_out_time=?, grace_period_minutes=?
       WHERE id = ? AND tenant_id = ?`,
      [name, location_type, latitude, longitude, radius_meters ?? 100, address || null, is_active ?? 1,
       check_in_time || null, check_out_time || null, grace_period_minutes ?? 15,
       req.params.id, req.tenantId]
    );
    const [updated] = await pool.execute('SELECT * FROM tb_work_locations WHERE id = ?', [req.params.id]);
    res.json({ success: true, location: updated[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/locations/:id — soft delete
router.delete('/:id', async (req, res) => {
  if (!['admin', 'hr'].includes((req.user.position || '').toLowerCase())) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  try {
    await pool.execute(
      'UPDATE tb_work_locations SET is_active = 0 WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.tenantId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.ensureSchema = ensureLocationsSchema;
module.exports = router;
