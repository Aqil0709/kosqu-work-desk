// routes/experienceLetterRoutes.js
const express = require('express');
const router = express.Router();
const experienceLetterController = require('../controllers/experienceLetterController');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

router.use(authMiddleware.verifyToken);
router.use(tenantMiddleware.extractTenantId);

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/experience-letters/my - Employee views own letters (EMPLOYEE)
router.get('/my', experienceLetterController.getMyLetters);

// POST /api/experience-letters - HR generates letter (ADMIN/HR ONLY)
router.post('/', authMiddleware.requireRole(['admin', 'hr']), experienceLetterController.uploadPDFMiddleware, experienceLetterController.generateLetter);

// GET /api/experience-letters - HR views all letters (ADMIN/HR ONLY)
router.get('/', authMiddleware.requireRole(['admin', 'hr']), experienceLetterController.getAllLetters);

// GET /api/experience-letters/:id - View specific letter (ADMIN/HR)
router.get('/:id', authMiddleware.requireRole(['admin', 'hr']), experienceLetterController.getLetterById);

// DELETE /api/experience-letters/:id - Delete letter (ADMIN/HR ONLY)
router.delete('/:id', authMiddleware.requireRole(['admin', 'hr']), experienceLetterController.deleteLetter);

module.exports = router;
