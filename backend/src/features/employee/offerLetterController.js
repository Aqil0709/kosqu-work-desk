const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../../config/db');
const Employee = require('./employeeModel');
const { sendEmployeeCredentials, sendOfferLetter } = require('../../services/mailService');

let offerLetterSchemaReady;

const ignoreSchemaError = (error) => {
  if (!['ER_DUP_FIELDNAME', 'ER_CANT_DROP_FIELD_OR_KEY'].includes(error.code)) {
    throw error;
  }
};

const addColumnIfMissing = async (definition) => {
  try {
    await pool.execute(`ALTER TABLE offer_letters ADD COLUMN ${definition}`);
  } catch (error) {
    ignoreSchemaError(error);
  }
};

const ensureOfferLetterSchema = () => {
  if (!offerLetterSchemaReady) {
    offerLetterSchemaReady = (async () => {
      await addColumnIfMissing('tenant_id INT NULL');
      await addColumnIfMissing('candidate_name VARCHAR(255) NULL');
      await addColumnIfMissing('candidate_email VARCHAR(255) NULL');
      await addColumnIfMissing("status VARCHAR(20) NOT NULL DEFAULT 'Pending'");

      try {
        await pool.execute('ALTER TABLE offer_letters MODIFY COLUMN employee_id INT NULL');
      } catch (error) {
        if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
      }

      await pool.execute(`
        UPDATE offer_letters ol
        JOIN users u ON ol.employee_id = u.id
        SET ol.tenant_id = u.tenant_id
        WHERE ol.tenant_id IS NULL
      `);
    })();
  }

  return offerLetterSchemaReady;
};

const parseJson = (value) => {
  if (!value || typeof value !== 'string') return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const splitName = (name) => {
  const parts = String(name || 'Candidate').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Candidate',
    lastName: parts.slice(1).join(' ')
  };
};

const generateSecurePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;
  const required = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    symbols[crypto.randomInt(symbols.length)]
  ];
  const rest = Array.from({ length: 12 }, () => all[crypto.randomInt(all.length)]);
  return [...required, ...rest]
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
};

const getMoney = (formData, field, fallback = '') => {
  const direct = formData[field];
  const breakup = formData.salaryBreakup?.[field];
  const value = direct || breakup?.annual || breakup?.monthly || fallback;
  const parsed = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const shapeOffer = (row) => ({
  ...row,
  form_data: parseJson(row.form_data)
});

const offerLetterController = {
  saveOfferLetter: async (req, res) => {
    try {
      await ensureOfferLetterSchema();

      const { employee_id, candidate_name, candidate_email, form_data, issue_date } = req.body;

      if (!form_data || !issue_date) {
        return res.status(400).json({ message: 'Offer letter details and issue date are required' });
      }

      const candidateName = String(candidate_name || form_data.fullName || form_data.employeeName || '').trim();
      const candidateEmail = normalizeEmail(candidate_email || form_data.email);

      if (!candidateName) {
        return res.status(400).json({ message: 'Candidate name is required' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail)) {
        return res.status(400).json({ message: 'Valid candidate email is required' });
      }

      const normalizedFormData = {
        ...form_data,
        fullName: form_data.fullName || form_data.employeeName || candidateName,
        email: candidateEmail
      };

      let offerId;
      if (employee_id) {
        const [result] = await pool.execute(
          `INSERT INTO offer_letters (tenant_id, employee_id, candidate_name, candidate_email, form_data, issue_date, status)
           VALUES (?, ?, ?, ?, ?, ?, 'Pending')
           ON DUPLICATE KEY UPDATE
             tenant_id = VALUES(tenant_id),
             candidate_name = VALUES(candidate_name),
             candidate_email = VALUES(candidate_email),
             form_data = VALUES(form_data),
             issue_date = VALUES(issue_date),
             status = 'Pending',
             updated_at = CURRENT_TIMESTAMP`,
          [req.tenantId, employee_id, candidateName, candidateEmail, JSON.stringify(normalizedFormData), issue_date]
        );
        offerId = result.insertId;
      } else {
        const [result] = await pool.execute(
          `INSERT INTO offer_letters (tenant_id, candidate_name, candidate_email, form_data, issue_date, status)
           VALUES (?, ?, ?, ?, ?, 'Pending')`,
          [req.tenantId, candidateName, candidateEmail, JSON.stringify(normalizedFormData), issue_date]
        );
        offerId = result.insertId;
      }

      let emailWarning = null;
      try {
        await sendOfferLetter(req.tenantId, {
          candidateName,
          candidateEmail,
          formData: normalizedFormData
        });

        const updateWhere = offerId ? 'id = ?' : 'employee_id = ?';
        const updateVal = offerId || employee_id;
        if (updateVal) {
          await pool.execute(
            `UPDATE offer_letters SET status = 'Sent', updated_at = CURRENT_TIMESTAMP WHERE ${updateWhere} AND tenant_id = ?`,
            [updateVal, req.tenantId]
          );
        }
      } catch (emailError) {
        console.warn('[OfferLetter] Email send failed:', emailError.message);
        emailWarning = 'Offer letter saved, but the email could not be sent: ' + emailError.message;
      }

      return res.status(201).json({
        success: true,
        offer_id: offerId,
        message: emailWarning ? 'Offer letter saved (email delivery failed)' : 'Offer letter saved and emailed successfully',
        warning: emailWarning || undefined
      });
    } catch (error) {
      console.error('Save offer letter database error:', error);
      return res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
    }
  },

  getMyOfferLetters: async (req, res) => {
    try {
      await ensureOfferLetterSchema();

      const [letters] = await pool.execute(
        `SELECT id, form_data, issue_date, status, created_at, updated_at
         FROM offer_letters
         WHERE tenant_id = ? AND employee_id = ?
         ORDER BY updated_at DESC`,
        [req.tenantId, req.user.id]
      );

      return res.json({ letters: letters.map(shapeOffer) });
    } catch (error) {
      console.error('Get my offer letters error:', error);
      return res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
    }
  },

  getAllOfferLetters: async (req, res) => {
    try {
      await ensureOfferLetterSchema();

      const [rows] = await pool.execute(
        `SELECT
           ol.id,
           ol.employee_id,
           ol.candidate_name,
           ol.candidate_email,
           ol.status,
           ol.form_data,
           ol.issue_date,
           ol.created_at,
           ol.updated_at,
           u.first_name,
           u.last_name,
           u.email,
           ed.id as employee_display_id
         FROM offer_letters ol
         LEFT JOIN users u ON ol.employee_id = u.id AND u.tenant_id = ol.tenant_id
         LEFT JOIN employee_details ed ON u.id = ed.employee_id AND ed.tenant_id = ol.tenant_id
         WHERE ol.tenant_id = ?
         ORDER BY ol.updated_at DESC`,
        [req.tenantId]
      );

      const processedRows = rows.map(shapeOffer);
      return res.json({ success: true, count: processedRows.length, data: processedRows });
    } catch (error) {
      console.error('Get all offer letters error:', error);
      return res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
    }
  },

  updateOfferStatus: async (req, res) => {
    try {
      await ensureOfferLetterSchema();

      const { id } = req.params;
      const { status, new_employee_id, department_id, employment_type } = req.body;
      const normalizedStatus = String(status || '').trim();

      if (!['Pending', 'Sent', 'Accepted', 'Rejected'].includes(normalizedStatus)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const [offerRows] = await pool.execute(
        'SELECT * FROM offer_letters WHERE id = ? AND tenant_id = ?',
        [id, req.tenantId]
      );

      if (offerRows.length === 0) {
        return res.status(404).json({ message: 'Offer letter not found' });
      }

      const offer = offerRows[0];
      const formData = parseJson(offer.form_data);

      if (normalizedStatus !== 'Accepted') {
        await pool.execute(
          'UPDATE offer_letters SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
          [normalizedStatus, id, req.tenantId]
        );
        return res.json({ success: true, message: 'Offer status updated successfully' });
      }

      if (!new_employee_id || !department_id || !employment_type) {
        return res.status(400).json({ message: 'Employee ID, Department, and Employee Type are required' });
      }

      if (String(new_employee_id).trim().length > 20) {
        return res.status(400).json({ message: 'Employee ID must be 20 characters or less' });
      }

      const email = normalizeEmail(offer.candidate_email || formData.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Offer letter does not have a valid candidate email' });
      }

      const [existingEmail] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      const employeeIdExists = await Employee.checkEmployeeIdExists(req.tenantId, new_employee_id);
      if (employeeIdExists) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }

      const candidateName = offer.candidate_name || formData.fullName || formData.employeeName || 'Candidate';
      const { firstName, lastName } = splitName(candidateName);
      const rawPassword = generateSecurePassword();
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const ctc = getMoney(formData, 'ctc');
      const employeeData = {
        employee_id: new_employee_id,
        first_name: firstName,
        last_name: lastName,
        email,
        password_hash: passwordHash,
        phone: formData.phone || null,
        department_id,
        position: formData.designation || 'employee',
        employment_type,
        salary: ctc || null,
        salary_basic: getMoney(formData, 'basicSalary'),
        salary_hra: getMoney(formData, 'hra'),
        salary_medical_allowance: getMoney(formData, 'medicalAllowance'),
        salary_travel_allowance: getMoney(formData, 'conveyanceAllowance'),
        salary_other_allowance: getMoney(formData, 'specialAllowance'),
        joining_date: formData.joiningDate || null,
        address: formData.address || null,
        is_active: true,
        status: 'active'
      };

      const result = await Employee.create(req.tenantId, employeeData);

      try {
        await pool.execute(
          'INSERT INTO employee_departments (employee_id, department_id, tenant_id) VALUES (?, ?, ?)',
          [result.employee_id, department_id, req.tenantId]
        );
      } catch (tableError) {
        if (tableError.code !== 'ER_NO_SUCH_TABLE' && tableError.code !== 'ER_DUP_ENTRY') {
          await Employee.hardDelete(req.tenantId, result.employee_id);
          throw tableError;
        }
      }

      let credEmailWarning = null;
      try {
        await sendEmployeeCredentials(req.tenantId, {
          employeeName: `${firstName} ${lastName}`.trim(),
          email,
          password: rawPassword
        });
      } catch (emailError) {
        console.warn('[OfferLetter] Credential email failed:', emailError.message);
        credEmailWarning = 'Credential email could not be sent: ' + emailError.message + '. Please share login details manually.';
      }

      await pool.execute(
        `UPDATE offer_letters
         SET employee_id = ?, status = 'Accepted', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND tenant_id = ?`,
        [result.user_id, id, req.tenantId]
      );

      return res.json({
        success: true,
        message: credEmailWarning ? 'Offer accepted and employee created (email delivery failed)' : 'Offer accepted and employee created successfully',
        warning: credEmailWarning || undefined,
        employee_id: result.employee_id,
        user_id: result.user_id
      });
    } catch (error) {
      console.error('Update offer status error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Employee ID or email already exists' });
      }
      return res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
    }
  }
};

module.exports = offerLetterController;
