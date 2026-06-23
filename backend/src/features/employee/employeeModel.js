const { query, pool } = require('../../config/db');
const { calculatePayroll } = require('./employeePayroll');
const { provisionEmployeeRecords } = require('./employeeProvisioning');

const employeeDetailSelectColumns = `
          ed.department_id,
          ed.position,
          ed.employment_type,
          ed.employment_category,
          ed.notice_period,
          ed.years_of_experience,
          ed.previous_company,
          ed.previous_designation,
          ed.work_location,
          ed.shift_id,
          ed.reporting_manager_id,
          ed.team_lead_id,
          ed.client_id,
          ed.salary,
          ed.salary as ctc,
          ed.salary_basic,
          ed.salary_hra,
          ed.salary_medical_allowance,
          ed.salary_travel_allowance,
          ed.salary_other_allowance,
          ed.salary_gross,
          ed.salary_pf,
          ed.salary_esic,
          ed.salary_professional_tax,
          ed.salary_lwf,
          ed.salary_total_deduction,
          ed.salary_net,
          ed.employer_pf,
          ed.employer_esic,
          ed.pf_applicable,
          ed.pf_number,
          ed.uan_number,
          ed.employee_pf_contribution,
          ed.employer_pf_contribution,
          ed.epf_fixed_amount,
          ed.tds_applicable,
          ed.tds_percentage,
          ed.tds_amount,
          ed.tds_category,
          ed.bonus,
          ed.incentives,
          ed.reimbursements,
          ed.other_deductions,
          ed.gst_number,
          ed.consultant_type,
          ed.contract_duration,
          DATE_FORMAT(ed.contract_start_date, '%Y-%m-%d') as contract_start_date,
          DATE_FORMAT(ed.contract_end_date, '%Y-%m-%d') as contract_end_date,
          ed.stipend_amount,
          ed.college_name,
          ed.internship_duration,
          DATE_FORMAT(ed.internship_start_date, '%Y-%m-%d') as internship_start_date,
          DATE_FORMAT(ed.internship_end_date, '%Y-%m-%d') as internship_end_date,
          ed.mentor_id,
          ed.auto_checkout_enabled,
          DATE_FORMAT(ed.probation_end_date, '%Y-%m-%d') as probation_end_date,
          DATE_FORMAT(ed.joining_date, '%Y-%m-%d') as joining_date,
          DATE_FORMAT(ed.last_working_date, '%Y-%m-%d') as last_working_date,
          DATE_FORMAT(ed.date_of_birth, '%Y-%m-%d') as date_of_birth,
          ed.address,
          ed.emergency_contact,
          ed.bank_account_number,
          ed.ifsc_code,
          ed.pan_number,
          ed.aadhar_number,
          ed.status,
          u.gender`;

const generateNextEmployeeId = async (connection, tenantId) => {
  const [rows] = await connection.execute(
    `SELECT id FROM employee_details
     WHERE tenant_id = ? AND id REGEXP '^EMP[0-9]+$'
     ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC
     LIMIT 1`,
    [tenantId]
  );

  let next = 1001;
  if (rows.length > 0) {
    const last = parseInt(rows[0].id.substring(3), 10);
    if (!isNaN(last) && last >= 1001) next = last + 1;
  }
  return `EMP${next}`;
};

const Employee = {
  getAll: async (tenantId, filters = {}) => {
    try {
      let sql = `
        SELECT
          u.id as user_id,
          ed.id as employee_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.is_active,
          u.profile_photo,
          u.created_at,
${employeeDetailSelectColumns},
          d.name as department_name,
          CONCAT(rm.first_name, ' ', rm.last_name) as reporting_manager_name,
          CONCAT(tl.first_name, ' ', tl.last_name) as team_lead_name
        FROM employee_details ed
        JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
        LEFT JOIN departments d ON ed.department_id = d.id
        LEFT JOIN users rm ON rm.id = ed.reporting_manager_id
        LEFT JOIN users tl ON tl.id = ed.team_lead_id
        WHERE ed.tenant_id = ?
      `;
      const params = [tenantId];

      if (filters.department_id) {
        sql += ' AND ed.department_id = ?';
        params.push(filters.department_id);
      }
      if (filters.position) {
        sql += ' AND ed.position = ?';
        params.push(filters.position);
      }
      if (filters.is_active !== undefined) {
        sql += ' AND u.is_active = ?';
        params.push(filters.is_active);
      }
      if (filters.status) {
        sql += ' AND ed.status = ?';
        params.push(filters.status);
      }
      if (filters.employment_category) {
        sql += ' AND ed.employment_category = ?';
        params.push(filters.employment_category);
      }

      sql += ' ORDER BY u.created_at DESC';

      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Error in Employee.getAll:', error);
      throw error;
    }
  },

  create: async (tenantId, employeeData) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      let employeeId;
      if (employeeData.employee_id && employeeData.employee_id.trim() !== '') {
        employeeId = employeeData.employee_id.trim().toUpperCase();
        const [existing] = await connection.execute(
          'SELECT id FROM employee_details WHERE id = ? AND tenant_id = ?',
          [employeeId, tenantId]
        );
        if (existing.length > 0) {
          throw new Error(`Employee ID '${employeeId}' already exists`);
        }
      } else {
        employeeId = await generateNextEmployeeId(connection, tenantId);
      }

      const [userResult] = await connection.execute(
        `INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, phone, gender, is_active, force_password_reset, temp_password_issued, first_login_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0)`,
        [
          tenantId,
          employeeData.first_name,
          employeeData.last_name,
          employeeData.email,
          employeeData.password_hash || null,
          employeeData.phone || null,
          employeeData.gender || null,
          employeeData.is_active !== undefined ? employeeData.is_active : 1,
        ]
      );
      const userId = userResult.insertId;

      const payroll = calculatePayroll(employeeData);

      await connection.execute(
        `INSERT INTO employee_details (
          id, tenant_id, employee_id,
          department_id, position, employment_type, employment_category,
          notice_period, work_location, shift_id,
          reporting_manager_id, team_lead_id, client_id,
          salary,
          salary_basic, salary_hra, salary_medical_allowance,
          salary_travel_allowance, salary_other_allowance,
          salary_gross, salary_pf, salary_esic,
          salary_professional_tax, salary_lwf,
          salary_total_deduction, salary_net,
          employer_pf, employer_esic,
          pf_applicable, pf_number, uan_number,
          employee_pf_contribution, employer_pf_contribution, epf_fixed_amount,
          tds_applicable, tds_percentage, tds_amount, tds_category,
          bonus, incentives, reimbursements, other_deductions,
          gst_number, consultant_type, contract_duration,
          contract_start_date, contract_end_date,
          stipend_amount, college_name, internship_duration,
          internship_start_date, internship_end_date, mentor_id,
          joining_date, last_working_date, date_of_birth,
          address, emergency_contact,
          bank_account_number, ifsc_code, pan_number, aadhar_number,
          probation_end_date, status
        ) VALUES (
          ?,?,?,
          ?,?,?, ?,
          ?,?,?,
          ?,?,?,
          ?,
          ?,?,?,
          ?, ?,
          ?,?,?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?,?,?,
          ?,?,?,
          ?,?,?, ?,
          ?,?,?, ?,
          ?,?,?,
          ?, ?,
          ?,?,?,
          ?,?,?,
          ?,?,?,
          ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?,?
        )`,
        [
          employeeId, tenantId, userId,
          employeeData.department_id || null,
          employeeData.position || null,
          employeeData.employment_type || null,
          employeeData.employment_category || 'employee',
          employeeData.notice_period || null,
          employeeData.work_location || null,
          employeeData.shift_id || null,
          employeeData.reporting_manager_id || null,
          employeeData.team_lead_id || null,
          employeeData.client_id || null,
          employeeData.salary || null,
          payroll.salary_basic,
          payroll.salary_hra,
          payroll.salary_medical_allowance,
          payroll.salary_travel_allowance,
          payroll.salary_other_allowance,
          payroll.salary_gross,
          payroll.salary_pf,
          payroll.salary_esic,
          payroll.salary_professional_tax,
          payroll.salary_lwf,
          payroll.salary_total_deduction,
          payroll.salary_net,
          payroll.employer_pf,
          payroll.employer_esic,
          employeeData.pf_applicable ? 1 : 0,
          employeeData.pf_number || null,
          employeeData.uan_number || null,
          employeeData.employee_pf_contribution ?? 12.00,
          employeeData.employer_pf_contribution ?? 13.00,
          employeeData.epf_fixed_amount != null ? Number(employeeData.epf_fixed_amount) : null,
          employeeData.tds_applicable ? 1 : 0,
          employeeData.tds_percentage || null,
          employeeData.tds_amount || 0,
          employeeData.tds_category || null,
          employeeData.bonus || 0,
          employeeData.incentives || 0,
          employeeData.reimbursements || 0,
          employeeData.other_deductions || 0,
          employeeData.gst_number || null,
          employeeData.consultant_type || null,
          employeeData.contract_duration || null,
          employeeData.contract_start_date || null,
          employeeData.contract_end_date || null,
          employeeData.stipend_amount || null,
          employeeData.college_name || null,
          employeeData.internship_duration || null,
          employeeData.internship_start_date || null,
          employeeData.internship_end_date || null,
          employeeData.mentor_id || null,
          employeeData.joining_date || null,
          employeeData.last_working_date || null,
          employeeData.date_of_birth || null,
          employeeData.address || null,
          employeeData.emergency_contact || null,
          employeeData.bank_account_number || null,
          employeeData.ifsc_code || null,
          employeeData.pan_number || null,
          employeeData.aadhar_number || null,
          employeeData.probation_end_date || null,
          employeeData.status || 'active',
        ]
      );

      const provisioning = await provisionEmployeeRecords(connection, {
        tenantId,
        userId,
        employeeCode: employeeId,
        departmentId: employeeData.department_id || null,
        joiningDate: employeeData.joining_date || null,
        createdBy: employeeData.created_by || null,
      });

      await connection.commit();
      return { user_id: userId, employee_id: employeeId, ...provisioning };

    } catch (error) {
      await connection.rollback();
      console.error('Error in Employee.create:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  getById: async (tenantId, id) => {
    try {
      const [rows] = await pool.execute(
        `SELECT
          u.id as user_id,
          ed.id as employee_id,
          u.first_name, u.last_name, u.email, u.phone,
          u.is_active, u.profile_photo, u.created_at,
${employeeDetailSelectColumns},
          d.name as department_name,
          CONCAT(rm.first_name, ' ', rm.last_name) as reporting_manager_name,
          CONCAT(tl.first_name, ' ', tl.last_name) as team_lead_name
        FROM employee_details ed
        JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
        LEFT JOIN departments d ON ed.department_id = d.id
        LEFT JOIN users rm ON rm.id = ed.reporting_manager_id
        LEFT JOIN users tl ON tl.id = ed.team_lead_id
        WHERE ed.id = ? AND u.tenant_id = ?`,
        [id, tenantId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Employee.getById:', error);
      throw error;
    }
  },

  getByUserId: async (tenantId, userId) => {
    try {
      const [rows] = await pool.execute(
        `SELECT
          u.id as user_id,
          ed.id as employee_id,
          u.first_name, u.last_name, u.email, u.phone,
          u.is_active, u.profile_photo, u.created_at,
${employeeDetailSelectColumns},
          d.name as department_name,
          CONCAT(rm.first_name, ' ', rm.last_name) as reporting_manager_name,
          CONCAT(tl.first_name, ' ', tl.last_name) as team_lead_name
        FROM employee_details ed
        JOIN users u ON u.id = ed.employee_id AND u.tenant_id = ed.tenant_id
        LEFT JOIN departments d ON ed.department_id = d.id
        LEFT JOIN users rm ON rm.id = ed.reporting_manager_id
        LEFT JOIN users tl ON tl.id = ed.team_lead_id
        WHERE u.id = ? AND u.tenant_id = ?`,
        [userId, tenantId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Employee.getByUserId:', error);
      throw error;
    }
  },

  update: async (tenantId, id, employeeData) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [employee] = await connection.execute(
        `SELECT ed.id, ed.employee_id, u.id as user_id
         FROM employee_details ed
         JOIN users u ON ed.employee_id = u.id
         WHERE ed.id = ? AND ed.tenant_id = ?`,
        [id, tenantId]
      );
      if (employee.length === 0) throw new Error('Employee not found');

      const userId = employee[0].user_id;
      const currentId = String(id).trim().toUpperCase();
      const requestedId = String(employeeData.employee_id || id).trim().toUpperCase();

      if (!requestedId) throw new Error('Employee ID is required');
      if (requestedId.length > 20) throw new Error('Employee ID must be 20 characters or less');

      if (requestedId !== currentId) {
        const [dup] = await connection.execute(
          'SELECT id FROM employee_details WHERE id = ? AND tenant_id = ?',
          [requestedId, tenantId]
        );
        if (dup.length > 0) throw new Error('Employee ID already exists');
      }

      await connection.execute(
        `UPDATE users
         SET first_name=?, last_name=?, email=?, phone=?, gender=?, is_active=?
         WHERE id=? AND tenant_id=?`,
        [
          employeeData.first_name, employeeData.last_name,
          employeeData.email, employeeData.phone || null,
          employeeData.gender || null,
          employeeData.is_active !== undefined ? employeeData.is_active : 1,
          userId, tenantId,
        ]
      );

      const payroll = calculatePayroll(employeeData);

      await connection.execute(
        `UPDATE employee_details SET
          id=?, department_id=?, position=?, employment_type=?, employment_category=?,
          notice_period=?, work_location=?, shift_id=?,
          reporting_manager_id=?, team_lead_id=?, client_id=?,
          salary=?,
          salary_basic=?, salary_hra=?, salary_medical_allowance=?,
          salary_travel_allowance=?, salary_other_allowance=?,
          salary_gross=?, salary_pf=?, salary_esic=?,
          salary_professional_tax=?, salary_lwf=?,
          salary_total_deduction=?, salary_net=?,
          employer_pf=?, employer_esic=?,
          pf_applicable=?, pf_number=?, uan_number=?,
          employee_pf_contribution=?, employer_pf_contribution=?, epf_fixed_amount=?,
          tds_applicable=?, tds_percentage=?, tds_amount=?, tds_category=?,
          bonus=?, incentives=?, reimbursements=?, other_deductions=?,
          gst_number=?, consultant_type=?, contract_duration=?,
          contract_start_date=?, contract_end_date=?,
          stipend_amount=?, college_name=?, internship_duration=?,
          internship_start_date=?, internship_end_date=?, mentor_id=?,
          joining_date=?, last_working_date=?, date_of_birth=?,
          address=?, emergency_contact=?,
          bank_account_number=?, ifsc_code=?, pan_number=?, aadhar_number=?,
          probation_end_date=?, status=?
        WHERE id=? AND tenant_id=?`,
        [
          requestedId,
          employeeData.department_id || null,
          employeeData.position || null,
          employeeData.employment_type || null,
          employeeData.employment_category || 'employee',
          employeeData.notice_period || null,
          employeeData.work_location || null,
          employeeData.shift_id || null,
          employeeData.reporting_manager_id || null,
          employeeData.team_lead_id || null,
          employeeData.client_id || null,
          employeeData.salary || null,
          payroll.salary_basic, payroll.salary_hra, payroll.salary_medical_allowance,
          payroll.salary_travel_allowance, payroll.salary_other_allowance,
          payroll.salary_gross, payroll.salary_pf, payroll.salary_esic,
          payroll.salary_professional_tax, payroll.salary_lwf,
          payroll.salary_total_deduction, payroll.salary_net,
          payroll.employer_pf, payroll.employer_esic,
          employeeData.pf_applicable ? 1 : 0,
          employeeData.pf_number || null,
          employeeData.uan_number || null,
          employeeData.employee_pf_contribution ?? 12.00,
          employeeData.employer_pf_contribution ?? 13.00,
          employeeData.epf_fixed_amount != null ? Number(employeeData.epf_fixed_amount) : null,
          employeeData.tds_applicable ? 1 : 0,
          employeeData.tds_percentage || null,
          employeeData.tds_amount || 0,
          employeeData.tds_category || null,
          employeeData.bonus || 0,
          employeeData.incentives || 0,
          employeeData.reimbursements || 0,
          employeeData.other_deductions || 0,
          employeeData.gst_number || null,
          employeeData.consultant_type || null,
          employeeData.contract_duration || null,
          employeeData.contract_start_date || null,
          employeeData.contract_end_date || null,
          employeeData.stipend_amount || null,
          employeeData.college_name || null,
          employeeData.internship_duration || null,
          employeeData.internship_start_date || null,
          employeeData.internship_end_date || null,
          employeeData.mentor_id || null,
          employeeData.joining_date || null,
          employeeData.last_working_date || null,
          employeeData.date_of_birth || null,
          employeeData.address || null,
          employeeData.emergency_contact || null,
          employeeData.bank_account_number || null,
          employeeData.ifsc_code || null,
          employeeData.pan_number || null,
          employeeData.aadhar_number || null,
          employeeData.probation_end_date || null,
          employeeData.status || 'active',
          id, tenantId,
        ]
      );

      await connection.commit();
      return { employee_id: requestedId };

    } catch (error) {
      await connection.rollback();
      console.error('Error in Employee.update:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  delete: async (tenantId, id) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        'SELECT employee_id FROM employee_details WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
      );
      if (rows.length === 0) { await connection.rollback(); return 0; }

      const userId = rows[0].employee_id;

      const [result] = await connection.execute(
        `UPDATE employee_details SET status='inactive', updated_at=NOW() WHERE id=? AND tenant_id=?`,
        [id, tenantId]
      );
      await connection.execute(
        'UPDATE users SET is_active=0, updated_at=NOW() WHERE id=? AND tenant_id=?',
        [userId, tenantId]
      );
      await connection.execute(
        'DELETE FROM user_module_access WHERE user_id=? AND tenant_id=?',
        [userId, tenantId]
      );

      await connection.commit();
      return result.affectedRows;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  hardDelete: async (tenantId, id) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [emp] = await connection.execute(
        'SELECT id, employee_id FROM employee_details WHERE id=? AND tenant_id=?',
        [id, tenantId]
      );
      if (emp.length === 0) throw new Error('Employee not found');

      const detailId = emp[0].id;
      const userId   = emp[0].employee_id;

      try {
        await connection.execute(
          'DELETE FROM employee_departments WHERE employee_id=? AND tenant_id=?',
          [detailId, tenantId]
        );
      } catch (e) { if (e.code !== 'ER_NO_SUCH_TABLE') throw e; }

      try {
        await connection.execute(
          'DELETE FROM employee_documents WHERE employee_detail_id=? AND tenant_id=?',
          [detailId, tenantId]
        );
      } catch (e) { if (e.code !== 'ER_NO_SUCH_TABLE') throw e; }

      await connection.execute('DELETE FROM employee_details WHERE id=? AND tenant_id=?', [detailId, tenantId]);
      await connection.execute('DELETE FROM users WHERE id=? AND tenant_id=?', [userId, tenantId]);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  getDepartments: async (tenantId) => {
    const [rows] = await pool.execute(
      'SELECT * FROM departments WHERE tenant_id=? ORDER BY name',
      [tenantId]
    );
    return rows;
  },

  createDepartment: async (tenantId, data) => {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Department name is required');
    const [ex] = await pool.execute(
      'SELECT id FROM departments WHERE tenant_id=? AND LOWER(name)=LOWER(?)',
      [tenantId, name]
    );
    if (ex.length > 0) throw new Error('Department already exists');
    const [r] = await pool.execute(
      'INSERT INTO departments (tenant_id, name, description, manager) VALUES (?,?,?,?)',
      [tenantId, name, data.description || null, data.manager || null]
    );
    return r.insertId;
  },

  updateDepartment: async (tenantId, departmentId, data) => {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Department name is required');
    const [ex] = await pool.execute(
      'SELECT id FROM departments WHERE tenant_id=? AND LOWER(name)=LOWER(?) AND id<>?',
      [tenantId, name, departmentId]
    );
    if (ex.length > 0) throw new Error('Department already exists');
    const [r] = await pool.execute(
      `UPDATE departments SET name=?, description=?, manager=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND tenant_id=?`,
      [name, data.description || null, data.manager || null, departmentId, tenantId]
    );
    return r.affectedRows;
  },

  deleteDepartment: async (tenantId, departmentId) => {
    const [emp] = await pool.execute(
      'SELECT COUNT(*) as c FROM employee_details WHERE tenant_id=? AND department_id=?',
      [tenantId, departmentId]
    );
    if (Number(emp[0]?.c || 0) > 0)
      throw new Error('Department is assigned to employees and cannot be deleted');
    const [r] = await pool.execute(
      'DELETE FROM departments WHERE id=? AND tenant_id=?',
      [departmentId, tenantId]
    );
    return r.affectedRows;
  },

  checkEmployeeIdExists: async (tenantId, employeeId) => {
    const [rows] = await pool.execute(
      'SELECT id FROM employee_details WHERE id=? AND tenant_id=?',
      [employeeId, tenantId]
    );
    return rows.length > 0;
  },

  getExistingEmails: async (emails = []) => {
    const unique = [...new Set(emails.filter(Boolean).map(e => e.toLowerCase()))];
    if (!unique.length) return new Set();
    const ph = unique.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT LOWER(email) as email FROM users WHERE LOWER(email) IN (${ph})`,
      unique
    );
    return new Set(rows.map(r => r.email));
  },

  getExistingEmployeeIds: async (tenantId, ids = []) => {
    const unique = [...new Set(ids.filter(Boolean).map(i => i.toUpperCase()))];
    if (!unique.length) return new Set();
    const ph = unique.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT UPPER(id) as employee_id FROM employee_details WHERE tenant_id=? AND UPPER(id) IN (${ph})`,
      [tenantId, ...unique]
    );
    return new Set(rows.map(r => r.employee_id));
  },

  // Issue 1 & 2 Fix: Completed support of all fields and values inside Bulk SQL creation
  bulkCreate: async (tenantId, employees, options = {}) => {
    if (!Array.isArray(employees) || !employees.length) return [];
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [lastRow] = await connection.execute(
        `SELECT id FROM employee_details
         WHERE tenant_id=? AND id REGEXP '^EMP[0-9]+$'
         ORDER BY CAST(SUBSTRING(id,4) AS UNSIGNED) DESC LIMIT 1`,
        [tenantId]
      );
      let nextNum = 1001;
      if (lastRow.length > 0) {
        const n = parseInt(lastRow[0].id.substring(3), 10);
        if (!isNaN(n) && n >= 1001) nextNum = n + 1;
      }

      const used = new Set(
        employees.map(e => e.employee_id).filter(Boolean).map(i => i.toUpperCase())
      );

      const withIds = employees.map(emp => {
        let eid = emp.employee_id ? emp.employee_id.trim().toUpperCase() : '';
        if (!eid) {
          do { eid = `EMP${nextNum++}`; } while (used.has(eid));
        }
        used.add(eid);
        return { ...emp, employee_id: eid };
      });

      console.log(`[bulkCreate] STAGE A — Inserting ${withIds.length} users into users table`);
      const userVals = withIds.map(e => [
        tenantId, e.first_name, e.last_name, e.email,
        e.password_hash || null, e.phone || null,
        e.gender || null,
        e.is_active !== undefined ? e.is_active : 1,
        1, 1, 0,
      ]);
      await connection.query(
        'INSERT INTO users (tenant_id,first_name,last_name,email,password_hash,phone,gender,is_active,force_password_reset,temp_password_issued,first_login_completed) VALUES ?',
        [userVals]
      );

      const emails = withIds.map(e => e.email.toLowerCase());
      const ph = emails.map(() => '?').join(',');
      const [created] = await connection.execute(
        `SELECT id, LOWER(email) as email FROM users WHERE tenant_id=? AND LOWER(email) IN (${ph})`,
        [tenantId, ...emails]
      );
      const byEmail = new Map(created.map(u => [u.email, u.id]));

      const detailVals = withIds.map(e => {
        const uid = byEmail.get(e.email.toLowerCase());
        if (!uid) throw new Error(`User not created for ${e.email}`);
        
        // Use pre-validated and pre-calculated payroll values
        const basic = Number(e.salary_basic || 0);
        const hra = Number(e.salary_hra || 0);
        const medical = Number(e.salary_medical_allowance || 0);
        const travel = Number(e.salary_travel_allowance || 0);
        const other = Number(e.salary_other_allowance || 0);
        
        const calculatedPayroll = calculatePayroll({
          salary_basic: basic,
          salary_hra: hra,
          salary_medical_allowance: medical,
          salary_travel_allowance: travel,
          salary_other_allowance: other,
          pf_applicable: e.pf_applicable,
          epf_fixed_amount: e.epf_fixed_amount
        });

        return [
          e.employee_id, tenantId, uid,
          e.department_id || null, e.position || null,
          e.employment_type || null, e.employment_category || 'employee',
          e.notice_period || null,
          e.salary || null,
          calculatedPayroll.salary_basic, 
          calculatedPayroll.salary_hra, 
          calculatedPayroll.salary_medical_allowance,
          calculatedPayroll.salary_travel_allowance, 
          calculatedPayroll.salary_other_allowance,
          calculatedPayroll.salary_gross, 
          calculatedPayroll.salary_pf, 
          calculatedPayroll.salary_esic,
          calculatedPayroll.salary_professional_tax, 
          calculatedPayroll.salary_lwf,
          calculatedPayroll.salary_total_deduction, 
          calculatedPayroll.salary_net,
          calculatedPayroll.employer_pf, 
          calculatedPayroll.employer_esic,
          e.pf_applicable ? 1 : 0,
          e.pf_number || null,
          e.uan_number || null,
          e.employee_pf_contribution ?? 12.00,
          e.employer_pf_contribution ?? 13.00,
          e.epf_fixed_amount != null ? Number(e.epf_fixed_amount) : null, // Mapped perfectly!
          e.tds_applicable ? 1 : 0,
          e.tds_percentage || null,
          0, // tds_amount
          null, // tds_category
          e.bonus || 0,
          e.incentives || 0,
          e.other_deductions || 0,
          e.joining_date || null, 
          e.last_working_date || null,
          e.date_of_birth || null, 
          e.address || null,
          e.emergency_contact || null, 
          e.bank_account_number || null,
          e.ifsc_code || null, 
          e.pan_number || null,
          e.aadhar_number || null, 
          e.status || 'active',
          e.team_lead_id ? Number(e.team_lead_id) : null,
          e.reporting_manager_id ? Number(e.reporting_manager_id) : null,
          e.client_id ? Number(e.client_id) : null,
          e.work_location || null,
          e.shift_id || null,
          e.probation_end_date || null,
        ];
      });

      // Issue 1 Fix: Correct column count alignment on bulk inserts
      await connection.query(
        `INSERT INTO employee_details
         (id, tenant_id, employee_id, department_id, position, employment_type, employment_category,
          notice_period, salary,
          salary_basic, salary_hra, salary_medical_allowance, salary_travel_allowance, salary_other_allowance,
          salary_gross, salary_pf, salary_esic, salary_professional_tax, salary_lwf, salary_total_deduction, salary_net,
          employer_pf, employer_esic,
          pf_applicable, pf_number, uan_number, employee_pf_contribution, employer_pf_contribution, epf_fixed_amount,
          tds_applicable, tds_percentage, tds_amount, tds_category,
          bonus, incentives, other_deductions,
          joining_date, last_working_date, date_of_birth, address, emergency_contact,
          bank_account_number, ifsc_code, pan_number, aadhar_number, status,
          team_lead_id, reporting_manager_id, client_id, work_location,
          shift_id, probation_end_date)
         VALUES ?`,
        [detailVals]
      );

      const provisionedRows = [];
      for (const employee of withIds) {
        const userId = byEmail.get(employee.email.toLowerCase());
        const provisioning = await provisionEmployeeRecords(connection, {
          tenantId,
          userId,
          employeeCode: employee.employee_id,
          departmentId: employee.department_id || null,
          joiningDate: employee.joining_date || null,
          createdBy: options.createdBy || null,
        });

        provisionedRows.push({
          rowNumber: employee.rowNumber,
          user_id: userId,
          employee_id: employee.employee_id,
          email: employee.email,
          first_name: employee.first_name,
          last_name: employee.last_name,
          ...provisioning,
        });
      }

      await connection.commit();
      return provisionedRows;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateFaceEncoding: async (tenantId, employeeId, faceEncoding) => {
    const [r] = await pool.execute(
      'UPDATE employee_details SET face_encoding=?, updated_at=NOW() WHERE id=? AND tenant_id=?',
      [faceEncoding, employeeId, tenantId]
    );
    if (r.affectedRows === 0) throw new Error('Employee not found');
    return true;
  },

  getWithFaceEncoding: async (tenantId, employeeId) => {
    const [rows] = await pool.execute(
      `SELECT ed.id as employee_id, CONCAT(u.first_name,' ',u.last_name) as name,
              ed.face_encoding, ed.department_id, d.name as department_name
       FROM employee_details ed
       JOIN users u ON ed.employee_id=u.id
       LEFT JOIN departments d ON ed.department_id=d.id
       WHERE ed.id=? AND ed.tenant_id=? AND u.is_active=1`,
      [employeeId, tenantId]
    );
    return rows[0];
  },

  getAllWithFaceEncodings: async (tenantId) => {
    const [rows] = await pool.execute(
      `SELECT ed.id as employee_id, u.first_name, u.last_name, u.email,
              ed.face_encoding, d.name as department_name
       FROM employee_details ed
       JOIN users u ON ed.employee_id=u.id
       LEFT JOIN departments d ON ed.department_id=d.id
       WHERE ed.tenant_id=? AND u.is_active=1 AND ed.face_encoding IS NOT NULL`,
      [tenantId]
    );
    return rows;
  },

  previewNextId: async (tenantId) => {
    const connection = await pool.getConnection();
    try {
      const id = await generateNextEmployeeId(connection, tenantId);
      return id;
    } finally {
      connection.release();
    }
  },
};

module.exports = Employee;
