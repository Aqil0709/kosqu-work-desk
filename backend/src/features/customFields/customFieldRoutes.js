// backend/src/features/customFields/customFieldRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { pool } = require('../../config/db');
const sendResponse = require('../../utils/response');

router.use(authMiddleware.verifyToken);

const canRead = requireModuleAccess('employee_management', 'read');
const canWrite = requireModuleAccess('employee_management', 'write');

// GET /api/custom-fields — list all custom field definitions for the tenant
router.get('/', canRead, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      'SELECT * FROM employee_custom_fields WHERE tenant_id = ? AND is_active = 1 ORDER BY id ASC',
      [tenantId]
    );
    return sendResponse(res, 200, true, 'Custom fields fetched', rows);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// POST /api/custom-fields — create a new custom field definition
router.post('/', canWrite, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { field_name, field_key, field_type, field_options, is_required } = req.body;
    if (!field_name || !field_key || !field_type) {
      return sendResponse(res, 400, false, 'field_name, field_key, and field_type are required');
    }
    const cleanKey = field_key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const [result] = await pool.execute(
      `INSERT INTO employee_custom_fields (tenant_id, field_name, field_key, field_type, field_options, is_required)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenantId, field_name, cleanKey, field_type, field_options ? JSON.stringify(field_options) : null, is_required ? 1 : 0]
    );
    return sendResponse(res, 201, true, 'Custom field created', { id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return sendResponse(res, 409, false, 'A field with this key already exists');
    return sendResponse(res, 500, false, err.message);
  }
});

// PUT /api/custom-fields/:id — update field definition
router.put('/:id', canWrite, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { field_name, field_type, field_options, is_required } = req.body;
    await pool.execute(
      `UPDATE employee_custom_fields SET field_name=?, field_type=?, field_options=?, is_required=?
       WHERE id=? AND tenant_id=?`,
      [field_name, field_type, field_options ? JSON.stringify(field_options) : null, is_required ? 1 : 0, req.params.id, tenantId]
    );
    return sendResponse(res, 200, true, 'Custom field updated');
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// DELETE /api/custom-fields/:id — soft-delete field
router.delete('/:id', canWrite, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute(
      'UPDATE employee_custom_fields SET is_active=0 WHERE id=? AND tenant_id=?',
      [req.params.id, tenantId]
    );
    return sendResponse(res, 200, true, 'Custom field removed');
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// GET /api/custom-fields/values/:employeeId — get custom field values for an employee
router.get('/values/:employeeId', canRead, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(
      `SELECT ecf.id as field_id, ecf.field_name, ecf.field_key, ecf.field_type, ecf.field_options,
              COALESCE(efv.value, '') as value
       FROM employee_custom_fields ecf
       LEFT JOIN employee_custom_field_values efv
         ON efv.field_id = ecf.id AND efv.employee_id = ? AND efv.tenant_id = ecf.tenant_id
       WHERE ecf.tenant_id = ? AND ecf.is_active = 1`,
      [req.params.employeeId, tenantId]
    );
    return sendResponse(res, 200, true, 'Values fetched', rows);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// POST /api/custom-fields/values/:employeeId — upsert custom field values
router.post('/values/:employeeId', canWrite, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { values } = req.body; // [{ field_id, value }]
    if (!Array.isArray(values)) return sendResponse(res, 400, false, 'values must be an array');
    for (const v of values) {
      await pool.execute(
        `INSERT INTO employee_custom_field_values (tenant_id, employee_id, field_id, value)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [tenantId, req.params.employeeId, v.field_id, v.value]
      );
    }
    return sendResponse(res, 200, true, 'Custom field values saved');
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

module.exports = router;
