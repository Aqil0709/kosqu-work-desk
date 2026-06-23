const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const ctrl = require('./recruitmentController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF/Word files allowed'));
  }
});

router.use(authMiddleware.verifyToken);

// Jobs
router.get('/jobs', ctrl.listJobs);
router.get('/jobs/:id', ctrl.getJob);
router.post('/jobs', requireModuleAccess('recruitment', 'write'), ctrl.createJob);
router.put('/jobs/:id', requireModuleAccess('recruitment', 'write'), ctrl.updateJob);
router.delete('/jobs/:id', requireModuleAccess('recruitment', 'write'), ctrl.deleteJob);

// Candidates
router.get('/candidates', ctrl.listCandidates);
router.get('/candidates/:id', ctrl.getCandidate);
router.post('/candidates', requireModuleAccess('recruitment', 'write'), upload.single('resume'), ctrl.addCandidate);
router.put('/candidates/:id/stage', requireModuleAccess('recruitment', 'write'), ctrl.updateCandidateStage);

// Interviews
router.post('/interviews', requireModuleAccess('recruitment', 'write'), ctrl.scheduleInterview);
router.put('/interviews/:id', requireModuleAccess('recruitment', 'write'), ctrl.updateInterview);

// Offers
router.post('/offers', requireModuleAccess('recruitment', 'write'), ctrl.createOffer);
router.put('/offers/:id/status', requireModuleAccess('recruitment', 'write'), ctrl.updateOfferStatus);

// Stats
router.get('/stats', ctrl.getATSStats);

module.exports = router;
