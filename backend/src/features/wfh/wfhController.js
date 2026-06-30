const WFHModel = require('./wfhModel');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { pool } = require('../../config/db');

// ── Upload middleware ──────────────────────────────────────────────────────────
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

// ── Notification helper ────────────────────────────────────────────────────────
async function notify(tenantId, userId, title, message) {
  try {
    const { sendNotification } = require('../notifications/notificationHelper');
    await sendNotification(tenantId, userId, { title, message, type: 'wfh' });
  } catch (_) {}
}

async function notifyApprovers(tenantId, stage, wfhId, employeeName) {
  try {
    let userIds = [];
    if (stage === 'tl') {
      // Already handled per-request — skip broad notify
    } else if (stage === 'client') {
      const [rows] = await pool.execute(
        `SELECT u.id FROM users u JOIN clients c ON c.user_id=u.id
         WHERE c.tenant_id=? AND u.is_active=1`,
        [tenantId]
      );
      userIds = rows.map(r => r.id);
    } else if (stage === 'hr') {
      const [rows] = await pool.execute(
        `SELECT id FROM users WHERE tenant_id=? AND position='hr' AND is_active=1`,
        [tenantId]
      );
      userIds = rows.map(r => r.id);
    } else if (stage === 'admin') {
      const [rows] = await pool.execute(
        `SELECT id FROM users WHERE tenant_id=? AND position='admin' AND is_active=1`,
        [tenantId]
      );
      userIds = rows.map(r => r.id);
    }
    const { sendNotification } = require('../notifications/notificationHelper');
    for (const uid of userIds) {
      await sendNotification(tenantId, uid, {
        title: '🏠 WFH Approval Required',
        message: `${employeeName} has submitted a WFH request awaiting your approval.`,
        type: 'wfh',
      });
    }
  } catch (_) {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fullName(wfh) {
  return `${wfh.first_name || ''} ${wfh.last_name || ''}`.trim();
}

// Determine next stage after current approval
async function resolveNextStage(tenantId, wfh, currentStage) {
  const empPos = wfh.emp_position || '';
  const isHRSelf = ['hr'].includes(empPos);

  if (isHRSelf) {
    // HR submits → goes directly to admin
    return currentStage === 'hr_self' ? 'admin' : null;
  }

  // Normal flow: tl → client (if assigned) → hr → admin (final)
  if (currentStage === 'tl') {
    if (wfh.client_id) return 'client';
    return 'hr';
  }
  if (currentStage === 'client') return 'hr';
  if (currentStage === 'hr')     return 'admin';
  return null; // done
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
exports.createRequest = async (req, res) => {
  try {
    const { from_date, to_date, reason } = req.body;
    if (!from_date || !to_date || !reason)
      return res.status(400).json({ success: false, message: 'from_date, to_date, and reason are required' });

    const attachment_path = req.file ? `/uploads/wfh/${req.file.filename}` : null;
    const empPos = (req.user.position || '').toLowerCase();

    let data;
    if (empPos === 'hr') {
      // HR self-request: skip TL/Client, goes directly to admin
      const [result] = await pool.execute(
        `INSERT INTO wfh_requests
         (tenant_id, employee_id, from_date, to_date, reason, attachment_path, status, current_stage)
         VALUES (?,?,?,?,?,?,'pending','admin')`,
        [req.tenantId, req.user.id, from_date, to_date, reason, attachment_path]
      );
      data = { id: result.insertId };
      // Notify admin
      await notifyApprovers(req.tenantId, 'admin', result.insertId,
        `${req.user.first_name} ${req.user.last_name}`);
    } else {
      data = await WFHModel.create(req.tenantId, req.user.id, { from_date, to_date, reason, attachment_path });
      // Notify TL
      const [empRows] = await pool.execute(
        `SELECT team_lead_id FROM employee_details WHERE employee_id=? AND tenant_id=? LIMIT 1`,
        [req.user.id, req.tenantId]
      );
      const tlId = empRows[0]?.team_lead_id;
      if (tlId) {
        await notify(req.tenantId, tlId, '🏠 WFH Approval Required',
          `${req.user.first_name} ${req.user.last_name} submitted a WFH request (${from_date} to ${to_date}).`);
      } else {
        await notifyApprovers(req.tenantId, 'hr', data.id,
          `${req.user.first_name} ${req.user.last_name}`);
      }
    }

    res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('WFH create error:', e);
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
    const pos = (req.user.position || '').toLowerCase();
    let data;

    if (pos === 'team_lead') {
      data = await WFHModel.getPendingForTL(req.tenantId, req.user.id);
    } else if (pos === 'client') {
      data = await WFHModel.getPendingForClient(req.tenantId, req.user.id);
    } else {
      data = await WFHModel.getAll(req.tenantId, req.query);
    }
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

// ── TL Action ─────────────────────────────────────────────────────────────────
exports.tlAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'Invalid action' });

    const wfh = await WFHModel.getById(req.tenantId, req.params.id);
    if (!wfh) return res.status(404).json({ success: false, message: 'Not found' });
    if (wfh.current_stage !== 'tl')
      return res.status(400).json({ success: false, message: 'Not at TL approval stage' });

    // Verify this TL is assigned to this employee
    const [empRows] = await pool.execute(
      `SELECT team_lead_id FROM employee_details WHERE employee_id=? AND tenant_id=? LIMIT 1`,
      [wfh.employee_id, req.tenantId]
    );
    const isAssignedTL = empRows[0]?.team_lead_id === req.user.id;
    const isHRAdmin = ['hr', 'admin'].includes(req.user.position);
    if (!isAssignedTL && !isHRAdmin)
      return res.status(403).json({ success: false, message: 'Only the assigned Team Lead can approve this request' });

    if (action === 'reject') {
      await WFHModel.updateStatus(req.tenantId, req.params.id,
        { status: 'rejected', action_by: req.user.id, remarks, next_stage: 'tl' }, 'tl');
      await notify(req.tenantId, wfh.employee_id, '❌ WFH Request Rejected',
        `Your WFH request (${wfh.from_date} to ${wfh.to_date}) was rejected by Team Lead. Reason: ${remarks || 'No reason given'}`);
      return res.json({ success: true, message: 'WFH rejected by Team Lead', next_stage: null });
    }

    // Approve — find next stage
    const next = await resolveNextStage(req.tenantId, wfh, 'tl');
    const newStatus = next ? 'tl_approved' : 'approved';
    await WFHModel.updateStatus(req.tenantId, req.params.id,
      { status: newStatus, action_by: req.user.id, remarks, next_stage: next || 'done' }, 'tl');

    if (!next) {
      await WFHModel.markAttendanceWFH(req.tenantId, req.params.id);
      await notify(req.tenantId, wfh.employee_id, '✅ WFH Request Approved',
        `Your WFH request (${wfh.from_date} to ${wfh.to_date}) has been fully approved.`);
    } else {
      await notifyApprovers(req.tenantId, next, req.params.id, fullName(wfh));
      await notify(req.tenantId, wfh.employee_id, '✔ WFH: TL Approved',
        `Your WFH request was approved by Team Lead and is now pending ${next.toUpperCase()} approval.`);
    }

    res.json({ success: true, message: 'Approved by Team Lead', next_stage: next });
  } catch (e) {
    console.error('TL action error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Client Action ─────────────────────────────────────────────────────────────
exports.clientAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'Invalid action' });

    const wfh = await WFHModel.getById(req.tenantId, req.params.id);
    if (!wfh) return res.status(404).json({ success: false, message: 'Not found' });
    if (wfh.current_stage !== 'client')
      return res.status(400).json({ success: false, message: 'Not at Client approval stage' });

    if (action === 'reject') {
      await WFHModel.updateStatus(req.tenantId, req.params.id,
        { status: 'rejected', action_by: req.user.id, remarks, next_stage: 'client' }, 'client');
      await notify(req.tenantId, wfh.employee_id, '❌ WFH Request Rejected',
        `Your WFH request was rejected by Client. Reason: ${remarks || 'No reason given'}`);
      return res.json({ success: true, message: 'WFH rejected by Client', next_stage: null });
    }

    const next = 'hr';
    await WFHModel.updateStatus(req.tenantId, req.params.id,
      { status: 'client_approved', action_by: req.user.id, remarks, next_stage: next }, 'client');
    await notifyApprovers(req.tenantId, 'hr', req.params.id, fullName(wfh));
    await notify(req.tenantId, wfh.employee_id, '✔ WFH: Client Approved',
      `Your WFH request was approved by Client and is now pending HR approval.`);

    res.json({ success: true, message: 'Approved by Client', next_stage: next });
  } catch (e) {
    console.error('Client action error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── HR Action ─────────────────────────────────────────────────────────────────
exports.hrAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    const wfh = await WFHModel.getById(req.tenantId, req.params.id);
    if (!wfh) return res.status(404).json({ success: false, message: 'Not found' });
    if (wfh.current_stage !== 'hr')
      return res.status(400).json({ success: false, message: 'Not at HR approval stage' });

    if (action === 'reject') {
      await WFHModel.updateStatus(req.tenantId, req.params.id,
        { status: 'rejected', action_by: req.user.id, remarks, next_stage: 'hr' }, 'hr');
      await notify(req.tenantId, wfh.employee_id, '❌ WFH Request Rejected',
        `Your WFH request was rejected by HR. Reason: ${remarks || 'No reason given'}`);
      return res.json({ success: true, message: 'WFH rejected by HR', next_stage: null });
    }

    const next = 'admin';
    await WFHModel.updateStatus(req.tenantId, req.params.id,
      { status: 'hr_approved', action_by: req.user.id, remarks, next_stage: next }, 'hr');
    await notifyApprovers(req.tenantId, 'admin', req.params.id, fullName(wfh));
    await notify(req.tenantId, wfh.employee_id, '✔ WFH: HR Approved',
      `Your WFH request was approved by HR and is now pending Admin final approval.`);

    res.json({ success: true, message: 'Approved by HR', next_stage: next });
  } catch (e) {
    console.error('HR action error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Admin Final Action ────────────────────────────────────────────────────────
exports.finalAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    const wfh = await WFHModel.getById(req.tenantId, req.params.id);
    if (!wfh) return res.status(404).json({ success: false, message: 'Not found' });
    if (wfh.current_stage !== 'admin')
      return res.status(400).json({ success: false, message: 'Not at Admin final approval stage' });

    if (action === 'reject') {
      await WFHModel.updateStatus(req.tenantId, req.params.id,
        { status: 'rejected', action_by: req.user.id, remarks, next_stage: 'admin' }, 'final');
      await notify(req.tenantId, wfh.employee_id, '❌ WFH Request Rejected',
        `Your WFH request was rejected by Admin. Reason: ${remarks || 'No reason given'}`);
      return res.json({ success: true, message: 'WFH rejected by Admin', next_stage: null });
    }

    await WFHModel.updateStatus(req.tenantId, req.params.id,
      { status: 'approved', action_by: req.user.id, remarks, next_stage: 'done' }, 'final');
    await WFHModel.markAttendanceWFH(req.tenantId, req.params.id);
    await notify(req.tenantId, wfh.employee_id, '✅ WFH Request Fully Approved',
      `Your WFH request (${wfh.from_date} to ${wfh.to_date}) has been fully approved by Admin.`);

    res.json({ success: true, message: 'WFH fully approved', next_stage: null });
  } catch (e) {
    console.error('Final action error:', e);
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
