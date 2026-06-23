// controllers/resignationController.js
const { pool } = require('../../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { sendNotification, sendToMany, getHRAndAdmins } = require('../notifications/notificationHelper');
const { writeAuditLog } = require('../auditLog/auditLogRoutes');
const mailService = require('../../services/mailService');

// ── Multer: HR acceptance letter PDF (50 MB) ─────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tenantId = req.tenantId;
        const dir = path.join(__dirname, '..', 'uploads', 'branding', String(tenantId), 'letters', 'resignation');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${req.params.id}_${Date.now()}.pdf`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
});

// ── Multer: employee attachment (10 MB, PDF/JPG/PNG) ─────────────────────────
const attachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tenantId = req.tenantId;
        const dir = path.join(__dirname, '..', 'uploads', 'branding', String(tenantId), 'resignation-attachments');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}_${safeName}`);
    },
});

const attachmentUpload = multer({
    storage: attachmentStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
    },
});

// ── Helper: resolve employee user_id from employee_details.id ────────────────
async function getEmployeeUserId(tenantId, employeeDetailId) {
    const [rows] = await pool.execute(
        `SELECT CAST(employee_id AS UNSIGNED) AS uid FROM employee_details WHERE id = ? AND tenant_id = ?`,
        [employeeDetailId, tenantId]
    );
    return rows.length > 0 ? rows[0].uid : null;
}

// ── Helper: insert status history with old_status ────────────────────────────
async function insertHistory(resignationId, tenantId, oldStatus, newStatus, changedBy, note) {
    await pool.execute(
        `INSERT INTO resignation_status_history (resignation_id, tenant_id, old_status, status, changed_by, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [resignationId, tenantId, oldStatus || null, newStatus, changedBy, note]
    );
}

// ── Helper: actor display name ────────────────────────────────────────────────
async function getUserName(tenantId, userId) {
    const [rows] = await pool.execute(
        `SELECT first_name, last_name FROM users WHERE id = ? AND tenant_id = ?`,
        [userId, tenantId]
    );
    if (!rows.length) return String(userId);
    return `${rows[0].first_name || ''} ${rows[0].last_name || ''}`.trim() || String(userId);
}

const resignationController = {

    // POST / — Employee submits a new resignation ─────────────────────────────
    submitRequest: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const userId = req.user.id;
            const { resignation_date, reason, remarks } = req.body;

            if (!resignation_date || !reason) {
                return res.status(400).json({ success: false, message: 'Resignation date and reason are required' });
            }

            // Fetch employee details (notice period + denormalized fields)
            const [empRows] = await pool.execute(
                `SELECT ed.id, ed.notice_period, ed.position, ed.department_id, ed.employee_id AS emp_user_id,
                        d.name AS dept_name,
                        u.first_name, u.last_name, u.email
                 FROM employee_details ed
                 LEFT JOIN departments d ON ed.department_id = d.id
                 LEFT JOIN users u ON ed.employee_id = u.id
                 WHERE ed.employee_id = ? AND ed.tenant_id = ?`,
                [userId, tenantId]
            );

            if (!empRows || empRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee details not found' });
            }

            const emp = empRows[0];
            const employeeDetailId = emp.id;
            // notice_period may be "30", "30 days", "30 Days", or null
            const noticePeriodDays = Math.max(1, parseInt(String(emp.notice_period || '30'), 10) || 30);
            const employeeName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
            const employeeEmail = emp.email;

            // Auto-calculate Last Working Date
            const resignDate = new Date(resignation_date);
            const lwd = new Date(resignDate);
            lwd.setDate(lwd.getDate() + noticePeriodDays);
            const lastWorkingDate = lwd.toISOString().split('T')[0];

            // Block duplicate active requests
            const [existing] = await pool.execute(
                `SELECT id FROM resignation_requests WHERE tenant_id = ? AND employee_id = ? AND status IN ('pending','under_review','approved')`,
                [tenantId, employeeDetailId]
            );
            if (existing && existing.length > 0) {
                return res.status(400).json({ success: false, message: 'You already have an active resignation request.' });
            }

            // Generate Ref Number
            const year = new Date().getFullYear();
            const [[{ cnt }]] = await pool.execute(
                'SELECT COUNT(*) AS cnt FROM resignation_requests WHERE tenant_id = ? AND YEAR(created_at) = ?',
                [tenantId, year]
            );
            const ref_number = `RES-${year}-${String(Number(cnt) + 1).padStart(4, '0')}`;

            // Handle optional attachment
            let attachmentUrl = null;
            if (req.file) {
                attachmentUrl = `/uploads/branding/${tenantId}/resignation-attachments/${req.file.filename}`;
            }

            const [insertResult] = await pool.execute(
                `INSERT INTO resignation_requests
                 (tenant_id, employee_id, employee_name, department_id, department_name,
                  designation, ref_number, resignation_date, requested_last_day, notice_period_days,
                  original_last_working_date, revised_last_working_date, reason, remarks,
                  attachment_url, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [tenantId, employeeDetailId, employeeName,
                 emp.department_id || null, emp.dept_name || null, emp.position || null,
                 ref_number, resignation_date, resignation_date, noticePeriodDays,
                 lastWorkingDate, lastWorkingDate, reason, remarks || null, attachmentUrl]
            );

            const newId = insertResult.insertId;

            await insertHistory(newId, tenantId, null, 'pending', userId, 'Resignation submitted by employee');

            // Audit log
            await writeAuditLog({
                tenantId, userId, userName: employeeName,
                action: 'resignation_submitted', entityType: 'resignation',
                entityId: String(newId),
                description: `Employee submitted resignation (${ref_number}). LWD: ${lastWorkingDate}`,
                ipAddress: req.ip,
            });

            // Notify HR/Admin
            try {
                const hrAdminIds = await getHRAndAdmins(tenantId);
                await sendToMany(tenantId, hrAdminIds, {
                    title: '📋 New Resignation Request',
                    message: `${employeeName} has submitted a resignation request (${ref_number}). Last Working Date: ${lastWorkingDate}.`,
                    type: 'resignation',
                    related_id: newId,
                });
            } catch (_) {}

            // Email: notify HR/Admin
            try {
                await mailService.sendResignationSubmittedToHR(tenantId, {
                    employeeName, employeeEmail, ref_number, resignation_date, lastWorkingDate,
                    reason, noticePeriodDays,
                });
            } catch (_) {}

            res.status(201).json({ success: true, message: 'Resignation request submitted successfully.', ref_number });
        } catch (error) {
            console.error('Submit resignation error:', error);
            res.status(500).json({ success: false, message: 'Failed to submit resignation request' });
        }
    },

    // GET /my — Employee views own resignations ───────────────────────────────
    getMyRequests: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const userId = req.user.id;
            const [requests] = await pool.execute(
                `SELECT r.* FROM resignation_requests r
                 JOIN employee_details ed ON r.employee_id = ed.id
                 WHERE r.tenant_id = ? AND CAST(ed.employee_id AS UNSIGNED) = ?
                 ORDER BY r.created_at DESC`,
                [tenantId, userId]
            );
            res.json({ success: true, data: requests });
        } catch (error) {
            console.error('Get my requests error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch your requests' });
        }
    },

    // GET / — HR/Admin views all requests ─────────────────────────────────────
    getAllRequests: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { status, search, department_id } = req.query;

            let query = `
                SELECT r.*,
                       u.first_name, u.last_name, u.email,
                       d.name AS department,
                       ed.position AS emp_designation,
                       CAST(ed.employee_id AS UNSIGNED) AS user_id
                FROM resignation_requests r
                JOIN employee_details ed ON r.employee_id = ed.id
                JOIN users u ON ed.employee_id = u.id
                LEFT JOIN departments d ON ed.department_id = d.id
                WHERE r.tenant_id = ?`;

            const params = [tenantId];

            if (status && status !== 'all') {
                query += ' AND r.status = ?';
                params.push(status);
            }
            if (department_id) {
                query += ' AND r.department_id = ?';
                params.push(Number(department_id));
            }
            if (search) {
                query += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR r.ref_number LIKE ? OR r.employee_name LIKE ?)';
                const s = `%${search}%`;
                params.push(s, s, s, s);
            }

            query += ' ORDER BY r.created_at DESC';

            const [requests] = await pool.execute(query, params);
            res.json({ success: true, data: requests });
        } catch (error) {
            console.error('Get all requests error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch requests' });
        }
    },

    // GET /:id — Get specific request with history ────────────────────────────
    getRequestById: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;

            const [requests] = await pool.execute(
                `SELECT r.*,
                        u.first_name, u.last_name, u.email,
                        ed.joining_date,
                        d.name AS department,
                        ed.position AS emp_designation,
                        CAST(ed.employee_id AS UNSIGNED) AS user_id
                 FROM resignation_requests r
                 JOIN employee_details ed ON r.employee_id = ed.id
                 JOIN users u ON ed.employee_id = u.id
                 LEFT JOIN departments d ON ed.department_id = d.id
                 WHERE r.id = ? AND r.tenant_id = ?`,
                [id, tenantId]
            );

            if (requests.length === 0) {
                return res.status(404).json({ success: false, message: 'Request not found' });
            }

            const [history] = await pool.execute(
                `SELECT rsh.*, u.first_name, u.last_name
                 FROM resignation_status_history rsh
                 LEFT JOIN users u ON rsh.changed_by = u.id
                 WHERE rsh.resignation_id = ? AND rsh.tenant_id = ?
                 ORDER BY rsh.created_at ASC`,
                [id, tenantId]
            );

            res.json({ success: true, data: { ...requests[0], history } });
        } catch (error) {
            console.error('Get request error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch request details' });
        }
    },

    // PUT /:id/under-review — HR marks as Under Review ───────────────────────
    markUnderReview: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            const actorId = req.user.id;

            const [check] = await pool.execute(
                'SELECT id, status, employee_id, employee_name FROM resignation_requests WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            if (check.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
            if (check[0].status !== 'pending') {
                return res.status(400).json({ success: false, message: `Cannot mark as under review: current status is ${check[0].status}` });
            }

            await pool.execute(
                `UPDATE resignation_requests SET status = 'under_review' WHERE id = ? AND tenant_id = ?`,
                [id, tenantId]
            );

            await insertHistory(id, tenantId, 'pending', 'under_review', actorId, 'Marked under review by HR');

            const actorName = await getUserName(tenantId, actorId);
            await writeAuditLog({
                tenantId, userId: actorId, userName: actorName,
                action: 'resignation_under_review', entityType: 'resignation', entityId: String(id),
                description: `Resignation ${id} marked under review`,
                ipAddress: req.ip,
            });

            // Notify employee
            try {
                const uid = await getEmployeeUserId(tenantId, check[0].employee_id);
                if (uid) {
                    await sendNotification(tenantId, uid, {
                        title: '🔍 Resignation Under Review',
                        message: 'Your resignation request is now being reviewed by HR.',
                        type: 'resignation',
                        related_id: Number(id),
                    });
                }
                // Email
                await mailService.sendResignationUnderReview(tenantId, { resignationId: id });
            } catch (_) {}

            res.json({ success: true, message: 'Marked as under review.' });
        } catch (error) {
            console.error('Mark under review error:', error);
            res.status(500).json({ success: false, message: 'Failed to update status' });
        }
    },

    // PUT /:id/approve — HR approves + uploads PDF letter ────────────────────
    approveRequest: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            const { hr_note } = req.body;
            const actorId = req.user.id;

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'PDF acceptance letter is required' });
            }

            const letter_url = `/uploads/branding/${tenantId}/letters/resignation/${req.file.filename}`;

            const [check] = await pool.execute(
                'SELECT id, status, employee_id, employee_name, revised_last_working_date, original_last_working_date FROM resignation_requests WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            if (check.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
            if (!['pending', 'under_review'].includes(check[0].status)) {
                return res.status(400).json({ success: false, message: `Request is already ${check[0].status}` });
            }

            const oldStatus = check[0].status;
            const lwd = check[0].revised_last_working_date || check[0].original_last_working_date;

            await pool.execute(
                `UPDATE resignation_requests
                 SET status = 'approved', hr_note = ?, letter_url = ?, letter_generated_at = NOW(),
                     approved_by = ?, approved_at = NOW()
                 WHERE id = ? AND tenant_id = ?`,
                [hr_note || null, letter_url, actorId, id, tenantId]
            );

            await insertHistory(id, tenantId, oldStatus, 'approved', actorId, hr_note || 'Resignation approved by HR');

            const actorName = await getUserName(tenantId, actorId);
            await writeAuditLog({
                tenantId, userId: actorId, userName: actorName,
                action: 'resignation_approved', entityType: 'resignation', entityId: String(id),
                description: `Resignation ${id} approved. LWD: ${lwd}`,
                ipAddress: req.ip,
            });

            // Notify employee
            try {
                const uid = await getEmployeeUserId(tenantId, check[0].employee_id);
                if (uid) {
                    await sendNotification(tenantId, uid, {
                        title: '✅ Resignation Approved',
                        message: `Your resignation has been approved. Your last working date is ${lwd || 'as per notice period'}.`,
                        type: 'resignation',
                        related_id: Number(id),
                    });
                }
                // Email
                await mailService.sendResignationApproved(tenantId, {
                    resignationId: id, lwd, letterPath: req.file.path,
                });
            } catch (_) {}

            res.json({ success: true, message: 'Resignation approved and letter generated.', letter_url });
        } catch (error) {
            console.error('Approve request error:', error);
            if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
            res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // PUT /:id/reject — HR rejects ────────────────────────────────────────────
    rejectRequest: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            const { rejection_reason } = req.body;
            const actorId = req.user.id;

            if (!rejection_reason || !rejection_reason.trim()) {
                return res.status(400).json({ success: false, message: 'Rejection reason is required' });
            }

            const [check] = await pool.execute(
                'SELECT id, status, employee_id, employee_name FROM resignation_requests WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            if (check.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
            if (!['pending', 'under_review'].includes(check[0].status)) {
                return res.status(400).json({ success: false, message: `Request is already ${check[0].status}` });
            }

            const oldStatus = check[0].status;

            await pool.execute(
                `UPDATE resignation_requests
                 SET status = 'rejected', rejection_reason = ?,
                     rejected_by = ?, rejected_at = NOW()
                 WHERE id = ? AND tenant_id = ?`,
                [rejection_reason.trim(), actorId, id, tenantId]
            );

            await insertHistory(id, tenantId, oldStatus, 'rejected', actorId, rejection_reason.trim());

            const actorName = await getUserName(tenantId, actorId);
            await writeAuditLog({
                tenantId, userId: actorId, userName: actorName,
                action: 'resignation_rejected', entityType: 'resignation', entityId: String(id),
                description: `Resignation ${id} rejected. Reason: ${rejection_reason}`,
                ipAddress: req.ip,
            });

            // Notify employee
            try {
                const uid = await getEmployeeUserId(tenantId, check[0].employee_id);
                if (uid) {
                    await sendNotification(tenantId, uid, {
                        title: '❌ Resignation Rejected',
                        message: `Your resignation request has been rejected. Reason: ${rejection_reason}`,
                        type: 'resignation',
                        related_id: Number(id),
                    });
                }
                // Email
                await mailService.sendResignationRejected(tenantId, {
                    resignationId: id, rejection_reason: rejection_reason.trim(),
                });
            } catch (_) {}

            res.json({ success: true, message: 'Resignation rejected.' });
        } catch (error) {
            console.error('Reject request error:', error);
            res.status(500).json({ success: false, message: 'Failed to reject request' });
        }
    },

    // PUT /:id/withdraw — Employee withdraws own pending request ──────────────
    withdrawRequest: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            const userId = req.user.id;

            // IDOR: verify request belongs to this employee via JOIN
            const [check] = await pool.execute(
                `SELECT r.id, r.status, r.employee_id, r.ref_number
                 FROM resignation_requests r
                 JOIN employee_details ed ON r.employee_id = ed.id
                 WHERE r.id = ? AND r.tenant_id = ? AND CAST(ed.employee_id AS UNSIGNED) = ?`,
                [id, tenantId, userId]
            );

            if (check.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
            if (check[0].status !== 'pending') {
                return res.status(400).json({ success: false, message: 'Only pending requests can be withdrawn' });
            }

            await pool.execute(
                `UPDATE resignation_requests SET status = 'withdrawn' WHERE id = ? AND tenant_id = ?`,
                [id, tenantId]
            );

            await insertHistory(id, tenantId, 'pending', 'withdrawn', userId, 'Withdrawn by employee');

            const actorName = await getUserName(tenantId, userId);
            await writeAuditLog({
                tenantId, userId, userName: actorName,
                action: 'resignation_withdrawn', entityType: 'resignation', entityId: String(id),
                description: `Employee withdrew resignation request (${check[0].ref_number})`,
                ipAddress: req.ip,
            });

            // Notify HR/Admin
            try {
                const hrAdminIds = await getHRAndAdmins(tenantId);
                await sendToMany(tenantId, hrAdminIds, {
                    title: '↩️ Resignation Withdrawn',
                    message: `${actorName} has withdrawn their resignation request (${check[0].ref_number}).`,
                    type: 'resignation',
                    related_id: Number(id),
                });
            } catch (_) {}

            res.json({ success: true, message: 'Resignation request withdrawn successfully.' });
        } catch (error) {
            console.error('Withdraw request error:', error);
            res.status(500).json({ success: false, message: 'Failed to withdraw request' });
        }
    },

    // PUT /:id/override-lwd — HR overrides Last Working Date ─────────────────
    overrideLWD: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            const { revised_last_working_date, override_reason } = req.body;
            const actorId = req.user.id;

            if (!revised_last_working_date || !override_reason || !override_reason.trim()) {
                return res.status(400).json({ success: false, message: 'Revised LWD and override reason are required' });
            }

            const [check] = await pool.execute(
                'SELECT id, status, employee_id, employee_name FROM resignation_requests WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            if (check.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
            if (['rejected', 'withdrawn'].includes(check[0].status)) {
                return res.status(400).json({ success: false, message: 'Cannot override LWD for a rejected or withdrawn request' });
            }

            await pool.execute(
                `UPDATE resignation_requests
                 SET revised_last_working_date = ?, override_reason = ?, override_by = ?, override_at = NOW()
                 WHERE id = ? AND tenant_id = ?`,
                [revised_last_working_date, override_reason.trim(), actorId, id, tenantId]
            );

            await insertHistory(id, tenantId, check[0].status, check[0].status, actorId,
                `LWD overridden to ${revised_last_working_date}. Reason: ${override_reason}`
            );

            const actorName = await getUserName(tenantId, actorId);
            await writeAuditLog({
                tenantId, userId: actorId, userName: actorName,
                action: 'resignation_lwd_overridden', entityType: 'resignation', entityId: String(id),
                description: `LWD overridden to ${revised_last_working_date}. Reason: ${override_reason}`,
                ipAddress: req.ip,
            });

            // Notify employee
            try {
                const uid = await getEmployeeUserId(tenantId, check[0].employee_id);
                if (uid) {
                    await sendNotification(tenantId, uid, {
                        title: '📅 Last Working Date Updated',
                        message: `Your last working date has been revised to ${revised_last_working_date}. Reason: ${override_reason}`,
                        type: 'resignation',
                        related_id: Number(id),
                    });
                }
            } catch (_) {}

            res.json({ success: true, message: 'Last working date updated successfully.' });
        } catch (error) {
            console.error('Override LWD error:', error);
            res.status(500).json({ success: false, message: 'Failed to override LWD' });
        }
    },

    // GET /stats/pending-count — Dashboard count ──────────────────────────────
    getPendingCount: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const [[{ count }]] = await pool.execute(
                `SELECT COUNT(*) AS count FROM resignation_requests
                 WHERE tenant_id = ? AND status IN ('pending','under_review')`,
                [tenantId]
            );
            res.json({ success: true, count });
        } catch (error) {
            console.error('Get pending count error:', error);
            res.json({ success: true, count: 0 });
        }
    },

    uploadPDFMiddleware: upload.single('pdf'),
    uploadAttachmentMiddleware: attachmentUpload.single('attachment'),
};

module.exports = resignationController;
