const { query } = require('../config/db');
const sendResponse = require('../utils/response');

const accessMeetsLevel = (access, minLevel) => {
  if (!access || access === 'none') return false;
  if (minLevel === 'read') return access === 'read' || access === 'write';
  if (minLevel === 'write') return access === 'write';
  return false;
};

// Roles that behave identically to 'employee' for access-control purposes.
// intern and consultant get same restrictions as employee (extra profile fields only).
// hr, team_lead, pm are NOT here — they are also employees and can use the employee portal.
const EMPLOYEE_LIKE_ROLES = new Set(['employee', 'intern', 'consultant', 'user']);

// Modules that employees (and employee-like roles) are never allowed to access,
// even if they somehow have entries in user_module_access.
const EMPLOYEE_FORBIDDEN_MODULES = new Set([
  'hr', 'hr_dashboard', 'employee_management', 'attendance_management',
  'leave_management', 'shift_management', 'salary_management', 'holiday_management',
  'ai_document_generator', 'offer_letters', 'declarations', 'resignations',
  'salary_slips', 'experience_letters', 'increment_letters',
  'accounts', 'billing_management', 'delivery_management', 'expense_management',
  'billing_settings', 'quotation_management', 'services', 'service_management',
  'lead_management', 'recruitment', 'payroll_compliance', 'onboarding',
  'declarations', 'asset_management', 'grievance',
]);

// Modules accessible to team_lead and pm in addition to normal employee modules.
const TEAM_LEAD_ALLOWED_MODULES = new Set([
  'work_reports', 'mom_management', 'performance_management',
  'project_management', 'attendance_management', 'leave_management',
  'pttm',
]);

// PM role gets same pre-approved module access as team_lead
const PM_ALLOWED_MODULES = new Set([
  'work_reports', 'mom_management', 'performance_management',
  'project_management', 'attendance_management', 'leave_management',
  'pttm',
]);

const MODULE_PARENT_KEYS = {
  hr_dashboard: 'hr',
  employee_management: 'hr',
  attendance_management: 'hr',
  leave_management: 'hr',
  shift_management: 'hr',
  salary_management: 'hr',
  holiday_management: 'hr',
  ai_document_generator: 'hr',
  offer_letters: 'hr',
  declarations: 'hr',
  resignations: 'hr',
  salary_slips: 'hr',
  experience_letters: 'hr',
  increment_letters: 'hr',
  performance_management: 'hr',
  mom_management: 'hr',
  work_reports: 'hr',
  billing_management: 'accounts',
  delivery_management: 'accounts',
  expense_management: 'accounts',
  billing_settings: 'accounts',
  quotation_management: 'accounts',
  service_management: 'services',
};

const getModuleKeysToCheck = (moduleKey) => {
  const keys = Array.isArray(moduleKey) ? moduleKey : [moduleKey];
  return [...new Set(keys.flatMap((key) => [key, MODULE_PARENT_KEYS[key]].filter(Boolean)))];
};

const requireModuleAccess = (moduleKey, minLevel = 'read') => async (req, res, next) => {
  try {
    const role = req.user?.role || req.user?.position || req.user?.role_name;
    if (role === 'admin') return next();

    // Normalize intern/consultant/user → employee for forbidden-module enforcement
    const effectiveRole = EMPLOYEE_LIKE_ROLES.has(role) ? 'employee' : role;

    // Hard-block employee-like roles from admin-only modules at the API level
    if (effectiveRole === 'employee') {
      const keysToCheck = Array.isArray(moduleKey) ? moduleKey : [moduleKey];
      const blocked = keysToCheck.some((k) => EMPLOYEE_FORBIDDEN_MODULES.has(k));
      if (blocked) {
        return sendResponse(res, 403, false, 'Access denied: insufficient role', {
          module_key: Array.isArray(moduleKey) ? moduleKey.join(',') : moduleKey,
        });
      }
    }

    // team_lead: anyone with is_team_lead=true gets access to TL modules without DB lookup
    const isTeamLead = req.user?.is_team_lead === true || req.user?.is_team_lead === 1 || role === 'team_lead';
    if (isTeamLead) {
      const keysToCheck = Array.isArray(moduleKey) ? moduleKey : [moduleKey];
      const allAllowed = keysToCheck.every((k) => TEAM_LEAD_ALLOWED_MODULES.has(k));
      if (allAllowed) return next();
    }
    if (role === 'pm') {
      const keysToCheck = Array.isArray(moduleKey) ? moduleKey : [moduleKey];
      const allAllowed = keysToCheck.every((k) => PM_ALLOWED_MODULES.has(k));
      if (allAllowed) return next();
    }

    const userId = req.user?.id || req.user?.user_id;
    const tenantId = req.tenantId || req.user?.tenant_id;

    if (!userId || !tenantId) {
      return sendResponse(res, 401, false, 'Unauthorized', null);
    }

    const moduleKeys = getModuleKeysToCheck(moduleKey);
    const placeholders = moduleKeys.map(() => '?').join(', ');
    const rows = await query(
      `SELECT access_level
       FROM user_module_access
       WHERE user_id = ? AND tenant_id = ? AND module_key IN (${placeholders})`,
      [userId, tenantId, ...moduleKeys]
    );

    const hasAccess = rows.some((row) => accessMeetsLevel(row.access_level, minLevel));
    if (!hasAccess) {
      return sendResponse(res, 403, false, 'Module access required', {
        module_key: Array.isArray(moduleKey) ? moduleKey.join(',') : moduleKey,
        required_access: minLevel,
      });
    }

    return next();
  } catch (error) {
    console.error('Module access check error:', error);
    return sendResponse(res, 500, false, 'Failed to verify module access', null);
  }
};

module.exports = requireModuleAccess;
