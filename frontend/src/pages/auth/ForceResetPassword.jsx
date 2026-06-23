/**
 * ForceResetPassword — shown when force_password_reset = true
 * Employee MUST change their temporary password before accessing the system.
 * Cannot navigate away or reach the dashboard until complete.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

const POLICY_RULES = [
  { test: (p) => p.length >= 8,          label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p),        label: 'One uppercase letter' },
  { test: (p) => /[a-z]/.test(p),        label: 'One lowercase letter' },
  { test: (p) => /[0-9]/.test(p),        label: 'One number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
];

const NAVY  = '#1C2D5E';
const GREEN = '#16a34a';
const RED   = '#dc2626';

const EyeIcon = ({ open }) => open
  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>;

const ForceResetPassword = () => {
  const { user, logout, clearForceReset } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);

  const policyPassed = POLICY_RULES.every(r => r.test(newPassword));
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const getDashboardPath = () => {
    const pos = (user?.position || '').toLowerCase();
    if (pos === 'admin' || pos === 'hr') return '/admin';
    if (pos === 'client') return '/client';
    return '/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!policyPassed) {
      setError('Password does not meet the requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      /* We use the changePassword endpoint which requires currentPassword.
         For force-reset we don't have the temp password client-side,
         so we use the dedicated first-login endpoint instead.
         If that doesn't exist yet, fall back gracefully. */
      const res = await authAPI.firstLoginReset({ newPassword });
      if (res.data?.success) {
        clearForceReset();
        setSuccess(true);
        setTimeout(() => navigate(getDashboardPath()), 1800);
      } else {
        setError(res.data?.message || 'Failed to update password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0fdf4', fontFamily:'Inter,system-ui,sans-serif' }}>
        <div style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
          <h2 style={{ color:GREEN, fontSize:22, fontWeight:800, margin:'0 0 8px' }}>Password Updated!</h2>
          <p style={{ color:'#374151', fontSize:14 }}>Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%)',
      fontFamily:'Inter,system-ui,sans-serif', padding:20,
    }}>
      <div style={{
        background:'#fff', borderRadius:20, padding:'40px 36px',
        maxWidth:440, width:'100%',
        boxShadow:'0 20px 60px rgba(28,45,94,0.15)',
      }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:`${NAVY}18`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, color:NAVY, margin:'0 0 8px' }}>Create New Password</h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0, lineHeight:1.5 }}>
            {user?.first_name ? `Hi ${user.first_name},` : 'Hi there,'}{' '}
            you must set a new password before accessing the system.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:NAVY, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
              New Password
            </label>
            <div style={{ position:'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                style={{
                  width:'100%', padding:'11px 40px 11px 14px', borderRadius:10,
                  border:`1.5px solid ${newPassword && policyPassed ? '#86efac' : newPassword && !policyPassed ? '#fca5a5' : '#e5e7eb'}`,
                  fontSize:14, outline:'none', boxSizing:'border-box',
                  transition:'border-color .15s',
                }}
              />
              <button type="button" onClick={() => setShowNew(p => !p)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:2 }}>
                <EyeIcon open={showNew}/>
              </button>
            </div>
          </div>

          {/* Password policy checklist */}
          {newPassword && (
            <div style={{ background:'#f9fafb', borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
              {POLICY_RULES.map(rule => {
                const ok = rule.test(newPassword);
                return (
                  <div key={rule.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, fontSize:12 }}>
                    <span style={{ color: ok ? GREEN : '#d1d5db', fontSize:16, lineHeight:1 }}>{ok ? '✓' : '○'}</span>
                    <span style={{ color: ok ? GREEN : '#6b7280', fontWeight: ok ? 600 : 400 }}>{rule.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirm Password */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:NAVY, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
              Confirm Password
            </label>
            <div style={{ position:'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                style={{
                  width:'100%', padding:'11px 40px 11px 14px', borderRadius:10,
                  border:`1.5px solid ${confirmPassword && passwordsMatch ? '#86efac' : confirmPassword && !passwordsMatch ? '#fca5a5' : '#e5e7eb'}`,
                  fontSize:14, outline:'none', boxSizing:'border-box',
                  transition:'border-color .15s',
                }}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:2 }}>
                <EyeIcon open={showConfirm}/>
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p style={{ fontSize:11, color:RED, marginTop:4, margin:'4px 0 0' }}>Passwords do not match</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:RED, fontWeight:600, marginBottom:16 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !policyPassed || !passwordsMatch}
            style={{
              width:'100%', padding:'13px 0', borderRadius:12, border:'none',
              background: policyPassed && passwordsMatch ? `linear-gradient(135deg,${NAVY},#2a4a8a)` : '#e5e7eb',
              color: policyPassed && passwordsMatch ? '#fff' : '#9ca3af',
              fontWeight:800, fontSize:15, cursor: policyPassed && passwordsMatch ? 'pointer' : 'not-allowed',
              transition:'background .2s',
            }}>
            {loading ? 'Updating…' : 'Set New Password'}
          </button>
        </form>

        {/* Logout link */}
        <div style={{ textAlign:'center', marginTop:20 }}>
          <button onClick={() => logout()}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#6b7280', textDecoration:'underline' }}>
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceResetPassword;
