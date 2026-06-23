// routes/incrementLetterRoutes.js
const express = require('express');
const router = express.Router();
const incrementLetterController = require('./incrementLetterController');
const authMiddleware = require('../../middleware/auth.middleware');
const tenantMiddleware = require('../../middleware/tenantMiddleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

router.use(authMiddleware.verifyToken);
router.use(tenantMiddleware.extractTenantId);

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/increment-letters/my - Employee views own letters (EMPLOYEE)
router.get('/my', incrementLetterController.getMyLetters);

// POST /api/increment-letters - HR generates letter (ADMIN/HR ONLY)
router.post('/', requireModuleAccess('increment_letters', 'write'), incrementLetterController.uploadPDFMiddleware, incrementLetterController.generateLetter);

// GET /api/increment-letters - HR views all letters (ADMIN/HR ONLY)
router.get('/', requireModuleAccess('increment_letters', 'read'), incrementLetterController.getAllLetters);

// GET /api/increment-letters/:id - View specific letter (ADMIN/HR)
router.get('/:id', requireModuleAccess('increment_letters', 'read'), incrementLetterController.getLetterById);

// DELETE /api/increment-letters/:id - Delete letter (ADMIN/HR ONLY)
router.delete('/:id', requireModuleAccess('increment_letters', 'write'), incrementLetterController.deleteLetter);

module.exports = router;
