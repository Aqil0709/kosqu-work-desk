// frontend/src/pages/PTTM/views/ProjectDocs.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useApp } from '../context/PTTMContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const DOC_TYPES = ['PRD', 'Design', 'SOW', 'Meeting Notes', 'Other'];

export default function ProjectDocs() {
  const { projects } = useApp();
  const [selectedProject, setSelectedProject] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', doc_type: 'Other', url: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadDocs = async (projId) => {
    if (!projId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/pttm/project-docs/${projId}`, { headers: authHeader() });
      setDocs(res.data?.docs || []);
    } catch (_) {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(selectedProject); }, [selectedProject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('project_id', selectedProject);
      fd.append('title', form.title);
      fd.append('doc_type', form.doc_type);
      if (form.url) fd.append('url', form.url);
      if (file) fd.append('file', file);
      await axios.post(`${API_BASE}/api/pttm/project-docs`, fd, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
      });
      setShowForm(false);
      setForm({ title: '', doc_type: 'Other', url: '' });
      setFile(null);
      loadDocs(selectedProject);
    } catch (err) {
      alert(err.response?.data?.message || 'Error uploading document');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    await axios.delete(`${API_BASE}/api/pttm/project-docs/${id}`, { headers: authHeader() });
    loadDocs(selectedProject);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Project Documentation</h2>
        {selectedProject && (
          <button onClick={() => setShowForm(true)}
            style={{ background: '#3b82f6', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
            + Add Document
          </button>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Select Project</label>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
          style={{ border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 14px', minWidth: 280 }}>
          <option value="">-- Choose a project --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleSubmit} style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 32, width: 460, maxWidth: '95vw' }}>
            <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Add Document</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Document Type</label>
                <select value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}
                  style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }}>
                  {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>External URL (optional)</label>
                <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..." style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Upload File (optional)</label>
                <input type="file" onChange={e => setFile(e.target.files[0])} style={{ border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '6px', width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: '#3b82f6', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? 'Uploading...' : 'Add Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!selectedProject ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--theme-text-muted,#9ca3af)' }}>Select a project to view its documents.</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading documents...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--theme-text-muted,#9ca3af)' }}>No documents added yet. Click "+ Add Document" to get started.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {docs.map(doc => (
            <div key={doc.id} style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 10, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{doc.title}</div>
                <div style={{ fontSize: 13, color: 'var(--theme-text-muted,#6b7280)', marginTop: 3 }}>
                  {doc.doc_type} &middot; Added by {doc.first_name} {doc.last_name} &middot; {new Date(doc.created_at).toLocaleDateString('en-IN')}
                </div>
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#3b82f6', marginTop: 4, display: 'block' }}>
                    🔗 Open Link
                  </a>
                )}
                {doc.file_path && (
                  <a href={`${API_BASE}${doc.file_path}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#22c55e', marginTop: 4, display: 'block' }}>
                    📄 Download File
                  </a>
                )}
              </div>
              <button onClick={() => handleDelete(doc.id)} style={{ background: 'rgba(220,38,38,0.12)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

