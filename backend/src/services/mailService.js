const nodemailer = require('nodemailer');
const ServiceSetting = require('../features/servicesetting/serviceSettingModel');

const buildTransportOptions = (config) => {
  if (!config?.host || !config?.port || !config?.username || !config?.password) {
    throw new Error('SMTP configuration is incomplete');
  }

  const encryption = config.encryption || 'tls';
  return {
    host: config.host,
    port: Number(config.port),
    secure: encryption === 'ssl',
    ignoreTLS: encryption === 'none',
    requireTLS: encryption === 'tls',
    auth: {
      user: config.username,
      pass: config.password
    }
  };
};

const createTransportForTenant = async (tenantId) => {
  const config = await ServiceSetting.getPrivateSmtpConfig(tenantId);
  if (!config) {
    throw new Error('SMTP configuration not found');
  }

  const transporter = nodemailer.createTransport(buildTransportOptions(config));
  return { transporter, config };
};

const assertSmtpConfigured = async (tenantId) => {
  const config = await ServiceSetting.getPrivateSmtpConfig(tenantId);
  if (!config) {
    throw new Error('SMTP configuration not found');
  }

  if (!config.from_email || !config.from_name) {
    throw new Error('SMTP configuration is incomplete');
  }

  buildTransportOptions(config);
  return true;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const buildCredentialsTemplate = ({ employeeName, email, password }) => {
  const safeName = escapeHtml(employeeName);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="margin: 0 0 16px; color: #111827;">Welcome to Work Desk</h2>
      <p>Hello ${safeName},</p>
      <p>Your Work Desk employee account has been created. Use the credentials below to sign in.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; background: #f3f4f6; font-weight: 700;">Login Email</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${safeEmail}</td>
        </tr>
        <tr>
          <td style="padding: 10px; background: #f3f4f6; font-weight: 700;">Temporary Password</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${safePassword}</td>
        </tr>
        <tr>
          <td style="padding: 10px; background: #f3f4f6; font-weight: 700;">Login URL</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">
            <a href="https://work-desk.tech">https://work-desk.tech</a>
          </td>
        </tr>
      </table>
      <p style="color: #92400e;">Please change this password after your first login.</p>
      <p>Regards,<br />Work Desk Team</p>
    </div>
  `;
};

const buildOfferLetterTemplate = ({ candidateName, formData }) => {
  const safeName = escapeHtml(candidateName || formData.fullName || 'Candidate');
  const safeDesignation = escapeHtml(formData.designation || 'the offered role');
  const safeJoiningDate = escapeHtml(formData.joiningDate || 'as discussed');
  const safeCtc = escapeHtml(formData.ctc || formData.salaryBreakup?.ctc?.annual || '');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #111827;">
      <h2 style="margin: 0 0 16px; color: #111827;">Offer Letter</h2>
      <p>Hello ${safeName},</p>
      <p>We are pleased to share your offer letter details for <strong>${safeDesignation}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; background: #f3f4f6; font-weight: 700;">Designation</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${safeDesignation}</td>
        </tr>
        <tr>
          <td style="padding: 10px; background: #f3f4f6; font-weight: 700;">Joining Date</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${safeJoiningDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px; background: #f3f4f6; font-weight: 700;">Annual CTC</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${safeCtc || '-'}</td>
        </tr>
      </table>
      <p>Please review the offer and contact HR for acceptance or any clarification.</p>
      <p>Regards,<br />Work Desk Team</p>
    </div>
  `;
};

const buildPasswordResetTemplate = ({ userName, resetLink }) => {
  const safeName = escapeHtml(userName || 'there');
  const safeResetLink = escapeHtml(resetLink);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="margin: 0 0 16px; color: #111827;">Reset Your Work Desk Password</h2>
      <p>Hello ${safeName},</p>
      <p>We received a request to reset your Work Desk password. Use the button below to choose a new password.</p>
      <p style="margin: 24px 0;">
        <a href="${safeResetLink}" style="background: #6d5dfc; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none; display: inline-block;">Reset Password</a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Regards,<br />Work Desk Team</p>
    </div>
  `;
};

const sendMail = async (tenantId, { to, subject, html, text }) => {
  const { transporter, config } = await createTransportForTenant(tenantId);
  const fromName = config.from_name || 'Work Desk';
  const fromEmail = config.from_email || config.username;

  return transporter.sendMail({
    from: `"${fromName.replace(/"/g, '\\"')}" <${fromEmail}>`,
    to,
    subject,
    html,
    text
  });
};

const sendEmployeeCredentials = async (tenantId, employee) => sendMail(tenantId, {
  to: employee.email,
  subject: 'Your Work Desk Login Credentials',
  html: buildCredentialsTemplate(employee),
  text: [
    `Hello ${employee.employeeName},`,
    '',
    'Your Work Desk employee account has been created.',
    `Login Email: ${employee.email}`,
    `Temporary Password: ${employee.password}`,
    'Login URL: https://work-desk.tech',
    '',
    'Please change this password after your first login.'
  ].join('\n')
});

const sendTestEmail = async (tenantId, to) => sendMail(tenantId, {
  to,
  subject: 'Work Desk SMTP Test Email',
  html: '<p>Your Work Desk SMTP configuration is working.</p>',
  text: 'Your Work Desk SMTP configuration is working.'
});

const sendPasswordResetEmail = async (tenantId, user) => sendMail(tenantId, {
  to: user.email,
  subject: 'Reset Your Work Desk Password',
  html: buildPasswordResetTemplate(user),
  text: [
    `Hello ${user.userName || 'there'},`,
    '',
    'We received a request to reset your Work Desk password.',
    `Reset link: ${user.resetLink}`,
    '',
    'This link will expire in 1 hour.',
    'If you did not request this, you can ignore this email.',
    '',
    'Regards,',
    'Work Desk Team'
  ].join('\n')
});

const sendOfferLetter = async (tenantId, offer) => sendMail(tenantId, {
  to: offer.candidateEmail,
  subject: `Offer Letter - ${offer.formData.designation || 'Work Desk'}`,
  html: buildOfferLetterTemplate(offer),
  text: [
    `Hello ${offer.candidateName || offer.formData.fullName || 'Candidate'},`,
    '',
    `We are pleased to share your offer letter details for ${offer.formData.designation || 'the offered role'}.`,
    `Joining Date: ${offer.formData.joiningDate || 'as discussed'}`,
    `Annual CTC: ${offer.formData.ctc || offer.formData.salaryBreakup?.ctc?.annual || '-'}`,
    '',
    'Please review the offer and contact HR for acceptance or any clarification.',
    '',
    'Regards,',
    'Work Desk Team'
  ].join('\n')
});

module.exports = {
  assertSmtpConfigured,
  sendEmployeeCredentials,
  sendOfferLetter,
  sendPasswordResetEmail,
  sendTestEmail
};


// -- Resignation email helpers ------------------------------------------------

const { pool: _resignPool } = (() => {
  try { return require('../config/db'); } catch (_) { return { pool: null }; }
})();

const _fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const _buildResignationTable = (rows) =>
  '<table style="width:100%;border-collapse:collapse;margin:20px 0;">' +
  rows.map(([k, v]) =>
    '<tr><td style="padding:10px;background:#f3f4f6;font-weight:700;width:40%;">' + escapeHtml(k) +
    '</td><td style="padding:10px;border:1px solid #e5e7eb;">' + escapeHtml(String(v == null ? '--' : v)) + '</td></tr>'
  ).join('') + '</table>';

const _resignationWrap = (greeting, body, tableRows) =>
  '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;">' +
  '<h2 style="margin:0 0 16px;color:#111827;">Work Desk HR</h2>' +
  '<p>' + greeting + '</p>' +
  _buildResignationTable(tableRows) +
  '<p>' + body + '</p>' +
  '<p>Regards,<br/>Work Desk HR Team</p></div>';

async function _getResignationDetails(resignationId) {
  if (!_resignPool) return null;
  try {
    const [rows] = await _resignPool.execute(
      'SELECT u.email, u.first_name, u.last_name, r.employee_name, r.ref_number,' +
      ' r.resignation_date, r.original_last_working_date, r.revised_last_working_date,' +
      ' r.notice_period_days, r.reason, r.rejection_reason' +
      ' FROM resignation_requests r' +
      ' JOIN employee_details ed ON r.employee_id = ed.id' +
      ' JOIN users u ON ed.employee_id = u.id' +
      ' WHERE r.id = ?',
      [resignationId]
    );
    return rows[0] || null;
  } catch (_) { return null; }
}

async function _getHREmails(tenantId) {
  if (!_resignPool) return [];
  try {
    const [rows] = await _resignPool.execute(
      "SELECT email FROM users WHERE tenant_id = ? AND position IN ('admin','hr') AND email IS NOT NULL",
      [tenantId]
    );
    return rows.map(r => r.email).filter(Boolean);
  } catch (_) { return []; }
}

const sendResignationSubmittedToHR = async (tenantId, data) => {
  const { employeeName, employeeEmail, ref_number, resignation_date, lastWorkingDate, reason, noticePeriodDays } = data;
  const hrEmails = await _getHREmails(tenantId);
  if (!hrEmails.length) return;
  const html = _resignationWrap(
    'A new resignation request has been submitted.',
    'Please log in to Work Desk to review and take action.',
    [
      ['Employee', employeeName], ['Email', employeeEmail || '--'], ['Reference No.', ref_number],
      ['Resignation Date', _fmtDate(resignation_date)], ['Notice Period', String(noticePeriodDays) + ' days'],
      ['Last Working Date', _fmtDate(lastWorkingDate)], ['Reason', reason],
    ]
  );
  return sendMail(tenantId, {
    to: hrEmails.join(', '),
    subject: 'New Resignation: ' + employeeName + ' (' + ref_number + ')',
    html, text: 'New resignation from ' + employeeName + ' (' + ref_number + '). LWD: ' + lastWorkingDate + '.',
  });
};

const sendResignationUnderReview = async (tenantId, opts) => {
  const emp = await _getResignationDetails(opts.resignationId);
  if (!emp || !emp.email) return;
  const name = emp.first_name || emp.employee_name || 'Employee';
  const lwd = emp.revised_last_working_date || emp.original_last_working_date;
  const html = _resignationWrap(
    'Dear ' + escapeHtml(name) + ',',
    'Your resignation request is currently under review by HR. You will be notified once a decision is made.',
    [['Reference No.', emp.ref_number], ['Resignation Date', _fmtDate(emp.resignation_date)], ['Last Working Date', _fmtDate(lwd)]]
  );
  return sendMail(tenantId, {
    to: emp.email, subject: 'Resignation Under Review -- ' + emp.ref_number, html,
    text: 'Dear ' + name + ', your resignation (' + emp.ref_number + ') is under review.',
  });
};

const sendResignationApproved = async (tenantId, opts) => {
  const { lwd: lwdOverride, letterPath } = opts;
  const emp = await _getResignationDetails(opts.resignationId);
  if (!emp || !emp.email) return;
  const name = emp.first_name || emp.employee_name || 'Employee';
  const finalLwd = lwdOverride || emp.revised_last_working_date || emp.original_last_working_date;
  const html = _resignationWrap(
    'Dear ' + escapeHtml(name) + ',',
    'Your resignation has been approved. Your acceptance letter is attached to this email.',
    [['Reference No.', emp.ref_number], ['Last Working Date', _fmtDate(finalLwd)]]
  );
  const attachments = [];
  if (letterPath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(letterPath)) attachments.push({ filename: 'Resignation_Acceptance_Letter.pdf', path: letterPath });
    } catch (_) {}
  }
  const { transporter, config } = await createTransportForTenant(tenantId);
  const fromName = config.from_name || 'Work Desk';
  const fromEmail = config.from_email || config.username;
  return transporter.sendMail({
    from: '"' + fromName.replace(/"/g, '\\"') + '" <' + fromEmail + '>',
    to: emp.email, subject: 'Resignation Approved -- ' + emp.ref_number, html,
    text: 'Dear ' + name + ', your resignation (' + emp.ref_number + ') has been approved. LWD: ' + finalLwd + '.',
    attachments,
  });
};

const sendResignationRejected = async (tenantId, opts) => {
  const { rejection_reason } = opts;
  const emp = await _getResignationDetails(opts.resignationId);
  if (!emp || !emp.email) return;
  const name = emp.first_name || emp.employee_name || 'Employee';
  const html = _resignationWrap(
    'Dear ' + escapeHtml(name) + ',',
    'If you have any questions, please contact your HR representative.',
    [['Reference No.', emp.ref_number], ['Rejection Reason', rejection_reason]]
  );
  return sendMail(tenantId, {
    to: emp.email, subject: 'Resignation Rejected -- ' + emp.ref_number, html,
    text: 'Dear ' + name + ', your resignation (' + emp.ref_number + ') has been rejected. Reason: ' + rejection_reason,
  });
};

module.exports.sendResignationSubmittedToHR = sendResignationSubmittedToHR;
module.exports.sendResignationUnderReview = sendResignationUnderReview;
module.exports.sendResignationApproved = sendResignationApproved;
module.exports.sendResignationRejected = sendResignationRejected;
