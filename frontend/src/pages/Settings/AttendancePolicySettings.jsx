import { useEffect, useState } from 'react';
import { attendancePolicyAPI } from '../../services/attendancePolicyAPI';
import './AttendancePolicySettings.css';

const AttendancePolicySettings = () => {
  const [form, setForm] = useState({
    late_arrival_warning_threshold: 3,
    late_arrival_block_threshold: 4,
    working_days_per_month: 26,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const load = async () => {
    try {
      setLoading(true);
      const res = await attendancePolicyAPI.get();
      if (res.data?.settings) setForm(res.data.settings);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load attendance policy settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);
    try {
      const res = await attendancePolicyAPI.update({
        late_arrival_warning_threshold: Number(form.late_arrival_warning_threshold),
        late_arrival_block_threshold: Number(form.late_arrival_block_threshold),
        working_days_per_month: Number(form.working_days_per_month),
      });
      setForm(res.data.settings);
      setMessage({ type: 'success', text: 'Attendance policy updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="lps-loading">Loading attendance policy settings…</div>;

  return (
    <div className="lps-root">
      <h2 className="lps-title">Attendance Policy Settings</h2>
      <p className="lps-sub">
        Configure the late-arrival warning/block thresholds and payroll working-days constant
        used across attendance deduction calculations for this organization.
      </p>

      {message.text && (
        <div className={`lps-message lps-message-${message.type}`}>{message.text}</div>
      )}

      <form className="lps-form" onSubmit={handleSave}>
        <div className="lps-field">
          <label>Late Arrival — Deduction Threshold (this many lates in a payroll month triggers a full-day deduction)</label>
          <input
            type="number"
            name="late_arrival_warning_threshold"
            value={form.late_arrival_warning_threshold}
            onChange={handleChange}
            min={1}
            max={30}
            required
          />
        </div>

        <div className="lps-field">
          <label>Late Arrival — Check-In Block Threshold (this many lates blocks further check-ins for the month)</label>
          <input
            type="number"
            name="late_arrival_block_threshold"
            value={form.late_arrival_block_threshold}
            onChange={handleChange}
            min={1}
            max={30}
            required
          />
        </div>

        <div className="lps-field">
          <label>Working Days per Month (used for daily-rate salary deduction calculations)</label>
          <input
            type="number"
            name="working_days_per_month"
            value={form.working_days_per_month}
            onChange={handleChange}
            min={20}
            max={31}
            required
          />
        </div>

        <button className="lps-save-btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default AttendancePolicySettings;
