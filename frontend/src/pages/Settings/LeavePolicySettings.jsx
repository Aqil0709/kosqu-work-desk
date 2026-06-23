import { useEffect, useState } from 'react';
import { leaveAPI } from '../../services/leaveAPI';
import './LeavePolicySettings.css';

const emptyLeaveType = {
  name: '',
  max_days: '',
  is_paid: true
};

const LeavePolicySettings = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypeForm, setLeaveTypeForm] = useState(emptyLeaveType);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadLeaveTypes = async () => {
    try {
      setLoading(true);
      const response = await leaveAPI.getLeaveTypeSettings();
      setLeaveTypes(response.data?.leave_types || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to load leave policy settings'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const updateDraftType = (typeId, key, value) => {
    setLeaveTypes((prev) => prev.map((type) => (
      type.id === typeId ? { ...type, [key]: value } : type
    )));
  };

  const validateMaxDays = (value) => {
    const maxDays = Number.parseInt(value, 10);
    if (!Number.isInteger(maxDays) || maxDays < 0 || maxDays > 365) {
      setMessage({ type: 'error', text: 'Annual days must be between 0 and 365.' });
      return null;
    }
    return maxDays;
  };

  const saveLeaveType = async (type) => {
    const maxDays = validateMaxDays(type.max_days);
    if (maxDays === null) return;

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await leaveAPI.updateLeaveType(type.id, {
        max_days: maxDays,
        is_paid: Boolean(type.is_paid),
        is_active: Boolean(type.is_active)
      });
      setMessage({ type: 'success', text: 'Leave policy updated.' });
      await loadLeaveTypes();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save leave policy'
      });
    } finally {
      setSaving(false);
    }
  };

  const createLeaveType = async (event) => {
    event.preventDefault();
    const name = leaveTypeForm.name.trim();
    const maxDays = validateMaxDays(leaveTypeForm.max_days);

    if (!name) {
      setMessage({ type: 'error', text: 'Leave type name is required.' });
      return;
    }

    if (maxDays === null) return;

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await leaveAPI.createLeaveType({
        name,
        max_days: maxDays,
        is_paid: leaveTypeForm.is_paid
      });
      setLeaveTypeForm(emptyLeaveType);
      setMessage({ type: 'success', text: 'Leave type added.' });
      await loadLeaveTypes();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to add leave type'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="leave-policy-page app-page">
      <div className="leave-policy-header app-page-header">
        <div>
          <h2 className="app-page-title">Leave Policy Settings</h2>
          <p className="app-page-subtitle">Configure annual leave allocation and leave type availability.</p>
        </div>
      </div>

      {message.text && (
        <div className={`app-message ${message.type === 'success' ? 'app-message-success' : 'app-message-error'}`}>
          {message.text}
        </div>
      )}

      <section className="leave-policy-panel app-card app-card-padded">
        <h3 className="app-section-title">Add Leave Type</h3>
        <form className="leave-policy-form app-form" onSubmit={createLeaveType}>
          <div className="app-form-group">
            <label>Leave Type *</label>
            <input
              value={leaveTypeForm.name}
              onChange={(event) => setLeaveTypeForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Comp Off"
              maxLength={50}
              disabled={saving}
            />
          </div>
          <div className="app-form-group">
            <label>Annual Days *</label>
            <input
              type="number"
              min="0"
              max="365"
              value={leaveTypeForm.max_days}
              onChange={(event) => setLeaveTypeForm((prev) => ({ ...prev, max_days: event.target.value }))}
              placeholder="12"
              disabled={saving}
            />
          </div>
          <label className="leave-policy-check">
            <input
              type="checkbox"
              checked={leaveTypeForm.is_paid}
              onChange={(event) => setLeaveTypeForm((prev) => ({ ...prev, is_paid: event.target.checked }))}
              disabled={saving}
            />
            Paid
          </label>
          <button type="submit" className="app-button app-button-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add Type'}
          </button>
        </form>
      </section>

      <section className="leave-policy-panel app-card">
        <div className="leave-policy-table-header">
          <h3 className="app-section-title">Configured Leave Types</h3>
          <span>{leaveTypes.length} total</span>
        </div>

        {loading ? (
          <div className="leave-policy-empty">Loading leave policy settings...</div>
        ) : (
          <div className="leave-policy-table-wrap">
            <table className="leave-policy-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Annual Days</th>
                  <th>Paid</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((type) => (
                  <tr key={type.id}>
                    <td>
                      <strong>{type.name}</strong>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={type.max_days}
                        onChange={(event) => updateDraftType(type.id, 'max_days', event.target.value)}
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <label className="leave-policy-check">
                        <input
                          type="checkbox"
                          checked={Boolean(type.is_paid)}
                          onChange={(event) => updateDraftType(type.id, 'is_paid', event.target.checked ? 1 : 0)}
                          disabled={saving}
                        />
                        Paid
                      </label>
                    </td>
                    <td>
                      <label className="leave-policy-check">
                        <input
                          type="checkbox"
                          checked={Boolean(type.is_active)}
                          onChange={(event) => updateDraftType(type.id, 'is_active', event.target.checked ? 1 : 0)}
                          disabled={saving}
                        />
                        Active
                      </label>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="app-button app-button-secondary"
                        onClick={() => saveLeaveType(type)}
                        disabled={saving}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leaveTypes.length === 0 && (
              <div className="leave-policy-empty">No leave types configured yet.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default LeavePolicySettings;
