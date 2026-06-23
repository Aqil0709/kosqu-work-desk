import React, { useState, useEffect, useCallback } from 'react';
import onboardingAPI from '../../../services/onboardingAPI';
import { employeeAPI } from '../../../services/employeeAPI';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};
const TASK_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-600',
};

export default function OnboardingManagement() {
  const [tab, setTab] = useState('overview');
  const [processType, setProcessType] = useState('onboarding');
  const [stats, setStats] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [processDetail, setProcessDetail] = useState(null);
  const [showCreateProcess, setShowCreateProcess] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadStats = useCallback(async () => {
    try { const r = await onboardingAPI.getStats(); setStats(r.data); } catch {}
  }, []);

  const loadProcesses = useCallback(async (type) => {
    setLoading(true);
    try {
      const r = await onboardingAPI.getProcesses({ type });
      setProcesses(r.data.processes || []);
    } catch {} finally { setLoading(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    try { const r = await onboardingAPI.getTemplates(); setTemplates(r.data.templates || []); } catch {}
  }, []);

  const loadEmployees = useCallback(async () => {
    try { const r = await employeeAPI.getAll(); setEmployees(r.data.employees || r.data.data || []); } catch {}
  }, []);

  const loadProcessDetail = useCallback(async (id) => {
    try { const r = await onboardingAPI.getProcess(id); setProcessDetail(r.data); } catch {}
  }, []);

  useEffect(() => {
    loadStats();
    loadTemplates();
    loadEmployees();
  }, [loadStats, loadTemplates, loadEmployees]);

  useEffect(() => {
    if (tab === 'processes') loadProcesses(processType);
  }, [tab, processType, loadProcesses]);

  useEffect(() => {
    if (selectedProcess) loadProcessDetail(selectedProcess);
  }, [selectedProcess, loadProcessDetail]);

  const handleTaskUpdate = async (taskId, status) => {
    try {
      await onboardingAPI.updateTask(taskId, { status });
      showToast('Task updated');
      loadProcessDetail(selectedProcess);
      loadStats();
    } catch (e) { showToast(e.response?.data?.message || 'Error'); }
  };

  const handleProcessStatusUpdate = async (id, status) => {
    try {
      await onboardingAPI.updateProcess(id, { status });
      showToast('Process updated');
      loadProcesses(processType);
      loadStats();
      if (selectedProcess === id) loadProcessDetail(id);
    } catch (e) { showToast(e.response?.data?.message || 'Error'); }
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Onboarding & Offboarding</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage employee joining and exit workflows</p>
        </div>
        <button onClick={() => setShowCreateProcess(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          + New Process
        </button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Onboarding', value: stats.onboarding?.active || 0, color: 'indigo' },
            { label: 'Completed Onboarding', value: stats.onboarding?.completed || 0, color: 'green' },
            { label: 'Active Offboarding', value: stats.offboarding?.active || 0, color: 'orange' },
            { label: 'Overdue Tasks', value: stats.overdue_tasks || 0, color: 'red' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 text-${s.color}-600`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-6">
          {[['overview', 'Overview'], ['processes', 'Processes'], ['templates', 'Templates']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {['onboarding', 'offboarding'].map((type) => {
            const s = stats?.[type] || {};
            return (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white capitalize mb-3">{type}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-medium">{s.total || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Active</span><span className="font-medium text-blue-600">{s.active || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Completed</span><span className="font-medium text-green-600">{s.completed || 0}</span></div>
                </div>
                <button onClick={() => { setTab('processes'); setProcessType(type); }}
                  className="mt-4 w-full text-center text-sm text-indigo-600 hover:underline">View All →</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Processes ── */}
      {tab === 'processes' && (
        <div className="flex gap-6">
          {/* List */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              {['onboarding', 'offboarding'].map((t) => (
                <button key={t} onClick={() => setProcessType(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${processType === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                  {t}
                </button>
              ))}
            </div>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : processes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">No {processType} processes yet</p>
            ) : processes.map((p) => {
              const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
              return (
                <div key={p.id}
                  onClick={() => setSelectedProcess(p.id)}
                  className={`bg-white dark:bg-gray-800 rounded-xl border p-4 cursor-pointer transition-all ${selectedProcess === p.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{p.employee_name}</p>
                      <p className="text-xs text-gray-500">{p.designation} · {p.department}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>{p.status.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{p.completed_tasks}/{p.total_tasks} tasks · {pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {processDetail && (
            <div className="w-96 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-fit sticky top-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{processDetail.process?.employee_name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{processDetail.process?.type} · {processDetail.process?.department}</p>
                </div>
                <button onClick={() => setSelectedProcess(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="flex gap-2">
                {processDetail.process?.status !== 'completed' && (
                  <button onClick={() => handleProcessStatusUpdate(processDetail.process.id, 'completed')}
                    className="flex-1 text-xs py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Mark Complete</button>
                )}
                {processDetail.process?.status === 'in_progress' && (
                  <button onClick={() => handleProcessStatusUpdate(processDetail.process.id, 'cancelled')}
                    className="flex-1 text-xs py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Cancel</button>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tasks ({processDetail.tasks?.length || 0})</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {(processDetail.tasks || []).map((t) => (
                    <div key={t.id} className="flex items-start gap-2 p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <input type="checkbox" checked={t.status === 'completed'} onChange={() => handleTaskUpdate(t.id, t.status === 'completed' ? 'pending' : 'completed')}
                        className="mt-0.5 accent-indigo-600" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{t.title}</p>
                        {t.due_date && <p className="text-xs text-gray-400 mt-0.5">Due {new Date(t.due_date).toLocaleDateString()}</p>}
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${TASK_STATUS_COLORS[t.status]}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Templates ── */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateTemplate(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">+ New Template</button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">{t.type}{t.department ? ` · ${t.department}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-gray-400 text-sm col-span-3 text-center py-12">No templates yet. Create one to speed up processes.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Create Process Modal ── */}
      {showCreateProcess && (
        <CreateProcessModal
          employees={employees}
          templates={templates}
          onClose={() => setShowCreateProcess(false)}
          onCreated={() => { setShowCreateProcess(false); loadProcesses(processType); loadStats(); showToast('Process created!'); }}
        />
      )}

      {/* ── Create Template Modal ── */}
      {showCreateTemplate && (
        <CreateTemplateModal
          onClose={() => setShowCreateTemplate(false)}
          onCreated={() => { setShowCreateTemplate(false); loadTemplates(); showToast('Template created!'); }}
        />
      )}
    </div>
  );
}

function CreateProcessModal({ employees, templates, onClose, onCreated }) {
  const [form, setForm] = useState({ employee_id: '', template_id: '', type: 'onboarding', start_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onboardingAPI.createProcess(form);
      onCreated();
    } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Process</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
              <option value="onboarding">Onboarding</option>
              <option value="offboarding">Offboarding</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
            <select required value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e.id || e.user_id} value={e.id || e.user_id}>{e.full_name || `${e.first_name} ${e.last_name}`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template (optional)</label>
            <select value={form.template_id} onChange={(e) => set('template_id', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
              <option value="">No template</option>
              {templates.filter((t) => t.type === form.type).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateTemplateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', type: 'onboarding', department: '' });
  const [items, setItems] = useState([{ title: '', assigned_to_role: 'hr', due_days: 1 }]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addItem = () => setItems((prev) => [...prev, { title: '', assigned_to_role: 'hr', due_days: 1 }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const setItem = (i, k, v) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onboardingAPI.createTemplate({ ...form, items: items.filter((it) => it.title.trim()) });
      onCreated();
    } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                <option value="onboarding">Onboarding</option>
                <option value="offboarding">Offboarding</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department (optional)</label>
            <input value={form.department} onChange={(e) => set('department', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Checklist Items</label>
              <button type="button" onClick={addItem} className="text-xs text-indigo-600 hover:underline">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input value={item.title} onChange={(e) => setItem(i, 'title', e.target.value)} placeholder="Task title" className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded px-2 py-1.5 text-xs" />
                  <select value={item.assigned_to_role} onChange={(e) => setItem(i, 'assigned_to_role', e.target.value)} className="border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded px-2 py-1.5 text-xs">
                    {['hr', 'it', 'admin', 'manager', 'employee'].map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                  <input type="number" value={item.due_days} onChange={(e) => setItem(i, 'due_days', Number(e.target.value))} min="1" className="w-14 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded px-2 py-1.5 text-xs" title="Days" />
                  <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
