// const FaceRecognition = require('../utils/faceRecognition');
const Employee = require('./employeeModel');
const { provisionTLModules, revokeTLModules, logTLAction } = require('../teamLead/teamLeadSchema');
const { pool } = require('../../config/db');
const { employeeListDto, employeeAdminDto, employeeSelfDto, employeeTeamLeadDto } = require('../../utils/responseDto');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { processEmployeeBulkUpload } = require('./employeeBulkUploadService');
const { sendEmployeeCredentials } = require('../../services/mailService');
const { parseMoney } = require('./employeePayroll');
const { parsePagination, paginatedResponse } = require('../../utils/pagination');
// const { sendEmployeeCredentials } = require('../utils/emailService');

const requiredEmployeeFields = [
  ['employee_id', 'Employee ID'],
  ['first_name', 'First name'],
  ['last_name', 'Last name'],
  ['email', 'Email'],
  ['department_id', 'Department'],
  ['position', 'Designation'],
  ['employment_type', 'Employment type'],
  ['joining_date', 'Joining date'],
  ['salary', 'CTC'],
  ['salary_basic', 'Basic salary']
];

const validateRequiredEmployeeFields = (payload) => {
  const missing = requiredEmployeeFields
    .filter(([field]) => payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === '')
    .map(([, label]) => label);
  return missing;
};

const validatePositivePayrollInputs = (payload) => {
  if (parseMoney(payload.salary) <= 0) return 'CTC must be greater than 0';
  if (parseMoney(payload.salary_basic) <= 0) return 'Basic salary must be greater than 0';
  return null;
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

const employeeController = {
  // Get current logged-in employee profile
  getMyProfile: async (req, res) => {
    try {
      const employee = await Employee.getByUserId(req.tenantId, req.user.id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee profile not found' });
      }
      res.json({ employee: employeeSelfDto(employee) });
    } catch (error) {
      console.error('Get my profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get all employees — single-query department resolution (eliminates N+1)
  getAllEmployees: async (req, res) => {
    try {
      const filters = {};
      if (req.query.department_id) filters.department_id = req.query.department_id;
      if (req.query.is_active !== undefined) {
        filters.is_active = req.query.is_active === 'true';
      }
      if (req.query.status) filters.status = req.query.status;
      if (req.query.position) filters.position = req.query.position;

      const { page, limit, offset } = parsePagination(req.query);
      const allEmployees = await Employee.getAll(req.tenantId, filters);
      const total = allEmployees.length;
      const employees = allEmployees.slice(offset, offset + limit);

      // Bulk-load all employee→department mappings in a single query
      let deptMapByEmpId = {};
      try {
        if (employees.length > 0) {
          const empIds = employees.map(e => e.employee_id);
          const placeholders = empIds.map(() => '?').join(',');
          const [allDeptRows] = await pool.execute(
            `SELECT ed.employee_id, d.id AS dept_id, d.name AS dept_name
             FROM employee_departments ed
             JOIN departments d ON d.id = ed.department_id AND d.tenant_id = ?
             WHERE ed.employee_id IN (${placeholders}) AND ed.tenant_id = ?`,
            [req.tenantId, ...empIds, req.tenantId]
          );
          for (const row of allDeptRows) {
            if (!deptMapByEmpId[row.employee_id]) deptMapByEmpId[row.employee_id] = [];
            deptMapByEmpId[row.employee_id].push({ id: row.dept_id, name: row.dept_name });
          }
        }
      } catch (tableError) {
        if (tableError.code !== 'ER_NO_SUCH_TABLE') throw tableError;
        // employee_departments table missing — fall through to single-dept fallback below
      }

      // Attach department arrays to each employee record
      for (const employee of employees) {
        const depts = deptMapByEmpId[employee.employee_id];
        if (depts && depts.length > 0) {
          employee.department_ids   = depts.map(d => d.id);
          employee.department_names = depts.map(d => d.name);
          employee.department_id    = depts[0].id;
          employee.department_name  = depts[0].name;
        } else {
          // Fallback to single-department already on the row
          employee.department_ids   = employee.department_id   ? [employee.department_id]   : [];
          employee.department_names = employee.department_name ? [employee.department_name] : [];
        }
      }

      const isHrAdmin = ['admin', 'hr'].includes(req.user?.position);
      const mapped = employees.map(e => isHrAdmin ? employeeAdminDto(e) : employeeListDto(e));
      res.json({
        ...paginatedResponse(mapped, total, page, limit),
        employees: mapped,
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get employee by ID
  getEmployee: async (req, res) => {
    try {
      const employee = await Employee.getById(req.tenantId, req.params.id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Fetch departments from mapping table when available
      try {
        const [deptRows] = await pool.execute(
          `SELECT d.id, d.name 
           FROM departments d 
           INNER JOIN employee_departments ed ON d.id = ed.department_id 
           WHERE ed.employee_id = ? AND d.tenant_id = ?`,
          [req.params.id, req.tenantId]
        );

        employee.department_ids = deptRows.map(d => d.id);
        employee.department_names = deptRows.map(d => d.name);
      } catch (tableError) {
        if (tableError.code === 'ER_NO_SUCH_TABLE') {
          employee.department_ids = employee.department_id ? [employee.department_id] : [];
          employee.department_names = employee.department_name ? [employee.department_name] : [];
        } else {
          throw tableError;
        }
      }

      const isHrAdmin = ['admin', 'hr'].includes(req.user?.position);

      if (!isHrAdmin) {
        const requesterId = String(req.user?.id);
        const targetId = String(employee.user_id || employee.employee_id || req.params.id);

        let isTeamLead = req.user?.position === 'team_lead';
        let isDirectReport = false;
        if (isTeamLead && requesterId !== targetId) {
          const [[tlCheck]] = await pool.execute(
            `SELECT id FROM employee_details WHERE team_lead_id=? AND employee_id=? AND tenant_id=?`,
            [requesterId, targetId, req.tenantId]
          );
          isDirectReport = !!tlCheck;
        }

        if (requesterId !== targetId && !isDirectReport) {
          return res.status(403).json({ message: 'Access denied: you can only view your own profile' });
        }

        // Own profile: include PII but not payroll breakdown
        // Team lead viewing direct report: list fields only
        const dto = (requesterId === targetId) ? employeeSelfDto(employee) : employeeTeamLeadDto(employee);
        return res.json({ employee: dto });
      }

      res.json({ employee: employeeAdminDto(employee) });
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Create employee
  createEmployee: async (req, res) => {
    try {
      const {
        first_name, last_name, email, phone, gender, department_id, position,
        employment_type, employment_category, joining_date, last_working_date, date_of_birth,
        address, emergency_contact, bank_account_number, ifsc_code, pan_number, aadhar_number,
        employee_id, salary, salary_basic, salary_hra, salary_medical_allowance,
        salary_travel_allowance, salary_other_allowance, is_active,
        notice_period, work_location, shift_id, reporting_manager_id, team_lead_id, client_id,
        pf_applicable, pf_number, uan_number, employee_pf_contribution, employer_pf_contribution,
        epf_fixed_amount, tds_applicable, tds_percentage, tds_amount, tds_category,
        bonus, incentives, reimbursements, other_deductions,
        probation_end_date, status,
        gst_number, consultant_type, contract_duration, contract_start_date, contract_end_date,
        stipend_amount, college_name, internship_duration, internship_start_date, internship_end_date, mentor_id,
        is_team_lead, payment_type, pay_rate
      } = req.body;

      // Validate required fields
      const missingFields = validateRequiredEmployeeFields(req.body);
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`
        });
      }

      const payrollInputError = validatePositivePayrollInputs(req.body);
      if (payrollInputError) {
        return res.status(400).json({ message: payrollInputError });
      }

      // Check if employee ID already exists
      if (employee_id) {
        if (String(employee_id).trim().length > 20) {
          return res.status(400).json({ message: 'Employee ID must be 20 characters or less' });
        }

        const exists = await Employee.checkEmployeeIdExists(req.tenantId, employee_id);
        if (exists) {
          return res.status(400).json({ message: 'Employee ID already exists' });
        }
      }

      // Generate temporary password
      const rawPassword = generateSecurePassword();
      const password_hash = await bcrypt.hash(rawPassword, 10);

      const employeeData = {
        first_name,
        last_name,
        email,
        password_hash,
        gender: gender || null,
        phone: phone || null,
        department_id: department_id || null,
        position: position || null,
        employment_type: employment_type || null,
        employment_category: employment_category || 'employee',
        salary: salary || null,
        salary_basic,
        salary_hra,
        salary_medical_allowance,
        salary_travel_allowance,
        salary_other_allowance,
        joining_date: joining_date || null,
        last_working_date: last_working_date || null,
        date_of_birth: date_of_birth || null,
        address: address || null,
        emergency_contact: emergency_contact || null,
        bank_account_number: bank_account_number || null,
        ifsc_code: ifsc_code || null,
        pan_number: pan_number || null,
        aadhar_number: aadhar_number || null,
        employee_id: employee_id || null,
        is_active: is_active !== undefined ? is_active : true,
        status: status || 'active',
        notice_period: notice_period || null,
        work_location: work_location || null,
        shift_id: shift_id || null,
        reporting_manager_id: reporting_manager_id || null,
        team_lead_id: team_lead_id || null,
        client_id: client_id || null,
        pf_applicable: pf_applicable ? 1 : 0,
        pf_number: pf_number || null,
        uan_number: uan_number || null,
        employee_pf_contribution: employee_pf_contribution ?? 12,
        employer_pf_contribution: employer_pf_contribution ?? 13,
        epf_fixed_amount: epf_fixed_amount != null ? Number(epf_fixed_amount) : null,
        tds_applicable: tds_applicable ? 1 : 0,
        tds_percentage: tds_percentage || null,
        tds_amount: tds_amount || 0,
        tds_category: tds_category || null,
        bonus: bonus || 0,
        incentives: incentives || 0,
        reimbursements: reimbursements || 0,
        other_deductions: other_deductions || 0,
        probation_end_date: probation_end_date || null,
        gst_number: gst_number || null,
        consultant_type: consultant_type || null,
        contract_duration: contract_duration || null,
        contract_start_date: contract_start_date || null,
        contract_end_date: contract_end_date || null,
        stipend_amount: stipend_amount || null,
        college_name: college_name || null,
        internship_duration: internship_duration || null,
        internship_start_date: internship_start_date || null,
        internship_end_date: internship_end_date || null,
        mentor_id: mentor_id || null,
        payment_type: ['monthly', 'daily', 'hourly'].includes(payment_type) ? payment_type : 'monthly',
        pay_rate: pay_rate != null && pay_rate !== '' ? Number(pay_rate) : null,
        created_by: req.user?.id || null,
      };

      // Enforce: reporting_manager_id must NOT be set; only reports_to_user_id/team_lead_id is used
      employeeData.reporting_manager_id = null;
      // Write reports_to_user_id alongside legacy team_lead_id
      employeeData.reports_to_user_id = team_lead_id || null;

      const result = await Employee.create(req.tenantId, employeeData);

      // TL flag: employment_category=team_lead OR explicit is_team_lead=true from form
      const explicitTlFlag = is_team_lead === true || is_team_lead === 1 || is_team_lead === 'true';
      const categoryIsTL   = String(employment_category || '').toLowerCase() === 'team_lead';
      const shouldBeTL     = explicitTlFlag || categoryIsTL;

      if (shouldBeTL && result.user_id) {
        try {
          await pool.execute(
            `UPDATE users SET is_team_lead = 1 WHERE id = ? AND tenant_id = ?`,
            [result.user_id, req.tenantId]
          );
          await provisionTLModules(req.tenantId, result.user_id, req.user?.id);
          await logTLAction(req.tenantId, req.user?.id, result.user_id, 'promoted', '0', '1', 0, 'Promoted on employee creation');
        } catch (tlErr) {
          console.warn('[createEmployee] TL provisioning warning:', tlErr.message);
        }
      }

      // Handle department associations if using many-to-many
      if (department_id) {
        try {
          await pool.execute(
            'INSERT INTO employee_departments (employee_id, department_id, tenant_id) VALUES (?, ?, ?)',
            [result.employee_id, department_id, req.tenantId]
          );
        } catch (err) {
          console.warn('Department association skipped:', err.message);
        }
      }

      // Send email with credentials (commented out for now)
      // const [tenantRows] = await pool.execute('SELECT slug FROM tenants WHERE id = ?', [req.tenantId]);
      // const tenantSlug = tenantRows[0]?.slug || 'Organization';
      // const adminEmail = req.user?.email || process.env.SMTP_USER;
      // if (adminEmail) {
      //   await sendEmployeeCredentials(adminEmail, tenantSlug, email, rawPassword, `${first_name} ${last_name}`);
      // }
      let emailWarning = null;
      try {
        await sendEmployeeCredentials(req.tenantId, {
          employeeName: `${first_name} ${last_name}`.trim(),
          email,
          password: rawPassword
        });
      } catch (emailError) {
        // Email is non-fatal — employee is still created, admin must share credentials manually
        emailWarning = `Employee created but credentials email could not be sent (${emailError.message}). Please share login details manually.`;
        console.warn('[createEmployee] Email send failed:', emailError.message);
      }

      res.status(201).json({
        success: true,
        message: emailWarning ? 'Employee created successfully (email delivery failed).' : 'Employee created successfully!',
        warning: emailWarning || undefined,
        user_id: result.user_id,
        employee_id: result.employee_id
      });

    } catch (error) {
      console.error('Create employee error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (error.message.includes('Employee ID already exists')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
    }
  },

  // Bulk Create employees
  bulkCreateEmployee: async (req, res) => {
    try {
      const { employees } = req.body;
      if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of employees.' });
      }

      const results = {
        success: [],
        errors: []
      };

      // Get departments for mapping
      const departments = await Employee.getDepartments(req.tenantId);
      const deptMap = {};
      departments.forEach(d => {
        deptMap[d.name.toLowerCase()] = d.id;
      });

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        try {
          // Basic validation
          if (!emp.first_name || !emp.last_name || !emp.email) {
            results.errors.push({
              index: i,
              name: `${emp.first_name || ''} ${emp.last_name || ''}`,
              message: 'First name, last name, and email are required'
            });
            continue;
          }

          // Map department name to ID if needed
          let department_id = emp.department_id;
          if (!department_id && emp.department_name) {
            department_id = deptMap[emp.department_name.toLowerCase()];
          }

          // Generate temporary password
          const rawPassword = crypto.randomBytes(6).toString('hex').toUpperCase();
          const password_hash = await bcrypt.hash(rawPassword, 10);

          const employeeData = {
            first_name: emp.first_name,
            last_name: emp.last_name,
            email: emp.email,
            password_hash,
            phone: emp.phone || null,
            department_id: department_id || null,
            position: emp.position || null,
            salary: emp.salary || null,
            joining_date: emp.joining_date || null,
            date_of_birth: emp.date_of_birth || null,
            address: emp.address || null,
            emergency_contact: emp.emergency_contact || null,
            bank_account_number: emp.bank_account_number || null,
            ifsc_code: emp.ifsc_code || null,
            pan_number: emp.pan_number || null,
            aadhar_number: emp.aadhar_number || null,
            employee_id: emp.employee_id || null,
            is_active: true,
            status: 'active'
          };

          const result = await Employee.create(req.tenantId, employeeData);

          // Handle department associations if using many-to-many
          if (department_id) {
            try {
              await pool.execute(
                'INSERT INTO employee_departments (employee_id, department_id, tenant_id) VALUES (?, ?, ?)',
                [result.employee_id, department_id, req.tenantId]
              );
            } catch (err) {
              // Ignore if table doesn't exist or already handled
            }
          }

          results.success.push({
            index: i,
            name: `${emp.first_name} ${emp.last_name}`,
            employee_id: result.employee_id
          });

        } catch (error) {
          results.errors.push({
            index: i,
            name: `${emp.first_name || ''} ${emp.last_name || ''}`,
            message: error.message || 'Failed to create employee'
          });
        }
      }

      res.json({
        success: true,
        message: `Processed ${employees.length} employees. ${results.success.length} succeeded, ${results.errors.length} failed.`,
        details: results
      });

    } catch (error) {
      console.error('Bulk create employee error:', error);
      res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
    }
  },

  bulkUploadEmployees: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          totalRows: 0,
          insertedRows: 0,
          failedRows: 0,
          errors: [{ row: null, message: 'CSV or XLSX file is required' }]
        });
      }

      const result = await processEmployeeBulkUpload(req.tenantId, req.file, req.user?.id || null);
      const statusCode = result.insertedRows > 0 || result.totalRows > 0 ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error('Bulk upload employees error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          totalRows: 0,
          insertedRows: 0,
          failedRows: 0,
          errors: [{ row: null, message: 'Duplicate employee data found while inserting records' }]
        });
      }

      return res.status(500).json({
        success: false,
        totalRows: 0,
        insertedRows: 0,
        failedRows: 0,
        errors: [{ row: null, message: 'Something went wrong. Please contact administrator.' }]
      });
    }
  },

  // Update employee
  updateEmployee: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        first_name, last_name, email, phone, gender, is_active, department_id, position,
        employment_type, employment_category, joining_date, last_working_date, date_of_birth,
        address, emergency_contact, bank_account_number, ifsc_code, pan_number, aadhar_number,
        employee_id, salary, salary_basic, salary_hra, salary_medical_allowance,
        salary_travel_allowance, salary_other_allowance, status,
        notice_period, work_location, shift_id, reporting_manager_id, team_lead_id, client_id,
        pf_applicable, pf_number, uan_number, employee_pf_contribution, employer_pf_contribution,
        epf_fixed_amount, tds_applicable, tds_percentage, tds_amount, tds_category,
        bonus, incentives, reimbursements, other_deductions,
        probation_end_date,
        gst_number, consultant_type, contract_duration, contract_start_date, contract_end_date,
        stipend_amount, college_name, internship_duration, internship_start_date, internship_end_date, mentor_id,
        is_team_lead, payment_type, pay_rate
      } = req.body;

      const missingFields = validateRequiredEmployeeFields(req.body);
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`
        });
      }

      const payrollInputError = validatePositivePayrollInputs(req.body);
      if (payrollInputError) {
        return res.status(400).json({ message: payrollInputError });
      }

      const existingEmployee = await Employee.getById(req.tenantId, id);
      if (!existingEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const employeeData = {
        first_name,
        last_name,
        email,
        gender: gender || null,
        employee_id: employee_id || id,
        phone: phone || null,
        is_active: is_active !== undefined ? is_active : true,
        department_id: department_id || null,
        position: position || null,
        employment_type: employment_type || null,
        employment_category: employment_category || 'employee',
        salary: salary || null,
        salary_basic,
        salary_hra,
        salary_medical_allowance,
        salary_travel_allowance,
        salary_other_allowance,
        joining_date: joining_date || null,
        last_working_date: last_working_date || null,
        date_of_birth: date_of_birth || null,
        address: address || null,
        emergency_contact: emergency_contact || null,
        bank_account_number: bank_account_number || null,
        ifsc_code: ifsc_code || null,
        pan_number: pan_number || null,
        aadhar_number: aadhar_number || null,
        status: status || 'active',
        notice_period: notice_period || null,
        work_location: work_location || null,
        shift_id: shift_id || null,
        reporting_manager_id: reporting_manager_id || null,
        team_lead_id: team_lead_id || null,
        client_id: client_id || null,
        pf_applicable: pf_applicable ? 1 : 0,
        pf_number: pf_number || null,
        uan_number: uan_number || null,
        employee_pf_contribution: employee_pf_contribution ?? 12,
        employer_pf_contribution: employer_pf_contribution ?? 13,
        epf_fixed_amount: epf_fixed_amount != null ? Number(epf_fixed_amount) : null,
        tds_applicable: tds_applicable ? 1 : 0,
        tds_percentage: tds_percentage || null,
        tds_amount: tds_amount || 0,
        tds_category: tds_category || null,
        bonus: bonus || 0,
        incentives: incentives || 0,
        reimbursements: reimbursements || 0,
        other_deductions: other_deductions || 0,
        probation_end_date: probation_end_date || null,
        gst_number: gst_number || null,
        consultant_type: consultant_type || null,
        contract_duration: contract_duration || null,
        contract_start_date: contract_start_date || null,
        contract_end_date: contract_end_date || null,
        stipend_amount: stipend_amount || null,
        college_name: college_name || null,
        internship_duration: internship_duration || null,
        internship_start_date: internship_start_date || null,
        internship_end_date: internship_end_date || null,
        mentor_id: mentor_id || null,
        payment_type: ['monthly', 'daily', 'hourly'].includes(payment_type) ? payment_type : 'monthly',
        pay_rate: pay_rate != null && pay_rate !== '' ? Number(pay_rate) : null,
      };

      // Enforce: reporting_manager_id never set from frontend; only reports_to_user_id/team_lead_id
      employeeData.reporting_manager_id = null;
      // Keep both columns in sync for backward compatibility
      employeeData.reports_to_user_id = team_lead_id || null;

      const result = await Employee.update(req.tenantId, id, employeeData);
      const updatedEmployeeId = result.employee_id || id;

      // TL detection: use employment_category === 'team_lead' only (not position string match)
      const newIsTeamLead = String(employment_category || '').toLowerCase() === 'team_lead';
      const prevIsTeamLead = String(existingEmployee.employment_category || '').toLowerCase() === 'team_lead';

      // Resolve user_id for this employee record
      const [[empUserRow]] = await pool.execute(
        `SELECT employee_id AS user_id FROM employee_details WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [id, req.tenantId]
      ).catch(() => [[null]]);
      const targetUserId = empUserRow?.user_id || existingEmployee.user_id;

      if (targetUserId) {
        if (newIsTeamLead && !prevIsTeamLead) {
          // Promoted to TL: set is_team_lead=1 + provision modules
          try {
            await pool.execute(
              `UPDATE users SET is_team_lead = 1 WHERE id = ? AND tenant_id = ?`,
              [targetUserId, req.tenantId]
            );
            await provisionTLModules(req.tenantId, targetUserId, req.user?.id);
            await logTLAction(req.tenantId, req.user?.id, targetUserId, 'promoted', '0', '1', 0, 'Promoted via employee update');
          } catch (tlErr) {
            console.warn('[updateEmployee] TL promotion warning:', tlErr.message);
          }
        } else if (!newIsTeamLead && prevIsTeamLead) {
          // Demoted from TL: clear is_team_lead=0 + revoke TL modules
          try {
            await pool.execute(
              `UPDATE users SET is_team_lead = 0 WHERE id = ? AND tenant_id = ?`,
              [targetUserId, req.tenantId]
            );
            await revokeTLModules(req.tenantId, targetUserId);
            await logTLAction(req.tenantId, req.user?.id, targetUserId, 'demoted', '1', '0', 0, 'Demoted via employee update');
          } catch (tlErr) {
            console.warn('[updateEmployee] TL demotion warning:', tlErr.message);
          }
        }
      }

      // Direct is_team_lead toggle from form: overrides employment_category-based logic
      // This handles the "Is Team Lead" checkbox that's independent of the category field
      if (targetUserId && is_team_lead !== undefined) {
        const explicitFlag = is_team_lead === true || is_team_lead === 1 || is_team_lead === 'true';
        try {
          const [[currentUser]] = await pool.execute(
            `SELECT is_team_lead FROM users WHERE id = ? AND tenant_id = ?`,
            [targetUserId, req.tenantId]
          ).catch(() => [[null]]);
          const currentFlag = currentUser?.is_team_lead ? 1 : 0;
          const targetFlag  = explicitFlag ? 1 : 0;

          if (currentFlag !== targetFlag) {
            await pool.execute(
              `UPDATE users SET is_team_lead = ? WHERE id = ? AND tenant_id = ?`,
              [targetFlag, targetUserId, req.tenantId]
            );
            if (targetFlag === 1) {
              await provisionTLModules(req.tenantId, targetUserId, req.user?.id);
              await logTLAction(req.tenantId, req.user?.id, targetUserId, 'promoted', '0', '1', 0, 'Promoted via Is Team Lead checkbox');
            } else {
              await revokeTLModules(req.tenantId, targetUserId);
              await logTLAction(req.tenantId, req.user?.id, targetUserId, 'demoted', '1', '0', 0, 'Demoted via Is Team Lead checkbox');
            }
          }
        } catch (tlErr) {
          console.warn('[updateEmployee] is_team_lead override warning:', tlErr.message);
        }
      }

      // Update department association if using many-to-many
      if (department_id !== undefined) {
        try {
          // Delete existing associations
          await pool.execute(
            'DELETE FROM employee_departments WHERE employee_id = ? AND tenant_id = ?',
            [id, req.tenantId]
          );

          // Insert new association
          if (department_id) {
            await pool.execute(
              'INSERT INTO employee_departments (employee_id, department_id, tenant_id) VALUES (?, ?, ?)',
              [updatedEmployeeId, department_id, req.tenantId]
            );
          }
        } catch (err) {
          console.warn('Department update skipped:', err.message);
        }
      }

      res.json({ success: true, message: 'Employee updated successfully' });

    } catch (error) {
      console.error('Update employee error:', error);
      if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Employee ID already exists')) {
        return res.status(400).json({ message: 'Employee ID or email already exists' });
      }
      if (
        error.message.includes('Employee ID must be 20 characters or less') ||
        error.message.includes('Employee ID is required')
      ) {
        return res.status(400).json({ message: error.message });
      }
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
        return res.status(400).json({
          message: 'Employee ID cannot be changed because this employee has related records. Other employee details were not updated.'
        });
      }
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete employee (soft delete)
  deleteEmployee: async (req, res) => {
    try {
      const { id } = req.params;
      const existingEmployee = await Employee.getById(req.tenantId, id);
      if (!existingEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Guard: system accounts cannot be deleted
      const systemPositions = ['admin', 'hr', 'team_lead'];
      if (systemPositions.includes(String(existingEmployee.position || '').toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: 'System accounts (Admin, HR, Team Lead) cannot be deleted. Change their status to Inactive instead.'
        });
      }

      // Delete department associations if table exists
      try {
        await pool.execute(
          'DELETE FROM employee_departments WHERE employee_id = ? AND tenant_id = ?',
          [id, req.tenantId]
        );
      } catch (err) {
        console.warn('Department cleanup skipped:', err.message);
      }

      const result = await Employee.delete(req.tenantId, id);
      
      if (result > 0) {
        res.json({ success: true, message: 'Employee deleted successfully' });
      } else {
        res.status(404).json({ message: 'Employee not found' });
      }

    } catch (error) {
      console.error('Delete employee error:', error);
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({
          message: 'Cannot delete this employee because they have associated records. Please edit and change their status to INACTIVE instead.'
        });
      }
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Reset employee password
  resetPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { new_password } = req.body;

      if (!new_password) {
        return res.status(400).json({ message: 'New password is required' });
      }

      // Enforce password policy
      const { validatePassword } = require('../../utils/passwordPolicy');
      const policyErr = validatePassword(new_password);
      if (policyErr) return res.status(400).json({ success: false, message: policyErr });

      const existingEmployee = await Employee.getById(req.tenantId, id);
      if (!existingEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const password_hash = await bcrypt.hash(new_password, 10);

      await pool.execute(
        'UPDATE users SET password_hash=?, force_password_reset=1, temp_password_issued=1, first_login_completed=0, failed_login_attempts=0, is_locked=0, locked_at=NULL WHERE id=? AND tenant_id=?',
        [password_hash, existingEmployee.user_id, req.tenantId]
      );

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get departments
  getDepartments: async (req, res) => {
    try {
      const departments = await Employee.getDepartments(req.tenantId);
      res.json({ departments });
    } catch (error) {
      console.error('Get departments error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  createDepartment: async (req, res) => {
    try {
      const departmentId = await Employee.createDepartment(req.tenantId, req.body);
      const departments = await Employee.getDepartments(req.tenantId);
      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        department_id: departmentId,
        departments
      });
    } catch (error) {
      console.error('Create department error:', error);
      if (error.message.includes('required') || error.message.includes('already exists')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  updateDepartment: async (req, res) => {
    try {
      const affectedRows = await Employee.updateDepartment(req.tenantId, req.params.departmentId, req.body);
      if (!affectedRows) {
        return res.status(404).json({ success: false, message: 'Department not found' });
      }

      const departments = await Employee.getDepartments(req.tenantId);
      res.json({ success: true, message: 'Department updated successfully', departments });
    } catch (error) {
      console.error('Update department error:', error);
      if (error.message.includes('required') || error.message.includes('already exists')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  deleteDepartment: async (req, res) => {
    try {
      const affectedRows = await Employee.deleteDepartment(req.tenantId, req.params.departmentId);
      if (!affectedRows) {
        return res.status(404).json({ success: false, message: 'Department not found' });
      }

      const departments = await Employee.getDepartments(req.tenantId);
      res.json({ success: true, message: 'Department deleted successfully', departments });
    } catch (error) {
      console.error('Delete department error:', error);
      if (error.message.includes('assigned to employees')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  },

  // Get suggested positions
  getSuggestedPositions: async (req, res) => {
    try {
      const positions = await Employee.getSuggestedPositions(req.tenantId);
      res.json({ positions });
    } catch (error) {
      console.error('Get suggested positions error:', error);
      res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
    }
  },

  // Add new suggested position
  addSuggestedPosition: async (req, res) => {
    try {
      const { name, category, description } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Position name is required' });
      }

      const positionId = await Employee.addSuggestedPosition(req.tenantId, {
        name,
        category: category || 'Other',
        description: description || null
      });

      res.status(201).json({ success: true, message: 'Position added successfully', position_id: positionId });
    } catch (error) {
      console.error('Add suggested position error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Position already exists' });
      }
      res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
    }
  },

  // Get face status
  getFaceStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await Employee.getById(req.tenantId, id);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      const hasFaceEnrolled = !!employee.face_encoding;
      res.json({
        success: true,
        hasFaceEnrolled,
        enrolledAt: hasFaceEnrolled ? JSON.parse(employee.face_encoding).timestamp : null
      });
    } catch (error) {
      console.error('Get face status error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Enroll face for employee (commented out FaceRecognition)
  enrollFace: async (req, res) => {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, message: 'Face image is required' });
      }

      // Uncomment when FaceRecognition is available
      // const faceEncoding = await FaceRecognition.extractFaceEncoding(file.buffer);
      // if (!faceEncoding) {
      //   return res.status(400).json({ success: false, message: 'No face detected in the image.' });
      // }
      // const faceData = {
      //   enrolled: true, employeeId: id, timestamp: new Date().toISOString(),
      //   encoding: faceEncoding, encodingVersion: '1.0'
      // };
      // await Employee.updateFaceEncoding(req.tenantId, id, JSON.stringify(faceData));

      res.json({ success: true, message: 'Face enrolled successfully!', employeeId: id });
    } catch (error) {
      console.error('❌ Enroll face error:', error);
      res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
  }
};

module.exports = employeeController;
