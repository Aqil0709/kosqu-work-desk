const Leave = require('../leave/leaveModel');

const toDateString = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const getDepartmentName = async (connection, tenantId, departmentId) => {
  if (!departmentId) return null;
  const [[row]] = await connection.execute(
    'SELECT name FROM departments WHERE id = ? AND tenant_id = ? LIMIT 1',
    [departmentId, tenantId]
  );
  return row?.name || null;
};

const getOnboardingTemplate = async (connection, tenantId, departmentName) => {
  const normalizedDepartment = String(departmentName || '').trim();
  const [rows] = await connection.execute(
    `SELECT id, name, department
     FROM onboarding_templates
     WHERE tenant_id = ?
       AND type = 'onboarding'
       AND is_active = 1
       AND (
         TRIM(COALESCE(department, '')) = ''
         OR LOWER(TRIM(department)) = LOWER(?)
       )
     ORDER BY
       CASE WHEN LOWER(TRIM(COALESCE(department, ''))) = LOWER(?) THEN 0 ELSE 1 END,
       id ASC
     LIMIT 1`,
    [tenantId, normalizedDepartment, normalizedDepartment]
  );

  return rows[0] || null;
};

const createOnboardingProcess = async (connection, {
  tenantId,
  userId,
  departmentId,
  joiningDate,
  createdBy,
}) => {
  const startDate = toDateString(joiningDate);
  const departmentName = await getDepartmentName(connection, tenantId, departmentId);
  const template = await getOnboardingTemplate(connection, tenantId, departmentName);

  const [processResult] = await connection.execute(
    `INSERT INTO onboarding_processes
      (tenant_id, employee_id, template_id, type, status, start_date, expected_end_date, notes, created_by)
     VALUES (?, ?, ?, 'onboarding', 'in_progress', ?, NULL, NULL, ?)`,
    [tenantId, userId, template?.id || null, startDate, createdBy || null]
  );

  let taskCount = 0;
  if (template?.id) {
    const [items] = await connection.execute(
      `SELECT title, description, assigned_to_role, due_days, sort_order
       FROM onboarding_template_items
       WHERE tenant_id = ? AND template_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [tenantId, template.id]
    );

    for (const item of items) {
      await connection.execute(
        `INSERT INTO onboarding_tasks
          (tenant_id, process_id, title, description, assigned_to_role, due_date, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          tenantId,
          processResult.insertId,
          item.title,
          item.description || null,
          item.assigned_to_role || 'hr',
          addDays(startDate, item.due_days || 0),
          item.sort_order || 0,
        ]
      );
    }
    taskCount = items.length;
  }

  return {
    onboarding_process_id: processResult.insertId,
    onboarding_template_id: template?.id || null,
    onboarding_task_count: taskCount,
  };
};

const provisionEmployeeRecords = async (connection, {
  tenantId,
  userId,
  employeeCode,
  departmentId,
  joiningDate,
  createdBy,
}) => {
  const year = Number(String(toDateString(joiningDate)).slice(0, 4));
  await Leave.initBalances(connection, tenantId, employeeCode, year);

  const [[leaveBalanceRow]] = await connection.execute(
    'SELECT COUNT(*) AS count FROM leave_balances WHERE tenant_id = ? AND employee_id = ? AND year = ?',
    [tenantId, employeeCode, year]
  );

  const onboarding = await createOnboardingProcess(connection, {
    tenantId,
    userId,
    departmentId,
    joiningDate,
    createdBy,
  });

  return {
    leave_balance_year: year,
    leave_balance_count: Number(leaveBalanceRow?.count || 0),
    ...onboarding,
  };
};

module.exports = {
  provisionEmployeeRecords,
};
