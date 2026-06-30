import React, { useState, useEffect } from 'react';
import { locationAPI } from '../../services/locationAPI';
import { employeeAPI } from '../../services/employeeAPI';
import { dialog } from '../../components/ui/CustomDialog';

const EMPTY_FORM = {
  name: '', location_type: 'head_office',
  latitude: '', longitude: '', radius_meters: 100, address: '',
  check_in_time: '', check_out_time: '', grace_period_minutes: 15,
};

const WorkLocations = () => {
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignLocId, setAssignLocId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  const flash = (msg, isError = false) => {
    isError ? setError(msg) : setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [locRes, empRes] = await Promise.all([
        locationAPI.getAll(),
        employeeAPI.getAll(),
      ]);
      setLocations(locRes.data?.locations || []);
      const emp = empRes.data?.users || empRes.data?.employees || [];
      setEmployees(emp);
    } catch (e) {
      flash(e.response?.data?.message || 'Failed to load', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (loc) => {
    setForm({
      name: loc.name, location_type: loc.location_type,
      latitude: loc.latitude, longitude: loc.longitude,
      radius_meters: loc.radius_meters, address: loc.address || '',
      check_in_time: loc.check_in_time ? loc.check_in_time.slice(0,5) : '',
      check_out_time: loc.check_out_time ? loc.check_out_time.slice(0,5) : '',
      grace_period_minutes: loc.grace_period_minutes ?? 15,
    });
    setEditingId(loc.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.latitude || !form.longitude) {
      flash('Name, Latitude and Longitude are required.', true);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await locationAPI.update(editingId, form);
        flash('Location updated.');
      } else {
        await locationAPI.create(form);
        flash('Location created.');
      }
      setShowForm(false);
      load();
    } catch (e) {
      flash(e.response?.data?.message || 'Save failed', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await dialog.danger('Delete this location? This cannot be undone.')) return;
    try {
      await locationAPI.delete(id);
      flash('Location deleted.');
      load();
    } catch (e) {
      flash('Delete failed', true);
    }
  };

  const handleAssign = async () => {
    if (!assignEmpId || !assignLocId) { flash('Select employee and location', true); return; }
    setAssignSaving(true);
    try {
      await locationAPI.assignEmployee(assignEmpId, assignLocId);
      flash('Employee assigned to location.');
      setAssignEmpId('');
      setAssignLocId('');
    } catch (e) {
      flash(e.response?.data?.message || 'Assign failed', true);
    } finally {
      setAssignSaving(false);
    }
  };

  const useMyGPS = () => {
    if (!navigator.geolocation) { flash('GPS not supported', true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm(f => ({
        ...f,
        latitude: pos.coords.latitude.toFixed(8),
        longitude: pos.coords.longitude.toFixed(8),
      })),
      () => flash('Could not get GPS location', true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)' }}>Work Locations</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--theme-text-muted,#6b7280)', fontSize: 13 }}>
            Set office/client site locations. Employees can only check in within the radius.
          </p>
        </div>
        <button onClick={openAdd} style={btnStyle('#6366f1')}>+ Add Location</button>
      </div>

      {error && <div style={alertStyle('rgba(185,28,28,0.1)','#b91c1c','rgba(185,28,28,0.3)')}>{error}</div>}
      {success && <div style={alertStyle('rgba(21,128,61,0.1)','#15803d','rgba(21,128,61,0.3)')}>{success}</div>}

      {/* Locations Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--theme-text-muted,#6b7280)' }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--card-bg,#fff)', borderRadius: 10, border: '1px solid var(--card-border,#e5e7eb)', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg,#f9fafb)' }}>
                {['Name','Type','Check In','Check Out','Grace','Radius (m)','Address','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--theme-text-strong,#374151)', borderBottom: '1px solid var(--card-border,#e5e7eb)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--theme-text-muted,#9ca3af)' }}>No locations configured yet</td></tr>
              ) : locations.map(loc => {
                const fmtT = (t) => {
                  if (!t) return '--';
                  const [h,m] = t.split(':').map(Number);
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  return `${h%12||12}:${String(m).padStart(2,'0')} ${ampm}`;
                };
                return (
                <tr key={loc.id} style={{ borderBottom: '1px solid var(--card-border,#f3f4f6)' }}>
                  <td style={td}><b>{loc.name}</b></td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: loc.location_type === 'head_office' ? 'rgba(37,99,235,0.1)' : 'rgba(180,83,9,0.1)',
                      color: loc.location_type === 'head_office' ? '#1d4ed8' : '#b45309',
                    }}>
                      {loc.location_type === 'head_office' ? 'Head Office' : 'Client Site'}
                    </span>
                  </td>
                  <td style={{...td, color: '#15803d', fontWeight: 600}}>{fmtT(loc.check_in_time)}</td>
                  <td style={{...td, color: '#b91c1c', fontWeight: 600}}>{fmtT(loc.check_out_time)}</td>
                  <td style={td}>{loc.grace_period_minutes ?? 15}m</td>
                  <td style={td}>{loc.radius_meters}m</td>
                  <td style={td}>{loc.address || '--'}</td>
                  <td style={td}>
                    <button onClick={() => openEdit(loc)} style={{ ...btnStyle('#3b82f6'), padding: '4px 10px', fontSize: 12, marginRight: 6 }}>Edit</button>
                    <button onClick={() => handleDelete(loc.id)} style={{ ...btnStyle('#ef4444'), padding: '4px 10px', fontSize: 12 }}>Delete</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Employee */}
      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e5e7eb)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)' }}>Assign Employee to Location</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Employee</label>
            <select value={assignEmpId} onChange={e => setAssignEmpId(e.target.value)} style={inputStyle}>
              <option value="">Select employee</option>
              {employees.map(emp => (
                <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                  {`${emp.first_name || ''} ${emp.last_name || ''}`.trim()} ({emp.employee_code || emp.employee_id || emp.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <select value={assignLocId} onChange={e => setAssignLocId(e.target.value)} style={inputStyle}>
              <option value="">Select location</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} ({loc.location_type === 'head_office' ? 'HO' : 'Client'})</option>
              ))}
            </select>
          </div>
          <button onClick={handleAssign} disabled={assignSaving} style={btnStyle('#6366f1')}>
            {assignSaving ? 'Saving...' : 'Assign'}
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleSave} style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative', border: '1px solid var(--card-border,#e5e7eb)' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--theme-text-muted,#9ca3af)', lineHeight: 1 }}>×</button>
            <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)' }}>{editingId ? 'Edit Location' : 'Add Location'}</h3>

            <label style={labelStyle}>Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={{...inputStyle, width: '100%', marginBottom: 14}} placeholder="e.g. Head Office Pune" required />

            <label style={labelStyle}>Type *</label>
            <select value={form.location_type} onChange={e => setForm(f => ({...f, location_type: e.target.value}))} style={{...inputStyle, width: '100%', marginBottom: 14}}>
              <option value="head_office">Head Office</option>
              <option value="client_site">Client Site</option>
            </select>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Latitude *</label>
                <input value={form.latitude} onChange={e => setForm(f => ({...f, latitude: e.target.value}))} style={{...inputStyle, width: '100%'}} placeholder="18.52043" required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Longitude *</label>
                <input value={form.longitude} onChange={e => setForm(f => ({...f, longitude: e.target.value}))} style={{...inputStyle, width: '100%'}} placeholder="73.85674" required />
              </div>
            </div>

            <button type="button" onClick={useMyGPS} style={{ ...btnStyle('#10b981'), fontSize: 12, padding: '5px 12px', marginBottom: 14 }}>
              📍 Use My Current GPS Location
            </button>

            <label style={labelStyle}>Allowed Radius (metres)</label>
            <input type="number" value={form.radius_meters} onChange={e => setForm(f => ({...f, radius_meters: Number(e.target.value)}))} style={{...inputStyle, width: '100%', marginBottom: 14}} min={50} max={2000} />

            <label style={labelStyle}>Address (optional)</label>
            <textarea value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} style={{...inputStyle, width: '100%', height: 72, resize: 'vertical', marginBottom: 14}} placeholder="Full address of the location" />

            {/* Shift timing for this location */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 10 }}>⏰ Office Hours (optional — leave blank for flexible/WFH locations)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Check-in Time</label>
                  <input type="time" value={form.check_in_time} onChange={e => setForm(f => ({...f, check_in_time: e.target.value}))} style={{...inputStyle, width: '100%'}} />
                </div>
                <div>
                  <label style={labelStyle}>Check-out Time</label>
                  <input type="time" value={form.check_out_time} onChange={e => setForm(f => ({...f, check_out_time: e.target.value}))} style={{...inputStyle, width: '100%'}} />
                </div>
                <div>
                  <label style={labelStyle}>Grace Period (min)</label>
                  <input type="number" value={form.grace_period_minutes} min={0} max={60} onChange={e => setForm(f => ({...f, grace_period_minutes: Number(e.target.value)}))} style={{...inputStyle, width: '100%'}} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                E.g. Head Office 9:30 AM → 6:30 PM, Client Site A 10:00 AM → 6:00 PM. Grace period = allowed late arrival minutes.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={btnStyle('#9ca3af')}>Cancel</button>
              <button type="submit" disabled={saving} style={btnStyle('#6366f1')}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
});
const alertStyle = (bg, color, borderColor) => ({
  background: bg, color, border: `1px solid ${borderColor || color}`, borderRadius: 8,
  padding: '10px 14px', marginBottom: 16, fontSize: 13,
});
const td = { padding: '10px 14px', color: 'var(--theme-text,#374151)' };
const inputStyle = {
  padding: '8px 12px', border: '1px solid var(--input-border,#d1d5db)', borderRadius: 8,
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  background: 'var(--input-bg,#fff)', color: 'var(--theme-text,#374151)',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--theme-text-strong,#374151)', marginBottom: 4 };

export default WorkLocations;
