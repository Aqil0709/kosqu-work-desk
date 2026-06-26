import { useState } from 'react';
import { authAPI } from '../../services/api';
import './ChangePassword.css';

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
);

const ChangePassword = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const toggleShow = (field) => setShow(prev => ({ ...prev, [field]: !prev[field] }));

  const validate = () => {
    if (!form.currentPassword) return 'Current password is required.';
    if (!form.newPassword) return 'New password is required.';
    if (form.newPassword.length < 8) return 'New password must be at least 8 characters.';
    if (!/[A-Z]/.test(form.newPassword)) return 'New password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(form.newPassword)) return 'New password must contain at least one number.';
    if (!/[^A-Za-z0-9]/.test(form.newPassword)) return 'New password must contain at least one special character.';
    if (form.newPassword !== form.confirmPassword) return 'New password and confirm password do not match.';
    if (form.currentPassword === form.newPassword) return 'New password must be different from current password.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await authAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      if (res.data?.success) {
        setSuccess('Password changed successfully!');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(res.data?.message || 'Failed to change password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({ label, name, showKey }) => (
    <div className="cp-field">
      <label className="cp-label">{label}</label>
      <div className="cp-input-wrap">
        <input
          type={show[showKey] ? 'text' : 'password'}
          name={name}
          value={form[name]}
          onChange={handleChange}
          className="cp-input"
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
        />
        <button type="button" className="cp-eye" onClick={() => toggleShow(showKey)} tabIndex={-1}>
          <EyeIcon open={show[showKey]} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="cp-wrap">
      <div className="cp-card">
        <div className="cp-header">
          <h2 className="cp-title">Change Password</h2>
          <p className="cp-sub">Keep your account secure by using a strong, unique password.</p>
        </div>

        <form className="cp-form" onSubmit={handleSubmit} noValidate>
          <PasswordField label="Current Password" name="currentPassword" showKey="current" />
          <PasswordField label="New Password" name="newPassword" showKey="new" />
          <PasswordField label="Confirm New Password" name="confirmPassword" showKey="confirm" />

          <div className="cp-policy">
            <p>Password must:</p>
            <ul>
              <li className={form.newPassword.length >= 8 ? 'met' : ''}>Be at least 8 characters</li>
              <li className={/[A-Z]/.test(form.newPassword) ? 'met' : ''}>Contain an uppercase letter</li>
              <li className={/[0-9]/.test(form.newPassword) ? 'met' : ''}>Contain a number</li>
              <li className={/[^A-Za-z0-9]/.test(form.newPassword) ? 'met' : ''}>Contain a special character</li>
            </ul>
          </div>

          {error   && <div className="cp-error">{error}</div>}
          {success && <div className="cp-success">{success}</div>}

          <button type="submit" className="cp-btn" disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
