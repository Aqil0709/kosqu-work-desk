// backend/models/expenseModel.js
const pool = require('../config/database');

const Expense = {
    // Get all expenses with user and category details
    getAll: async (tenantId, filters = {}) => {
        let query = `
            SELECT 
                e.*,
                u.first_name,
                u.last_name,
                u.email,
                r.name as user_role,
                ec.name as category_name,
                ec.limit_amount as category_limit
            FROM expenses e
            JOIN users u ON e.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.tenant_id = ?
        `;
        const params = [tenantId];

        if (filters.user_id) {
            query += ' AND e.user_id = ?';
            params.push(filters.user_id);
        }

        if (filters.status) {
            query += ' AND e.status = ?';
            params.push(filters.status);
        }

        if (filters.category_id) {
            query += ' AND e.category_id = ?';
            params.push(filters.category_id);
        }

        if (filters.payment_status) {
            query += ' AND e.payment_status = ?';
            params.push(filters.payment_status);
        }

        query += ' ORDER BY e.submitted_at DESC';

        const [rows] = await pool.execute(query, params);
        return rows;
    },

    // Get expense by ID
    getById: async (tenantId, id) => {
        const [rows] = await pool.execute(
            `SELECT 
                e.*,
                u.first_name,
                u.last_name,
                u.email,
                r.name as user_role,
                ec.name as category_name,
                ec.limit_amount as category_limit
            FROM expenses e
            JOIN users u ON e.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.id = ? AND e.tenant_id = ?`,
            [id, tenantId]
        );
        return rows[0];
    },

   // backend/models/expenseModel.js
create: async (tenantId, expenseData) => {
  const { user_id, category_id, amount, description, image } = expenseData;
  
  console.log('Expense.create called with:', {
    tenantId,
    user_id,
    category_id,
    amount,
    description,
    image
  });
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO expenses (tenant_id, user_id, category_id, amount, description, image, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [tenantId, user_id, category_id, amount, description, image || null, 'pending', 'pending']
    );
    console.log('Insert result:', result);
    return result.insertId;
  } catch (dbError) {
    console.error('Database insert error:', dbError);
    console.error('SQL Error code:', dbError.code);
    console.error('SQL Error message:', dbError.message);
    throw dbError;
  }
},

    // Update expense status
    updateStatus: async (tenantId, id, status, approved_by = null) => {
        const approved_at = status !== 'pending' ? new Date() : null;
        const [result] = await pool.execute(
            `UPDATE expenses SET status = ?, approved_by = ?, approved_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`,
            [status, approved_by, approved_at, id, tenantId]
        );
        return result.affectedRows;
    },

    // Update payment status
   // backend/models/expenseModel.js

// Add this method if it doesn't exist
updatePaymentStatus: async (tenantId, id, payment_status) => {
  console.log('Updating payment status:', { tenantId, id, payment_status });
  
  try {
    const [result] = await pool.execute(
      'UPDATE expenses SET payment_status = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
      [payment_status, id, tenantId]
    );
    
    console.log('Update result:', result);
    return result.affectedRows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
},

    // Get expenses by user ID
    getByUserId: async (tenantId, user_id) => {
        const [rows] = await pool.execute(
            `SELECT 
                e.*,
                ec.name as category_name,
                ec.limit_amount as category_limit
            FROM expenses e
            JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.user_id = ? AND e.tenant_id = ?
            ORDER BY e.submitted_at DESC`,
            [user_id, tenantId]
        );
        return rows;
    },

    // Get all expense categories
    getCategories: async (tenantId) => {
        const [rows] = await pool.execute(
            'SELECT * FROM expense_categories WHERE tenant_id = ? ORDER BY name', [tenantId]
        );
        return rows;
    },

    // Get category by ID
    getCategoryById: async (tenantId, id) => {
        const [rows] = await pool.execute(
            'SELECT * FROM expense_categories WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return rows[0];
    },

    // Create new expense category
    createCategory: async (tenantId, categoryData) => {
        const { name, limit_amount = 0, description = '' } = categoryData;
        const [result] = await pool.execute(
            'INSERT INTO expense_categories (tenant_id, name, limit_amount, description) VALUES (?, ?, ?, ?)',
            [tenantId, name, limit_amount, description]
        );
        return {
            id: result.insertId,
            name,
            limit_amount,
            description,
            tenant_id: tenantId
        };
    }
};

module.exports = Expense;