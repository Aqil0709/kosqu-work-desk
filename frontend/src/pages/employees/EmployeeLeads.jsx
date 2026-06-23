import React, { useState, useEffect } from 'react';
import { leadsAPI } from '../../services/leadsAPI';

const STATUS_CONFIG = {
  new:       { label: 'New',       color: '#1d4ed8', bg: '#dbeafe' },
  contacted: { label: 'Contacted', color: '#b45309', bg: '#fef3c7' },
  qualified: { label: 'Qualified', color: '#15803d', bg: '#dcfce7' },
  lost:      { label: 'Lost',      color: '#b91c1c', bg: '#fee2e2' },
  converted: { label: 'Converted', color: '#7c3aed', bg: '#ede9fe' },
};

const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email', 'Social Media', 'Event', 'Other'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Education', 'Manufacturing', 'Real Estate', 'Other'];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span style={{ color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const EMPTY_FORM = {
  lead_name: '', company_name: '', email: '', phone: '',
  source: '', industry: '', budget: '', requirements: '', notes: '',
};

export default function EmployeeLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewLead, setViewLead] = useState(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await leadsAPI.getMyLeads();
      setLeads(res.data?.leads || []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditLead(null); setError(''); setShowForm(true); };
  const openEdit = (lead) => {
    setForm({
      lead_name: lead.lead_name || '', company_name: lead.company_name || '',
      email: lead.email || '', phone: lead.phone || '', source: lead.source || '',
      industry: lead.industry || '', budget: lead.budget || '',
      requirements: lead.requirements || '', notes: lead.notes || '',
    });
    setEditLead(lead);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lead_name.trim()) { setError('Lead name is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (editLead) {
        await leadsAPI.updateMy(editLead.id, form);
        setSuccess('Lead updated successfully');
      } else {
        await leadsAPI.create(form);
        setSuccess('Lead submitted successfully');
      }
      setShowForm(false);
      fetchLeads();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save lead');
    } finally {
      setSubmitting(false);
    }
  };

  const s = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--theme-text-strong, #111)' }}>My Leads</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--theme-text-muted, #6b7280)', fontSize: '0.9rem' }}>
            Track and submit potential business leads
          </p>
        </div>
        <button onClick={openAdd} style={{
          background: '#1C47C9', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}>
          + Add Lead
        </button>
      </div>

      {success && (
        <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 600 }}>
          {success}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: '1.15rem', color: 'var(--theme-text-strong, #111)' }}>
              {editLead ? 'Edit Lead' : 'Submit New Lead'}
            </h3>

            {error && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: '0.88rem', fontWeight: 600 }}>{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Lead / Contact Name *</label>
                  <input value={form.lead_name} onChange={s('lead_name')} required style={inputStyle} placeholder="Full name of the contact" />
                </div>
                <div>
                  <label style={labelStyle}>Company Name</label>
                  <input value={form.company_name} onChange={s('company_name')} style={inputStyle} placeholder="Company or organization" />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.email} onChange={s('email')} style={inputStyle} placeholder="contact@example.com" />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={form.phone} onChange={s('phone')} style={inputStyle} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label style={labelStyle}>Source</label>
                  <select value={form.source} onChange={s('source')} style={inputStyle}>
                    <option value="">Select source</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Industry</label>
                  <select value={form.industry} onChange={s('industry')} style={inputStyle}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estimated Budget (₹)</label>
                  <input type="number" value={form.budget} onChange={s('budget')} style={inputStyle} placeholder="e.g. 50000" min="0" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Requirements</label>
                  <textarea value={form.requirements} onChange={s('requirements')} style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="What does the lead need?" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Additional Notes</label>
                  <textarea value={form.notes} onChange={s('notes')} style={{ ...inputStyle, height: 70, resize: 'vertical' }} placeholder="Any other details..." />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ ...btnStyle, background: 'var(--card-border, #e5e7eb)', color: 'var(--theme-text-strong, #374151)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={{ ...btnStyle, background: '#1C47C9', color: '#fff', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Saving...' : editLead ? 'Update Lead' : 'Submit Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--theme-text-strong,#111)' }}>{viewLead.lead_name}</h3>
                {viewLead.company_name && <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.88rem' }}>{viewLead.company_name}</p>}
              </div>
              <StatusBadge status={viewLead.status} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: '0.88rem' }}>
              {[
                ['Email', viewLead.email],
                ['Phone', viewLead.phone],
                ['Source', viewLead.source],
                ['Industry', viewLead.industry],
                ['Budget', viewLead.budget ? `₹${Number(viewLead.budget).toLocaleString()}` : null],
                ['Submitted', fmtDate(viewLead.created_at)],
              ].map(([label, val]) => val ? (
                <div key={label}>
                  <div style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.76rem', marginBottom: 2 }}>{label.toUpperCase()}</div>
                  <div style={{ color: 'var(--theme-text-strong,#111)', fontWeight: 500 }}>{val}</div>
                </div>
              ) : null)}
            </div>
            {viewLead.requirements && (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.76rem', marginBottom: 4 }}>REQUIREMENTS</div>
                <p style={{ margin: 0, color: 'var(--theme-text-strong,#111)', fontSize: '0.88rem', lineHeight: 1.5 }}>{viewLead.requirements}</p>
              </div>
            )}
            {viewLead.notes && (
              <div style={{ marginTop: 14 }}>
                <div style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.76rem', marginBottom: 4 }}>NOTES</div>
                <p style={{ margin: 0, color: 'var(--theme-text-strong,#111)', fontSize: '0.88rem', lineHeight: 1.5 }}>{viewLead.notes}</p>
              </div>
            )}
            <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {viewLead.status === 'new' && (
                <button onClick={() => { setViewLead(null); openEdit(viewLead); }} style={{ ...btnStyle, background: '#1C47C9', color: '#fff' }}>Edit</button>
              )}
              <button onClick={() => setViewLead(null)} style={{ ...btnStyle, background: 'var(--card-border,#e5e7eb)', color: 'var(--theme-text-strong,#374151)' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading leads...</div>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>No leads yet</div>
          <div style={{ fontSize: '0.88rem', marginTop: 4 }}>Click "Add Lead" to submit your first lead</div>
        </div>
      ) : (
        <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg,#f9fafb)', borderBottom: '2px solid var(--card-border,#e5e7eb)' }}>
                {['Lead Name', 'Company', 'Contact', 'Source', 'Budget', 'Status', 'Date', ''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--theme-text-muted,#6b7280)', fontSize: '0.78rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id} style={{ borderBottom: '1px solid var(--card-border,#f3f4f6)', background: i % 2 === 0 ? 'transparent' : 'var(--table-row-alt,#fafafa)' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: 'var(--theme-text-strong,#111)' }}>{lead.lead_name}</div>
                  </td>
                  <td style={tdStyle}>{lead.company_name || '--'}</td>
                  <td style={tdStyle}>
                    {lead.email && <div style={{ color: '#1C47C9' }}>{lead.email}</div>}
                    {lead.phone && <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>{lead.phone}</div>}
                    {!lead.email && !lead.phone && '--'}
                  </td>
                  <td style={tdStyle}>{lead.source || '--'}</td>
                  <td style={tdStyle}>{lead.budget ? `₹${Number(lead.budget).toLocaleString()}` : '--'}</td>
                  <td style={tdStyle}><StatusBadge status={lead.status} /></td>
                  <td style={tdStyle}>{fmtDate(lead.created_at)}</td>
                  <td style={tdStyle}>
                    <button onClick={() => setViewLead(lead)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#374151', fontSize: '0.8rem', fontWeight: 600 }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontWeight: 600, fontSize: '0.82rem', color: 'var(--theme-text-muted,#6b7280)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.9rem', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#111)', boxSizing: 'border-box' };
const btnStyle = { padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' };
const tdStyle = { padding: '12px 14px', color: 'var(--theme-text-strong,#374151)', verticalAlign: 'middle' };
