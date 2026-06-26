const WFHModel = require('./wfhModel');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/wfh');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `wfh_${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
exports.uploadMiddleware = upload.single('attachment');

exports.createRequest = async (req, res) => {
  try {
    const { from_date, to_date, reason } = req.body;
    if (!from_date || !to_date || !reason)
      return res.status(400).json({ success: false, message: 'from_date, to_date, and reason are required' });

    const attachment_path = req.file ? req.file.path : null;
    const data = await WFHModel.create(req.tenantId, req.user.id, { from_date, to_date, reason, attachment_path });
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const data = await WFHModel.getByEmployee(req.tenantId, req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const data = await WFHModel.getAll(req.tenantId, req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getRequest = async (req, res) => {
  try {
    const data = await WFHModel.getById(req.tenantId, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// TL approves/rejects
exports.tlAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    if (!['approve','reject'].includes(action))
      return res.status(400).json({ success: false, message: 'Invalid action' });

    const wfh = await WFHModel.getById(req.tenantId, req.params.id);
    if (!wfh) return res.status(404).json({ success: false, message: 'Not found' });
    if (wfh.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Request is not pending' });

    const newStatus = action === 'approve' ? 'tl_approved' : 'rejected';
    await WFHModel.updateStatus(req.tenantId, req.params.id,
      { status: newStatus, action_by: req.user.id, remarks }, 'tl');
    res.json({ success: true, message: `WFH ${action}d by Team Lead` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// HR approves/rejects
exports.hrAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    const wfh = await WFHModel.getById(req.tenantId, req.params.id);
    if (!wfh) return res.status(404).json({ success: false, message: 'Not found' });
    if (wfh.status !== 'tl_approved')
      return res.status(400).json({ success: false, message: 'Awaiting TL approval first' });

    const newStatus = action === 'approve' ? 'hr_approved' : 'rejected';
    await WFHModel.updateStatus(req.tenantId, req.params.id,
      { status: newStatus, action_by: req.user.id, remarks }, 'hr');
    res.json({ success: true, message: `WFH ${action}d by HR` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// Admin final approval
exports.finalAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    const wfh = await WFHModel.getById(req.tenantId, req.params.id);
    if (!wfh) return res.status(404).json({ success: false, message: 'Not found' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await WFHModel.updateStatus(req.tenantId, req.params.id,
      { status: newStatus, action_by: req.user.id, remarks }, 'final');
    res.json({ success: true, message: `WFH request ${newStatus}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    await WFHModel.delete(req.tenantId, req.params.id, req.user.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
