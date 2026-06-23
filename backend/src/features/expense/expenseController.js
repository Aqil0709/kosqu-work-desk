// backend/controllers/expenseController.js
const Expense = require('./expenseModel');
const fs = require('fs');
const path = require('path');

const expenseController = {
    // Get all expenses (with role-based filtering)
    getAllExpenses: async (req, res) => {
        try {
            const filters = {};
            

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

    // Create category
    createCategory: async (req, res) => {
        try {
            const { name, limit_amount, description } = req.body;
            
            // Validate input
            if (!name || !name.trim()) {
                return res.status(400).json({ message: 'Category name is required' });
            }
            
            // Check if category already exists for this tenant
            const existingCategories = await Expense.getCategories(req.tenantId);
            const categoryExists = existingCategories.some(
                cat => cat.name.toLowerCase() === name.trim().toLowerCase()
            );
            
            if (categoryExists) {
                return res.status(400).json({ message: 'Category already exists' });
            }
            
            // Create the category
            const categoryId = await Expense.createCategory(req.tenantId, {
                name: name.trim(),
                limit_amount: limit_amount || null,
                description: description || null
            });
            
            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                category_id: categoryId
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Get expense by ID
    getExpense: async (req, res) => {
        try {
            const expense = await Expense.getById(req.tenantId, req.params.id);
            
            if (!expense) {
                return res.status(404).json({ message: 'Expense not found' });
            }

            if (req.user.role_name !== 'admin' && req.user.role_name !== 'hr' && expense.employee_id !== req.user.id) {
                return res.status(403).json({ message: 'Access denied' });
            }

            res.json({ expense });
        } catch (error) {
            console.error('Get expense error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    submitExpense: async (req, res) => {
        try {
            const { category_id, amount, description } = req.body;
            let imagePath = null;

            if (req.file) {
                const fileName = `expense_${Date.now()}_${req.file.originalname}`;
                const uploadDir = path.join(__dirname, '../uploads/expenses');
                
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, req.file.buffer);
                imagePath = `/uploads/expenses/${fileName}`;
            }

            if (!category_id || !amount || !description) {
                return res.status(400).json({ 
                    message: 'Category, amount, and description are required',
                    received: { category_id, amount, description }
                });
            }

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return res.status(400).json({ message: 'Amount must be a valid number greater than 0' });
            }

            const category = await Expense.getCategoryById(req.tenantId, category_id);
            
            if (!category) {
                return res.status(400).json({ message: 'Invalid expense category' });
            }

            if (category.limit_amount > 0 && amountNum > category.limit_amount) {
                return res.status(400).json({ 
                    message: `Amount exceeds category limit of ₹${category.limit_amount}` 
                });
            }

            const expenseId = await Expense.create(req.tenantId, {
                employee_id: req.user.id,
                category_id: parseInt(category_id),
                amount: amountNum,
                description: description,
                image: imagePath
            });

            res.status(201).json({ 
                success: true,
                message: 'Expense submitted successfully', 
                expense_id: expenseId,
                image: imagePath
            });
        } catch (error) {
            console.error('Submit expense error:', error);
            res.status(500).json({ 
                message: 'Something went wrong. Please contact administrator.',
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

    updatePaymentStatus: async (req, res) => {
    try {
        const { payment_status } = req.body;
        const expenseId = req.params.id;

        // Only Admin/HR/Finance can update payment status
        const pos = (req.user?.position || req.user?.role || '').toLowerCase();
        if (!['admin', 'hr', 'finance'].includes(pos)) {
            return res.status(403).json({ success: false, message: 'Admin/HR/Finance access required' });
        }

        const validStatuses = ['pending', 'paid', 'cancelled'];
        if (!payment_status || !validStatuses.includes(payment_status.toLowerCase())) {
            return res.status(400).json({ 
                success: false,
                message: `Payment status must be one of: ${validStatuses.join(', ')}` 
            });
        }

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
            message: 'Something went wrong. Please contact administrator.'
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
    },
};

module.exports = expenseController;