// backend/src/features/events/eventRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { pool } = require('../../config/db');
const sendResponse = require('../../utils/response');

router.use(authMiddleware.verifyToken);

// GET /api/events — list upcoming company events
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { upcoming } = req.query;
    let sql = 'SELECT * FROM company_events WHERE tenant_id = ?';
    const params = [tenantId];
    if (upcoming === '1') {
      sql += ' AND event_date >= CURDATE()';
    }
    sql += ' ORDER BY event_date ASC LIMIT 50';
    const [rows] = await pool.execute(sql, params);
    return sendResponse(res, 200, true, 'Events fetched', rows);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// POST /api/events — create a company event (admin only)
router.post('/', requireModuleAccess('employee_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { title, description, event_date, event_time, location } = req.body;
    if (!title || !event_date) return sendResponse(res, 400, false, 'title and event_date are required');
    const [result] = await pool.execute(
      `INSERT INTO company_events (tenant_id, title, description, event_date, event_time, location, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, title, description || null, event_date, event_time || null, location || null, req.user.id]
    );
    return sendResponse(res, 201, true, 'Event created', { id: result.insertId });
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// PUT /api/events/:id — update event
router.put('/:id', requireModuleAccess('employee_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { title, description, event_date, event_time, location } = req.body;
    await pool.execute(
      `UPDATE company_events SET title=?, description=?, event_date=?, event_time=?, location=?
       WHERE id=? AND tenant_id=?`,
      [title, description, event_date, event_time, location, req.params.id, tenantId]
    );
    return sendResponse(res, 200, true, 'Event updated');
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

// DELETE /api/events/:id
router.delete('/:id', requireModuleAccess('employee_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    await pool.execute('DELETE FROM company_events WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    return sendResponse(res, 200, true, 'Event deleted');
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
});

module.exports = router;
