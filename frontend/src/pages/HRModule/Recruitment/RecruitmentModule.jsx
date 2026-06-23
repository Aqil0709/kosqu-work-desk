import React, { useState, useEffect } from 'react';
import { recruitmentAPI } from '../../../services/recruitmentAPI';

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'jobs', label: '💼 Job Postings' },
  { id: 'pipeline', label: '🔄 Candidate Pipeline' },
  { id: 'interviews', label: '📅 Interviews' },
];

const STAGES = ['applied','screening','interview','technical','hr_round','offer','selected','rejected','withdrawn'];
const STAGE_COLOR = {
  applied: '#6b7280', screening: '#7c3aed', interview: '#1d4ed8', technical: '#0369a1',
  hr_round: '#0891b2', offer: '#ca8a04', selected: '#15803d', rejected: '#b91c1c', withdrawn: '#9ca3af',
};
const STAGE_BG = {
  applied: '#f3f4f6', screening: '#ede9fe', interview: '#dbeafe', technical: '#e0f2fe',
  hr_round: '#cffafe', offer: '#fef9c3', selected: '#dcfce7', rejected: '#fee2e2', withdrawn: '#f9fafb',
};

const JOB_TYPES = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', internship: 'Internship', freelance: 'Freelance' };
const SOURCES = ['job_portal','referral','linkedin','direct','agency','campus','other'];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
const fmtSalary = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '--';

export default function RecruitmentModule() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    recruitmentAPI.getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: '"Inter",system-ui,sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--theme-text-strong,#0f172a)' }}>Recruitment & ATS</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--theme-text-muted,#6b7280)', fontSize: '0.86rem' }}>Applicant Tracking System -- manage jobs, candidates, interviews & offers</p>
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--card-border,#e5e7eb)', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 18px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.83rem',
            background: 'transparent', borderBottom: tab === t.id ? '2px solid #1C47C9' : '2px solid transparent',
            color: tab === t.id ? '#1C47C9' : 'var(--theme-text-muted,#6b7280)', marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab stats={stats} />}
      {tab === 'jobs' && <JobsTab />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'interviews' && <InterviewsTab />}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({ stats }) {
  if (!stats) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading stats...</div>;

  const stageMap = {};
  (stats.stageStats || []).forEach(s => { stageMap[s.stage] = Number(s.count); });
  const jobMap = {};
  (stats.jobStats || []).forEach(s => { jobMap[s.status] = Number(s.count); });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Open Positions', value: jobMap.open || 0, color: '#1C47C9', bg: '#dbeafe' },
          { label: 'Total Candidates', value: stats.totals?.total_candidates || 0, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Selected', value: stats.totals?.selected || 0, color: '#15803d', bg: '#dcfce7' },
          { label: 'In Interview', value: (stageMap.interview || 0) + (stageMap.technical || 0) + (stageMap.hr_round || 0), color: '#0891b2', bg: '#cffafe' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: '20px 22px', border: `1px solid ${c.color}22` }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: c.color, marginTop: 4, opacity: 0.8 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: 'var(--theme-text-strong,#0f172a)' }}>Candidate Pipeline</div>
          {STAGES.filter(s => stageMap[s]).map(s => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: STAGE_COLOR[s] }} />
                <span style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--theme-text-strong,#374151)' }}>{s.replace('_', ' ')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 100, height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (stageMap[s] / (stats.totals?.total_candidates || 1)) * 100)}%`, height: '100%', background: STAGE_COLOR[s], borderRadius: 3 }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: STAGE_COLOR[s], minWidth: 24, textAlign: 'right' }}>{stageMap[s]}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: 'var(--theme-text-strong,#0f172a)' }}>Source Breakdown</div>
          {(stats.sourceStats || []).map(s => (
            <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ textTransform: 'capitalize', color: 'var(--theme-text-strong,#374151)' }}>{s.source.replace('_', ' ')}</span>
              <strong style={{ color: '#1C47C9' }}>{s.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Jobs ─────────────────────────────────────────────────────────────────────
function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await recruitmentAPI.getJobs(statusFilter ? { status: statusFilter } : {}); setJobs(r.data?.jobs || []); }
    catch { } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [statusFilter]);

  const deleteJob = async (id) => {
    if (!confirm('Close this job posting?')) return;
    await recruitmentAPI.deleteJob(id);
    load();
  };

  const STATUS_STYLE = { draft: ['#6b7280','#f3f4f6'], open: ['#15803d','#dcfce7'], paused: ['#ca8a04','#fef9c3'], closed: ['#b91c1c','#fee2e2'] };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['','open','paused','closed','draft'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.8rem', fontWeight: 600, background: statusFilter === s ? '#1C47C9' : 'transparent', color: statusFilter === s ? '#fff' : '#6b7280', cursor: 'pointer' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditJob(null); setShowForm(true); }} style={{ padding: '9px 20px', background: '#1C47C9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer' }}>
          + Post Job
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {jobs.map(j => {
            const [col, bg] = STATUS_STYLE[j.status] || STATUS_STYLE.draft;
            return (
              <div key={j.id} style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', padding: 20, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--theme-text-strong,#0f172a)', marginBottom: 4 }}>{j.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{j.department} {j.location ? `• ${j.location}` : ''}</div>
                  </div>
                  <span style={{ color: col, background: bg, padding: '3px 9px', borderRadius: 5, fontSize: '0.73rem', fontWeight: 700 }}>{j.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: '#6b7280', marginBottom: 14 }}>
                  <span>🧑 {j.openings} opening{j.openings > 1 ? 's' : ''}</span>
                  <span>💼 {JOB_TYPES[j.job_type] || j.job_type}</span>
                  {j.closing_date && <span>📅 {fmtDate(j.closing_date)}</span>}
                </div>
                {(j.salary_min || j.salary_max) && (
                  <div style={{ fontSize: '0.82rem', color: '#374151', marginBottom: 12 }}>
                    💰 {fmtSalary(j.salary_min)}{j.salary_max ? ` - ${fmtSalary(j.salary_max)}` : '+'} / year
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditJob(j); setShowForm(true); }} style={{ flex: 1, padding: '7px', background: '#f3f4f6', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Edit</button>
                  <button onClick={() => deleteJob(j.id)} style={{ padding: '7px 12px', background: '#fee2e2', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#b91c1c' }}>Close</button>
                </div>
              </div>
            );
          })}
          {jobs.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#9ca3af' }}>No job postings. Click "Post Job" to create one.</div>}
        </div>
      )}

      {showForm && <JobFormModal job={editJob} onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

function JobFormModal({ job, onClose, onSaved }) {
  const [form, setForm] = useState(job ? { ...job } : { title: '', department: '', location: '', job_type: 'full_time', experience_min: 0, experience_max: '', salary_min: '', salary_max: '', description: '', requirements: '', skills: '', openings: 1, status: 'open', closing_date: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim()) return alert('Job title is required');
    setSaving(true);
    try {
      if (job) await recruitmentAPI.updateJob(job.id, form);
      else await recruitmentAPI.createJob(form);
      onSaved(); onClose();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 20px', fontWeight: 800 }}>{job ? 'Edit Job Posting' : 'Post New Job'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[['title','Job Title *','text','1/-1'], ['department','Department','text'], ['location','Location','text'], ['job_type','Job Type','select'], ['experience_min','Min Experience (yrs)','number'], ['experience_max','Max Experience (yrs)','number'], ['salary_min','Min Salary (₹)','number'], ['salary_max','Max Salary (₹)','number'], ['openings','Openings','number'], ['closing_date','Closing Date','date'], ['status','Status','select']].map(([key, label, type, colSpan]) => (
            <div key={key} style={{ gridColumn: colSpan || 'auto' }}>
              <label style={lblStyle}>{label}</label>
              {type === 'select' ? (
                <select value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inpStyle}>
                  {key === 'job_type' && Object.entries(JOB_TYPES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  {key === 'status' && ['draft','open','paused','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inpStyle} />
              )}
            </div>
          ))}
        </div>
        {[['description','Job Description'],['requirements','Requirements'],['skills','Required Skills (comma-separated)']].map(([key, label]) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={lblStyle}>{label}</label>
            <textarea rows={3} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ ...inpStyle, width: '100%', resize: 'vertical' }} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#e5e7eb', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '10px 24px', background: '#1C47C9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : job ? 'Update Job' : 'Post Job'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline ─────────────────────────────────────────────────────────────────
function PipelineTab() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [jobs, setJobs] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [cr, jr] = await Promise.all([recruitmentAPI.getCandidates(stageFilter ? { stage: stageFilter } : {}), recruitmentAPI.getJobs({ status: 'open' })]);
      setCandidates(cr.data?.candidates || []);
      setJobs(jr.data?.jobs || []);
    } catch { } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [stageFilter]);

  const filtered = candidates.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  const updateStage = async (id, stage) => {
    await recruitmentAPI.updateCandidateStage(id, { stage });
    load();
    if (selected?.id === id) setSelected(s => ({ ...s, stage }));
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates..." style={{ ...inpStyle, minWidth: 200 }} />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={inpStyle}>
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)} style={{ padding: '9px 20px', background: '#1C47C9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', marginLeft: 'auto' }}>
          + Add Candidate
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div> : (
        <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead><tr style={{ background: 'var(--table-header-bg,#f9fafb)' }}>
              {['Candidate','Job','Experience','Expected Salary','Source','Stage','Action'].map(h =>
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--card-border,#f3f4f6)', background: i%2===0?'transparent':'var(--table-row-alt,#fafafa)', cursor: 'pointer' }}>
                  <td style={tdStyle} onClick={() => setSelected(c)}>
                    <div style={{ fontWeight: 600, color: 'var(--theme-text-strong,#0f172a)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#9ca3af' }}>{c.email}</div>
                    {c.current_company && <div style={{ fontSize: '0.76rem', color: '#9ca3af' }}>{c.current_company}</div>}
                  </td>
                  <td style={tdStyle}>{c.job_title}</td>
                  <td style={tdStyle}>{c.experience_years ? `${c.experience_years} yrs` : '--'}</td>
                  <td style={tdStyle}>{fmtSalary(c.expected_salary)}</td>
                  <td style={tdStyle}><span style={{ textTransform: 'capitalize' }}>{c.source?.replace('_',' ')}</span></td>
                  <td style={tdStyle}><span style={{ color: STAGE_COLOR[c.stage], background: STAGE_BG[c.stage], padding: '3px 9px', borderRadius: 5, fontSize: '0.73rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{c.stage?.replace('_',' ')}</span></td>
                  <td style={tdStyle}>
                    <select value={c.stage} onChange={e => updateStage(c.id, e.target.value)} style={{ ...inpStyle, padding: '5px 8px', fontSize: '0.78rem' }}>
                      {STAGES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No candidates found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddCandidateModal jobs={jobs} onClose={() => setShowAdd(false)} onSaved={load} />}
      {selected && <CandidateDetailModal candidate={selected} onClose={() => setSelected(null)} onRefresh={load} />}
    </div>
  );
}

function AddCandidateModal({ jobs, onClose, onSaved }) {
  const [form, setForm] = useState({ job_id: '', name: '', email: '', phone: '', current_company: '', experience_years: '', current_salary: '', expected_salary: '', notice_period: '', source: 'direct', skills: '' });
  const [resume, setResume] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.job_id || !form.name || !form.email) return alert('Job, name and email are required');
    setSaving(true);
    try {
      await recruitmentAPI.addCandidate({ ...form, resume });
      onSaved(); onClose();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 580, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 20px', fontWeight: 800 }}>Add Candidate</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lblStyle}>Job Posting *</label>
            <select value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))} style={inpStyle}>
              <option value="">Select Job</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          {[['name','Full Name *','text'], ['email','Email *','email'], ['phone','Phone','text'], ['current_company','Current Company','text'], ['experience_years','Experience (yrs)','number'], ['current_salary','Current Salary (₹)','number'], ['expected_salary','Expected Salary (₹)','number'], ['notice_period','Notice Period (days)','number']].map(([key, label, type]) => (
            <div key={key}>
              <label style={lblStyle}>{label}</label>
              <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inpStyle} />
            </div>
          ))}
          <div>
            <label style={lblStyle}>Source</label>
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inpStyle}>
              {SOURCES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={lblStyle}>Resume (PDF/Word)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResume(e.target.files[0])} style={{ fontSize: '0.82rem' }} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lblStyle}>Skills</label>
            <input type="text" value={form.skills || ''} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="React, Node.js, MySQL..." style={inpStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#e5e7eb', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '10px 24px', background: '#1C47C9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Adding...' : 'Add Candidate'}</button>
        </div>
      </div>
    </div>
  );
}

function CandidateDetailModal({ candidate, onClose, onRefresh }) {
  const [detail, setDetail] = useState(null);
  const [showInterview, setShowInterview] = useState(false);
  const [showOffer, setShowOffer] = useState(false);

  useEffect(() => {
    recruitmentAPI.getCandidate(candidate.id).then(r => setDetail(r.data)).catch(() => {});
  }, [candidate.id]);

  if (!detail) return null;
  const c = detail.candidate;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>{c.name}</h3>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 3 }}>{c.email} • {c.phone || 'No phone'}</div>
            <div style={{ marginTop: 6 }}><span style={{ color: STAGE_COLOR[c.stage], background: STAGE_BG[c.stage], padding: '3px 9px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>{c.stage?.replace('_',' ')}</span></div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, fontSize: '0.85rem' }}>
          {[['Job Applied', c.job_title], ['Current Company', c.current_company||'--'], ['Experience', c.experience_years ? `${c.experience_years} years` : '--'], ['Current Salary', fmtSalary(c.current_salary)], ['Expected Salary', fmtSalary(c.expected_salary)], ['Notice Period', c.notice_period ? `${c.notice_period} days` : '--'], ['Source', c.source?.replace('_',' ')], ['Applied', fmtDate(c.applied_at)]].map(([l,v]) => (
            <div key={l}><span style={{ color: '#6b7280', fontWeight: 600 }}>{l}:</span> <span style={{ color: 'var(--theme-text-strong,#374151)' }}>{v}</span></div>
          ))}
        </div>

        {c.skills && <div style={{ marginBottom: 16 }}><div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#6b7280', marginBottom: 6 }}>SKILLS</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{c.skills.split(',').map(s => <span key={s} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 5, fontSize: '0.78rem', fontWeight: 600 }}>{s.trim()}</span>)}</div></div>}

        {(detail.interviews || []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem' }}>Interview History</div>
            {detail.interviews.map(iv => (
              <div key={iv.id} style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 600 }}>{iv.round_name} -- {fmtDate(iv.scheduled_at)}</div>
                <div style={{ color: '#6b7280', marginTop: 4 }}>Status: {iv.status} | Outcome: {iv.outcome} {iv.rating ? `| Rating: ${iv.rating}/5` : ''}</div>
                {iv.feedback && <div style={{ color: '#374151', marginTop: 4 }}>{iv.feedback}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setShowInterview(true)} style={{ padding: '9px 18px', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer' }}>Schedule Interview</button>
          {['interview','technical','hr_round'].includes(c.stage) && <button onClick={() => setShowOffer(true)} style={{ padding: '9px 18px', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer' }}>Send Offer</button>}
        </div>

        {showInterview && <ScheduleInterviewModal candidateId={c.id} jobId={c.job_id} onClose={() => setShowInterview(false)} onSaved={() => { setShowInterview(false); recruitmentAPI.getCandidate(c.id).then(r => setDetail(r.data)); onRefresh(); }} />}
        {showOffer && <SendOfferModal candidateId={c.id} jobId={c.job_id} onClose={() => setShowOffer(false)} onSaved={() => { setShowOffer(false); onRefresh(); }} />}
      </div>
    </div>
  );
}

function ScheduleInterviewModal({ candidateId, jobId, onClose, onSaved }) {
  const [form, setForm] = useState({ round: 1, round_name: 'Technical Interview', scheduled_at: '', duration_mins: 60, interview_type: 'video', meet_link: '' });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.scheduled_at) return alert('Schedule date/time is required');
    setSaving(true);
    try { await recruitmentAPI.scheduleInterview({ candidate_id: candidateId, job_id: jobId, ...form }); onSaved(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, padding: 24, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h4 style={{ margin: '0 0 18px', fontWeight: 800 }}>Schedule Interview</h4>
        {[['round_name','Interview Round','text'],['meet_link','Meeting Link','url']].map(([k,l,t]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={lblStyle}>{l}</label>
            <input type={t} value={form[k]||''} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} style={inpStyle} />
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={lblStyle}>Date & Time</label><input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f=>({...f,scheduled_at:e.target.value}))} style={inpStyle} /></div>
          <div><label style={lblStyle}>Duration (mins)</label><input type="number" value={form.duration_mins} onChange={e => setForm(f=>({...f,duration_mins:e.target.value}))} style={inpStyle} /></div>
          <div><label style={lblStyle}>Type</label><select value={form.interview_type} onChange={e => setForm(f=>({...f,interview_type:e.target.value}))} style={inpStyle}>{['video','in_person','phone'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</select></div>
          <div><label style={lblStyle}>Round #</label><input type="number" value={form.round} onChange={e => setForm(f=>({...f,round:e.target.value}))} style={inpStyle} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: '#e5e7eb', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '9px 20px', background: '#1C47C9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>{saving?'Scheduling...':'Schedule'}</button>
        </div>
      </div>
    </div>
  );
}

function SendOfferModal({ candidateId, jobId, onClose, onSaved }) {
  const [form, setForm] = useState({ offered_salary: '', joining_date: '', offer_date: new Date().toISOString().slice(0,10), expiry_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await recruitmentAPI.createOffer({ candidate_id: candidateId, job_id: jobId, ...form }); onSaved(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, padding: 24, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h4 style={{ margin: '0 0 18px', fontWeight: 800 }}>Send Offer Letter</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[['offered_salary','Offered Salary (₹)','number'],['joining_date','Joining Date','date'],['offer_date','Offer Date','date'],['expiry_date','Expiry Date','date']].map(([k,l,t]) => (
            <div key={k}><label style={lblStyle}>{l}</label><input type={t} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={inpStyle} /></div>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}><label style={lblStyle}>Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{...inpStyle,width:'100%',resize:'vertical'}} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: '#e5e7eb', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '9px 20px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>{saving?'Sending...':'Send Offer'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Interviews tab ────────────────────────────────────────────────────────────
function InterviewsTab() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recruitmentAPI.getCandidates({}).then(r => {
      const all = r.data?.candidates || [];
      // Collect all scheduled interviews -- fetch per candidate detail is too expensive
      // Show candidates in interview stages as a list
      setInterviews(all.filter(c => ['interview','technical','hr_round'].includes(c.stage)));
    }).catch(()=>{}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 14, color: '#6b7280', fontSize: '0.85rem' }}>Candidates currently in interview stages</div>
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div> : (
        <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead><tr style={{ background: 'var(--table-header-bg,#f9fafb)' }}>
              {['Candidate','Job','Stage','Contact'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {interviews.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--card-border,#f3f4f6)', background: i%2===0?'transparent':'var(--table-row-alt,#fafafa)' }}>
                  <td style={tdStyle}><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: '0.76rem', color: '#9ca3af' }}>{c.email}</div></td>
                  <td style={tdStyle}>{c.job_title}</td>
                  <td style={tdStyle}><span style={{ color: STAGE_COLOR[c.stage], background: STAGE_BG[c.stage], padding: '3px 9px', borderRadius: 5, fontSize: '0.73rem', fontWeight: 700, textTransform: 'capitalize' }}>{c.stage?.replace('_',' ')}</span></td>
                  <td style={tdStyle}>{c.phone || '--'}</td>
                </tr>
              ))}
              {interviews.length === 0 && <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No interviews in progress</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const lblStyle = { display: 'block', fontWeight: 600, fontSize: '0.78rem', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' };
const inpStyle = { padding: '8px 12px', borderRadius: 7, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.88rem', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#111)', width: '100%', boxSizing: 'border-box' };
const tdStyle = { padding: '11px 14px', color: 'var(--theme-text-strong,#374151)', verticalAlign: 'middle' };
