export const MODULE_KEYS = {
  HR: 'hr',
  HR_DASHBOARD: 'hr_dashboard',
  EMPLOYEE_MANAGEMENT: 'employee_management',
  ATTENDANCE_MANAGEMENT: 'attendance_management',
  LEAVE_MANAGEMENT: 'leave_management',
  SHIFT_MANAGEMENT: 'shift_management',
  SALARY_MANAGEMENT: 'salary_management',
  HOLIDAY_MANAGEMENT: 'holiday_management',
  AI_DOCUMENT_GENERATOR: 'ai_document_generator',
  OFFER_LETTERS: 'offer_letters',
  DECLARATIONS: 'declarations',
  RESIGNATIONS: 'resignations',
  SALARY_SLIPS: 'salary_slips',
  EXPERIENCE_LETTERS: 'experience_letters',
  INCREMENT_LETTERS: 'increment_letters',
  ACCOUNTS: 'accounts',
  BILLING_MANAGEMENT: 'billing_management',
  DELIVERY_MANAGEMENT: 'delivery_management',
  EXPENSE_MANAGEMENT: 'expense_management',
  BILLING_SETTINGS: 'billing_settings',
  QUOTATION_MANAGEMENT: 'quotation_management',
  SERVICES: 'services',
  SERVICE_MANAGEMENT: 'service_management',
  PTTM: 'pttm',
  EMPLOYEE_ATTENDANCE: 'employee_attendance',
  EMPLOYEE_EXPENSE: 'employee_expense',
  EMPLOYEE_PROJECTS: 'employee_projects',
};

export const MODULE_PARENT_KEYS = {
  [MODULE_KEYS.HR_DASHBOARD]: MODULE_KEYS.HR,
  [MODULE_KEYS.EMPLOYEE_MANAGEMENT]: MODULE_KEYS.HR,
  [MODULE_KEYS.ATTENDANCE_MANAGEMENT]: MODULE_KEYS.HR,
  [MODULE_KEYS.LEAVE_MANAGEMENT]: MODULE_KEYS.HR,
  [MODULE_KEYS.SHIFT_MANAGEMENT]: MODULE_KEYS.HR,
  [MODULE_KEYS.SALARY_MANAGEMENT]: MODULE_KEYS.HR,
  [MODULE_KEYS.HOLIDAY_MANAGEMENT]: MODULE_KEYS.HR,
  [MODULE_KEYS.AI_DOCUMENT_GENERATOR]: MODULE_KEYS.HR,
  [MODULE_KEYS.OFFER_LETTERS]: MODULE_KEYS.HR,
  [MODULE_KEYS.DECLARATIONS]: MODULE_KEYS.HR,
  [MODULE_KEYS.RESIGNATIONS]: MODULE_KEYS.HR,
  [MODULE_KEYS.SALARY_SLIPS]: MODULE_KEYS.HR,
  [MODULE_KEYS.EXPERIENCE_LETTERS]: MODULE_KEYS.HR,
  [MODULE_KEYS.INCREMENT_LETTERS]: MODULE_KEYS.HR,
  [MODULE_KEYS.BILLING_MANAGEMENT]: MODULE_KEYS.ACCOUNTS,
  [MODULE_KEYS.DELIVERY_MANAGEMENT]: MODULE_KEYS.ACCOUNTS,
  [MODULE_KEYS.EXPENSE_MANAGEMENT]: MODULE_KEYS.ACCOUNTS,
  [MODULE_KEYS.BILLING_SETTINGS]: MODULE_KEYS.ACCOUNTS,
  [MODULE_KEYS.QUOTATION_MANAGEMENT]: MODULE_KEYS.ACCOUNTS,
  [MODULE_KEYS.SERVICE_MANAGEMENT]: MODULE_KEYS.SERVICES,
};

export const MODULE_GROUPS = {
  [MODULE_KEYS.HR]: [
    MODULE_KEYS.HR,
    MODULE_KEYS.HR_DASHBOARD,
    MODULE_KEYS.EMPLOYEE_MANAGEMENT,
    MODULE_KEYS.ATTENDANCE_MANAGEMENT,
    MODULE_KEYS.LEAVE_MANAGEMENT,
    MODULE_KEYS.SHIFT_MANAGEMENT,
    MODULE_KEYS.SALARY_MANAGEMENT,
    MODULE_KEYS.HOLIDAY_MANAGEMENT,
    MODULE_KEYS.AI_DOCUMENT_GENERATOR,
    MODULE_KEYS.OFFER_LETTERS,
    MODULE_KEYS.DECLARATIONS,
    MODULE_KEYS.RESIGNATIONS,
    MODULE_KEYS.SALARY_SLIPS,
    MODULE_KEYS.EXPERIENCE_LETTERS,
    MODULE_KEYS.INCREMENT_LETTERS,
  ],
  [MODULE_KEYS.ACCOUNTS]: [
    MODULE_KEYS.ACCOUNTS,
    MODULE_KEYS.BILLING_MANAGEMENT,
    MODULE_KEYS.DELIVERY_MANAGEMENT,
    MODULE_KEYS.EXPENSE_MANAGEMENT,
    MODULE_KEYS.BILLING_SETTINGS,
    MODULE_KEYS.QUOTATION_MANAGEMENT,
  ],
  [MODULE_KEYS.SERVICES]: [
    MODULE_KEYS.SERVICES,
    MODULE_KEYS.SERVICE_MANAGEMENT,
  ],
};

const DEFAULT_EMPLOYEE_MODULES = [
  MODULE_KEYS.EMPLOYEE_ATTENDANCE,
  MODULE_KEYS.EMPLOYEE_EXPENSE,
  MODULE_KEYS.EMPLOYEE_PROJECTS,
];

const accessMeetsLevel = (access, minLevel) => {
  if (!access || access === 'none') return false;
  if (minLevel === 'read') return access === 'read' || access === 'write';
  if (minLevel === 'write') return access === 'write';
  return false;
};

const findUserModule = (user, moduleKey) =>
  (user.modules || []).find((m) => m.module_key === moduleKey);

export const hasModuleAccess = (user, moduleKey, minLevel = 'read') => {
  if (!user) return false;
  if (user.position === 'admin') return true;
  if (DEFAULT_EMPLOYEE_MODULES.includes(moduleKey)) return true;

  const directModule = findUserModule(user, moduleKey);
  if (accessMeetsLevel(directModule?.access, minLevel)) return true;

  const parentKey = MODULE_PARENT_KEYS[moduleKey];
  if (parentKey) {
    const parentModule = findUserModule(user, parentKey);
    if (accessMeetsLevel(parentModule?.access, minLevel)) return true;
  }

  const childKeys = MODULE_GROUPS[moduleKey] || [];
  return childKeys.some((childKey) => {
    const childModule = findUserModule(user, childKey);
    return accessMeetsLevel(childModule?.access, minLevel);
  });
};

export const canWriteModule = (user, moduleKey) =>
  hasModuleAccess(user, moduleKey, 'write');

export const getModuleAccessLevel = (user, moduleKey) => {
  if (user?.position === 'admin') return 'write';
  if (DEFAULT_EMPLOYEE_MODULES.includes(moduleKey)) return 'write';
  const mod = (user?.modules || []).find((m) => m.module_key === moduleKey);
  if (mod?.access && mod.access !== 'none') return mod.access;
  const parentKey = MODULE_PARENT_KEYS[moduleKey];
  if (!parentKey) return mod?.access || 'none';
  const parent = (user?.modules || []).find((m) => m.module_key === parentKey);
  return parent?.access || mod?.access || 'none';
};
