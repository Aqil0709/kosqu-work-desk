import { useState, useEffect } from 'react';
import api from '../../services/api';
import './WorkflowBuilder.css';

const MODULE_TYPES = [
  { value: 'leave',           label: 'Leave' },
  { value: 'wfh',             label: 'Work From Home' },
  { value: 'expense',         label: 'Expense Claim' },
  { value: 'attendance_reg',  label: 'Attendance Regularization' },
  { value: 'salary_revision', label: 'Salary Revision' },
  { value: 'recruitment_job', label: 'Job Posting (Recruitment)' },
  { value: 'candidate',       label: 'Candidate Approval' },
  { value: 'offer',           label: 'Offer Approval' },
  { value: 'asset_request',   label: 'Asset Request' },
  { value: 'asset_return',    label: 'Asset Return' },
  { value: 'project',         label: 'Project Approval' },
  { value: 'purchase',        label: 'Purchase Request' },
  { value: 'resignation',     label: 'Resignation' },
  { value: 'exit_clearance',  label: 'Exit Clearance' },
  { value: 'full_final',      label: 'Full & Final Settlement' },
  { value: 'training',        label: 'Training Approval' },
  { value: 'travel',          label: 'Travel Request' },
  { value: 'custom',          label: 'Custom Module' },
];

const APPROVER_TYPES = [
  { value: 'reporting_tl',    label: 'Reporting Team Lead' },
  { value: 'hr',              label: 'HR' },
  { value: 'admin',           label: 'Admin' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'client',          label: 'Client' },
  { value: 'role',            label: 'Specific Role' },
  { value: 'specific_user',   label: 'Specific User' },
  { value: 'dynamic_field',   label: 'From Request Data (Dynamic)' },
];

const STEP_TYPES = [
  { value: 'sequential',  label: 'Sequential (one after another)' },
  { value: 'parallel',    label: 'Parallel (simultaneous)' },
  { value: 'conditional', label: 'Conditional (skip if condition fails)' },
];

const emptyStep = () => ({
  step_order: 1,
  step_name: '',
  step_type: 'sequential',
  approver_type: 'reporting_tl',
  approver_role: '',
  approver_user_id: '',
  approver_field: '',
  parallel_quorum: 1,
  condition_field: '',
  condition_op: 'eq',
  condition_value: '',
  skip_if_no_approver: true,
  sla_hours: '',
  escalate_to_type: '',
  escalate_to_role: '',
  escalation_delay_hours: 24,
  reminder_hours: 4,
  auto_approve_hours: '',
  is_final_step: false,
  allow_send_back: false,
  require_remarks: false,
  require_attachment: false,
});

const emptyTemplate = () => ({
  module_type: 'leave',
  name: '',
  description: '',
  is_default: true,
  is_active: true,
  condition_field: '',
  condition_op: 'gte',
  condition_value: '',
  sort_order: 0,
  sla_hours: '',
  auto_approve_rule: null,
  steps: [{ ...emptyStep(), step_name: 'Team Lead Approval', step_order: 1 }],
});

export default function WorkflowBuilder({ onSaved }) {
  const [templates, setTemplates]   = useState([]);
  const [editing, setEditing]       = useState(null); // null = list view
  const [saving, setSaving]         = useState(false);
  const [filterModule, setFilterMod] = useState('all');
  const [users, setUsers]           = useState([]);

  useEffect(() => {
    loadTemplates();
    api.get('/employees').then(r => setUsers(r.data?.employees || [])).catch(() => {});
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/approvals/templates');
      setTemplates(res.data.templates || []);
    } catch { /* silent */ }
  };

  const startCreate = () => setEditing(emptyTemplate());

  const startEdit = async (id) => {
    try {
      const res = await api.get(`/approvals/templates/${id}`);
      setEditing({ ...res.data.template, steps: res.data.steps || [] });
    } catch { alert('Failed to load template'); }
  };

  const deleteTemplate = async (id, name) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/approvals/templates/${id}`);
      await loadTemplates();
    } catch (err) {
      alert(err?.response?.data?.message || 'Delete failed');
    }
  };

  const save = async () => {
    if (!editing.module_type || !editing.name.trim()) {
      alert('Module type and name are required.');
      return;
    }
    if (!editing.steps.length) {
      alert('At least one step is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...editing,
        steps: editing.steps.map(s => ({
          ...s,
          approver_user_id: s.approver_user_id ? Number(s.approver_user_id) : null,
          sla_hours: s.sla_hours ? Number(s.sla_hours) : null,
          auto_approve_hours: s.auto_approve_hours ? Number(s.auto_approve_hours) : null,
        })),
        sla_hours: editing.sla_hours ? Number(editing.sla_hours) : null,
      };
      if (editing.id) {
        await api.put(`/approvals/templates/${editing.id}`, payload);
      } else {
        await api.post('/approvals/templates', payload);
      }
      setEditing(null);
      await loadTemplates();
      onSaved?.();
    } catch (err) {
      alert(err?.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const addStep = () => {
    const maxOrder = editing.steps.length > 0
      ? Math.max(...editing.steps.map(s => s.step_order))
      : 0;
    setEditing(e => ({
      ...e,
      steps: [...e.steps, { ...emptyStep(), step_order: maxOrder + 1 }],
    }));
  };

  const removeStep = (idx) => {
    setEditing(e => ({ ...e, steps: e.steps.filter((_, i) => i !== idx) }));
  };

  const updateStep = (idx, field, value) => {
    setEditing(e => ({
      ...e,
      steps: e.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const moveStep = (idx, dir) => {
    const steps = [...editing.steps];
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    // Re-number step_order
    steps.forEach((s, i) => { s.step_order = i + 1; });
    setEditing(e => ({ ...e, steps }));
  };

  const filteredTemplates = filterModule === 'all'
    ? templates
    : templates.filter(t => t.module_type === filterModule);

  /* ── LIST VIEW ──────────────────────────────────────────────────────── */
  if (!editing) {
    return (
      <div className="wfb">
        <div className="wfb__header">
          <div>
            <h2>Approval Workflows</h2>
            <p className="wfb__subtitle">Configure approval chains for any module</p>
          </div>
          <button className="wfb__btn wfb__btn--primary" onClick={startCreate}>
            + New Workflow
          </button>
        </div>

        <div className="wfb__module-filter">
          <button className={`wfb__tab ${filterModule === 'all' ? 'active' : ''}`} onClick={() => setFilterMod('all')}>All</button>
          {MODULE_TYPES.map(m => (
            templates.some(t => t.module_type === m.value) &&
            <button
              key={m.value}
              className={`wfb__tab ${filterModule === m.value ? 'active' : ''}`}
              onClick={() => setFilterMod(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="wfb__template-grid">
          {filteredTemplates.map(t => (
            <div key={t.id} className={`wfb__template-card ${!t.is_active ? 'wfb__template-card--inactive' : ''}`}>
              <div className="wfb__template-card-header">
                <span className="wfb__module-chip">
                  {MODULE_TYPES.find(m => m.value === t.module_type)?.label || t.module_type}
                </span>
                {t.is_default && <span className="wfb__default-chip">Default</span>}
                {!t.is_active && <span className="wfb__inactive-chip">Inactive</span>}
              </div>
              <div className="wfb__template-name">{t.name}</div>
              {t.description && <div className="wfb__template-desc">{t.description}</div>}
              <div className="wfb__template-meta">
                <span>🔢 {t.step_count} step{t.step_count !== 1 ? 's' : ''}</span>
                {t.sla_hours && <span>⏱ {t.sla_hours}h SLA</span>}
              </div>
              <div className="wfb__template-actions">
                <button className="wfb__btn wfb__btn--sm" onClick={() => startEdit(t.id)}>✏️ Edit</button>
                <button className="wfb__btn wfb__btn--sm wfb__btn--danger" onClick={() => deleteTemplate(t.id, t.name)}>🗑 Delete</button>
              </div>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="wfb__empty">
              No workflow templates yet.{' '}
              <button className="wfb__link" onClick={startCreate}>Create one</button>.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── EDITOR VIEW ────────────────────────────────────────────────────── */
  return (
    <div className="wfb">
      <div className="wfb__header">
        <div>
          <button className="wfb__back" onClick={() => setEditing(null)}>← Back</button>
          <h2>{editing.id ? 'Edit Workflow' : 'New Workflow'}</h2>
        </div>
        <button className="wfb__btn wfb__btn--primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Workflow'}
        </button>
      </div>

      {/* ── Template settings ─────────────────────────────────────────── */}
      <div className="wfb__section">
        <h3>Workflow Settings</h3>
        <div className="wfb__form-grid">
          <div className="wfb__field">
            <label>Module Type <span className="wfb__req">*</span></label>
            <select
              value={editing.module_type}
              onChange={e => setEditing(f => ({ ...f, module_type: e.target.value }))}
              disabled={!!editing.id}
            >
              {MODULE_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="wfb__field">
            <label>Workflow Name <span className="wfb__req">*</span></label>
            <input
              type="text"
              value={editing.name}
              onChange={e => setEditing(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Standard Leave Approval"
            />
          </div>

          <div className="wfb__field wfb__field--full">
            <label>Description</label>
            <input
              type="text"
              value={editing.description || ''}
              onChange={e => setEditing(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>

          <div className="wfb__field">
            <label>SLA (hours, optional)</label>
            <input
              type="number"
              value={editing.sla_hours || ''}
              onChange={e => setEditing(f => ({ ...f, sla_hours: e.target.value }))}
              placeholder="e.g. 48"
              min={1}
            />
          </div>

          <div className="wfb__field">
            <label>Sort Order</label>
            <input
              type="number"
              value={editing.sort_order || 0}
              onChange={e => setEditing(f => ({ ...f, sort_order: Number(e.target.value) }))}
            />
          </div>

          <div className="wfb__field">
            <label className="wfb__checkbox-label">
              <input
                type="checkbox"
                checked={!!editing.is_default}
                onChange={e => setEditing(f => ({ ...f, is_default: e.target.checked }))}
              />
              Default template for this module
            </label>
          </div>

          <div className="wfb__field">
            <label className="wfb__checkbox-label">
              <input
                type="checkbox"
                checked={!!editing.is_active}
                onChange={e => setEditing(f => ({ ...f, is_active: e.target.checked }))}
              />
              Active
            </label>
          </div>
        </div>

        {/* Conditional matching */}
        {!editing.is_default && (
          <div className="wfb__condition-box">
            <h4>Match Condition (optional)</h4>
            <p className="wfb__help">This workflow applies when the condition is true. Leave blank for unconditional.</p>
            <div className="wfb__form-grid">
              <div className="wfb__field">
                <label>Field path in request data</label>
                <input
                  type="text"
                  value={editing.condition_field || ''}
                  onChange={e => setEditing(f => ({ ...f, condition_field: e.target.value }))}
                  placeholder="e.g. days or leave_details.days"
                />
              </div>
              <div className="wfb__field">
                <label>Operator</label>
                <select
                  value={editing.condition_op || 'eq'}
                  onChange={e => setEditing(f => ({ ...f, condition_op: e.target.value }))}
                >
                  <option value="eq">= equals</option>
                  <option value="neq">≠ not equals</option>
                  <option value="gt">&gt; greater than</option>
                  <option value="gte">≥ greater or equal</option>
                  <option value="lt">&lt; less than</option>
                  <option value="lte">≤ less or equal</option>
                  <option value="in">in list (JSON array)</option>
                  <option value="notin">not in list (JSON array)</option>
                </select>
              </div>
              <div className="wfb__field">
                <label>Value</label>
                <input
                  type="text"
                  value={editing.condition_value || ''}
                  onChange={e => setEditing(f => ({ ...f, condition_value: e.target.value }))}
                  placeholder="e.g. 3 or [&quot;annual&quot;,&quot;sick&quot;]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Steps ─────────────────────────────────────────────────────── */}
      <div className="wfb__section">
        <div className="wfb__section-header">
          <h3>Approval Steps</h3>
          <button className="wfb__btn wfb__btn--secondary" onClick={addStep}>+ Add Step</button>
        </div>
        <p className="wfb__help">Steps are executed in order. Same step_order number = parallel approval.</p>

        <div className="wfb__steps">
          {editing.steps.map((step, idx) => (
            <div key={idx} className="wfb__step">
              <div className="wfb__step-header">
                <div className="wfb__step-number">Step {step.step_order}</div>
                <div className="wfb__step-controls">
                  <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} title="Move up">↑</button>
                  <button onClick={() => moveStep(idx, 1)} disabled={idx === editing.steps.length - 1} title="Move down">↓</button>
                  <button onClick={() => removeStep(idx)} className="wfb__step-remove" title="Remove step">✕</button>
                </div>
              </div>

              <div className="wfb__form-grid">
                <div className="wfb__field">
                  <label>Step Name <span className="wfb__req">*</span></label>
                  <input
                    type="text"
                    value={step.step_name}
                    onChange={e => updateStep(idx, 'step_name', e.target.value)}
                    placeholder="e.g. Team Lead Approval"
                  />
                </div>

                <div className="wfb__field">
                  <label>Step Type</label>
                  <select value={step.step_type} onChange={e => updateStep(idx, 'step_type', e.target.value)}>
                    {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="wfb__field">
                  <label>Approver Type</label>
                  <select value={step.approver_type} onChange={e => updateStep(idx, 'approver_type', e.target.value)}>
                    {APPROVER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {step.approver_type === 'role' && (
                  <div className="wfb__field">
                    <label>Role</label>
                    <select value={step.approver_role} onChange={e => updateStep(idx, 'approver_role', e.target.value)}>
                      <option value="">Select role…</option>
                      <option value="admin">Admin</option>
                      <option value="hr">HR</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                )}

                {step.approver_type === 'specific_user' && (
                  <div className="wfb__field">
                    <label>User</label>
                    <select value={step.approver_user_id || ''} onChange={e => updateStep(idx, 'approver_user_id', e.target.value)}>
                      <option value="">Select user…</option>
                      {users.map(u => (
                        <option key={u.user_id || u.id} value={u.user_id || u.id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {step.approver_type === 'dynamic_field' && (
                  <div className="wfb__field">
                    <label>Field path (user_id from request_data)</label>
                    <input
                      type="text"
                      value={step.approver_field || ''}
                      onChange={e => updateStep(idx, 'approver_field', e.target.value)}
                      placeholder="e.g. assigned_manager_id"
                    />
                  </div>
                )}

                {step.step_type === 'parallel' && (
                  <div className="wfb__field">
                    <label>Min approvals needed (quorum)</label>
                    <input
                      type="number"
                      value={step.parallel_quorum || 1}
                      onChange={e => updateStep(idx, 'parallel_quorum', Number(e.target.value))}
                      min={1}
                    />
                  </div>
                )}

                {step.step_type === 'conditional' && (
                  <>
                    <div className="wfb__field">
                      <label>Condition field</label>
                      <input type="text" value={step.condition_field || ''} onChange={e => updateStep(idx, 'condition_field', e.target.value)} placeholder="request_data field path" />
                    </div>
                    <div className="wfb__field">
                      <label>Operator</label>
                      <select value={step.condition_op || 'eq'} onChange={e => updateStep(idx, 'condition_op', e.target.value)}>
                        <option value="eq">= equals</option>
                        <option value="neq">≠ not equals</option>
                        <option value="gt">&gt; greater than</option>
                        <option value="gte">≥ greater or equal</option>
                        <option value="lt">&lt; less than</option>
                        <option value="lte">≤ less or equal</option>
                      </select>
                    </div>
                    <div className="wfb__field">
                      <label>Value</label>
                      <input type="text" value={step.condition_value || ''} onChange={e => updateStep(idx, 'condition_value', e.target.value)} />
                    </div>
                  </>
                )}

                <div className="wfb__field">
                  <label>SLA (hours)</label>
                  <input type="number" value={step.sla_hours || ''} onChange={e => updateStep(idx, 'sla_hours', e.target.value)} placeholder="Inherit from template" min={1} />
                </div>

                <div className="wfb__field">
                  <label>Reminder before SLA (hours)</label>
                  <input type="number" value={step.reminder_hours || 4} onChange={e => updateStep(idx, 'reminder_hours', Number(e.target.value))} min={0} />
                </div>

                <div className="wfb__field">
                  <label>Auto-approve after (hours, 0=off)</label>
                  <input type="number" value={step.auto_approve_hours || ''} onChange={e => updateStep(idx, 'auto_approve_hours', e.target.value)} min={1} />
                </div>

                <div className="wfb__field">
                  <label>Escalate to type</label>
                  <select value={step.escalate_to_type || ''} onChange={e => updateStep(idx, 'escalate_to_type', e.target.value)}>
                    <option value="">None</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                    <option value="role">Role</option>
                    <option value="specific_user">Specific User</option>
                  </select>
                </div>

                {step.escalate_to_type === 'role' && (
                  <div className="wfb__field">
                    <label>Escalate to role</label>
                    <select value={step.escalate_to_role || ''} onChange={e => updateStep(idx, 'escalate_to_role', e.target.value)}>
                      <option value="">Select…</option>
                      <option value="admin">Admin</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="wfb__step-flags">
                {[
                  ['skip_if_no_approver', 'Auto-skip if no approver found'],
                  ['allow_send_back',     'Allow send-back to previous step'],
                  ['require_remarks',     'Require remarks'],
                  ['require_attachment',  'Require attachment'],
                  ['is_final_step',       'Final step (override — engine auto-detects)'],
                ].map(([field, label]) => (
                  <label key={field} className="wfb__checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!step[field]}
                      onChange={e => updateStep(idx, field, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="wfb__btn wfb__btn--secondary wfb__btn--full" onClick={addStep}>
          + Add Another Step
        </button>
      </div>

      <div className="wfb__footer">
        <button className="wfb__btn" onClick={() => setEditing(null)}>Cancel</button>
        <button className="wfb__btn wfb__btn--primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Workflow'}
        </button>
      </div>
    </div>
  );
}
