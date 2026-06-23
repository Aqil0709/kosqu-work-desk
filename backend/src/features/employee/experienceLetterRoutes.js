// routes/experienceLetterRoutes.js
const express = require('express');
const router = express.Router();
const experienceLetterController = require('./experienceLetterController');
const authMiddleware = require('../../middleware/auth.middleware');
const tenantMiddleware = require('../../middleware/tenantMiddleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

router.use(authMiddleware.verifyToken);
router.use(tenantMiddleware.extractTenantId);

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/experience-letters/my - Employee views own letters (EMPLOYEE)
router.get('/my', experienceLetterController.getMyLetters);

// POST /api/experience-letters - HR generates letter (ADMIN/HR ONLY)
router.post('/', requireModuleAccess('experience_letters', 'write'), experienceLetterController.uploadPDFMiddleware, experienceLetterController.generateLetter);

// GET /api/experience-letters - HR views all letters (ADMIN/HR ONLY)
router.get('/', requireModuleAccess('experience_letters', 'read'), experienceLetterController.getAllLetters);

// GET /api/experience-letters/:id - View specific letter (ADMIN/HR)
router.get('/:id', requireModuleAccess('experience_letters', 'read'), experienceLetterController.getLetterById);

// DELETE /api/experience-letters/:id - Delete letter (ADMIN/HR ONLY)
router.delete('/:id', requireModuleAccess('experience_letters', 'write'), experienceLetterController.deleteLetter);

module.exports = router;
