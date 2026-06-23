const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const docController = require('./employeeDocumentController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images, PDF and Word documents are allowed'), false);
  },
});

router.use(authMiddleware.verifyToken);

// Employee routes — own documents only
router.get('/my', docController.getMyDocuments);
router.post('/my', upload.single('file'), docController.upload);
router.delete('/my/:id', docController.deleteMyDocument);

// Admin / HR routes
router.get('/', requireModuleAccess('employee_management', 'read'), docController.getAllDocuments);
router.get('/employee/:employeeId', requireModuleAccess('employee_management', 'read'), docController.getEmployeeDocuments);

module.exports = router;
