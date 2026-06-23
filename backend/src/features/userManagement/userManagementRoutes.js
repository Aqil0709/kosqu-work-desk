/**
 * User Management Routes
 * Handles employee + client user creation, password management, account control.
 * All routes require admin or appropriate module access.
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/requireAdmin');
const { validatePassword, generateSecurePassword } = require('../../utils/passwordPolicy');
const { sendEmployeeCredentials } = require('../../services/mailService');

// Helpers
const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || null;
const adminName = (req) => `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim() || req.user?.email || 'Admin';

const writeAuditLog = async ({ tenantId, userId, userName, action, entityType, entityId, description, ipAddress, status = 'success' }) => {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity_type, entity_id, description, ip_address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, userId, userName, action, entityType || null, entityId ? String(entityId) : null, description || null, ipAddress || null, status]
    );
  } catch (err) { console.warn('[audit] write failed:', err.message); }
};

// Send in-app notification helper
const sendInAppNotification = async ({ tenantId, recipientUserId, title, message }) => {
  try {
    // Check if notifications table exists before writing
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS in_app_notifications (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY idx_notif (tenant_id, user_id, is_read)
      )`
    );
    await pool.execute(
      'INSERT INTO in_app_notifications (tenant_id, user_id, title, message) VALUES (?,?,?,?)',
      [tenantId, recipientUserId, title, message]
    );
  } catch (err) { console.warn('[notif] write failed:', err.message); }
};

// All routes require JWT + admin
router.use(verifyToken);
router.use(requireAdmin);

// ─────────────────────────────────────────────────────────────
// EMPLOYEE USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/user-management/employees/create
 * Directly create a single employee with account credentials.
 * Body: standard employee fields + optional password
 */
router.post('/employees/create', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const ip = getIp(req);
  try {
    const {
      employee_id, first_name, last_name, email, phone,
      department_id, position, employment_type, joining_date,
      salary, salary_basic, salary_hra, salary_medical_allowance,
      salary_travel_allowance, salary_other_allowance,
      work_location, shift_id, team_lead_id, reporting_manager_id,
      client_id, status,
      // Account info
      password: rawPasswordInput,
      send_credentials = true,
    } = req.body;

    // Required field validation
    const missing = [];
    if (!first_name?.trim()) missing.push('First Name');
    if (!last_name?.trim()) missing.push('Last Name');
    if (!email?.trim()) missing.push('Email');
    if (!department_id) missing.push('Department');
    if (!position?.trim()) missing.push('Designation');
    if (!joining_date) missing.push('Joining Date');
    if (missing.length) return res.status(400).json({ success: false, message: `Required: ${missing.join(', ')}` });

    // Email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    // Employee ID length
    if (employee_id && String(employee_id).length > 20) {
      return res.status(400).json({ success: false, message: 'Employee ID must be 20 characters or less' });
    }

    // Duplicate email check
    const [emailCheck] = await pool.execute(
      'SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND tenant_id=?',
      [email.trim(), tenantId]
    );
    if (emailCheck.length) return res.status(400).json({ success: false, message: 'Email already exists' });

    // Duplicate employee_id check
    if (employee_id) {
      const [empIdCheck] = await pool.execute(
        'SELECT id FROM employee_details WHERE employee_id=? AND tenant_id=?',
        [employee_id, tenantId]
      );
      if (empIdCheck.length) return res.status(400).json({ success: false, message: 'Employee ID already exists' });
    }

    // Password handling
    let rawPassword = rawPasswordInput;
    let isTemp = false;
    if (rawPassword) {
      const policyErr = validatePassword(rawPassword);
      if (policyErr) return res.status(400).json({ success: false, message: policyErr });
    } else {
      rawPassword = generateSecurePassword();
      isTemp = true;
    }
    const password_hash = await bcrypt.hash(rawPassword, 10);

    // Payroll calculations
    const basic = Number(salary_basic || 0);
    const hra = Number(salary_hra || 0);
    const med = Number(salary_medical_allowance || 0);
    const travel = Number(salary_travel_allowance || 0);
    const other = Number(salary_other_allowance || 0);
    const gross = basic + hra + med + travel + other;
    const pf = +(basic * 0.12).toFixed(2);
    const esic = gross <= 21000 && gross > 0 ? +(gross * 0.0075).toFixed(2) : 0;
    const pt = gross > 10000 ? 200 : 0;
    const totalDed = +(pf + esic + pt).toFixed(2);
    const net = +(Math.max(0, gross - totalDed)).toFixed(2);

    // Derive RBAC role from employment_type — must be a valid users.position ENUM value
    const VALID_USER_POSITIONS = new Set(['admin','hr','employee','intern','user','client','team_lead','project_manager','consultant']);
    const derivedRole = employment_type?.toLowerCase() === 'intern' ? 'intern' : 'employee';
    const rbacRole = VALID_USER_POSITIONS.has(derivedRole) ? derivedRole : 'employee';

    // Create user record
    const [userResult] = await pool.execute(
      `INSERT INTO users (tenant_id, first_name, last_name, email, phone, position, password_hash, is_active, force_password_reset, temp_password_issued)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [tenantId, first_name.trim(), last_name.trim(), email.trim().toLowerCase(), phone || null, rbacRole, password_hash, isTemp ? 1 : 0, isTemp ? 1 : 0]
    );
    const userId = userResult.insertId;

    // Create employee_details record
    // Table schema: id=VARCHAR(PK/employee-code), employee_id=INT(FK→users.id)
    const empIdToUse = employee_id || `EMP${String(userId).padStart(5, '0')}`;
    const empCategory = employment_type?.toLowerCase() === 'intern' ? 'intern'
      : employment_type?.toLowerCase() === 'consultant' ? 'consultant'
      : 'employee';
    await pool.execute(
      `INSERT INTO employee_details
         (id, tenant_id, employee_id, department_id, position, employment_type, employment_category,
          joining_date, default_shift_id, reporting_manager_id,
          salary_basic, salary_hra, salary_medical_allowance, salary_travel_allowance, salary_other_allowance,
          salary_gross, salary_pf, salary_esic, salary_professional_tax, salary_lwf, salary_total_deduction, salary_net,
          employer_pf, employer_esic, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)`,
      [
        empIdToUse, tenantId, userId, department_id || null, position?.trim() || null,
        employment_type || null, empCategory,
        joining_date || null, shift_id || null, reporting_manager_id || null,
        basic, hra, med, travel, other,
        gross, pf, esic, pt, totalDed, net,
        +(basic * 0.13).toFixed(2), gross <= 21000 && gross > 0 ? +(gross * 0.0325).toFixed(2) : 0,
        status || 'active'
      ]
    );

    // Department many-to-many (if table exists)
    if (department_id) {
      try {
        await pool.execute(
          'INSERT IGNORE INTO employee_departments (employee_id, department_id, tenant_id) VALUES (?,?,?)',
          [empIdToUse, department_id, tenantId]
        );
      } catch (_) {}
    }

    // Send email credentials
    let emailSent = false;
    if (send_credentials) {
      try {
        await sendEmployeeCredentials(tenantId, {
          employeeName: `${first_name} ${last_name}`.trim(),
          email: email.trim(),
          password: rawPassword,
        });
        emailSent = true;
      } catch (emailErr) {
        console.warn('[user-mgmt] credential email failed:', emailErr.message);
      }
    }

    // In-app notification
    await sendInAppNotification({
      tenantId, recipientUserId: userId,
      title: 'Welcome to Work Desk!',
      message: `Your employee account has been created. Please login with your email ${email.trim()}.`,
    });

    // Audit log
    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'EMPLOYEE_CREATED', entityType: 'employee', entityId: userId,
      description: `Employee ${first_name} ${last_name} (${email}) created by admin. Temp password: ${isTemp}. Email sent: ${emailSent}.`,
      ipAddress: ip,
    });

    return res.status(201).json({
      success: true,
      message: `Employee created successfully.${emailSent ? ' Credentials sent via email.' : ' Could not send email — note credentials manually.'}`,
      user_id: userId,
      employee_id: empIdToUse,
      ...(isTemp ? { temp_password: rawPassword } : {}),
    });
  } catch (err) {
    console.error('[user-mgmt] create employee error:', err);
    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'EMPLOYEE_CREATED', entityType: 'employee', entityId: null,
      description: `Create employee failed: ${err.message}`, ipAddress: ip, status: 'failed',
    });
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Email already exists' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/user-management/employees/credentials
 * List all employee accounts with login info (no passwords).
 */
router.get('/employees/credentials', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const like = `%${search}%`;

    const lim = parseInt(limit, 10) || 20;
    const off = parseInt(offset, 10) || 0;
    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.position,
              u.is_active, u.is_locked, u.force_password_reset, u.temp_password_issued,
              u.failed_login_attempts, u.last_login_at, u.created_at,
              ed.employee_id AS emp_number, d.name AS department
       FROM users u
       LEFT JOIN employee_details ed ON ed.employee_id = u.id AND ed.tenant_id = u.tenant_id
       LEFT JOIN departments d ON d.id = ed.department_id
       WHERE u.tenant_id = ? AND u.position != 'admin' AND u.position != 'client'
         AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR ed.employee_id LIKE ?)
       ORDER BY u.created_at DESC
       LIMIT ${lim} OFFSET ${off}`,
      [tenantId, like, like, like, like]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users u
       LEFT JOIN employee_details ed ON ed.employee_id = u.id AND ed.tenant_id = u.tenant_id
       WHERE u.tenant_id = ? AND u.position != 'admin' AND u.position != 'client'
         AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR ed.employee_id LIKE ?)`,
      [tenantId, like, like, like, like]
    );

    return res.json({ success: true, users: rows, total, page: parseInt(page, 10), limit: lim });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/employees/:userId/set-password
 * Admin sets a specific password for an employee.
 */
router.post('/employees/:userId/set-password', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const { password, force_reset = false } = req.body;
  const ip = getIp(req);

  try {
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });
    const policyErr = validatePassword(password);
    if (policyErr) return res.status(400).json({ success: false, message: policyErr });

    const [users] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE id=? AND tenant_id=?',
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });
    const target = users[0];

    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      'UPDATE users SET password_hash=?, force_password_reset=?, temp_password_issued=0, failed_login_attempts=0, is_locked=0, locked_at=NULL WHERE id=? AND tenant_id=?',
      [hash, force_reset ? 1 : 0, userId, tenantId]
    );

    await sendInAppNotification({
      tenantId, recipientUserId: Number(userId),
      title: 'Password Updated',
      message: 'Your account password has been updated by the administrator.',
    });

    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'PASSWORD_SET', entityType: 'employee', entityId: userId,
      description: `Password set for ${target.first_name} ${target.last_name} (${target.email}). Force reset: ${force_reset}.`,
      ipAddress: ip,
    });

    return res.json({ success: true, message: 'Password set successfully.' });
  } catch (err) {
    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'PASSWORD_SET', entityType: 'employee', entityId: userId, description: `Failed: ${err.message}`, ipAddress: ip, status: 'failed' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/employees/:userId/reset-password
 * Admin generates a new secure password for an employee.
 */
router.post('/employees/:userId/reset-password', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const { custom_password } = req.body;
  const ip = getIp(req);

  try {
    const [users] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE id=? AND tenant_id=?',
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });
    const target = users[0];

    let rawPassword;
    if (custom_password) {
      const policyErr = validatePassword(custom_password);
      if (policyErr) return res.status(400).json({ success: false, message: policyErr });
      rawPassword = custom_password;
    } else {
      rawPassword = generateSecurePassword();
    }

    const hash = await bcrypt.hash(rawPassword, 10);
    await pool.execute(
      'UPDATE users SET password_hash=?, force_password_reset=1, temp_password_issued=1, failed_login_attempts=0, is_locked=0, locked_at=NULL WHERE id=? AND tenant_id=?',
      [hash, userId, tenantId]
    );

    // Try to email credentials
    let emailSent = false;
    try {
      await sendEmployeeCredentials(tenantId, {
        employeeName: `${target.first_name} ${target.last_name}`.trim(),
        email: target.email,
        password: rawPassword,
      });
      emailSent = true;
    } catch (_) {}

    await sendInAppNotification({
      tenantId, recipientUserId: Number(userId),
      title: 'Password Reset',
      message: 'Your account password has been reset by the administrator. Please change it on next login.',
    });

    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'PASSWORD_RESET', entityType: 'employee', entityId: userId,
      description: `Password reset for ${target.first_name} ${target.last_name} (${target.email}). Email sent: ${emailSent}.`,
      ipAddress: ip,
    });

    return res.json({ success: true, message: 'Password reset successfully.', temp_password: rawPassword, email_sent: emailSent });
  } catch (err) {
    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'PASSWORD_RESET', entityType: 'employee', entityId: userId, description: `Failed: ${err.message}`, ipAddress: ip, status: 'failed' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/employees/:userId/temp-password
 * Issue a temporary password — employee must change on first login.
 */
router.post('/employees/:userId/temp-password', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const ip = getIp(req);

  try {
    const [users] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE id=? AND tenant_id=?',
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });
    const target = users[0];

    const rawPassword = generateSecurePassword();
    const hash = await bcrypt.hash(rawPassword, 10);
    await pool.execute(
      'UPDATE users SET password_hash=?, force_password_reset=1, temp_password_issued=1, failed_login_attempts=0, is_locked=0, locked_at=NULL WHERE id=? AND tenant_id=?',
      [hash, userId, tenantId]
    );

    await sendInAppNotification({
      tenantId, recipientUserId: Number(userId),
      title: 'Temporary Password Issued',
      message: 'A temporary password has been issued for your account. You will be required to change it after login.',
    });

    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'TEMP_PASSWORD_ISSUED', entityType: 'employee', entityId: userId,
      description: `Temporary password issued for ${target.first_name} ${target.last_name} (${target.email}).`,
      ipAddress: ip,
    });

    return res.json({ success: true, message: 'Temporary password generated.', temp_password: rawPassword });
  } catch (err) {
    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'TEMP_PASSWORD_ISSUED', entityType: 'employee', entityId: userId, description: `Failed: ${err.message}`, ipAddress: ip, status: 'failed' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/employees/:userId/force-reset
 * Flag employee to reset password on next login without changing current password.
 */
router.post('/employees/:userId/force-reset', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const ip = getIp(req);

  try {
    const [users] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE id=? AND tenant_id=?',
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });
    const target = users[0];

    await pool.execute(
      'UPDATE users SET force_password_reset=1 WHERE id=? AND tenant_id=?',
      [userId, tenantId]
    );

    await sendInAppNotification({
      tenantId, recipientUserId: Number(userId),
      title: 'Action Required: Change Password',
      message: 'You are required to change your password on next login.',
    });

    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'FORCE_PASSWORD_RESET', entityType: 'employee', entityId: userId,
      description: `Force password reset flagged for ${target.first_name} ${target.last_name} (${target.email}).`,
      ipAddress: ip,
    });

    return res.json({ success: true, message: 'Force password reset flag set.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/employees/:userId/unlock
 * Unlock a locked employee account.
 */
router.post('/employees/:userId/unlock', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const ip = getIp(req);

  try {
    const [users] = await pool.execute(
      'SELECT id, first_name, last_name, email, is_locked FROM users WHERE id=? AND tenant_id=?',
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });
    const target = users[0];

    await pool.execute(
      'UPDATE users SET is_locked=0, locked_at=NULL, failed_login_attempts=0 WHERE id=? AND tenant_id=?',
      [userId, tenantId]
    );

    await sendInAppNotification({
      tenantId, recipientUserId: Number(userId),
      title: 'Account Unlocked',
      message: 'Your account has been unlocked by the administrator. You can now login.',
    });

    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'ACCOUNT_UNLOCKED', entityType: 'employee', entityId: userId,
      description: `Account unlocked for ${target.first_name} ${target.last_name} (${target.email}). Was locked: ${target.is_locked}.`,
      ipAddress: ip,
    });

    return res.json({ success: true, message: 'Account unlocked successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/user-management/employees/:userId/toggle-status
 * Enable or disable an employee account.
 */
router.patch('/employees/:userId/toggle-status', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const { is_active } = req.body;
  const ip = getIp(req);

  try {
    if (is_active === undefined) return res.status(400).json({ success: false, message: 'is_active is required' });

    const [users] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE id=? AND tenant_id=?',
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });
    const target = users[0];

    await pool.execute('UPDATE users SET is_active=? WHERE id=? AND tenant_id=?', [is_active ? 1 : 0, userId, tenantId]);

    const action = is_active ? 'ACCOUNT_ENABLED' : 'ACCOUNT_DISABLED';
    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action, entityType: 'employee', entityId: userId,
      description: `Account ${is_active ? 'enabled' : 'disabled'} for ${target.first_name} ${target.last_name} (${target.email}).`,
      ipAddress: ip,
    });

    return res.json({ success: true, message: `Account ${is_active ? 'enabled' : 'disabled'} successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CLIENT USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/user-management/clients/accounts
 * List all client portal user accounts.
 */
router.get('/clients/accounts', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const like = `%${search}%`;

    const lim = parseInt(limit, 10) || 20;
    const off = parseInt(offset, 10) || 0;
    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active,
              u.is_locked, u.failed_login_attempts, u.last_login_at,
              u.force_password_reset, u.client_ref_id, u.created_at,
              c.name AS client_name, c.company AS company_name, c.status AS client_status
       FROM users u
       LEFT JOIN clients c ON c.id = u.client_ref_id AND c.tenant_id = u.tenant_id
       WHERE u.tenant_id = ? AND u.position = 'client'
         AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR c.name LIKE ?)
       ORDER BY u.created_at DESC
       LIMIT ${lim} OFFSET ${off}`,
      [tenantId, like, like, like, like]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users u
       LEFT JOIN clients c ON c.id = u.client_ref_id AND c.tenant_id = u.tenant_id
       WHERE u.tenant_id = ? AND u.position = 'client'
         AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR c.name LIKE ?)`,
      [tenantId, like, like, like, like]
    );

    return res.json({ success: true, accounts: rows, total, page: parseInt(page, 10), limit: lim });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/clients/create
 * Create a client portal user account linked to a CRM client.
 */
router.post('/clients/create', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const ip = getIp(req);
  try {
    const { first_name, last_name, email, phone, client_ref_id, password: rawPasswordInput } = req.body;

    const missing = [];
    if (!first_name?.trim()) missing.push('First Name');
    if (!last_name?.trim()) missing.push('Last Name');
    if (!email?.trim()) missing.push('Email');
    if (missing.length) return res.status(400).json({ success: false, message: `Required: ${missing.join(', ')}` });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    const [emailCheck] = await pool.execute(
      'SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND tenant_id=?',
      [email.trim(), tenantId]
    );
    if (emailCheck.length) return res.status(400).json({ success: false, message: 'Email already exists' });

    let rawPassword = rawPasswordInput;
    let isTemp = false;
    if (rawPassword) {
      const policyErr = validatePassword(rawPassword);
      if (policyErr) return res.status(400).json({ success: false, message: policyErr });
    } else {
      rawPassword = generateSecurePassword();
      isTemp = true;
    }
    const hash = await bcrypt.hash(rawPassword, 10);

    const [result] = await pool.execute(
      `INSERT INTO users (tenant_id, first_name, last_name, email, phone, position, password_hash, is_active, force_password_reset, temp_password_issued, client_ref_id)
       VALUES (?,?,?,?,?,'client',?,1,?,?,?)`,
      [tenantId, first_name.trim(), last_name.trim(), email.trim().toLowerCase(), phone || null, hash, isTemp ? 1 : 0, isTemp ? 1 : 0, client_ref_id || null]
    );
    const userId = result.insertId;

    await sendInAppNotification({
      tenantId, recipientUserId: userId,
      title: 'Welcome to the Client Portal!',
      message: `Your client account has been created. Login at the client portal with ${email.trim()}.`,
    });

    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'CLIENT_USER_CREATED', entityType: 'client_user', entityId: userId,
      description: `Client user ${first_name} ${last_name} (${email}) created.`,
      ipAddress: ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Client user created successfully.',
      user_id: userId,
      ...(isTemp ? { temp_password: rawPassword } : {}),
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Email already exists' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/user-management/clients/:userId
 * Update client user details.
 */
router.put('/clients/:userId', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const ip = getIp(req);
  try {
    const { first_name, last_name, phone, client_ref_id, is_active } = req.body;

    const [users] = await pool.execute(
      "SELECT id FROM users WHERE id=? AND tenant_id=? AND position='client'",
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'Client user not found' });

    await pool.execute(
      'UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), phone=COALESCE(?,phone), client_ref_id=COALESCE(?,client_ref_id), is_active=COALESCE(?,is_active) WHERE id=? AND tenant_id=?',
      [first_name || null, last_name || null, phone || null, client_ref_id || null, is_active !== undefined ? (is_active ? 1 : 0) : null, userId, tenantId]
    );

    await writeAuditLog({
      tenantId, userId: req.user.id, userName: adminName(req),
      action: 'CLIENT_USER_UPDATED', entityType: 'client_user', entityId: userId,
      description: `Client user ${userId} updated.`, ipAddress: ip,
    });

    return res.json({ success: true, message: 'Client user updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/clients/:userId/set-password
 * Set password for a client user.
 */
router.post('/clients/:userId/set-password', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const { password, force_reset = false } = req.body;
  const ip = getIp(req);
  try {
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });
    const policyErr = validatePassword(password);
    if (policyErr) return res.status(400).json({ success: false, message: policyErr });

    const [users] = await pool.execute(
      "SELECT id, first_name, last_name, email FROM users WHERE id=? AND tenant_id=? AND position='client'",
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'Client user not found' });
    const target = users[0];

    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      'UPDATE users SET password_hash=?, force_password_reset=?, temp_password_issued=0, failed_login_attempts=0, is_locked=0, locked_at=NULL WHERE id=? AND tenant_id=?',
      [hash, force_reset ? 1 : 0, userId, tenantId]
    );

    await sendInAppNotification({ tenantId, recipientUserId: Number(userId), title: 'Password Updated', message: 'Your password has been updated by the administrator.' });

    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'CLIENT_PASSWORD_SET', entityType: 'client_user', entityId: userId, description: `Password set for client ${target.email}.`, ipAddress: ip });

    return res.json({ success: true, message: 'Password set successfully.' });
  } catch (err) {
    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'CLIENT_PASSWORD_SET', entityType: 'client_user', entityId: userId, description: `Failed: ${err.message}`, ipAddress: ip, status: 'failed' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/clients/:userId/reset-password
 * Generate new password for client user.
 */
router.post('/clients/:userId/reset-password', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const { custom_password } = req.body;
  const ip = getIp(req);
  try {
    const [users] = await pool.execute(
      "SELECT id, first_name, last_name, email FROM users WHERE id=? AND tenant_id=? AND position='client'",
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'Client user not found' });
    const target = users[0];

    let rawPassword = custom_password;
    if (rawPassword) {
      const policyErr = validatePassword(rawPassword);
      if (policyErr) return res.status(400).json({ success: false, message: policyErr });
    } else {
      rawPassword = generateSecurePassword();
    }

    const hash = await bcrypt.hash(rawPassword, 10);
    await pool.execute(
      'UPDATE users SET password_hash=?, force_password_reset=1, temp_password_issued=1, failed_login_attempts=0, is_locked=0, locked_at=NULL WHERE id=? AND tenant_id=?',
      [hash, userId, tenantId]
    );

    await sendInAppNotification({ tenantId, recipientUserId: Number(userId), title: 'Password Reset', message: 'Your client account password has been reset. You must change it on next login.' });

    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'CLIENT_PASSWORD_RESET', entityType: 'client_user', entityId: userId, description: `Password reset for client ${target.email}.`, ipAddress: ip });

    return res.json({ success: true, message: 'Password reset.', temp_password: rawPassword });
  } catch (err) {
    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'CLIENT_PASSWORD_RESET', entityType: 'client_user', entityId: userId, description: `Failed: ${err.message}`, ipAddress: ip, status: 'failed' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/clients/:userId/temp-password
 * Issue temp password for client user.
 */
router.post('/clients/:userId/temp-password', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const ip = getIp(req);
  try {
    const [users] = await pool.execute(
      "SELECT id, email FROM users WHERE id=? AND tenant_id=? AND position='client'",
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'Client user not found' });

    const rawPassword = generateSecurePassword();
    const hash = await bcrypt.hash(rawPassword, 10);
    await pool.execute(
      'UPDATE users SET password_hash=?, force_password_reset=1, temp_password_issued=1, failed_login_attempts=0, is_locked=0, locked_at=NULL WHERE id=? AND tenant_id=?',
      [hash, userId, tenantId]
    );

    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'CLIENT_TEMP_PASSWORD', entityType: 'client_user', entityId: userId, description: `Temp password issued for client ${users[0].email}.`, ipAddress: ip });

    return res.json({ success: true, message: 'Temporary password generated.', temp_password: rawPassword });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user-management/clients/:userId/unlock
 * Unlock a locked client account.
 */
router.post('/clients/:userId/unlock', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const ip = getIp(req);
  try {
    const [users] = await pool.execute(
      "SELECT id, email FROM users WHERE id=? AND tenant_id=? AND position='client'",
      [userId, tenantId]
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'Client user not found' });

    await pool.execute('UPDATE users SET is_locked=0, locked_at=NULL, failed_login_attempts=0 WHERE id=? AND tenant_id=?', [userId, tenantId]);

    await sendInAppNotification({ tenantId, recipientUserId: Number(userId), title: 'Account Unlocked', message: 'Your client account has been unlocked. You can now login.' });

    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: 'CLIENT_ACCOUNT_UNLOCKED', entityType: 'client_user', entityId: userId, description: `Client account unlocked: ${users[0].email}.`, ipAddress: ip });

    return res.json({ success: true, message: 'Account unlocked.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/user-management/clients/:userId/toggle-status
 * Enable or disable a client account.
 */
router.patch('/clients/:userId/toggle-status', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  const { is_active } = req.body;
  const ip = getIp(req);
  try {
    if (is_active === undefined) return res.status(400).json({ success: false, message: 'is_active required' });
    const [users] = await pool.execute("SELECT id, email FROM users WHERE id=? AND tenant_id=? AND position='client'", [userId, tenantId]);
    if (!users.length) return res.status(404).json({ success: false, message: 'Client user not found' });

    await pool.execute('UPDATE users SET is_active=? WHERE id=? AND tenant_id=?', [is_active ? 1 : 0, userId, tenantId]);

    await writeAuditLog({ tenantId, userId: req.user.id, userName: adminName(req), action: is_active ? 'CLIENT_ACCOUNT_ENABLED' : 'CLIENT_ACCOUNT_DISABLED', entityType: 'client_user', entityId: userId, description: `Client ${users[0].email} ${is_active ? 'enabled' : 'disabled'}.`, ipAddress: ip });

    return res.json({ success: true, message: `Client account ${is_active ? 'enabled' : 'disabled'}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/user-management/clients/:userId/audit
 * View audit logs for a specific client user.
 */
router.get('/clients/:userId/audit', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { userId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT action, user_name, description, ip_address, status, created_at
       FROM audit_logs WHERE tenant_id=? AND entity_id=? AND entity_type='client_user'
       ORDER BY created_at DESC LIMIT 50`,
      [tenantId, String(userId)]
    );
    return res.json({ success: true, logs: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/user-management/notifications/unread
 * Get unread in-app notifications for the current user.
 */
router.get('/notifications/unread', async (req, res) => {
  // Allow any authenticated user (not just admin) — remove requireAdmin for this route by putting it before the use() call
  // This is intentionally AFTER the requireAdmin middleware, so only admins call this specific endpoint.
  // Notifications for non-admins are served separately.
  const tenantId = req.user.tenant_id;
  const { userId } = req.query;
  try {
    const targetId = userId || req.user.id;
    const [rows] = await pool.execute(
      'SELECT id, title, message, is_read, created_at FROM in_app_notifications WHERE tenant_id=? AND user_id=? ORDER BY created_at DESC LIMIT 20',
      [tenantId, targetId]
    );
    return res.json({ success: true, notifications: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
