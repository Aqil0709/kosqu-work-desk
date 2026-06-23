// backend/src/features/assets/assetRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { pool } = require('../../config/db');
const sendResponse = require('../../utils/response');

const ensureSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS employee_assets (
      id             INT           NOT NULL AUTO_INCREMENT,
      tenant_id      INT           NOT NULL,
      employee_id    INT           NOT NULL,
      asset_type     VARCHAR(60)   NOT NULL,
      asset_name     VARCHAR(120)  NOT NULL,
      serial_number  VARCHAR(80)   NULL,
      assigned_date  DATE          NULL,
      return_date    DATE          NULL,
      status         ENUM('assigned','returned','lost','damaged') NOT NULL DEFAULT 'assigned',
      notes          TEXT          NULL,
      created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_assets_tenant_emp    (tenant_id, employee_id),
      KEY idx_assets_tenant_status (tenant_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

router.use(authMiddleware.verifyToken);

const canRead = requireModuleAccess('employee_management', 'read');
const canWrite = requireModuleAccess('employee_management', 'write');

// GET /api/assets/my — employee fetches their own assigned assets
router.get('/my', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const employeeId = req.user.id;
    const [rows] = await pool.execute(
      `SELECT id, asset_type, asset_name, serial_number, assigned_date, return_date, status, notes
       FROM employee_assets WHERE tenant_id = ? AND employee_id = ? ORDER BY assigned_date DESC`,
      [tenantId, employeeId]
    );
    return sendResponse(res, 200, true, 'Assets fetched', rows);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// GET /api/assets — list all assets (optionally filtered by employee_id)
router.get('/', canRead, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { employee_id, status } = req.query;
    let sql = `
      SELECT ea.*, u.first_name, u.last_name, u.email, ed.position
      FROM employee_assets ea
      JOIN users u ON u.id = ea.employee_id AND u.tenant_id = ea.tenant_id
      JOIN employee_details ed ON ed.employee_id = ea.employee_id AND ed.tenant_id = ea.tenant_id
      WHERE ea.tenant_id = ?
    `;
    const params = [tenantId];
    if (employee_id) { sql += ' AND ea.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND ea.status = ?'; params.push(status); }
    sql += ' ORDER BY ea.created_at DESC';
    const [allRows] = await pool.execute(sql, params);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const rows = allRows.slice(offset, offset + limit);
    return res.json({
      success: true,
      message: 'Assets fetched',
      data: rows,
      pagination: { page, limit, total: allRows.length, totalPages: Math.ceil(allRows.length / limit) },
    });
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// GET /api/assets/:id — single asset
router.get('/:id', canRead, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      'SELECT * FROM employee_assets WHERE id = ? AND tenant_id = ?',
      [req.params.id, tenantId]
    );
    if (!rows.length) return sendResponse(res, 404, false, 'Asset not found');
    return sendResponse(res, 200, true, 'Asset fetched', rows[0]);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// POST /api/assets — create asset
router.post('/', canWrite, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { employee_id, asset_type, asset_name, serial_number, assigned_date, notes } = req.body;
    if (!employee_id || !asset_type || !asset_name) {
      return sendResponse(res, 400, false, 'employee_id, asset_type, and asset_name are required');
    }
    const [result] = await pool.execute(
      `INSERT INTO employee_assets (tenant_id, employee_id, asset_type, asset_name, serial_number, assigned_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, employee_id, asset_type, asset_name, serial_number || null, assigned_date || null, notes || null]
    );
    return sendResponse(res, 201, true, 'Asset created', { id: result.insertId });
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// PUT /api/assets/:id — update asset
router.put('/:id', canWrite, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { asset_type, asset_name, serial_number, assigned_date, return_date, status, notes } = req.body;
    await pool.execute(
      `UPDATE employee_assets SET asset_type=?, asset_name=?, serial_number=?, assigned_date=?,
       return_date=?, status=?, notes=? WHERE id=? AND tenant_id=?`,
      [asset_type, asset_name, serial_number, assigned_date, return_date, status, notes, req.params.id, tenantId]
    );
    return sendResponse(res, 200, true, 'Asset updated');
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// DELETE /api/assets/:id — delete asset
router.delete('/:id', canWrite, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('DELETE FROM employee_assets WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    return sendResponse(res, 200, true, 'Asset deleted');
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

const routerModule = router;
routerModule.ensureSchema = ensureSchema;
module.exports = routerModule;
