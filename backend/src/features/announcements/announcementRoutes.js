const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth.middleware');
const sendResponse = require('../../utils/response');
const { addColumnIfMissing } = require('../../utils/schemaHelpers');

// ── Schema ─────────────────────────────────────────────────────────────────────
const ensureAnnouncementSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS announcements (
      id          INT          NOT NULL AUTO_INCREMENT,
      tenant_id   INT          NOT NULL,
      title       VARCHAR(255) NOT NULL,
      content     TEXT         NOT NULL,
      priority    ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
      audience    ENUM('all','employees','interns','consultants','admins') NOT NULL DEFAULT 'all',
      target_type ENUM('all','department','specific') NOT NULL DEFAULT 'all',
      target_ids  TEXT         NULL,
      is_active   TINYINT(1)   NOT NULL DEFAULT 1,
      is_pinned   TINYINT(1)   NOT NULL DEFAULT 0,
      start_date  DATE         NULL,
      end_date    DATE         NULL,
      created_by  INT          NOT NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ann_tenant_active (tenant_id, is_active),
      KEY idx_ann_tenant_dates  (tenant_id, start_date, end_date),
      KEY idx_ann_pinned        (tenant_id, is_pinned, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Migrate existing tables that may not have target columns
  await addColumnIfMissing('announcements', 'target_type', "target_type ENUM('all','department','specific','team') NOT NULL DEFAULT 'all'");
  await addColumnIfMissing('announcements', 'target_ids', 'target_ids TEXT NULL');

  // Add 'team' to existing ENUM if not already present (non-fatal)
  try {
    await pool.execute(`
      ALTER TABLE announcements
      MODIFY COLUMN target_type ENUM('all','department','specific','team') NOT NULL DEFAULT 'all'
    `);
  } catch (_) {}

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS announcement_reads (
      id              INT      NOT NULL AUTO_INCREMENT,
      tenant_id       INT      NOT NULL,
      announcement_id INT      NOT NULL,
      user_id         INT      NOT NULL,
      read_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_ann_read (announcement_id, user_id),
      KEY idx_ann_read_user (tenant_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const { sendToMany } = require('../notifications/notificationHelper');

// ── Auth ───────────────────────────────────────────────────────────────────────
router.use(verifyToken);

const isAdmin = (req) => {
  const role = (req.user?.position || req.user?.role || '').toLowerCase();
  return role === 'admin' || role === 'hr';
};

// Resolve user's department_id and team_lead_id from employee_details
const getUserDeptAndTeam = async (tenantId, userId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT department_id, team_lead_id FROM employee_details WHERE employee_id = ? AND tenant_id = ? LIMIT 1',
      [userId, tenantId]
    );
    return {
      deptId: rows[0]?.department_id ?? null,
      teamLeadId: rows[0]?.team_lead_id ?? null,
    };
  } catch {
    return { deptId: null, teamLeadId: null };
  }
};

// Keep backward-compat alias
const getUserDeptId = async (tenantId, userId) => {
  const { deptId } = await getUserDeptAndTeam(tenantId, userId);
  return deptId;
};

// Check whether a JSON target_ids column contains the given numeric id
const jsonContainsSql = (colName) =>
  `JSON_CONTAINS(COALESCE(${colName}, '[]'), CAST(? AS JSON), '$')`;

// ── GET /api/announcements  ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const admin = isAdmin(req);
    const today = new Date().toISOString().slice(0, 10);

    if (admin) {
      const [rows] = await pool.execute(
        `SELECT a.id, a.title, a.content, a.priority, a.audience,
                a.target_type, a.target_ids, a.is_pinned, a.is_active,
                a.start_date, a.end_date, a.created_by, a.created_at, a.updated_at,
                CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
                (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id AND ar.tenant_id = a.tenant_id) AS read_count
         FROM announcements a
         LEFT JOIN users u ON u.id = a.created_by AND u.tenant_id = a.tenant_id
         WHERE a.tenant_id = ?
         ORDER BY a.is_pinned DESC, a.priority DESC, a.created_at DESC`,
        [tenantId]
      );
      return sendResponse(res, 200, true, 'Announcements fetched', rows);
    }

    // Employee view — apply target filter
    const empCategory = req.user?.employment_category || 'employee';
    const { deptId, teamLeadId } = await getUserDeptAndTeam(tenantId, userId);
    const deptStr     = deptId      != null ? String(deptId)      : '-1';
    const userStr     = String(userId);
    const teamLeadStr = teamLeadId  != null ? String(teamLeadId)  : '-1';

    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.content, a.priority, a.audience,
              a.target_type, a.is_pinned, a.start_date, a.end_date, a.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
              (ar.id IS NOT NULL) AS is_read
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by AND u.tenant_id = a.tenant_id
       LEFT JOIN announcement_reads ar
              ON ar.announcement_id = a.id AND ar.user_id = ? AND ar.tenant_id = a.tenant_id
       WHERE a.tenant_id = ?
         AND a.is_active = 1
         AND (a.start_date IS NULL OR a.start_date <= ?)
         AND (a.end_date   IS NULL OR a.end_date   >= ?)
         AND (a.audience = 'all' OR a.audience = 'employees' OR a.audience = ?)
         AND (
           a.target_type = 'all'
           OR (a.target_type = 'department' AND ${jsonContainsSql('a.target_ids')})
           OR (a.target_type = 'specific'   AND ${jsonContainsSql('a.target_ids')})
           OR (a.target_type = 'team'       AND ${jsonContainsSql('a.target_ids')})
         )
       ORDER BY a.is_pinned DESC, is_read ASC, a.priority DESC, a.created_at DESC
       LIMIT 50`,
      [userId, tenantId, today, today, empCategory, deptStr, userStr, teamLeadStr]
    );
    return sendResponse(res, 200, true, 'Announcements fetched', rows);
  } catch (err) {
    console.error('GET /announcements error:', err);
    return sendResponse(res, 500, false, 'Failed to fetch announcements');
  }
});

// ── GET /api/announcements/unread-count ──────────────────────────────────────
router.get('/unread-count', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);
    const empCategory = req.user?.employment_category || 'employee';
    const { deptId, teamLeadId } = await getUserDeptAndTeam(tenantId, userId);
    const deptStr     = deptId     != null ? String(deptId)     : '-1';
    const userStr     = String(userId);
    const teamLeadStr = teamLeadId != null ? String(teamLeadId) : '-1';

    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS unread
       FROM announcements a
       LEFT JOIN announcement_reads ar
              ON ar.announcement_id = a.id AND ar.user_id = ? AND ar.tenant_id = a.tenant_id
       WHERE a.tenant_id = ?
         AND a.is_active = 1
         AND (a.start_date IS NULL OR a.start_date <= ?)
         AND (a.end_date   IS NULL OR a.end_date   >= ?)
         AND (a.audience = 'all' OR a.audience = 'employees' OR a.audience = ?)
         AND (
           a.target_type = 'all'
           OR (a.target_type = 'department' AND ${jsonContainsSql('a.target_ids')})
           OR (a.target_type = 'specific'   AND ${jsonContainsSql('a.target_ids')})
           OR (a.target_type = 'team'       AND ${jsonContainsSql('a.target_ids')})
         )
         AND ar.id IS NULL`,
      [userId, tenantId, today, today, empCategory, deptStr, userStr, teamLeadStr]
    );
    return sendResponse(res, 200, true, 'Unread count', { unread: Number(rows[0]?.unread || 0) });
  } catch (err) {
    return sendResponse(res, 500, false, 'Failed to fetch unread count');
  }
});

// ── GET /api/announcements/active  (widget — top 5) ──────────────────────────
router.get('/active', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);
    const empCategory = req.user?.employment_category || 'employee';
    const { deptId, teamLeadId } = await getUserDeptAndTeam(tenantId, userId);
    const deptStr     = deptId     != null ? String(deptId)     : '-1';
    const userStr     = String(userId);
    const teamLeadStr = teamLeadId != null ? String(teamLeadId) : '-1';

    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.content, a.priority, a.is_pinned, a.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
              (ar.id IS NOT NULL) AS is_read
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by AND u.tenant_id = a.tenant_id
       LEFT JOIN announcement_reads ar
              ON ar.announcement_id = a.id AND ar.user_id = ? AND ar.tenant_id = a.tenant_id
       WHERE a.tenant_id = ?
         AND a.is_active = 1
         AND (a.start_date IS NULL OR a.start_date <= ?)
         AND (a.end_date   IS NULL OR a.end_date   >= ?)
         AND (a.audience = 'all' OR a.audience = 'employees' OR a.audience = ?)
         AND (
           a.target_type = 'all'
           OR (a.target_type = 'department' AND ${jsonContainsSql('a.target_ids')})
           OR (a.target_type = 'specific'   AND ${jsonContainsSql('a.target_ids')})
           OR (a.target_type = 'team'       AND ${jsonContainsSql('a.target_ids')})
         )
       ORDER BY a.is_pinned DESC, is_read ASC, a.priority DESC, a.created_at DESC
       LIMIT 5`,
      [userId, tenantId, today, today, empCategory, deptStr, userStr, teamLeadStr]
    );
    return sendResponse(res, 200, true, 'Active announcements', rows);
  } catch (err) {
    return sendResponse(res, 500, false, 'Failed to fetch announcements');
  }
});

// ── POST /api/announcements/:id/read  ────────────────────────────────────────
router.post('/:id/read', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const annId = req.params.id;

    await pool.execute(
      `INSERT INTO announcement_reads (tenant_id, announcement_id, user_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE read_at = read_at`,
      [tenantId, annId, userId]
    );
    return sendResponse(res, 200, true, 'Marked as read');
  } catch (err) {
    return sendResponse(res, 500, false, 'Failed to mark as read');
  }
});

// ── POST /api/announcements  (admin only) ────────────────────────────────────
router.post('/', async (req, res) => {
  if (!isAdmin(req)) return sendResponse(res, 403, false, 'Admin access required');
  try {
    const tenantId = req.user.tenant_id;
    const {
      title, content, priority = 'medium', audience = 'all',
      target_type = 'all', target_ids = [],
      is_pinned = 0, start_date, end_date,
    } = req.body;

    if (!title?.trim())   return sendResponse(res, 400, false, 'Title is required');
    if (!content?.trim()) return sendResponse(res, 400, false, 'Content is required');

    const targetIdsJson = target_type === 'all' ? null : JSON.stringify(
      (Array.isArray(target_ids) ? target_ids : []).map(Number).filter(Boolean)
    );

    const [result] = await pool.execute(
      `INSERT INTO announcements
         (tenant_id, title, content, priority, audience, target_type, target_ids, is_pinned, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, title.trim(), content.trim(), priority, audience,
        target_type, targetIdsJson,
        is_pinned ? 1 : 0, start_date || null, end_date || null, req.user.id,
      ]
    );

    const annId = result.insertId;

    // Send bell notifications to targeted users (async, non-blocking)
    (async () => {
      try {
        let recipientIds = [];
        if (target_type === 'all') {
          const [users] = await pool.execute(
            `SELECT id FROM users WHERE tenant_id = ? AND is_active = 1
             AND LOWER(position) NOT IN ('admin','super_admin','superadmin','client')`,
            [tenantId]
          );
          recipientIds = users.map(r => r.id);
        } else if (target_type === 'department') {
          const deptIds = targetIdsJson ? JSON.parse(targetIdsJson) : [];
          if (deptIds.length > 0) {
            const ph = deptIds.map(() => '?').join(',');
            const [empRows] = await pool.execute(
              `SELECT DISTINCT ed.employee_id FROM employee_details ed
               WHERE ed.tenant_id = ? AND ed.department_id IN (${ph})
               AND LOWER(COALESCE(ed.status,'active')) NOT IN ('inactive','deleted')`,
              [tenantId, ...deptIds]
            );
            recipientIds = empRows.map(r => r.employee_id).filter(Boolean);
          }
        } else if (target_type === 'specific') {
          recipientIds = targetIdsJson ? JSON.parse(targetIdsJson) : [];
        } else if (target_type === 'team') {
          const teamLeadIds = targetIdsJson ? JSON.parse(targetIdsJson) : [];
          if (teamLeadIds.length > 0) {
            const ph = teamLeadIds.map(() => '?').join(',');
            const [empRows] = await pool.execute(
              `SELECT DISTINCT ed.employee_id FROM employee_details ed
               WHERE ed.tenant_id = ? AND ed.team_lead_id IN (${ph})
               AND LOWER(COALESCE(ed.status,'active')) NOT IN ('inactive','deleted')`,
              [tenantId, ...teamLeadIds]
            );
            recipientIds = empRows.map(r => r.employee_id).filter(Boolean);
            // Also include the team leads themselves
            recipientIds = [...recipientIds, ...teamLeadIds];
          }
        }

        recipientIds = recipientIds.filter(id => id != null && Number(id) !== req.user.id);
        if (recipientIds.length > 0) {
          const preview = content.trim().length > 80 ? content.trim().slice(0, 80) + '…' : content.trim();
          await sendToMany(tenantId, recipientIds, {
            title: `📢 ${title.trim()}`,
            message: preview,
            type: 'announcement',
            related_id: annId,
          });
        }
      } catch (e) {
        console.error('[Announcement] notification send error:', e.message);
      }
    })();

    return sendResponse(res, 201, true, 'Announcement created', { id: annId });
  } catch (err) {
    console.error('POST /announcements error:', err);
    return sendResponse(res, 500, false, 'Failed to create announcement');
  }
});

// ── PUT /api/announcements/:id  (admin only) ─────────────────────────────────
router.put('/:id', async (req, res) => {
  if (!isAdmin(req)) return sendResponse(res, 403, false, 'Admin access required');
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { title, content, priority, audience, target_type, target_ids, is_active, is_pinned, start_date, end_date } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM announcements WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (!existing.length) return sendResponse(res, 404, false, 'Announcement not found');

    let targetIdsJson = undefined;
    if (target_type !== undefined) {
      targetIdsJson = target_type === 'all' ? null : JSON.stringify(
        (Array.isArray(target_ids) ? target_ids : []).map(Number).filter(Boolean)
      );
    }

    await pool.execute(
      `UPDATE announcements SET
         title       = COALESCE(?, title),
         content     = COALESCE(?, content),
         priority    = COALESCE(?, priority),
         audience    = COALESCE(?, audience),
         target_type = COALESCE(?, target_type),
         target_ids  = ${targetIdsJson !== undefined ? '?' : 'target_ids'},
         is_active   = COALESCE(?, is_active),
         is_pinned   = COALESCE(?, is_pinned),
         start_date  = ?,
         end_date    = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        title?.trim() || null,
        content?.trim() || null,
        priority || null,
        audience || null,
        target_type || null,
        ...(targetIdsJson !== undefined ? [targetIdsJson] : []),
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        is_pinned !== undefined ? (is_pinned ? 1 : 0) : null,
        start_date || null,
        end_date || null,
        id,
        tenantId,
      ]
    );
    return sendResponse(res, 200, true, 'Announcement updated');
  } catch (err) {
    console.error('PUT /announcements/:id error:', err);
    return sendResponse(res, 500, false, 'Failed to update announcement');
  }
});

// ── DELETE /api/announcements/:id  (admin only) ──────────────────────────────
router.delete('/:id', async (req, res) => {
  if (!isAdmin(req)) return sendResponse(res, 403, false, 'Admin access required');
  try {
    const [result] = await pool.execute(
      'DELETE FROM announcements WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!result.affectedRows) return sendResponse(res, 404, false, 'Announcement not found');
    // Clean up reads for this announcement
    await pool.execute('DELETE FROM announcement_reads WHERE announcement_id = ?', [req.params.id]).catch(() => {});
    return sendResponse(res, 200, true, 'Announcement deleted');
  } catch (err) {
    return sendResponse(res, 500, false, 'Failed to delete announcement');
  }
});

module.exports = router;
module.exports.ensureSchema = ensureAnnouncementSchema;
