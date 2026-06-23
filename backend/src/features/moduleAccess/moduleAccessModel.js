const { query } = require('../../config/db');
const { addColumnIfMissing, addForeignKeyIfMissing, addIndexIfMissing } = require('../../utils/schemaHelpers');

// Module keys that only admin/hr roles should ever possess.
// Employees (position === 'employee') are auto-stripped of these on every login/profile refresh.
const EMPLOYEE_FORBIDDEN_MODULES = [
  'hr',
  'hr_dashboard',
  'employee_management',
  'attendance_management',
  'leave_management',
  'shift_management',
  'salary_management',
  'holiday_management',
  'ai_document_generator',
  'offer_letters',
  'declarations',
  'resignations',
  'salary_slips',
  'experience_letters',
  'increment_letters',
  'accounts',
  'billing_management',
  'delivery_management',
  'expense_management',
  'billing_settings',
  'quotation_management',
  'services',
  'service_management',
];

const MODULE_DEFINITIONS = [
  ['hr', 'HR Module', 10],
  ['hr_dashboard', 'HR Dashboard', 11],
  ['employee_management', 'Employee Management', 12],
  ['attendance_management', 'Attendance Management', 13],
  ['leave_management', 'Leave Management', 14],
  ['shift_management', 'Shift Management', 15],
  ['salary_management', 'Salary Management', 16],
  ['holiday_management', 'Holiday Management', 17],
  ['ai_document_generator', 'AI Document Generator', 18],
  ['offer_letters', 'Offer Letters', 19],
  ['declarations', 'Declaration Forms', 20],
  ['resignations', 'Resignation Requests', 21],
  ['salary_slips', 'Salary Slips', 22],
  ['experience_letters', 'Experience Letters', 23],
  ['increment_letters', 'Increment Letters', 24],
  ['accounts', 'Accounts Module', 40],
  ['billing_management', 'Billing Management', 41],
  ['delivery_management', 'Delivery Management', 42],
  ['expense_management', 'Expense Management', 43],
  ['billing_settings', 'Billing Settings', 44],
  ['quotation_management', 'Quotation Management', 45],
  ['services', 'Services Module', 60],
  ['service_management', 'Service Management', 61],
  ['performance_management', 'Performance Management', 25],
  ['mom_management', 'Minutes of Meeting', 26],
  ['work_reports', 'Work Reports', 27],
  ['pttm', 'PTTM', 80],
  ['employee_attendance', 'My Attendance & Leave', 100],
  ['employee_expense', 'My Expense', 101],
  ['employee_projects', 'My Projects & Tasks', 102],
];

const MANAGEABLE_MODULES = MODULE_DEFINITIONS.map(([moduleKey]) => moduleKey);

const moduleAccessModel = {
  async ensureSchema() {
    await addColumnIfMissing('users', 'last_active_at', 'last_active_at DATETIME NULL');

    await query(`
      CREATE TABLE IF NOT EXISTS modules (
        id INT NOT NULL AUTO_INCREMENT,
        module_key VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uk_module_key (module_key)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_module_access (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        tenant_id INT NOT NULL,
        module_key VARCHAR(50) NOT NULL,
        access_level ENUM('none', 'read', 'write') NOT NULL DEFAULT 'none',
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_user_module (user_id, module_key),
        KEY idx_tenant_user (tenant_id, user_id)
      )
    `);

    await addIndexIfMissing('user_module_access', 'idx_user_module_module', 'INDEX idx_user_module_module (module_key)');
    await addIndexIfMissing('user_module_access', 'idx_user_module_updated_by', 'INDEX idx_user_module_updated_by (updated_by)');

    await addForeignKeyIfMissing(
      'user_module_access',
      'fk_user_module_access_user',
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    );
    await addForeignKeyIfMissing(
      'user_module_access',
      'fk_user_module_access_tenant',
      'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE'
    );
    await addForeignKeyIfMissing(
      'user_module_access',
      'fk_user_module_access_module',
      'FOREIGN KEY (module_key) REFERENCES modules(module_key) ON DELETE CASCADE'
    );
    await addForeignKeyIfMissing(
      'user_module_access',
      'fk_user_module_access_updated_by',
      'FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL'
    );

    for (const [moduleKey, name, sortOrder] of MODULE_DEFINITIONS) {
      await query(
        `INSERT INTO modules (module_key, name, sort_order)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)`,
        [moduleKey, name, sortOrder]
      );
    }

    await addForeignKeyIfMissing(
      'user_module_access',
      'fk_user_module_access_module',
      'FOREIGN KEY (module_key) REFERENCES modules(module_key) ON DELETE CASCADE'
    );
  },

  async updateLastActive(userId) {
    await query('UPDATE users SET last_active_at = NOW() WHERE id = ?', [userId]);
  },

  async getModules() {
    const placeholders = MANAGEABLE_MODULES.map(() => '?').join(', ');
    const rows = await query(
      `SELECT module_key, name, sort_order FROM modules
       WHERE module_key IN (${placeholders})
       ORDER BY sort_order`,
      MANAGEABLE_MODULES
    );
    return rows;
  },

  async getUserAccessMap(userId, tenantId) {
    const rows = await query(
      `SELECT module_key, access_level FROM user_module_access
       WHERE user_id = ? AND tenant_id = ?`,
      [userId, tenantId]
    );
    const map = {};
    for (const row of rows) {
      map[row.module_key] = row.access_level;
    }
    return map;
  },

  async getModulesForUser(userId, tenantId, isAdmin, userPosition) {
    const modules = await this.getModules();
    if (isAdmin) {
      return modules.map((m) => ({
        module_key: m.module_key,
        name: m.name,
        access: 'write',
      }));
    }

    const accessMap = await this.getUserAccessMap(userId, tenantId);

    const isEmployee = userPosition === 'employee';
    if (isEmployee) {
      // Auto-cleanup: strip any forbidden modules from the DB so the bad data doesn't linger.
      const forbiddenGranted = EMPLOYEE_FORBIDDEN_MODULES.filter((k) => accessMap[k] && accessMap[k] !== 'none');
      if (forbiddenGranted.length > 0) {
        const placeholders = forbiddenGranted.map(() => '?').join(', ');
        await query(
          `DELETE FROM user_module_access
           WHERE user_id = ? AND tenant_id = ? AND module_key IN (${placeholders})`,
          [userId, tenantId, ...forbiddenGranted]
        ).catch(() => {});
        for (const k of forbiddenGranted) delete accessMap[k];
      }
    }

    return modules
      .map((m) => ({
        module_key: m.module_key,
        name: m.name,
        access: accessMap[m.module_key] || 'none',
      }))
      .filter((m) => m.access !== 'none');
  },

  async listUsersWithAccess(tenantId) {
    const users = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.position AS system_role,
              u.last_active_at, u.is_active,
              ed.position AS job_position,
              ed.status AS employee_status
       FROM users u
       LEFT JOIN employee_details ed ON ed.employee_id = u.id
       WHERE u.tenant_id = ?
         AND COALESCE(u.is_active, 1) = 1
         AND (ed.id IS NULL OR COALESCE(ed.status, 'active') <> 'inactive')
       ORDER BY u.first_name, u.last_name`,
      [tenantId]
    );

    const accessRows = await query(
      `SELECT user_id, module_key, access_level
       FROM user_module_access
       WHERE tenant_id = ?`,
      [tenantId]
    );

    const accessByUser = {};
    for (const row of accessRows) {
      if (!accessByUser[row.user_id]) accessByUser[row.user_id] = {};
      accessByUser[row.user_id][row.module_key] = row.access_level;
    }

    return users.map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      system_role: u.system_role,
      job_position: u.job_position || '—',
      last_active_at: u.last_active_at,
      is_active: u.is_active,
      module_access: accessByUser[u.id] || {},
    }));
  },

  async getUserModuleAccess(userId, tenantId) {
    const userRows = await query(
      `SELECT u.id, u.position
       FROM users u
       LEFT JOIN employee_details ed ON ed.employee_id = u.id
       WHERE u.id = ?
         AND u.tenant_id = ?
         AND COALESCE(u.is_active, 1) = 1
         AND (ed.id IS NULL OR COALESCE(ed.status, 'active') <> 'inactive')`,
      [userId, tenantId]
    );
    if (userRows.length === 0) return null;

    const position = userRows[0].position;
    const isAdmin = position === 'admin';
    const isEmployee = position === 'employee';

    const modules = await this.getModules();
    const accessMap = await this.getUserAccessMap(userId, tenantId);

    return {
      user_id: userId,
      position,
      is_admin: isAdmin,
      modules: modules.map((m) => {
        if (isAdmin) return { module_key: m.module_key, name: m.name, access: 'write' };
        if (isEmployee && EMPLOYEE_FORBIDDEN_MODULES.includes(m.module_key)) {
          return { module_key: m.module_key, name: m.name, access: 'none' };
        }
        return { module_key: m.module_key, name: m.name, access: accessMap[m.module_key] || 'none' };
      }),
    };
  },

  async setUserModuleAccess(userId, tenantId, moduleAccessList, updatedBy, targetPosition) {
    const isEmployee = targetPosition === 'employee';
    for (const item of moduleAccessList) {
      const { module_key, access } = item;
      if (!MANAGEABLE_MODULES.includes(module_key)) continue;
      if (!['none', 'read', 'write'].includes(access)) continue;
      if (isEmployee && access !== 'none' && EMPLOYEE_FORBIDDEN_MODULES.includes(module_key)) continue;

      if (access === 'none') {
        await query(
          `DELETE FROM user_module_access WHERE user_id = ? AND tenant_id = ? AND module_key = ?`,
          [userId, tenantId, module_key]
        );
      } else {
        await query(
          `INSERT INTO user_module_access (user_id, tenant_id, module_key, access_level, updated_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE access_level = VALUES(access_level), updated_by = VALUES(updated_by)`,
          [userId, tenantId, module_key, access, updatedBy]
        );
      }
    }
  },
};

module.exports = moduleAccessModel;
