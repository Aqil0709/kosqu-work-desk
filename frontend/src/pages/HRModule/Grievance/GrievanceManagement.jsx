import React, { useState, useEffect, useCallback } from 'react';
import grievanceAPI from '../../../services/grievanceAPI';
import { employeeAPI } from '../../../services/employeeAPI';

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  investigating: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  withdrawn: 'bg-gray-100 text-gray-400',
};
const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};
const CATEGORY_LABELS = {
  harassment: 'Harassment', posh: 'POSH', discrimination: 'Discrimination',
  workplace_conflict: 'Workplace Conflict', policy_violation: 'Policy Violation', other: 'Other',
};

export default function GrievanceManagement() {
  const [tab, setTab] = useState('all');
  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState(null);
  const [committee, setCommittee] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', is_posh: '' });
  const [showEscalate, setShowEscalate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadGrievances = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (tab === 'posh') params.is_posh = 'true';
      const r = await grievanceAPI.getAll(params);
      setGrievances(r.data.grievances || []);
    } catch {} finally { setLoading(false); }
  }, [filters, tab]);

  const loadStats = useCallback(async () => {
    try { const r = await grievanceAPI.getStats(); setStats(r.data); } catch {}
  }, []);

  const loadCommittee = useCallback(async () => {
    try { const r = await grievanceAPI.getCommittee(); setCommittee(r.data.committee || []); } catch {}
  }, []);

  const loadEmployees = useCallback(async () => {
    try { const r = await employeeAPI.getAll(); setEmployees(r.data.employees || r.data.data || []); } catch {}
  }, []);

  const loadDetail = useCallback(async (id) => {
    try { const r = await grievanceAPI.getOne(id); setDetail(r.data); } catch {}
  }, []);

  useEffect(() => { loadStats(); loadEmployees(); loadCommittee(); }, [loadStats, loadEmployees, loadCommittee]);
  useEffect(() => { loadGrievances(); }, [loadGrievances]);
  useEffect(() => { if (selected) loadDetail(selected); }, [selected, loadDetail]);

  const handleStatusUpdate = async (id, status, resolution) => {
    try {
      await grievanceAPI.update(id, { status, resolution });
      showToast('Updated');
      loadGrievances(); loadStats(); if (selected === id) loadDetail(id);
    } catch (e) { showToast(e.response?.data?.message || 'Error'); }
  };

  const handleAssign = async (id, userId) => {
    try {
      await grievanceAPI.update(id, { assigned_to: userId });
      showToast('Assigned'); loadDetail(id);
    } catch (e) { showToast(e.response?.data?.message || 'Error'); }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await grievanceAPI.addComment(selected, { comment, is_internal: isInternal });
      setComment(''); showToast('Comment added'); loadDetail(selected);
    } catch (e) { showToast(e.response?.data?.message || 'Error'); }
  };

  return (
    <div className="p-6 space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grievance & POSH</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage complaints, POSH cases, and escalations</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.totals?.total || 0, color: 'text-gray-700' },
            { label: 'Open', value: stats.totals?.open_count || 0, color: 'text-red-600' },
            { label: 'POSH Cases', value: stats.totals?.posh_count || 0, color: 'text-purple-600' },
            { label: 'SLA Breached', value: stats.totals?.sla_breached || 0, color: 'text-orange-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-6">
          {[['all', 'All Grievances'], ['posh', 'POSH Cases'], ['committee', 'POSH Committee']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Grievance List + Detail ── */}
      {(tab === 'all' || tab === 'posh') && (
        <div className="flex gap-6">
          {/* Filters + List */}
          <div className="flex-1 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'status', opts: ['', 'open', 'under_review', 'investigating', 'resolved', 'closed'], label: 'Status' },
                { key: 'category', opts: ['', 'harassment', 'posh', 'discrimination', 'workplace_conflict', 'policy_violation', 'other'], label: 'Category' },
                { key: 'priority', opts: ['', 'low', 'medium', 'high', 'critical'], label: 'Priority' },
              ].map(({ key, opts, label }) => (
                <select key={key} value={filters[key]}
                  onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1.5 text-sm">
                  <option value="">{label}</option>
                  {opts.filter(Boolean).map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
              ))}
            </div>

            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : grievances.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">No grievances found</p>
            ) : grievances.map((g) => (
              <div key={g.id} onClick={() => setSelected(g.id)}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-4 cursor-pointer transition-all ${selected === g.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">{g.ticket_no}</span>
                      {g.is_posh ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">POSH</span> : null}
                      {g.is_anonymous ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Anonymous</span> : null}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white mt-1 text-sm truncate">{g.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">By: {g.complainant_name} · {CATEGORY_LABELS[g.category]}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[g.status]}`}>{g.status.replace(/_/g, ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[g.priority]}`}>{g.priority}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{new Date(g.created_at).toLocaleDateString()}</span>
                  {g.sla_due_date && new Date(g.sla_due_date) < new Date() && g.status !== 'resolved' && g.status !== 'closed' && (
                    <span className="text-xs text-red-600 font-medium">⚠ SLA Breached</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {detail && (
            <div className="w-96 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-fit sticky top-4 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono text-gray-400">{detail.grievance?.ticket_no}</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white mt-0.5 text-sm">{detail.grievance?.subject}</h3>
                </div>
                <button onClick={() => { setSelected(null); setDetail(null); }} className="text-gray-400 hover:text-gray-600 shrink-0">✕</button>
              </div>

              {/* Info */}
              <div className="text-xs space-y-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between"><span className="text-gray-500">Filed by</span><span className="font-medium">{detail.grievance?.complainant_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{CATEGORY_LABELS[detail.grievance?.category]}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Incident date</span><span className="font-medium">{detail.grievance?.incident_date ? new Date(detail.grievance.incident_date).toLocaleDateString() : '--'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SLA due</span><span className={`font-medium ${new Date(detail.grievance?.sla_due_date) < new Date() && !['resolved','closed'].includes(detail.grievance?.status) ? 'text-red-500' : ''}`}>{detail.grievance?.sla_due_date ? new Date(detail.grievance.sla_due_date).toLocaleDateString() : '--'}</span></div>
                {detail.grievance?.accused_name && <div className="flex justify-between"><span className="text-gray-500">Accused</span><span className="font-medium">{detail.grievance.accused_name}</span></div>}
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400">{detail.grievance?.description}</p>

              {/* Actions */}
              <div className="space-y-2">
                <select value={detail.grievance?.status} onChange={(e) => handleStatusUpdate(detail.grievance.id, e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1.5 text-xs">
                  {['open', 'under_review', 'investigating', 'resolved', 'closed', 'withdrawn'].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <select value={detail.grievance?.assigned_to || ''} onChange={(e) => handleAssign(detail.grievance.id, e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1.5 text-xs">
                  <option value="">Assign to...</option>
                  {employees.map((e) => <option key={e.id || e.user_id} value={e.id || e.user_id}>{e.full_name || `${e.first_name} ${e.last_name}`}</option>)}
                </select>
                <button onClick={() => setShowEscalate(true)} className="w-full text-xs py-1.5 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20">
                  Escalate
                </button>
              </div>

              {/* Comments */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Comments ({detail.comments?.length || 0})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {(detail.comments || []).map((c) => (
                    <div key={c.id} className={`p-2.5 rounded-lg text-xs ${c.is_internal ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700'}`}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{c.author_name}</span>
                        {c.is_internal && <span className="text-yellow-600 text-xs">Internal</span>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">{c.comment}</p>
                    </div>
                  ))}
                </div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Add a comment..."
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-xs mb-2" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="accent-indigo-600" />
                    Internal note
                  </label>
                  <button onClick={handleComment} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">Post</button>
                </div>
              </div>

              {/* Escalation history */}
              {detail.escalations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Escalations</h4>
                  {detail.escalations.map((e) => (
                    <div key={e.id} className="text-xs text-gray-500 py-1 border-t border-gray-100 dark:border-gray-700">
                      Escalated by {e.escalated_by_name} on {new Date(e.escalated_at).toLocaleDateString()}
                      {e.reason && ` -- ${e.reason}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── POSH Committee ── */}
      {tab === 'committee' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddMember(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">+ Add Member</button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {committee.map((m) => (
              <div key={m.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.designation}</p>
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize">{m.role.replace(/_/g, ' ')}</span>
                  </div>
                  <button onClick={async () => { await grievanceAPI.removeMember(m.id); loadCommittee(); showToast('Removed'); }}
                    className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                </div>
              </div>
            ))}
            {committee.length === 0 && (
              <p className="text-gray-400 text-sm col-span-3 text-center py-12">No committee members added yet</p>
            )}
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalate && detail && (
        <EscalateModal
          grievanceId={detail.grievance?.id}
          employees={employees}
          onClose={() => setShowEscalate(false)}
          onDone={() => { setShowEscalate(false); loadDetail(selected); showToast('Escalated'); }}
        />
      )}

      {/* Add Committee Member Modal */}
      {showAddMember && (
        <AddMemberModal
          employees={employees}
          onClose={() => setShowAddMember(false)}
          onDone={() => { setShowAddMember(false); loadCommittee(); showToast('Member added'); }}
        />
      )}
    </div>
  );
}

function EscalateModal({ grievanceId, employees, onClose, onDone }) {
  const [form, setForm] = useState({ escalated_to: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await grievanceAPI.escalate(grievanceId, form); onDone(); } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Escalate Grievance</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escalate To *</label>
            <select required value={form.escalated_to} onChange={(e) => setForm((f) => ({ ...f, escalated_to: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
              <option value="">Select person</option>
              {employees.map((e) => <option key={e.id || e.user_id} value={e.id || e.user_id}>{e.full_name || `${e.first_name} ${e.last_name}`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Escalating...' : 'Escalate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ employees, onClose, onDone }) {
  const [form, setForm] = useState({ user_id: '', name: '', designation: '', role: 'member' });
  const [saving, setSaving] = useState(false);
  const handleEmpSelect = (userId) => {
    const emp = employees.find((e) => String(e.id || e.user_id) === userId);
    if (emp) setForm((f) => ({ ...f, user_id: userId, name: emp.full_name || `${emp.first_name} ${emp.last_name}`, designation: emp.designation || '' }));
    else setForm((f) => ({ ...f, user_id: userId }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await grievanceAPI.addMember(form); onDone(); } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Committee Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
            <select value={form.user_id} onChange={(e) => handleEmpSelect(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
              <option value="">Select or enter manually</option>
              {employees.map((e) => <option key={e.id || e.user_id} value={e.id || e.user_id}>{e.full_name || `${e.first_name} ${e.last_name}`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
              <input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                <option value="presiding_officer">Presiding Officer</option>
                <option value="member">Member</option>
                <option value="external_member">External Member</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
