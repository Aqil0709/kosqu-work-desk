const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const ctrl = require('./biometricController');

router.post  ('/enroll',              verifyToken, ctrl.uploadMiddleware, ctrl.enroll);
router.post  ('/verify',              verifyToken, ctrl.uploadMiddleware, ctrl.verify);
router.post  ('/reenroll',            verifyToken, ctrl.uploadMiddleware, ctrl.reenroll);
router.get   ('/status',              verifyToken, ctrl.status);
router.get   ('/status/:employeeId',  verifyToken, ctrl.status);

module.exports = router;
