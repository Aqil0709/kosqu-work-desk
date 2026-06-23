// backend/src/features/auditLog/auditLogRoutes.js
const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { pool } = require('../../config/db');

const router = express.Router();

// ── Schema ─────────────────────────────────────────────────────────────────────
const ensureAuditLogSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          BIGINT        NOT NULL AUTO_INCREMENT,
      tenant_id   INT           NOT NULL,
      user_id     INT           NOT NULL,
      user_name   VARCHAR(120)  NOT NULL DEFAULT '',
      action      VARCHAR(100)  NOT NULL,
      entity_type VARCHAR(60)   NULL,
      entity_id   VARCHAR(60)   NULL,
      description TEXT          NULL,
      ip_address  VARCHAR(45)   NULL,
      status      ENUM('success','failed') NOT NULL DEFAULT 'success',
      created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_audit_tenant_created (tenant_id, created_at),
      KEY idx_audit_tenant_user    (tenant_id, user_id),
      KEY idx_audit_entity         (tenant_id, entity_type, entity_id(20))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// Note: final module.exports at the bottom of this file includes ensureSchema

// ── Helper — write one log entry ───────────────────────────────────────────────
const writeAuditLog = async ({
  tenantId, userId, userName = '',
  action, entityType = null, entityId = null,
  description = null, ipAddress = null, status = 'success',
}) => {
  try {
    await pool.execute(
      `INSERT INTO audit_logs
         (tenant_id, user_id, user_name, action, entity_type, entity_id, description, ip_address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, userId, userName, action, entityType, entityId ? String(entityId) : null,
       description, ipAddress, status]
    );
  } catch (err) {
    // Never crash the main request if audit logging fails
    console.warn('[audit-log] write failed:', err.message);
  }
};

// exported below

// ── Middleware helper — attach to any request ───────────────────────────────────
const auditLog = (action, entityType = null, getEntityId = null, getDescription = null) =>
  async (req, res, next) => {
    res.on('finish', async () => {
      const success = res.statusCode < 400;
      const tenantId = req.tenantId || req.user?.tenant_id;
      const userId   = req.user?.id;
      if (!tenantId || !userId) return;
      const userName = `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim() ||
                        req.user?.email || String(userId);
      const entityId   = getEntityId   ? getEntityId(req, res)   : null;
      const description = getDescription ? getDescription(req, res) : null;
      await writeAuditLog({
        tenantId, userId, userName, action,
        entityType, entityId, description,
        ipAddress: req.ip,
        status: success ? 'success' : 'failed',
      });
    });
    next();
  };

// exported below

// ── Routes (all require auth) ──────────────────────────────────────────────────
router.use(verifyToken);

const isAdmin = (req) => req.user?.position === 'admin';

// GET /api/audit-logs — paginated list (admin only)
router.get('/', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  const tenantId = req.tenantId;
  const page    = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit   = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const offset  = (page - 1) * limit;

  const userFilter   = req.query.user_id     ? parseInt(req.query.user_id, 10) : null;
  const entityFilter = req.query.entity_type || null;
  const actionFilter = req.query.action      || null;
  const statusFilter = req.query.status      || null;
  const dateFrom     = req.query.date_from   || null;
  const dateTo       = req.query.date_to     || null;
  const search       = req.query.search      ? `%${req.query.search}%` : null;

  const conditions = ['tenant_id = ?'];
  const params     = [tenantId];

  if (userFilter)   { conditions.push('user_id = ?');      params.push(userFilter); }
  if (entityFilter) { conditions.push('entity_type = ?');  params.push(entityFilter); }
  if (actionFilter) { conditions.push('action LIKE ?');    params.push(`%${actionFilter}%`); }
  if (statusFilter) { conditions.push('status = ?');       params.push(statusFilter); }
  if (dateFrom)     { conditions.push('DATE(created_at) >= ?'); params.push(dateFrom); }
  if (dateTo)       { conditions.push('DATE(created_at) <= ?'); params.push(dateTo); }
  if (search)       {
    conditions.push('(user_name LIKE ? OR action LIKE ? OR description LIKE ?)');
    params.push(search, search, search);
  }

  const where = conditions.join(' AND ');

  try {
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM audit_logs WHERE ${where}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT id, user_id, user_name, action, entity_type, entity_id,
              description, ip_address, status, created_at
       FROM audit_logs
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /audit-logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// GET /api/audit-logs/stats — summary stats (admin only)
router.get('/stats', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin access required' });
  const tenantId = req.tenantId;
  try {
    const [[counts]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count,
         SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END) AS failed_count,
         SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) AS last_24h
       FROM audit_logs WHERE tenant_id = ?`,
      [tenantId]
    );
    const [topActions] = await pool.execute(
      `SELECT action, COUNT(*) AS count
       FROM audit_logs WHERE tenant_id = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY action ORDER BY count DESC LIMIT 8`,
      [tenantId]
    );
    const [topUsers] = await pool.execute(
      `SELECT user_id, user_name, COUNT(*) AS count
       FROM audit_logs WHERE tenant_id = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY user_id, user_name ORDER BY count DESC LIMIT 5`,
      [tenantId]
    );
    res.json({ success: true, counts, topActions, topUsers });
  } catch (err) {
    console.error('GET /audit-logs/stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch audit stats' });
  }
});

// Single export object — keeps ensureSchema, writeAuditLog, auditLog alongside the router
const routerModule = router;
routerModule.ensureSchema  = ensureAuditLogSchema;
routerModule.writeAuditLog = writeAuditLog;
routerModule.auditLog      = auditLog;
module.exports = routerModule;
