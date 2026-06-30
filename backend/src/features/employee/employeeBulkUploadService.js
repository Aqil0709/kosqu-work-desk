const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Employee = require('./employeeModel');
const { parseEmployeeUploadFile } = require('./employeeBulkUploadParser');
const { sendEmployeeCredentials } = require('../../services/mailService');
const {
  validateEmployeeRows,
  normalizeEmail,
  normalizeEmployeeId
} = require('./employeeBulkUploadValidator');

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

const generatePlaceholderEmail = (row, index) => {
  const namePart = String(row.first_name || row.full_name || 'employee')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'employee';
  return `${namePart}.${row.employee_id || index}.noemail@workdesk.internal`;
};

const hashRows = async (rows) => Promise.all(rows.map(async (row, index) => {
  const temporaryPassword = generateSecurePassword();
  const email = row.email || generatePlaceholderEmail(row, index + 1);
  const isPlaceholderEmail = !row.email;
  return {
    ...row,
    email,
    isPlaceholderEmail,
    temporary_password: isPlaceholderEmail ? null : temporaryPassword,
    password_hash: await bcrypt.hash(temporaryPassword, 10)
  };
}));

const processEmployeeBulkUpload = async (tenantId, file, actorUserId = null) => {
  console.log(`[BulkUpload] STAGE 1 — File received: ${file?.originalname}, size: ${file?.size}, tenant: ${tenantId}`);

  const parsedFile = await parseEmployeeUploadFile(file);
  console.log(`[BulkUpload] STAGE 2 — Parsed: ${parsedFile.rows.length} rows, ${parsedFile.errors.length} parse errors`);
  if (parsedFile.errors.length > 0) {
    console.log(`[BulkUpload] STAGE 2 FAILED — Parse errors:`, parsedFile.errors);
    return {
      success: false,
      totalRows: parsedFile.rows.length,
      insertedRows: 0,
      failedRows: parsedFile.rows.length,
      errors: parsedFile.errors.map((message) => ({ row: null, message }))
    };
  }

  const departments = await Employee.getDepartments(tenantId);
  console.log(`[BulkUpload] STAGE 3 — Departments loaded: ${departments.length} departments:`, departments.map(d => `${d.id}:${d.name}`));

  const uploadedEmails = parsedFile.rows
    .map((row) => normalizeEmail(row.data.email))
    .filter(Boolean);
  const uploadedEmployeeIds = parsedFile.rows
    .map((row) => normalizeEmployeeId(row.data.employee_id))
    .filter(Boolean);

  const [existingEmails, existingEmployeeIds] = await Promise.all([
    Employee.getExistingEmails(uploadedEmails),
    Employee.getExistingEmployeeIds(tenantId, uploadedEmployeeIds)
  ]);
  console.log(`[BulkUpload] STAGE 4 — Existing emails in DB: ${existingEmails.size}, existing IDs: ${existingEmployeeIds.size}`);

  // Log each raw row's department field before validation
  parsedFile.rows.forEach(({ rowNumber, data }) => {
    console.log(`[BulkUpload] Row ${rowNumber} raw data — department: "${data.department}", department_id: "${data.department_id}", email: "${data.email}", full_name: "${data.full_name}"`);
  });

  const { validRows, errors } = validateEmployeeRows(
    parsedFile.rows,
    departments,
    existingEmails,
    existingEmployeeIds
  );
  console.log(`[BulkUpload] STAGE 5 — Validation: ${validRows.length} valid, ${errors.length} failed`);
  if (errors.length > 0) {
    console.log(`[BulkUpload] STAGE 5 VALIDATION ERRORS:`, errors.map(e => `Row ${e.row}: ${e.message}`));
  }

  let inserted = [];
  let passwordByEmail = new Map();
  let placeholderEmails = new Set();
  if (validRows.length > 0) {
    console.log(`[BulkUpload] STAGE 6 — Hashing passwords for ${validRows.length} rows...`);
    const rowsWithPasswords = await hashRows(validRows);

    console.log(`[BulkUpload] STAGE 7 — Calling Employee.bulkCreate() with ${rowsWithPasswords.length} rows...`);
    inserted = await Employee.bulkCreate(tenantId, rowsWithPasswords, { createdBy: actorUserId });
    console.log(`[BulkUpload] STAGE 7 COMPLETE — bulkCreate returned ${inserted.length} records:`, inserted.map(e => `${e.employee_id}:${e.email}`));

    passwordByEmail = new Map(rowsWithPasswords.map((row) => [row.email, row.temporary_password]));
    placeholderEmails = new Set(rowsWithPasswords.filter(r => r.isPlaceholderEmail).map(r => r.email));

    const emailErrors = [];
    for (const employee of inserted) {
      const sourceRow = rowsWithPasswords.find((row) => row.email === employee.email);
      if (sourceRow?.isPlaceholderEmail) continue;
      try {
        await sendEmployeeCredentials(tenantId, {
          employeeName: `${sourceRow.first_name} ${sourceRow.last_name}`.trim(),
          email: employee.email,
          password: passwordByEmail.get(employee.email)
        });
      } catch (emailError) {
        emailErrors.push({ email: employee.email, error: emailError.message });
      }
    }

    if (emailErrors.length > 0) {
      console.warn(`[BulkUpload] ${emailErrors.length} credential email(s) failed to send:`, emailErrors);
    }
  } else {
    console.log(`[BulkUpload] STAGE 6 SKIPPED — No valid rows to insert`);
  }

  const exposeTemporaryPasswords = process.env.NODE_ENV !== 'production';
  const result = {
    success: errors.length === 0,
    totalRows: parsedFile.rows.length,
    insertedRows: inserted.length,
    failedRows: errors.length,
    errors,
    inserted: inserted.map((employee) => ({
      row: employee.rowNumber,
      user_id: employee.user_id,
      employee_id: employee.employee_id,
      email: employee.email,
      leave_balance_count: employee.leave_balance_count,
      leave_balance_year: employee.leave_balance_year,
      onboarding_process_id: employee.onboarding_process_id,
      onboarding_template_id: employee.onboarding_template_id,
      onboarding_task_count: employee.onboarding_task_count,
      ...(exposeTemporaryPasswords ? { temporary_password: passwordByEmail.get(employee.email) } : {})
    })),
    rows: parsedFile.rows.map(({ rowNumber, data }) => {
      const insertedRow = inserted.find((employee) => employee.rowNumber === rowNumber);
      if (insertedRow) {
        const isIncomplete = placeholderEmails && placeholderEmails.has(insertedRow.email);
        return {
          row: rowNumber,
          employee_name: `${insertedRow.first_name || ''} ${insertedRow.last_name || ''}`.trim() || data.full_name || insertedRow.email,
          email: isIncomplete ? null : insertedRow.email,
          status: isIncomplete ? 'NEEDS_UPDATE' : 'SUCCESS',
          needs_update: isIncomplete,
          user_id: insertedRow.user_id,
          employee_id: insertedRow.employee_id,
          leave_balance_count: insertedRow.leave_balance_count,
          leave_balance_year: insertedRow.leave_balance_year,
          onboarding_process_id: insertedRow.onboarding_process_id,
          onboarding_template_id: insertedRow.onboarding_template_id,
          onboarding_task_count: insertedRow.onboarding_task_count,
          ...(exposeTemporaryPasswords && !isIncomplete ? { temporary_password: passwordByEmail.get(insertedRow.email) } : {})
        };
      }

      const failedRow = errors.find((error) => error.row === rowNumber);
      return {
        row: rowNumber,
        employee_name: String(data.full_name || `${data.first_name || ''} ${data.last_name || ''}`).trim() || data.email || 'Unknown',
        email: data.email || null,
        status: 'FAILED',
        reason: failedRow?.message || 'Row was not inserted'
      };
    }),
    message: inserted.length === 0 && errors.length > 0
      ? `No employees were created. ${errors.length} row(s) failed.`
      : `Processed ${parsedFile.rows.length} rows. ${inserted.length} inserted, ${errors.length} failed.`
  };
  console.log(`[BulkUpload] FINAL RESULT:`, JSON.stringify({ success: result.success, totalRows: result.totalRows, insertedRows: result.insertedRows, failedRows: result.failedRows }));
  return result;
};

module.exports = {
  processEmployeeBulkUpload
};
