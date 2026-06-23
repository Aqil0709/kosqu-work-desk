const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const c = require('./grievanceController');

router.use(auth.verifyToken);

// ── Employee self-service (any authenticated user can file) ──────────────────
router.post('/submit', c.submitGrievance);
router.get('/my', c.getMyGrievances);
router.get('/my/:id', c.getMyGrievance);

// ── Admin / HR routes ────────────────────────────────────────────────────────
router.get('/stats', requireModuleAccess('grievance', 'read'), c.getStats);
router.get('/', requireModuleAccess('grievance', 'read'), c.listGrievances);
router.get('/:id', requireModuleAccess('grievance', 'read'), c.getGrievance);
router.put('/:id', requireModuleAccess('grievance', 'write'), c.updateGrievance);
router.post('/:id/comment', requireModuleAccess('grievance', 'write'), c.addComment);
router.post('/:id/escalate', requireModuleAccess('grievance', 'write'), c.escalateGrievance);

// ── POSH Committee ────────────────────────────────────────────────────────────
router.get('/posh/committee', requireModuleAccess('grievance', 'read'), c.getCommittee);
router.post('/posh/committee', requireModuleAccess('grievance', 'write'), c.addCommitteeMember);
router.delete('/posh/committee/:id', requireModuleAccess('grievance', 'write'), c.removeCommitteeMember);

module.exports = router;
