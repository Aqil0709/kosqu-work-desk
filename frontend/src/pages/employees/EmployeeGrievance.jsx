import React, { useState, useEffect, useCallback } from 'react';
import grievanceAPI from '../../services/grievanceAPI';

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  investigating: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  withdrawn: 'bg-gray-100 text-gray-400',
};
const CATEGORY_LABELS = {
  harassment: 'Harassment', posh: 'POSH / Sexual Harassment', discrimination: 'Discrimination',
  workplace_conflict: 'Workplace Conflict', policy_violation: 'Policy Violation', other: 'Other',
};

const EMPTY_FORM = {
  category: 'other', subject: '', description: '', incident_date: '',
  accused_name: '', witnesses: '', priority: 'medium', is_anonymous: false, is_posh: false,
};

export default function EmployeeGrievance() {
  const [view, setView] = useState('list');
  const [grievances, setGrievances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(''), 4000);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadMy = useCallback(async () => {
    setLoading(true);
    try { const r = await grievanceAPI.getMy(); setGrievances(r.data.grievances || []); } catch {} finally { setLoading(false); }
  }, []);

  const loadDetail = useCallback(async (id) => {
    try { const r = await grievanceAPI.getMyOne(id); setDetail(r.data); } catch {}
  }, []);

  useEffect(() => { if (view === 'list') loadMy(); }, [view, loadMy]);
  useEffect(() => { if (selected) loadDetail(selected); }, [selected, loadDetail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await grievanceAPI.submit(form);
      showToast(`Grievance filed! Ticket: ${r.data.ticket_no}`);
      setForm(EMPTY_FORM);
      setView('list');
    } catch (err) { showToast(err.response?.data?.message || 'Error filing grievance', 'error'); } finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-sm ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grievance Portal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">File a complaint or track your grievances</p>
        </div>
        {view === 'list' && (
          <button onClick={() => setView('file')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            + File Grievance
          </button>
        )}
        {view !== 'list' && (
          <button onClick={() => { setView('list'); setSelected(null); setDetail(null); }} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
            ← Back
          </button>
        )}
      </div>

      {/* ── Filing Form ── */}
      {view === 'file' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Confidentiality Notice</p>
            <p className="text-xs">All grievances are handled confidentially by HR. You may choose to submit anonymously. POSH complaints are handled per the POSH Act 2013 with strict timelines.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Anonymous toggle */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <input type="checkbox" id="anon" checked={form.is_anonymous} onChange={(e) => set('is_anonymous', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              <label htmlFor="anon" className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Submit Anonymously</span>
                <span className="block text-xs text-gray-500">Your identity will not be disclosed to the committee</span>
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <select required value={form.category} onChange={(e) => { set('category', e.target.value); if (e.target.value === 'posh') set('is_posh', true); }}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => set('priority', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {form.category === 'posh' && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-700 dark:text-purple-300">
                ⚖️ POSH complaints are governed by the Sexual Harassment of Women at Workplace Act 2013. The Internal Committee (IC) will address this within 90 days.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
              <input required value={form.subject} onChange={(e) => set('subject', e.target.value)} maxLength={300}
                placeholder="Brief subject of the grievance"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Detailed Description *</label>
              <textarea required value={form.description} onChange={(e) => set('description', e.target.value)} rows={5}
                placeholder="Describe the incident in detail -- what happened, when, where, and how it affected you"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Incident Date</label>
                <input type="date" value={form.incident_date} onChange={(e) => set('incident_date', e.target.value)} max={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Person(s) Involved</label>
                <input value={form.accused_name} onChange={(e) => set('accused_name', e.target.value)} placeholder="Name(s) of the respondent(s)"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Witnesses (optional)</label>
              <input value={form.witnesses} onChange={(e) => set('witnesses', e.target.value)} placeholder="Names of any witnesses"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setView('list')} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Grievance'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── My Grievances List ── */}
      {view === 'list' && (
        <div className="space-y-3">
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading...</p>
          ) : grievances.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No grievances filed yet</p>
              <button onClick={() => setView('file')} className="mt-3 text-indigo-600 text-sm hover:underline">File your first grievance</button>
            </div>
          ) : grievances.map((g) => (
            <div key={g.id}
              onClick={() => { setSelected(g.id); setView('detail'); }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:border-indigo-300 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">{g.ticket_no}</span>
                    {g.is_posh ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">POSH</span> : null}
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{g.subject}</p>
                  <p className="text-xs text-gray-500 mt-1">{CATEGORY_LABELS[g.category]} · Filed {new Date(g.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[g.status]}`}>{g.status.replace(/_/g, ' ')}</span>
              </div>
              {g.sla_due_date && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-400">SLA due: {new Date(g.sla_due_date).toLocaleDateString()}</span>
                  {new Date(g.sla_due_date) < new Date() && !['resolved', 'closed'].includes(g.status) && (
                    <span className="text-red-500 font-medium">⚠ Overdue</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Detail View ── */}
      {view === 'detail' && detail && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono text-gray-400">{detail.grievance?.ticket_no}</span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-0.5">{detail.grievance?.subject}</h2>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[detail.grievance?.status]}`}>
              {detail.grievance?.status?.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <div><span className="text-gray-500 text-xs">Category</span><p className="font-medium">{CATEGORY_LABELS[detail.grievance?.category]}</p></div>
            <div><span className="text-gray-500 text-xs">Priority</span><p className="font-medium capitalize">{detail.grievance?.priority}</p></div>
            <div><span className="text-gray-500 text-xs">Filed on</span><p className="font-medium">{detail.grievance?.created_at ? new Date(detail.grievance.created_at).toLocaleDateString() : '--'}</p></div>
            <div><span className="text-gray-500 text-xs">SLA Due</span><p className="font-medium">{detail.grievance?.sla_due_date ? new Date(detail.grievance.sla_due_date).toLocaleDateString() : '--'}</p></div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{detail.grievance?.description}</p>
          </div>

          {detail.grievance?.resolution && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Resolution</p>
              <p className="text-sm text-green-600 dark:text-green-400">{detail.grievance.resolution}</p>
            </div>
          )}

          {detail.comments?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Updates ({detail.comments.length})</p>
              <div className="space-y-2">
                {detail.comments.map((c) => (
                  <div key={c.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{c.author_name}</span>
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
