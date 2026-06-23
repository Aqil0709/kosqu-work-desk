// backend/routes/expenseRoutes.js
const express = require('express');
const multer = require('multer');
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for expense images (using memory storage as in your server.js)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/expenses - Get all expenses (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, expenseController.getAllExpenses);

// GET /api/expenses/categories - Get expense categories (ALL USERS)
router.get('/categories', expenseController.getCategories);

// POST /api/expenses/categories - Create new expense category (ADMIN ONLY)
router.post('/categories', authMiddleware.requireAdmin, expenseController.createCategory);

// GET /api/expenses/my - Get current user's expenses (EMPLOYEE)
router.get('/my', expenseController.getMyExpenses);

// GET /api/expenses/:id - Get specific expense (ADMIN OR OWNER)
router.get('/:id', expenseController.getExpense);

// POST /api/expenses - Submit new expense (EMPLOYEE)
router.post('/', upload.single('image'), expenseController.submitExpense);

// PUT /api/expenses/:id/status - Approve/Reject expense (ADMIN ONLY)
router.put('/:id/status', authMiddleware.requireAdmin, expenseController.updateExpenseStatus);

// PUT /api/expenses/:id/payment-status - Update payment status (ADMIN ONLY)
router.put('/:id/payment-status', authMiddleware.requireAdmin, expenseController.updatePaymentStatus);

module.exports = router;