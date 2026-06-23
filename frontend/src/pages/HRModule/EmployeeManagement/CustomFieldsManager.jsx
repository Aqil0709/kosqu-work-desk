import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'boolean', label: 'Yes/No' },
];

const CustomFieldsManager = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ field_name: '', field_key: '', field_type: 'text', field_options: '', is_required: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/custom-fields`, { headers: authHeader() });
      setFields(res.data?.data || []);
    } catch (_) {
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        field_options: form.field_type === 'dropdown' && form.field_options
          ? form.field_options.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
      };
      await axios.post(`${API_BASE}/api/custom-fields`, payload, { headers: authHeader() });
      setShowForm(false);
      setForm({ field_name: '', field_key: '', field_type: 'text', field_options: '', is_required: false });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating field');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this custom field?')) return;
    await axios.delete(`${API_BASE}/api/custom-fields/${id}`, { headers: authHeader() });
    load();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Custom Fields</h2>
          <p style={{ color: 'var(--theme-text-muted,#6b7280)', fontSize: 14 }}>Define additional fields that appear on every employee profile.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ background: '#3b82f6', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600 }}
        >
          + Add Field
        </button>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleSubmit} style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 32, width: 440, maxWidth: '95vw', position: 'relative' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--theme-text-muted,#9ca3af)', lineHeight: 1 }}>×</button>
            <h3 style={{ marginBottom: 20, fontWeight: 700 }}>New Custom Field</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Field Label *</label>
                <input required value={form.field_name} onChange={e => setForm(f => ({ ...f, field_name: e.target.value, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="e.g. Blood Group" style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Field Key (auto-generated)</label>
                <input value={form.field_key} readOnly style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px', background: 'var(--theme-bg-muted,#f8fafc)', color: 'var(--theme-text-muted,#6b7280)' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Field Type *</label>
                <select required value={form.field_type} onChange={e => setForm(f => ({ ...f, field_type: e.target.value }))} style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }}>
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {form.field_type === 'dropdown' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Options (comma-separated)</label>
                  <input value={form.field_options} onChange={e => setForm(f => ({ ...f, field_options: e.target.value }))}
                    placeholder="e.g. A+, B+, O+, AB+" style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }} />
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_required} onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} />
                Required field
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: '#3b82f6', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Create Field'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : fields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--theme-text-muted,#9ca3af)' }}>
          <p style={{ fontSize: 16 }}>No custom fields defined yet.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Click "Add Field" to create your first custom employee field.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map(field => (
            <div key={field.id} style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{field.field_name}</div>
                <div style={{ fontSize: 13, color: 'var(--theme-text-muted,#6b7280)', marginTop: 3 }}>
                  Key: <code style={{ background: 'var(--theme-bg-muted,#f1f5f9)', padding: '1px 6px', borderRadius: 4 }}>{field.field_key}</code>
                  &nbsp;·&nbsp; Type: {FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}
                  {field.is_required ? <span style={{ color: '#ef4444', marginLeft: 8 }}>• Required</span> : ''}
                </div>
                {field.field_options && (
                  <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#9ca3af)', marginTop: 4 }}>
                    Options: {(typeof field.field_options === 'string' ? JSON.parse(field.field_options) : field.field_options).join(', ')}
                  </div>
                )}
              </div>
              <button onClick={() => handleDelete(field.id)} style={{ background: 'rgba(220,38,38,0.12)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomFieldsManager;

