// backend/controllers/expenseController.js
const Expense = require('../models/expenseModel');
const fs = require('fs');
const path = require('path');

const expenseController = {
    // Get all expenses (with role-based filtering)
    getAllExpenses: async (req, res) => {
        try {
            const filters = {};
            
            if (req.user.role_name !== 'admin' && req.user.role_name !== 'hr') {
                filters.user_id = req.user.id;
            }

            if (req.query.status) filters.status = req.query.status;
            if (req.query.category_id) filters.category_id = req.query.category_id;
            if (req.query.payment_status) filters.payment_status = req.query.payment_status;

            const expenses = await Expense.getAll(req.tenantId, filters);
            res.json({ expenses });
        } catch (error) {
            console.error('Get expenses error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get expense categories
    getCategories: async (req, res) => {
        try {
            const categories = await Expense.getCategories(req.tenantId);
            res.json({ categories });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create new expense category (ADMIN ONLY)
    createCategory: async (req, res) => {
        try {
            const { name, limit_amount, description } = req.body;

            // Validate input
            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Category name is required' });
            }

            // Create category
            const category = await Expense.createCategory(req.tenantId, {
                name: name.trim(),
                limit_amount: limit_amount || 0,
                description: description || ''
            });

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                category
            });
        } catch (error) {
            console.error('Create category error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Category with this name already exists' });
            }
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get expense by ID
    getExpense: async (req, res) => {
        try {
            const expense = await Expense.getById(req.tenantId, req.params.id);
            
            if (!expense) {
                return res.status(404).json({ message: 'Expense not found' });
            }

            if (req.user.role_name !== 'admin' && req.user.role_name !== 'hr' && expense.user_id !== req.user.id) {
                return res.status(403).json({ message: 'Access denied' });
            }

            res.json({ expense });
        } catch (error) {
            console.error('Get expense error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

   // backend/controllers/expenseController.js
submitExpense: async (req, res) => {
  try {
    console.log('=== SUBMIT EXPENSE DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('User:', req.user);
    console.log('Tenant ID:', req.tenantId);
    
    const { category_id, amount, description } = req.body;
    let imagePath = null;

    // Handle image upload if file exists
    if (req.file) {
      console.log('File received:', req.file.originalname, req.file.size);
      // Create unique filename
      const fileName = `expense_${Date.now()}_${req.file.originalname}`;
      const uploadDir = path.join(__dirname, '../uploads/expenses');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      
      // Save file
      fs.writeFileSync(filePath, req.file.buffer);
      
      // Store relative path for web access
      imagePath = `/uploads/expenses/${fileName}`;
      console.log('Image saved to:', imagePath);
    }

    // Validation
    console.log('Validation checks:');
    console.log('- category_id:', category_id, 'type:', typeof category_id);
    console.log('- amount:', amount, 'type:', typeof amount);
    console.log('- description:', description);
    
    if (!category_id || !amount || !description) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: 'Category, amount, and description are required',
        received: { category_id, amount, description }
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.log('Invalid amount:', amountNum);
      return res.status(400).json({ message: 'Amount must be a valid number greater than 0' });
    }

    // Check if category exists
    const category = await Expense.getCategoryById(req.tenantId, category_id);
    console.log('Category found:', category);
    
    if (!category) {
      return res.status(400).json({ message: 'Invalid expense category' });
    }

    // Check if amount exceeds category limit
    if (category.limit_amount > 0 && amountNum > category.limit_amount) {
      return res.status(400).json({ 
        message: `Amount exceeds category limit of ₹${category.limit_amount}` 
      });
    }

    console.log('Attempting to create expense with:', {
      tenant_id: req.tenantId,
      user_id: req.user.id,
      category_id: parseInt(category_id),
      amount: amountNum,
      description: description,
      image: imagePath
    });

    const expenseId = await Expense.create(req.tenantId, {
      user_id: req.user.id,
      category_id: parseInt(category_id),
      amount: amountNum,
      description: description,
      image: imagePath
    });

    console.log('Expense created with ID:', expenseId);

    res.status(201).json({ 
      success: true,
      message: 'Expense submitted successfully', 
      expense_id: expenseId,
      image: imagePath
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error: ' + error.message,
      details: error.toString()
    });
  }
},

    // Update expense status (Approve/Reject)
    updateExpenseStatus: async (req, res) => {
        try {
            const { status } = req.body;
            const expenseId = req.params.id;

            if (req.user.role_name !== 'admin' && req.user.role_name !== 'hr') {
                return res.status(403).json({ message: 'Access denied. Only admins can approve expenses.' });
            }

            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ message: 'Status must be either "approved" or "rejected"' });
            }

            const affectedRows = await Expense.updateStatus(req.tenantId, expenseId, status, req.user.id);

            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Expense not found' });
            }

            res.json({ 
                success: true,
                message: `Expense ${status} successfully` 
            });
        } catch (error) {
            console.error('Update expense status error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

  // backend/controllers/expenseController.js

updatePaymentStatus: async (req, res) => {
  try {
    const { payment_status } = req.body;
    const expenseId = req.params.id;

    console.log('=== PAYMENT STATUS UPDATE ===');
    console.log('Expense ID:', expenseId);
    console.log('Payment Status:', payment_status);
    console.log('User:', req.user);

    // Check if user has permission
    if (req.user.role_name !== 'admin' && req.user.role_name !== 'hr') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Only admins can update payment status.' 
      });
    }

    // Validate payment status
    const validStatuses = ['pending', 'paid', 'cancelled'];
    if (!payment_status || !validStatuses.includes(payment_status.toLowerCase())) {
      return res.status(400).json({ 
        success: false,
        message: `Payment status must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Update the payment status
    const result = await Expense.updatePaymentStatus(req.tenantId, expenseId, payment_status.toLowerCase());

    if (!result || result === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found' 
      });
    }

    res.json({ 
      success: true,
      message: `Payment status updated to ${payment_status} successfully` 
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error' 
    });
  }
},

    // Get user's own expenses
    getMyExpenses: async (req, res) => {
        try {
            const expenses = await Expense.getByUserId(req.tenantId, req.user.id);
            res.json({ expenses });
        } catch (error) {
            console.error('Get my expenses error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = expenseController;