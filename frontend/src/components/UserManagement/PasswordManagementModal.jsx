/**
 * PasswordManagementModal
 * Shared across Employee and Client user management.
 * Modes: 'set' | 'reset' | 'temp' | 'force' | 'unlock'
 */
import { useState } from 'react';
import axios from 'axios';
import './PasswordManagementModal.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const POLICY_RULES = [
  { key: 'len', label: '8+ characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'digit', label: 'Number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'Special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const PolicyMeter = ({ password }) => {
  if (!password) return null;
  const passed = POLICY_RULES.filter((r) => r.test(password)).length;
  const pct = (passed / POLICY_RULES.length) * 100;
  const color = pct <= 40 ? '#ef4444' : pct <= 80 ? '#f59e0b' : '#10b981';
  return (
    <div className="pm-policy">
      <div className="pm-meter"><div style={{ width: `${pct}%`, background: color }} /></div>
      <div className="pm-rules">
        {POLICY_RULES.map((r) => (
          <span key={r.key} className={r.test(password) ? 'ok' : 'fail'}>
            {r.test(password) ? '✓' : '✗'} {r.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const EyeIcon = ({ show }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {show
      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    }
  </svg>
);

const MODES = {
  set: { title: 'Set Password', icon: '🔑', desc: 'Manually assign a specific password to this account.' },
  reset: { title: 'Reset Password', icon: '🔄', desc: 'Generate a new secure password. Employee must change it on next login.' },
  temp: { title: 'Issue Temporary Password', icon: '⏳', desc: 'Generate a one-time password. Must be changed immediately after login.' },
  force: { title: 'Force Password Reset', icon: '🚨', desc: 'Require this user to change their password on next login without changing the current one.' },
  unlock: { title: 'Unlock Account', icon: '🔓', desc: 'Remove the account lockout so this user can login again.' },
};

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {'employee'|'client'} props.userType
 * @param {'set'|'reset'|'temp'|'force'|'unlock'} props.mode
 * @param {{ id: number, name: string, email: string }} props.user
 * @param {function} [props.onSuccess]
 */
const PasswordManagementModal = ({ open, onClose, userType = 'employee', mode = 'reset', user, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [customPw, setCustomPw] = useState('');
  const [forceReset, setForceReset] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { temp_password, email_sent }

  if (!open) return null;

  const meta = MODES[mode] || MODES.reset;
  const segment = userType === 'client' ? 'clients' : 'employees';
  const userId = user?.id;

  const reset = () => { setPassword(''); setConfirmPw(''); setCustomPw(''); setError(''); setResult(null); setForceReset(true); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    setError('');
    if (mode === 'set') {
      if (!password) { setError('Password is required'); return; }
      if (password !== confirmPw) { setError('Passwords do not match'); return; }
    }
    setLoading(true);
    try {
      let url, body;
      if (mode === 'set') {
        url = `/api/user-management/${segment}/${userId}/set-password`;
        body = { password, force_reset: forceReset };
      } else if (mode === 'reset') {
        url = `/api/user-management/${segment}/${userId}/reset-password`;
        body = customPw ? { custom_password: customPw } : {};
      } else if (mode === 'temp') {
        url = `/api/user-management/${segment}/${userId}/temp-password`;
        body = {};
      } else if (mode === 'force') {
        url = `/api/user-management/${segment}/${userId}/force-reset`;
        body = {};
      } else if (mode === 'unlock') {
        url = `/api/user-management/${segment}/${userId}/unlock`;
        body = {};
      }

      const res = await axios.post(`${API}${url}`, body, { headers: authHdr() });
      setResult(res.data);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  // Show result (for temp/reset that return generated password)
  if (result?.temp_password) {
    return (
      <div className="pm-backdrop" onClick={close}>
        <div className="pm-modal pm-result" onClick={(e) => e.stopPropagation()}>
          <div className="pm-result-icon">🔐</div>
          <h2>Credentials Generated</h2>
          <p className="pm-result-warning">
            ⚠️ This password is shown <strong>only once</strong>. Once closed, it cannot be retrieved – the user will need to have it reset again.
          </p>
          <div className="pm-cred-box">
            <div className="pm-cred-row">
              <span>Username / Email</span>
              <strong>{user?.email}</strong>
            </div>
            <div className="pm-cred-row">
              <span>Temporary Password</span>
              <strong className="pm-pw-display">{result.temp_password}</strong>
            </div>
          </div>
          {result.email_sent === false && (
            <div className="pm-email-warn">Email could not be sent – share these credentials manually.</div>
          )}
          <div className="pm-actions">
            <button className="pm-btn primary" onClick={() => { navigator.clipboard?.writeText(result.temp_password); }}>
              Copy Password
            </button>
            <button className="pm-btn secondary" onClick={close}>Close (Password Hidden)</button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="pm-backdrop" onClick={close}>
        <div className="pm-modal pm-result" onClick={(e) => e.stopPropagation()}>
          <div className="pm-result-icon">✅</div>
          <h2>Success</h2>
          <p>{result.message}</p>
          <button className="pm-btn primary" onClick={close}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-backdrop" onClick={close}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <span className="pm-icon">{meta.icon}</span>
          <div>
            <h2>{meta.title}</h2>
            <p>{user?.name || user?.email}</p>
          </div>
          <button className="pm-close" onClick={close}>✕</button>
        </div>

        <p className="pm-desc">{meta.desc}</p>

        {error && <div className="pm-error">{error}</div>}

        {mode === 'set' && (
          <>
            <div className="pm-field">
              <label>New Password</label>
              <div className="pm-input-wrap">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
                <button type="button" className="pm-eye" onClick={() => setShowPw(!showPw)}><EyeIcon show={showPw} /></button>
              </div>
              <PolicyMeter password={password} />
            </div>
            <div className="pm-field">
              <label>Confirm Password</label>
              <div className="pm-input-wrap">
                <input type={showPwConfirm ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm password" />
                <button type="button" className="pm-eye" onClick={() => setShowPwConfirm(!showPwConfirm)}><EyeIcon show={showPwConfirm} /></button>
              </div>
              {confirmPw && password !== confirmPw && <span className="pm-mismatch">Passwords do not match</span>}
            </div>
            <label className="pm-checkbox">
              <input type="checkbox" checked={forceReset} onChange={(e) => setForceReset(e.target.checked)} />
              Require user to change password on next login
            </label>
          </>
        )}

        {mode === 'reset' && (
          <div className="pm-field">
            <label>Custom Password <span className="pm-optional">(leave blank to auto-generate)</span></label>
            <div className="pm-input-wrap">
              <input type={showPw ? 'text' : 'password'} value={customPw} onChange={(e) => setCustomPw(e.target.value)} placeholder="Leave blank for secure auto-generated password" />
              <button type="button" className="pm-eye" onClick={() => setShowPw(!showPw)}><EyeIcon show={showPw} /></button>
            </div>
            {customPw && <PolicyMeter password={customPw} />}
          </div>
        )}

        {(mode === 'temp' || mode === 'force') && (
          <div className="pm-info-box">
            {mode === 'temp'
              ? 'A cryptographically secure temporary password will be generated. The user must change it immediately after logging in.'
              : 'The user will be prompted to set a new password when they next login. Their current password remains active until they do.'}
          </div>
        )}

        {mode === 'unlock' && (
          <div className="pm-info-box">
            The account will be unlocked and the failed login counter will be reset to zero. The user can login immediately after this action.
          </div>
        )}

        <div className="pm-footer">
          <button className="pm-btn secondary" onClick={close} disabled={loading}>Cancel</button>
          <button className="pm-btn primary" onClick={submit} disabled={loading}>
            {loading ? 'Processing...' : meta.title}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordManagementModal;

