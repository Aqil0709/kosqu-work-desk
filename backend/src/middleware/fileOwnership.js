// Ownership check for files served under /uploads
// Runs after JWT verification (req.user is populated).
// Denies access unless the caller owns the file or is HR/admin.
const { pool } = require('../config/db');

const checkFileOwnership = async (req, res, next) => {
  try {
    const { id: userId, tenant_id: tenantId, position } = req.user;

    const isHrAdmin = position === 'admin' || position === 'hr';

    // Clients are never allowed to access employee personal documents
    if (position === 'client') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // req.path under the /uploads mount is the part after /uploads, e.g. /aadhaar/file.pdf
    // The DB stores the full path: /uploads/aadhaar/file.pdf
    const dbPath = `/uploads${req.path}`;

    // ── Check 1: employee_documents (aadhaar, pan, cv, photo, all employee docs) ─────
    const [empDocs] = await pool.execute(
      'SELECT employee_user_id FROM employee_documents WHERE file_path = ? AND tenant_id = ? LIMIT 1',
      [dbPath, tenantId]
    );

    if (empDocs.length > 0) {
      if (isHrAdmin || Number(empDocs[0].employee_user_id) === Number(userId)) {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // ── Check 2: mom_attachments (meeting documents) ──────────────────────────────────
    const [momDocs] = await pool.execute(
      'SELECT id FROM mom_attachments WHERE file_path = ? AND tenant_id = ? LIMIT 1',
      [dbPath, tenantId]
    );

    if (momDocs.length > 0) {
      return next();
    }

    // ── Check 3: project_docs (project documents uploaded by employees) ───────────────
    const [projDocs] = await pool.execute(
      'SELECT user_id, employee_id FROM project_docs WHERE file_path = ? AND tenant_id = ? LIMIT 1',
      [dbPath, tenantId]
    ).catch(() => [[]]);

    if (projDocs.length > 0) {
      if (isHrAdmin || Number(projDocs[0].user_id) === Number(userId)) return next();
      // Also allow TL / reporting manager access
      const [tlCheck] = await pool.execute(
        `SELECT ed.id FROM employee_details ed
         JOIN project_docs pd ON pd.employee_id = ed.employee_id AND pd.tenant_id = ed.tenant_id
         WHERE ed.tenant_id = ? AND pd.file_path = ? AND pd.tenant_id = ?
           AND (ed.reporting_manager_id = ? OR ed.team_lead_id = ?) LIMIT 1`,
        [tenantId, dbPath, tenantId, userId, userId]
      ).catch(() => [[]]);
      if (tlCheck.length > 0) return next();
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // ── Fallback: HR/Admin may access files not yet registered (AI docs, expenses, etc.) ─
    if (isHrAdmin) {
      return next();
    }

    // File not registered to any ownership table and caller is not HR/admin
    return res.status(403).json({ success: false, message: 'Access denied' });

  } catch (err) {
    console.error('[fileOwnership] check failed:', err.message);
    return res.status(500).json({ success: false, message: 'File access check failed' });
  }
};

module.exports = { checkFileOwnership };
