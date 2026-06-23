// backend/routes/faceRoutes.js
const express = require('express');
const multer = require('multer');
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and tenant context
router.use(authMiddleware.verifyToken);
const upload = multer({ storage: multer.memoryStorage() });

// Face validation endpoint
router.post('/validate', upload.single('faceImage'), employeeController.validateFace);

module.exports = router;