import React, { useState, useEffect, useRef } from 'react';
import { employeeDocumentAPI } from '../../services/employeeDocumentAPI';

const DOC_TYPE_CONFIG = {
  aadhaar:                { label: 'Aadhaar Card',             icon: '🪪', color: '#1d4ed8', bg: '#dbeafe' },
  pan:                    { label: 'PAN Card',                 icon: '💳', color: '#b45309', bg: '#fef3c7' },
  resume:                 { label: 'Resume / CV',              icon: '📄', color: '#7c3aed', bg: '#ede9fe' },
  bank_passbook:          { label: 'Bank Passbook',            icon: '🏦', color: '#15803d', bg: '#dcfce7' },
  experience_certificate: { label: 'Experience Certificate',   icon: '📜', color: '#0e7490', bg: '#cffafe' },
  education_certificate:  { label: 'Education Certificate',   icon: '🎓', color: '#c2410c', bg: '#ffedd5' },
  offer_letter:           { label: 'Offer Letter',             icon: '✉️', color: '#6b21a8', bg: '#f3e8ff' },
  other:                  { label: 'Other Document',           icon: '📎', color: '#6b7280', bg: '#f3f4f6' },
};

const DOC_TYPES = Object.keys(DOC_TYPE_CONFIG);

const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

export default function EmployeeDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ doc_type: 'aadhaar', doc_label: '' });
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await employeeDocumentAPI.getMyDocuments();
      setDocuments(res.data?.documents || []);
    } catch { setDocuments([]); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', form.doc_type);
      fd.append('doc_label', form.doc_label || file.name);
      await employeeDocumentAPI.upload(fd);
      setSuccess('Document uploaded successfully');
      setShowUpload(false);
      setForm({ doc_type: 'aadhaar', doc_label: '' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchDocs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      await employeeDocumentAPI.deleteMyDocument(id);
      setDocuments(d => d.filter(doc => doc.id !== id));
    } catch {
      setError('Failed to delete document');
    }
  };

  const grouped = DOC_TYPES.reduce((acc, type) => {
    acc[type] = documents.filter(d => d.doc_type === type);
    return acc;
  }, {});

  const filtered = filterType ? documents.filter(d => d.doc_type === filterType) : documents;

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--theme-text-strong,#111)' }}>My Documents</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--theme-text-muted,#6b7280)', fontSize: '0.9rem' }}>
            Upload and manage your KYC and employment documents
          </p>
        </div>
        <button onClick={() => { setShowUpload(true); setError(''); }} style={{
          background: '#1C47C9', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
        }}>
          + Upload Document
        </button>
      </div>

      {success && <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 600 }}>{success}</div>}
      {error && !showUpload && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 600 }}>{error}</div>}

      {/* Document type summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {DOC_TYPES.map(type => {
          const cfg = DOC_TYPE_CONFIG[type];
          const count = grouped[type]?.length || 0;
          return (
            <div key={type} onClick={() => setFilterType(filterType === type ? '' : type)}
              style={{ background: filterType === type ? cfg.bg : 'var(--card-bg,#fff)', border: `1.5px solid ${filterType === type ? cfg.color : 'var(--card-border,#e5e7eb)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{cfg.icon}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>{cfg.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: count > 0 ? cfg.color : '#d1d5db' }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: '1.1rem', color: 'var(--theme-text-strong,#111)' }}>Upload Document</h3>
            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: '0.88rem', fontWeight: 600 }}>{error}</div>}
            <form onSubmit={handleUpload}>
              <label style={labelStyle}>Document Type</label>
              <select value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))} style={{ ...inputStyle, marginBottom: 16 }}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_CONFIG[t].icon} {DOC_TYPE_CONFIG[t].label}</option>)}
              </select>

              <label style={labelStyle}>Document Label</label>
              <input value={form.doc_label} onChange={e => setForm(f => ({ ...f, doc_label: e.target.value }))}
                style={{ ...inputStyle, marginBottom: 16 }} placeholder="e.g. Aadhaar Card - Front & Back" />

              <label style={labelStyle}>File (PDF, Image, Word -- max 10MB)</label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={e => setFile(e.target.files[0])} required
                style={{ marginBottom: 24, fontSize: '0.88rem', color: 'var(--theme-text-strong,#374151)' }} />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowUpload(false); setError(''); setFile(null); }}
                  style={{ ...btnStyle, background: 'var(--card-border,#e5e7eb)', color: '#374151' }}>Cancel</button>
                <button type="submit" disabled={uploading}
                  style={{ ...btnStyle, background: '#1C47C9', color: '#fff', opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading documents...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📂</div>
          <div style={{ fontWeight: 600 }}>{filterType ? `No ${DOC_TYPE_CONFIG[filterType]?.label} documents yet` : 'No documents uploaded yet'}</div>
          <div style={{ fontSize: '0.88rem', marginTop: 4 }}>Click "Upload Document" to add your first document</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(doc => {
            const cfg = DOC_TYPE_CONFIG[doc.doc_type] || DOC_TYPE_CONFIG.other;
            const fileUrl = employeeDocumentAPI.getFileUrl(doc.file_path);
            return (
              <div key={doc.id} style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e5e7eb)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--theme-text-strong,#111)', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.doc_label}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 5, fontSize: '0.74rem', fontWeight: 700 }}>{cfg.label}</span>
                    {doc.file_size > 0 && <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{fmtSize(doc.file_size)}</span>}
                    <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{fmtDate(doc.uploaded_at)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <a href={fileUrl} target="_blank" rel="noreferrer"
                    style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                    View
                  </a>
                  <a href={fileUrl} download={doc.file_name}
                    style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #1C47C9', background: '#1C47C9', color: '#fff', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                    Download
                  </a>
                  <button onClick={() => handleDelete(doc.id, doc.doc_label)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #fca5a5', background: 'transparent', color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontWeight: 600, fontSize: '0.82rem', color: 'var(--theme-text-muted,#6b7280)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.9rem', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#111)', boxSizing: 'border-box' };
const btnStyle = { padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' };
