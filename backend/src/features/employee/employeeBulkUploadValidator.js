const { REQUIRED_BULK_UPLOAD_COLUMNS } = require('./employeeBulkUploadConfig');
const { calculatePayroll, parseMoney } = require('./employeePayroll');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\-()\s]{7,20}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
const aadharRegex = /^\d{12}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeEmployeeId = (employeeId) => String(employeeId || '').trim().toUpperCase();

const splitFullName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '-' };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' ')
  };
};

const isValidDate = (value) => {
  if (!value) return true;
  if (!dateRegex.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const parseBoolean = (value) => {
  if (value === '' || value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  if (['active', 'true', 'yes', '1', 'y', 'applicable'].includes(normalized)) return true;
  if (['inactive', 'false', 'no', '0', 'n', 'not applicable'].includes(normalized)) return false;
  return null;
};

const validateEmployeeRows = (rows, departments, existingEmails, existingEmployeeIds) => {
  const errors = [];
  const validRows = [];
  const fileEmails = new Set();
  const fileEmployeeIds = new Set();
  const departmentById = new Map(departments.map((department) => [String(department.id), department.id]));
  const departmentByName = new Map(departments.map((department) => [
    String(department.name || '').trim().toLowerCase(),
    department.id
  ]));

  rows.forEach(({ rowNumber, data }) => {
    const rowErrors = [];
    const normalized = {};

    // Validate Required Columns
    REQUIRED_BULK_UPLOAD_COLUMNS.forEach((field) => {
      if (field === 'full_name') {
        if (!String(data.full_name || '').trim() && !String(data.first_name || '').trim()) {
          rowErrors.push('Full Name (or First Name) is required');
        }
      } else if (!String(data[field] || '').trim()) {
        rowErrors.push(`${field} is required`);
      }
    });

    const nameParts = splitFullName(data.full_name);
    normalized.first_name = String(data.first_name || nameParts.first_name).trim();
    normalized.last_name = String(data.last_name || nameParts.last_name).trim() || '-';
    normalized.email = normalizeEmail(data.email);

    if (normalized.email && !emailRegex.test(normalized.email)) {
      rowErrors.push('Invalid email address');
    }

    if (normalized.email && fileEmails.has(normalized.email)) {
      rowErrors.push('Duplicate email in uploaded spreadsheet');
    }

    if (normalized.email && existingEmails.has(normalized.email)) {
      rowErrors.push('Email already exists in system');
    }

    if (normalized.email) fileEmails.add(normalized.email);

    normalized.employee_id = normalizeEmployeeId(data.employee_id);
    if (normalized.employee_id) {
      if (normalized.employee_id.length > 20) {
        rowErrors.push('Employee ID must be 20 characters or less');
      }
      if (fileEmployeeIds.has(normalized.employee_id)) {
        rowErrors.push('Duplicate Employee ID in uploaded spreadsheet');
      }
      if (existingEmployeeIds.has(normalized.employee_id)) {
        rowErrors.push('Employee ID already exists in system');
      }
      fileEmployeeIds.add(normalized.employee_id);
    }

    normalized.phone = String(data.phone || '').trim() || null;
    if (normalized.phone && !phoneRegex.test(normalized.phone)) {
      rowErrors.push('Invalid phone number format');
    }

    normalized.emergency_contact = String(data.emergency_contact || '').trim() || null;
    if (normalized.emergency_contact && !phoneRegex.test(normalized.emergency_contact)) {
      rowErrors.push('Invalid emergency contact number format');
    }

    // Parse Payroll Salary Components
    const numericFields = [
      ['salary', 'CTC'],
      ['salary_basic', 'Basic'],
      ['salary_hra', 'HRA'],
      ['salary_medical_allowance', 'Medical Allowance'],
      ['salary_travel_allowance', 'Travel Allowance'],
      ['salary_other_allowance', 'Other Allowance']
    ];

    numericFields.forEach(([field, label]) => {
      const rawValue = String(data[field] || '').trim();
      if (!rawValue) {
        normalized[field] = 0;
        return;
      }
      const value = parseMoney(rawValue);
      if (rawValue && (!Number.isFinite(Number(rawValue.replace(/,/g, ''))) || value < 0)) {
        rowErrors.push(`${label} must be a valid positive number`);
      }
      normalized[field] = value;
    });

    // Dates Validation
    normalized.joining_date = String(data.joining_date || '').trim() || null;
    if (normalized.joining_date && !isValidDate(normalized.joining_date)) {
      rowErrors.push('Joining date must use YYYY-MM-DD format');
    }

    normalized.last_working_date = String(data.last_working_date || '').trim() || null;
    if (normalized.last_working_date && !isValidDate(normalized.last_working_date)) {
      rowErrors.push('Last working date must use YYYY-MM-DD format');
    }

    normalized.date_of_birth = String(data.date_of_birth || '').trim() || null;
    if (normalized.date_of_birth && !isValidDate(normalized.date_of_birth)) {
      rowErrors.push('Date of birth must use YYYY-MM-DD format');
    }

    normalized.probation_end_date = String(data.probation_end_date || '').trim() || null;
    if (normalized.probation_end_date && !isValidDate(normalized.probation_end_date)) {
      rowErrors.push('Probation end date must use YYYY-MM-DD format');
    }

    // Bank Details Validation
    normalized.ifsc_code = String(data.ifsc_code || '').trim().toUpperCase() || null;
    if (normalized.ifsc_code && !ifscRegex.test(normalized.ifsc_code)) {
      rowErrors.push('Invalid banking IFSC code format');
    }

    normalized.pan_number = String(data.pan_number || '').trim().toUpperCase() || null;
    if (normalized.pan_number && !panRegex.test(normalized.pan_number)) {
      rowErrors.push('Invalid PAN number format');
    }

    normalized.aadhar_number = String(data.aadhar_number || '').replace(/\s/g, '') || null;
    if (normalized.aadhar_number && !aadharRegex.test(normalized.aadhar_number)) {
      rowErrors.push('Aadhar number must be exactly 12 digits');
    }

    // Resolve Department
    let departmentId = null;
    const uploadedDepartmentId = String(data.department_id || '').trim();
    const uploadedDepartmentName = String(data.department || '').trim();
    if (uploadedDepartmentId) {
      departmentId = departmentById.get(uploadedDepartmentId) || null;
    } else if (uploadedDepartmentName) {
      departmentId = departmentByName.get(uploadedDepartmentName.toLowerCase()) || null;
    }

    if (!departmentId) {
      rowErrors.push(`Department "${uploadedDepartmentName || uploadedDepartmentId || 'N/A'}" not found. Create it first.`);
    }

    normalized.employment_type = String(data.employment_type || '').trim() || null;

    const parsedIsActive = parseBoolean(data.is_active);
    if (parsedIsActive === null && data.is_active !== undefined) {
      rowErrors.push('Is active must be active, inactive, yes, no, true, false, 1 or 0');
    }

    // FIXED: Gender field normalization fallback for old demo files
    let genderVal = String(data.gender || '').trim();
    if (genderVal) {
      const gLower = genderVal.toLowerCase();
      if (['male', 'm'].includes(gLower)) genderVal = 'Male';
      else if (['female', 'f'].includes(gLower)) genderVal = 'Female';
      else if (['other', 'o'].includes(gLower)) genderVal = 'Other';
      else {
        genderVal = 'Other'; // Fallback instead of failing
      }
    } else {
      genderVal = 'Other'; // Default for old template files missing this column
    }

    // Compliance settings
    const pf_applicable = parseBoolean(data.pf_applicable) === true ? 1 : 0;
    const epf_fixed_amount = parseMoney(data.epf_fixed_amount || data.pf_amount || data.salary_pf);

    // Form payroll inputs payload cleanly
    const payrollPayload = {
      salary_basic: normalized.salary_basic,
      salary_hra: normalized.salary_hra,
      salary_medical_allowance: normalized.salary_medical_allowance,
      salary_travel_allowance: normalized.salary_travel_allowance,
      salary_other_allowance: normalized.salary_other_allowance,
      pf_applicable,
      epf_fixed_amount
    };

    const calculatedPayrollData = calculatePayroll(payrollPayload);

    const cleanRow = {
      first_name: normalized.first_name,
      last_name: normalized.last_name,
      email: normalized.email,
      phone: normalized.phone,
      gender: genderVal,
      emergency_contact: normalized.emergency_contact,
      department_id: departmentId,
      position: String(data.position || '').trim() || null,
      employment_type: normalized.employment_type,
      employment_category: String(data.employment_category || '').trim() || 'employee',
      salary: normalized.salary || null,
      salary_basic: normalized.salary_basic,
      salary_hra: normalized.salary_hra,
      salary_medical_allowance: normalized.salary_medical_allowance,
      salary_travel_allowance: normalized.salary_travel_allowance,
      salary_other_allowance: normalized.salary_other_allowance,
      ...calculatedPayrollData,
      notice_period: String(data.notice_period || '').trim() || null,
      work_location: String(data.work_location || '').trim() || null,
      pf_applicable,
      pf_number: String(data.pf_number || '').trim() || null,
      uan_number: String(data.uan_number || '').trim() || null,
      employee_pf_contribution: 12.00,
      employer_pf_contribution: 13.00,
      epf_fixed_amount: pf_applicable ? epf_fixed_amount : null,
      tds_applicable: parseBoolean(data.tds_applicable) === true ? 1 : 0,
      tds_percentage: data.tds_percentage ? Number(data.tds_percentage) : null,
      bonus: Number(data.bonus) || 0,
      incentives: Number(data.incentives) || 0,
      other_deductions: Number(data.other_deductions) || 0,
      joining_date: normalized.joining_date,
      last_working_date: normalized.last_working_date,
      date_of_birth: normalized.date_of_birth,
      probation_end_date: normalized.probation_end_date,
      address: String(data.address || '').trim() || null,
      bank_account_number: String(data.bank_account_number || '').trim() || null,
      ifsc_code: normalized.ifsc_code,
      pan_number: normalized.pan_number,
      aadhar_number: normalized.aadhar_number,
      employee_id: normalized.employee_id,
      is_active: parsedIsActive === null ? true : parsedIsActive,
      status: parsedIsActive === false ? 'inactive' : 'active',
      team_lead_id: data.team_lead_id ? Number(data.team_lead_id) : null,
      reporting_manager_id: data.reporting_manager_id ? Number(data.reporting_manager_id) : null,
      client_id: data.client_id ? Number(data.client_id) : null,
      shift_id: data.shift_id ? Number(data.shift_id) : null,
      sourceRow: data,
      rowNumber
    };

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        message: rowErrors.join('; '),
        data
      });
    } else {
      validRows.push(cleanRow);
    }
  });

  return { validRows, errors };
};

module.exports = {
  validateEmployeeRows,
  normalizeEmail,
  normalizeEmployeeId
};