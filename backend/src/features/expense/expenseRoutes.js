// backend/routes/expenseRoutes.js
const express = require('express');
const multer = require('multer');
const expenseController = require('./expenseController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// All routes are protected
router.use(authMiddleware.verifyToken);

// GET /api/expenses - Get all expenses (role-based)
router.get('/', requireModuleAccess('expense_management', 'read'), expenseController.getAllExpenses);

// GET /api/expenses/categories - Get expense categories
router.get('/categories', expenseController.getCategories);

// POST /api/expenses/categories - Create new category (ADD THIS)
router.post('/categories', requireModuleAccess('expense_management', 'write'), expenseController.createCategory);

// GET /api/expenses/my - Get current user's expenses
router.get('/my', expenseController.getMyExpenses);

// GET /api/expenses/:id - Get specific expense
router.get('/:id', expenseController.getExpense);

// POST /api/expenses - Submit new expense (with image upload)
router.post('/', upload.single('image'), expenseController.submitExpense);

// PUT /api/expenses/:id/status - Approve/Reject expense
router.put('/:id/status', requireModuleAccess('expense_management', 'write'), expenseController.updateExpenseStatus);

// PUT /api/expenses/:id/payment-status - Update payment status
router.put('/:id/payment-status', requireModuleAccess('expense_management', 'write'), expenseController.updatePaymentStatus);

module.exports = router;
