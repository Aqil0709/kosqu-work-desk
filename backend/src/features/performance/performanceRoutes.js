const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const ensurePerformanceSchema = async (pool) => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        employee_id VARCHAR(20) NOT NULL,
        reviewer_id INT NOT NULL,
        period_label VARCHAR(100) NOT NULL,
        period_start DATE,
        period_end DATE,
        overall_rating DECIMAL(3,1) NOT NULL DEFAULT 0,
        comments TEXT,
        status ENUM('draft', 'submitted', 'acknowledged') DEFAULT 'draft',
        notification_sent TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id),
        INDEX idx_employee (tenant_id, employee_id),
        INDEX idx_status (tenant_id, status)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS performance_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        tenant_id INT NOT NULL,
        category_name VARCHAR(100) NOT NULL,
        rating DECIMAL(3,1) NOT NULL DEFAULT 0,
        comments TEXT,
        INDEX idx_review (review_id),
        FOREIGN KEY (review_id) REFERENCES performance_reviews(id) ON DELETE CASCADE
      )
    `);
  } catch (err) {
    if (err.code !== 'ER_TABLE_EXISTS_ERROR') console.warn('Performance schema warning:', err.message);
  }
};

// ── helpers ────────────────────────────────────────────────────────────────────

// MUST be defined before route handlers that call it (const has no hoisting)
async function sendLowPerformanceNotification(pool, review, rating) {
  try {
    const [empData] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, ed.reporting_manager_id, ed.team_lead_id
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id
       WHERE ed.id = ? AND ed.tenant_id = ? LIMIT 1`,
      [review.employee_id, review.tenant_id]
    );
    if (!empData.length) return;

    const emp = empData[0];
    const message = `Performance Alert: ${emp.first_name} ${emp.last_name} received a rating of ${rating}/5 for ${review.period_label}. Please review.`;

    const recipientSet = new Set([emp.id]);
    if (emp.reporting_manager_id) recipientSet.add(emp.reporting_manager_id);
    if (emp.team_lead_id) recipientSet.add(emp.team_lead_id);

    const [admins] = await pool.execute(
      `SELECT id FROM users WHERE tenant_id = ? AND position = 'admin' LIMIT 1`,
      [review.tenant_id]
    );
    if (admins.length) recipientSet.add(admins[0].id);

    for (const userId of recipientSet) {
      await pool.execute(
        `INSERT INTO in_app_notifications (tenant_id, user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, 'Performance Alert', ?, 'performance', 0, NOW())`,
        [review.tenant_id, userId, message]
      ).catch(() => {});
    }
  } catch (err) {
    console.warn('Low perf notification warning:', err.message);
  }
}

const attachCategories = async (pool, reviews) => {
  for (const review of reviews) {
    const [cats] = await pool.execute(
      'SELECT * FROM performance_categories WHERE review_id = ?',
      [review.id]
    );
    review.categories = cats;
  }
};

// Resolve employee_details.id (VARCHAR EMP-code) → users.id (INT)
const resolveUserIdFromEmpCode = async (pool, empCode, tenantId) => {
  const [rows] = await pool.execute(
    'SELECT employee_id FROM employee_details WHERE id = ? AND tenant_id = ? LIMIT 1',
    [empCode, tenantId]
  );
  return rows[0]?.employee_id ?? null;
};

// ── GET /api/performance ───────────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    const isAdmin = ['admin', 'hr'].includes(req.user.position);
    const isTeamLead = req.user.position === 'team_lead';

    // Resolve current user's employee code so non-admins can filter their own reviews
    let myEmpCode = null;
    if (!isAdmin) {
      const [empRows] = await pool.execute(
        'SELECT id FROM employee_details WHERE employee_id = ? AND tenant_id = ? LIMIT 1',
        [req.user.id, tenantId]
      );
      myEmpCode = empRows[0]?.id ?? null;
    }

    // employee_id in performance_reviews = employee_details.id (VARCHAR EMP-code)
    let query = `
      SELECT
        pr.id, pr.employee_id, pr.reviewer_id, pr.tenant_id,
        pr.period_label, pr.period_start, pr.period_end,
        pr.overall_rating, pr.status, pr.comments, pr.created_at, pr.updated_at,
        u.first_name, u.last_name,
        CONCAT(rv.first_name, ' ', rv.last_name) AS reviewer_name
      FROM performance_reviews pr
      LEFT JOIN employee_details ed ON ed.id = pr.employee_id AND ed.tenant_id = pr.tenant_id
      LEFT JOIN users u ON u.id = ed.employee_id
      LEFT JOIN users rv ON rv.id = pr.reviewer_id
      WHERE pr.tenant_id = ?
    `;
    const params = [tenantId];

    if (isTeamLead) {
      // Team lead sees reviews they submitted + reviews for their direct reports
      query += ' AND (pr.reviewer_id = ? OR ed.team_lead_id = ?)';
      params.push(req.user.id, req.user.id);
    } else if (!isAdmin) {
      if (!myEmpCode) {
        return res.json({ success: true, reviews: [] });
      }
      query += ' AND pr.employee_id = ?';
      params.push(myEmpCode);
    }

    query += ' ORDER BY pr.created_at DESC LIMIT 100';
    const [reviews] = await pool.execute(query, params);
    await attachCategories(pool, reviews);

    res.json({ success: true, reviews });
  } catch (err) {
    console.error('GET /performance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/performance ──────────────────────────────────────────────────────
router.post('/', verifyToken, requireModuleAccess('performance_management', 'write'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const { employee_id, period_label, period_start, period_end, categories, comments } = req.body;
    const tenantId = req.user.tenant_id;
    const reviewerId = req.user.id;

    if (!employee_id || !period_label) {
      return res.status(400).json({ success: false, message: 'employee_id and period_label are required' });
    }

    const cats = Array.isArray(categories) ? categories : [];
    const overallRating = cats.length > 0
      ? (cats.reduce((sum, c) => sum + Number(c.rating || 0), 0) / cats.length).toFixed(1)
      : 0;

    const [result] = await pool.execute(
      `INSERT INTO performance_reviews
        (tenant_id, employee_id, reviewer_id, period_label, period_start, period_end, overall_rating, comments, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [tenantId, employee_id, reviewerId, period_label, period_start || null, period_end || null, overallRating, comments || '']
    );

    const reviewId = result.insertId;
    for (const cat of cats) {
      await pool.execute(
        `INSERT INTO performance_categories (review_id, tenant_id, category_name, rating, comments)
         VALUES (?, ?, ?, ?, ?)`,
        [reviewId, tenantId, cat.name, Number(cat.rating) || 0, cat.comments || '']
      );
    }

    res.json({ success: true, message: 'Review created', review_id: reviewId });
  } catch (err) {
    console.error('POST /performance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/performance/:id ───────────────────────────────────────────────────
router.put('/:id', verifyToken, requireModuleAccess('performance_management', 'write'), async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const { id } = req.params;
    const { categories, comments, status } = req.body;
    const tenantId = req.user.tenant_id;

    const [rows] = await pool.execute(
      'SELECT * FROM performance_reviews WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Review not found' });

    const review = rows[0];
    const cats = Array.isArray(categories) ? categories : [];
    const overallRating = cats.length > 0
      ? (cats.reduce((sum, c) => sum + Number(c.rating || 0), 0) / cats.length).toFixed(1)
      : review.overall_rating;

    await pool.execute(
      `UPDATE performance_reviews SET overall_rating = ?, comments = ?, status = ?, updated_at = NOW() WHERE id = ?`,
      [overallRating, comments ?? review.comments, status ?? review.status, id]
    );

    if (cats.length > 0) {
      await pool.execute('DELETE FROM performance_categories WHERE review_id = ?', [id]);
      for (const cat of cats) {
        await pool.execute(
          `INSERT INTO performance_categories (review_id, tenant_id, category_name, rating, comments) VALUES (?, ?, ?, ?, ?)`,
          [id, tenantId, cat.name, Number(cat.rating) || 0, cat.comments || '']
        );
      }
    }

    if (status === 'submitted' && Number(overallRating) < 3.0 && !review.notification_sent) {
      await sendLowPerformanceNotification(pool, review, overallRating);
      await pool.execute('UPDATE performance_reviews SET notification_sent = 1 WHERE id = ?', [id]);
    }

    res.json({ success: true, message: 'Review updated' });
  } catch (err) {
    console.error('PUT /performance/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/performance/:id ───────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { pool } = require('../../config/db');
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const [rows] = await pool.execute(
      `SELECT pr.id, pr.employee_id, pr.reviewer_id, pr.tenant_id,
              pr.period_label, pr.period_start, pr.period_end,
              pr.overall_rating, pr.status, pr.comments, pr.created_at, pr.updated_at,
              u.first_name, u.last_name
       FROM performance_reviews pr
       LEFT JOIN employee_details ed ON ed.id = pr.employee_id AND ed.tenant_id = pr.tenant_id
       LEFT JOIN users u ON u.id = ed.employee_id
       WHERE pr.id = ? AND pr.tenant_id = ?`,
      [id, tenantId]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: 'Review not found' });

    const review = rows[0];

    // Non-admin can only view their own review
    const isAdmin = ['admin', 'hr'].includes(req.user.position);
    if (!isAdmin) {
      const userId = await resolveUserIdFromEmpCode(pool, review.employee_id, tenantId);
      if (userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const [cats] = await pool.execute('SELECT * FROM performance_categories WHERE review_id = ?', [id]);
    review.categories = cats;

    res.json({ success: true, review });
  } catch (err) {
    console.error('GET /performance/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { router, ensurePerformanceSchema };
