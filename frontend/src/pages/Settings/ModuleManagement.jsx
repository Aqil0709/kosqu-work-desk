import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { moduleAccessAPI } from '../../services/moduleAccessAPI';
import './ModuleManagement.css';

const ACCESS_OPTIONS = [
  { value: 'write', label: 'Read & Write' },
  { value: 'read', label: 'Read Only' },
  { value: 'none', label: 'No Access' },
];

// Modules that employees can never be granted -- mirrors backend EMPLOYEE_FORBIDDEN_MODULES
const EMPLOYEE_FORBIDDEN_MODULES = new Set([
  'hr', 'hr_dashboard', 'employee_management', 'attendance_management',
  'leave_management', 'shift_management', 'salary_management', 'holiday_management',
  'ai_document_generator', 'offer_letters', 'declarations', 'resignations',
  'salary_slips', 'experience_letters', 'increment_letters',
  'accounts', 'billing_management', 'delivery_management', 'expense_management',
  'billing_settings', 'quotation_management', 'services', 'service_management',
]);

const MODULE_GROUPS = [
  {
    title: 'HR Module',
    keys: [
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
    ],
  },
  {
    title: 'Accounts Module',
    keys: [
      'accounts',
      'billing_management',
      'delivery_management',
      'expense_management',
      'billing_settings',
      'quotation_management',
    ],
  },
  { title: 'Services', keys: ['services', 'service_management'] },
  { title: 'Planning & Tasks', keys: ['pttm'] },
  { title: 'Employee Self Service', keys: ['employee_attendance', 'employee_expense', 'employee_projects'] },
];

const formatLastActive = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString();
};

const groupModules = (modules) => {
  const moduleMap = new Map(modules.map((mod) => [mod.module_key, mod]));
  const usedKeys = new Set();

  const grouped = MODULE_GROUPS
    .map((group) => {
      const groupModulesList = group.keys
        .map((key) => moduleMap.get(key))
        .filter(Boolean);
      groupModulesList.forEach((mod) => usedKeys.add(mod.module_key));
      return { ...group, modules: groupModulesList };
    })
    .filter((group) => group.modules.length > 0);

  const otherModules = modules.filter((mod) => !usedKeys.has(mod.module_key));
  if (otherModules.length > 0) grouped.push({ title: 'Other Modules', modules: otherModules });

  return grouped;
};

const getAccessSummary = (user) => {
  if (user.system_role === 'admin') return 'Full access';
  const enabled = Object.values(user.module_access || {})
    .filter((level) => level && level !== 'none').length;
  if (enabled === 0) return 'No modules';
  return `${enabled} module${enabled === 1 ? '' : 's'}`;
};

const getModuleGroupTitle = (moduleKey) =>
  MODULE_GROUPS.find((group) => group.keys.includes(moduleKey))?.title || '';

const ModuleManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [moduleAccess, setModuleAccess] = useState([]);
  const [saving, setSaving] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await moduleAccessAPI.listUsers();
      setUsers(response.data?.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openManageModal = async (user) => {
    setSelectedUser(user);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const response = await moduleAccessAPI.getUserAccess(user.id);
      const data = response.data?.data;
      setModuleAccess(data?.modules || []);
    } catch (err) {
      console.error('Failed to load access:', err);
      setError('Failed to load module access for this user.');
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setModuleAccess([]);
    setModuleSearch('');
  };

  const handleAccessChange = (moduleKey, access) => {
    setModuleAccess((prev) =>
      prev.map((m) =>
        m.module_key === moduleKey ? { ...m, access } : m
      )
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await moduleAccessAPI.updateUserAccess(
        selectedUser.id,
        moduleAccess.map((m) => ({
          module_key: m.module_key,
          access: m.access,
        }))
      );
      await fetchUsers();
      closeModal();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save module access.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const searchableText = [
        user.first_name,
        user.last_name,
        user.email,
        user.job_position,
        user.system_role,
        getAccessSummary(user),
        ...Object.keys(user.module_access || {}),
        ...Object.values(user.module_access || {}),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [userSearch, users]);

  const filteredModuleAccess = useMemo(() => {
    const query = moduleSearch.trim().toLowerCase();
    if (!query) return moduleAccess;

    return moduleAccess.filter((mod) => {
      const searchableText = [
        mod.name,
        mod.module_key,
        mod.access,
        getModuleGroupTitle(mod.module_key),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [moduleAccess, moduleSearch]);

  const groupedModuleAccess = groupModules(filteredModuleAccess);

  // ── Role Defaults state ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'
  const [roleTab, setRoleTab] = useState('hr');
  const [roleModules, setRoleModules] = useState({});  // { module_key: 'read'|'write'|'none' }
  const [roleApplying, setRoleApplying] = useState(false);
  const [roleMsg, setRoleMsg] = useState('');

  const ROLE_PRESETS = {
    hr: {
      hr: 'write', hr_dashboard: 'read', employee_management: 'write',
      attendance_management: 'write', leave_management: 'write', shift_management: 'read',
      salary_management: 'write', holiday_management: 'write', ai_document_generator: 'write',
      offer_letters: 'write', declarations: 'write', resignations: 'write',
      salary_slips: 'write', experience_letters: 'write', increment_letters: 'write',
      performance_management: 'write', mom_management: 'write', work_reports: 'read',
      onboarding: 'write', grievance: 'write', recruitment: 'write',
    },
    team_lead: {
      work_reports: 'write', mom_management: 'read', performance_management: 'read',
      project_management: 'read', attendance_management: 'read', leave_management: 'read',
    },
    employee: {
      work_reports: 'write', mom_management: 'read', grievance: 'write',
    },
  };

  const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.keys);

  const applyRoleDefaults = async () => {
    setRoleApplying(true);
    setRoleMsg('');
    try {
      const preset = ROLE_PRESETS[roleTab] || {};
      const modules = ALL_MODULES.map(key => ({ module_key: key, access: preset[key] || 'none' }));
      const res = await moduleAccessAPI.assignRoleDefaults(roleTab, modules);
      const count = res.data?.data?.updated || 0;
      setRoleMsg(`✓ Applied to ${count} user(s) with role '${roleTab}'`);
      await fetchUsers();
    } catch (err) {
      setRoleMsg('✗ ' + (err.response?.data?.message || 'Failed to apply'));
    } finally {
      setRoleApplying(false);
    }
  };

  const handleRoleModuleChange = (key, val) => {
    setRoleModules(prev => ({ ...prev, [key]: val }));
  };

  const loadRolePreset = () => {
    setRoleModules(ROLE_PRESETS[roleTab] || {});
    setRoleMsg('');
  };

  // Load preset when role tab changes
  const handleRoleTabChange = (r) => { setRoleTab(r); setRoleModules(ROLE_PRESETS[r] || {}); setRoleMsg(''); };

  return (
    <div className="module-management">
      <div className="module-management-header">
        <div>
          <h2>Module Management</h2>
          <p className="module-management-subtitle">
            Manage module permissions by user or apply defaults by role.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button"
            className={`mm-refresh-btn${activeTab === 'users' ? ' mm-tab-active' : ''}`}
            onClick={() => setActiveTab('users')}>
            By User
          </button>
          <button type="button"
            className={`mm-refresh-btn${activeTab === 'roles' ? ' mm-tab-active' : ''}`}
            onClick={() => { setActiveTab('roles'); loadRolePreset(); }}>
            Role Defaults
          </button>
          {activeTab === 'users' && (
            <button type="button" className="mm-refresh-btn" onClick={fetchUsers}>Refresh</button>
          )}
        </div>
      </div>

      {activeTab === 'roles' && (
        <div className="mm-table-wrap glass-form" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: 'var(--theme-text-muted)', marginBottom: 12 }}>
              Select a role and configure default module access. Click "Apply to All" to update every user with that role.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['hr', 'team_lead', 'employee'].map(r => (
                <button key={r} type="button"
                  onClick={() => handleRoleTabChange(r)}
                  style={{
                    padding: '6px 16px', borderRadius: 6, border: '1px solid var(--theme-border)',
                    background: roleTab === r ? 'var(--color-primary)' : 'var(--card-bg)',
                    color: roleTab === r ? '#fff' : 'var(--theme-text)', cursor: 'pointer',
                    fontWeight: roleTab === r ? 600 : 400,
                  }}>
                  {r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {MODULE_GROUPS.map(group => (
            <div key={group.title} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: 'var(--theme-text-strong)', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {group.title}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {group.keys.map(key => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--table-header-bg)', borderRadius: 6, padding: '8px 12px', border: '1px solid var(--theme-border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--theme-text)' }}>{key.replace(/_/g, ' ')}</span>
                    <select
                      value={roleModules[key] || 'none'}
                      onChange={e => handleRoleModuleChange(key, e.target.value)}
                      style={{ background: 'var(--input-bg)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>
                      {ACCESS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button type="button" onClick={applyRoleDefaults} disabled={roleApplying}
              style={{ padding: '8px 20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: roleApplying ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              {roleApplying ? 'Applying...' : `Apply to All '${roleTab.replace('_', ' ')}' Users`}
            </button>
            {roleMsg && <span style={{ fontSize: 13, color: roleMsg.startsWith('✓') ? 'var(--color-success)' : 'var(--color-danger)' }}>{roleMsg}</span>}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
      <>
      {error && <div className="mm-error">{error}</div>}

      <div className="mm-table-wrap glass-form">
        <div className="mm-table-toolbar">
          <input
            type="search"
            className="mm-search-input"
            placeholder="Search users, email, role, module..."
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
          />
          <span className="mm-result-count">
            {filteredUsers.length} of {users.length} users
          </span>
        </div>
        {loading ? (
          <p className="mm-loading">Loading users...</p>
        ) : (
          <table className="mm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Position</th>
                <th>Access</th>
                <th>Last Active</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="mm-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.first_name} {user.last_name}
                      {user.system_role === 'admin' && (
                        <span className="mm-badge-admin">Admin</span>
                      )}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.job_position}</td>
                    <td>
                      <span className="mm-access-summary">{getAccessSummary(user)}</span>
                    </td>
                    <td>{formatLastActive(user.last_active_at)}</td>
                    <td>
                      {user.system_role === 'admin' ? (
                        <span className="mm-full-access">Full access</span>
                      ) : (
                        <button
                          type="button"
                          className="mm-manage-btn"
                          onClick={() => openManageModal(user)}
                        >
                          Manage Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="mm-modal-overlay" onClick={closeModal} role="presentation">
          <div
            className="mm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="mm-modal-title"
          >
            <div className="mm-modal-header">
              <h3 id="mm-modal-title">
                Manage Module Access
                {selectedUser && (
                  <span className="mm-modal-user">
                    -- {selectedUser.first_name} {selectedUser.last_name}
                  </span>
                )}
              </h3>
              <button type="button" className="mm-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            {modalLoading ? (
              <p className="mm-loading">Loading access...</p>
            ) : (
              <>
                <div className="mm-modal-search">
                  <input
                    type="search"
                    className="mm-search-input"
                    placeholder="Search modules..."
                    value={moduleSearch}
                    onChange={(event) => setModuleSearch(event.target.value)}
                  />
                  <span className="mm-result-count">
                    {filteredModuleAccess.length} of {moduleAccess.length} modules
                  </span>
                </div>
                <div className="mm-modal-modules">
                  {groupedModuleAccess.length === 0 ? (
                    <p className="mm-empty">No modules found.</p>
                  ) : (
                    groupedModuleAccess.map((group) => (
                      <section key={group.title} className="mm-module-group">
                        <h4>{group.title}</h4>
                        <div className="mm-module-group-list">
                          {group.modules.map((mod) => {
                            const isEmployeeLocked =
                              selectedUser?.system_role === 'employee' &&
                              EMPLOYEE_FORBIDDEN_MODULES.has(mod.module_key);
                            return (
                              <div
                                key={mod.module_key}
                                className="mm-module-row"
                                title={isEmployeeLocked ? 'Not available for employee role' : undefined}
                                style={isEmployeeLocked ? { opacity: 0.45 } : undefined}
                              >
                                <span className="mm-module-name">
                                  {mod.name}
                                  {isEmployeeLocked && (
                                    <span style={{ marginLeft: 6, fontSize: 11, color: '#94a3b8' }}>
                                      (employee restricted)
                                    </span>
                                  )}
                                </span>
                                <div className="mm-access-options">
                                  {ACCESS_OPTIONS.map((opt) => (
                                    <label
                                      key={opt.value}
                                      className="mm-access-label"
                                      style={isEmployeeLocked ? { pointerEvents: 'none' } : undefined}
                                    >
                                      <input
                                        type="radio"
                                        name={`access-${mod.module_key}`}
                                        value={opt.value}
                                        checked={isEmployeeLocked ? opt.value === 'none' : mod.access === opt.value}
                                        onChange={() =>
                                          !isEmployeeLocked && handleAccessChange(mod.module_key, opt.value)
                                        }
                                        disabled={isEmployeeLocked}
                                      />
                                      {opt.label}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))
                  )}
                </div>

                <div className="mm-modal-actions">
                  <button type="button" className="mm-cancel-btn" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="mm-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Access'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default ModuleManagement;
