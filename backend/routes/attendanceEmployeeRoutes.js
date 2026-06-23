// backend/routes/attendanceEmployeeRoutes.js
const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const multer = require('multer');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// All routes require authentication
router.use(authMiddleware.verifyToken);

// Employee-specific routes (matching frontend expectations)
router.get('/my/today', attendanceController.getMyTodayAttendance);
router.get('/my/history', attendanceController.getMyHistory);
router.get('/my/percentage', attendanceController.getMyAttendancePercentage);
router.post('/my/mark', attendanceController.markMyAttendance);
router.post('/verify-my-face', upload.single('faceImage'), attendanceController.verifyMyFaceAndMarkAttendance);

module.exports = router;
