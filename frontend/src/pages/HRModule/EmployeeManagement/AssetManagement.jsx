import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUS_COLORS = {
  assigned: '#22c55e',
  returned: 'var(--theme-text-muted,#6b7280)',
  lost: '#ef4444',
  damaged: '#f59e0b',
};

const ASSET_TYPES = ['Laptop', 'Mobile', 'Access Card', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Chair', 'Other'];

const AssetManagement = () => {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editAsset, setEditAsset] = useState(null);
  const [form, setForm] = useState({
    employee_id: '', asset_type: '', asset_name: '', serial_number: '', assigned_date: '', notes: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterEmployee) params.employee_id = filterEmployee;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get(`${API_BASE}/api/assets`, { headers: authHeader(), params });
      setAssets(res.data?.data || []);
    } catch (_) {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterEmployee, filterStatus]);

  useEffect(() => {
    axios.get(`${API_BASE}/api/employees`, { headers: authHeader() })
      .then(res => setEmployees(res.data?.employees || res.data?.data || []))
      .catch(() => setEmployees([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editAsset) {
        await axios.put(`${API_BASE}/api/assets/${editAsset.id}`, { ...form, status: editAsset.status }, { headers: authHeader() });
      } else {
        await axios.post(`${API_BASE}/api/assets`, form, { headers: authHeader() });
      }
      setShowForm(false);
      setEditAsset(null);
      setForm({ employee_id: '', asset_type: '', asset_name: '', serial_number: '', assigned_date: '', notes: '' });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving asset');
    }
  };

  const handleStatusUpdate = async (asset, status) => {
    try {
      await axios.put(`${API_BASE}/api/assets/${asset.id}`, { ...asset, status }, { headers: authHeader() });
      load();
    } catch (_) {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset?')) return;
    await axios.delete(`${API_BASE}/api/assets/${id}`, { headers: authHeader() });
    load();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Asset Management</h2>
        <button
          onClick={() => { setShowForm(true); setEditAsset(null); setForm({ employee_id: '', asset_type: '', asset_name: '', serial_number: '', assigned_date: '', notes: '' }); }}
          style={{ background: '#3b82f6', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600 }}
        >
          + Assign Asset
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={{ border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '7px 12px' }}>
          <option value="">All Employees</option>
          {employees.map(emp => (
            <option key={emp.user_id || emp.id} value={emp.user_id || emp.id}>
              {emp.first_name} {emp.last_name}
            </option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '7px 12px' }}>
          <option value="">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="returned">Returned</option>
          <option value="lost">Lost</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>

      {/* Asset Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleSubmit} style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 32, width: 480, maxWidth: '95vw', position: 'relative' }}>
            <button type="button" onClick={() => { setShowForm(false); setEditAsset(null); }} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--theme-text-muted,#9ca3af)', lineHeight: 1 }}>×</button>
            <h3 style={{ marginBottom: 20, fontWeight: 700 }}>{editAsset ? 'Edit Asset' : 'Assign New Asset'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Employee *</label>
                <select required value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }}>
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.user_id || emp.id} value={emp.user_id || emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employment_category || 'employee'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Asset Type *</label>
                <select required value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))} style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }}>
                  <option value="">Select Type</option>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Asset Name *</label>
                <input required value={form.asset_name} onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))} placeholder="e.g. Dell XPS 15, iPhone 14" style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Serial Number</label>
                <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Assigned Date</label>
                <input type="date" value={form.assigned_date} onChange={e => setForm(f => ({ ...f, assigned_date: e.target.value }))} style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ width: '100%', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => { setShowForm(false); setEditAsset(null); }} style={{ border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ background: '#3b82f6', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>
                {editAsset ? 'Update' : 'Assign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Asset Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading assets...</div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--theme-text-muted,#6b7280)' }}>No assets found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--theme-bg-muted,#f8fafc)', borderBottom: '2px solid var(--card-border,#e2e8f0)' }}>
                {['Employee', 'Asset Type', 'Asset Name', 'Serial No.', 'Assigned Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--theme-text,#374151)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id} style={{ borderBottom: '1px solid var(--card-border,#f1f5f9)' }}>
                  <td style={{ padding: '10px 14px' }}>{asset.first_name} {asset.last_name}</td>
                  <td style={{ padding: '10px 14px' }}>{asset.asset_type}</td>
                  <td style={{ padding: '10px 14px' }}>{asset.asset_name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--theme-text-muted,#6b7280)' }}>{asset.serial_number || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>{asset.assigned_date ? new Date(asset.assigned_date).toLocaleDateString('en-IN') : '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <select
                      value={asset.status}
                      onChange={e => handleStatusUpdate(asset, e.target.value)}
                      style={{ border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 6, padding: '4px 8px', background: STATUS_COLORS[asset.status] + '22', fontWeight: 600, color: STATUS_COLORS[asset.status] }}
                    >
                      <option value="assigned">Assigned</option>
                      <option value="returned">Returned</option>
                      <option value="lost">Lost</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => { setEditAsset(asset); setForm({ employee_id: asset.employee_id, asset_type: asset.asset_type, asset_name: asset.asset_name, serial_number: asset.serial_number || '', assigned_date: asset.assigned_date || '', notes: asset.notes || '' }); setShowForm(true); }}
                      style={{ background: '#3b82f6', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', marginRight: 6 }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(asset.id)}
                      style={{ background: '#ef4444', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                      Delete
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
};

export default AssetManagement;

