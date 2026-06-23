import React, { useState, useEffect } from 'react';
import { leadsAPI } from '../../../services/leadsAPI';

const STATUS_CONFIG = {
  new:       { label: 'New',       color: '#1d4ed8', bg: '#dbeafe' },
  contacted: { label: 'Contacted', color: '#b45309', bg: '#fef3c7' },
  qualified: { label: 'Qualified', color: '#15803d', bg: '#dcfce7' },
  lost:      { label: 'Lost',      color: '#b91c1c', bg: '#fee2e2' },
  converted: { label: 'Converted', color: '#7c3aed', bg: '#ede9fe' },
};
const ALL_STATUSES = Object.keys(STATUS_CONFIG);

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span style={{ color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

export default function LeadsManagement() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [viewLead, setViewLead] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ open: false, lead: null, status: '', notes: '' });
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { fetchLeads(); }, [filterStatus]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await leadsAPI.getAll({ status: filterStatus });
      setLeads(res.data?.leads || []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (lead) => {
    setStatusUpdate({ open: true, lead, status: lead.status, notes: lead.notes || '' });
  };

  const handleStatusSave = async () => {
    setUpdating(true);
    try {
      await leadsAPI.updateStatus(statusUpdate.lead.id, statusUpdate.status, statusUpdate.notes);
      setToast('Lead status updated');
      setStatusUpdate({ open: false, lead: null, status: '', notes: '' });
      fetchLeads();
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Failed to update status');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = leads.filter(l =>
    !search ||
    l.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.submitted_by_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const stats = ALL_STATUSES.reduce((acc, s) => { acc[s] = leads.filter(l => l.status === s).length; return acc; }, {});

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--theme-text-strong,#111)' }}>Leads Management</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--theme-text-muted,#6b7280)', fontSize: '0.9rem' }}>
          Track and manage leads submitted by employees
        </p>
      </div>

      {toast && (
        <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 600 }}>{toast}</div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {ALL_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              style={{ background: filterStatus === s ? cfg.bg : 'var(--card-bg,#fff)', border: `1.5px solid ${filterStatus === s ? cfg.color : 'var(--card-border,#e5e7eb)'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.color }}>{stats[s]}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600, marginTop: 2 }}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, company, employee, email..."
          style={{ flex: 1, minWidth: 240, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.9rem', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#111)' }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.9rem', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#111)', minWidth: 160 }}>
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
        {(filterStatus || search) && (
          <button onClick={() => { setFilterStatus(''); setSearch(''); }} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#6b7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>
            Clear
          </button>
        )}
      </div>

      {/* Status Update Modal */}
      {statusUpdate.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 30, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '1.05rem', color: 'var(--theme-text-strong,#111)' }}>Update Lead Status</h3>
            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '0.88rem' }}>{statusUpdate.lead?.lead_name}</p>

            <label style={labelStyle}>Status</label>
            <select value={statusUpdate.status} onChange={e => setStatusUpdate(p => ({ ...p, status: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 16 }}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>

            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={statusUpdate.notes} onChange={e => setStatusUpdate(p => ({ ...p, notes: e.target.value }))}
              style={{ ...inputStyle, height: 90, resize: 'vertical', marginBottom: 20 }} placeholder="Add remarks or follow-up notes..." />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setStatusUpdate({ open: false, lead: null, status: '', notes: '' })}
                style={{ ...btnStyle, background: 'var(--card-border,#e5e7eb)', color: 'var(--theme-text-strong,#374151)' }}>Cancel</button>
              <button onClick={handleStatusSave} disabled={updating}
                style={{ ...btnStyle, background: '#1C47C9', color: '#fff', opacity: updating ? 0.7 : 1 }}>
                {updating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--theme-text-strong,#111)' }}>{viewLead.lead_name}</h3>
                {viewLead.company_name && <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: '0.88rem' }}>{viewLead.company_name}</p>}
              </div>
              <StatusBadge status={viewLead.status} />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: '#374151' }}>
              <span style={{ fontWeight: 600 }}>Submitted by: </span>{viewLead.submitted_by_name} &nbsp;·&nbsp; {fmtDate(viewLead.created_at)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: '0.88rem', marginBottom: 16 }}>
              {[
                ['Email', viewLead.email],
                ['Phone', viewLead.phone],
                ['Source', viewLead.source],
                ['Industry', viewLead.industry],
                ['Budget', viewLead.budget ? `₹${Number(viewLead.budget).toLocaleString()}` : null],
              ].map(([label, val]) => val ? (
                <div key={label}>
                  <div style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem', marginBottom: 2 }}>{label.toUpperCase()}</div>
                  <div style={{ color: 'var(--theme-text-strong,#111)', fontWeight: 500 }}>{val}</div>
                </div>
              ) : null)}
            </div>
            {viewLead.requirements && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem', marginBottom: 4 }}>REQUIREMENTS</div>
                <p style={{ margin: 0, color: 'var(--theme-text-strong,#111)', fontSize: '0.88rem', lineHeight: 1.55 }}>{viewLead.requirements}</p>
              </div>
            )}
            {viewLead.notes && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem', marginBottom: 4 }}>NOTES</div>
                <p style={{ margin: 0, color: 'var(--theme-text-strong,#111)', fontSize: '0.88rem', lineHeight: 1.55 }}>{viewLead.notes}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setViewLead(null); openStatusModal(viewLead); }}
                style={{ ...btnStyle, background: '#1C47C9', color: '#fff' }}>Update Status</button>
              <button onClick={() => setViewLead(null)}
                style={{ ...btnStyle, background: 'var(--card-border,#e5e7eb)', color: 'var(--theme-text-strong,#374151)' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading leads...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>No leads found</div>
        </div>
      ) : (
        <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg,#f9fafb)', borderBottom: '2px solid var(--card-border,#e5e7eb)' }}>
                {['Lead Name', 'Company', 'Contact', 'Source / Industry', 'Budget', 'Submitted By', 'Status', 'Date', ''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--theme-text-muted,#6b7280)', fontSize: '0.76rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr key={lead.id} style={{ borderBottom: '1px solid var(--card-border,#f3f4f6)', background: i % 2 === 0 ? 'transparent' : 'var(--table-row-alt,#fafafa)' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: 'var(--theme-text-strong,#111)' }}>{lead.lead_name}</div>
                  </td>
                  <td style={tdStyle}>{lead.company_name || '--'}</td>
                  <td style={tdStyle}>
                    {lead.email && <div style={{ color: '#1C47C9', fontSize: '0.83rem' }}>{lead.email}</div>}
                    {lead.phone && <div style={{ color: '#6b7280', fontSize: '0.81rem' }}>{lead.phone}</div>}
                    {!lead.email && !lead.phone && '--'}
                  </td>
                  <td style={tdStyle}>
                    {lead.source && <div>{lead.source}</div>}
                    {lead.industry && <div style={{ color: '#6b7280', fontSize: '0.81rem' }}>{lead.industry}</div>}
                    {!lead.source && !lead.industry && '--'}
                  </td>
                  <td style={tdStyle}>{lead.budget ? `₹${Number(lead.budget).toLocaleString()}` : '--'}</td>
                  <td style={tdStyle}>{lead.submitted_by_name}</td>
                  <td style={tdStyle}><StatusBadge status={lead.status} /></td>
                  <td style={tdStyle}>{fmtDate(lead.created_at)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setViewLead(lead)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#374151', fontSize: '0.79rem', fontWeight: 600 }}>
                        View
                      </button>
                      <button onClick={() => openStatusModal(lead)} style={{ background: '#1C47C9', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#fff', fontSize: '0.79rem', fontWeight: 600 }}>
                        Status
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--card-border,#e5e7eb)', color: '#9ca3af', fontSize: '0.82rem' }}>
            Showing {filtered.length} of {leads.length} leads
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontWeight: 600, fontSize: '0.82rem', color: 'var(--theme-text-muted,#6b7280)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.9rem', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#111)', boxSizing: 'border-box' };
const btnStyle = { padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' };
const tdStyle = { padding: '11px 14px', color: 'var(--theme-text-strong,#374151)', verticalAlign: 'middle' };
