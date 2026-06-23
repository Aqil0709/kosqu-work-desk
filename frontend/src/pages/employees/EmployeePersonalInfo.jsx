// src/pages/employees/EmployeePersonalInfo.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { employeeAPI } from '../../services/employeeAPI';
import { brandingAPI } from '../../services/brandingAPI';
import IDCardTemplate from '../../components/IDCard/IDCardTemplate';
import './EmployeePersonalInfo.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

/* ── CSS variable helpers ───────────────────────────────────── */
const T = {
  strong: { color: 'var(--theme-text-strong, #0f172a)' },
  muted:  { color: 'var(--theme-text-muted, #64748b)' },
  base:   { color: 'var(--theme-text, #334155)' },
};
const card = (extra = {}) => ({
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--card-border, #e2e8f0)',
  boxShadow: 'var(--card-shadow, 0 1px 3px rgba(0,0,0,.07))',
  borderRadius: 14,
  ...extra,
});

/* ── Upload result modal ────────────────────────────────────── */
const UploadModal = ({ result, onClose }) => {
  if (!result) return null;
  const ok = !result.error;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ ...card({ padding:'28px 32px', minWidth:320, maxWidth:440, width:'100%' }), position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:16, background:'none', border:'none', fontSize:20, cursor:'pointer', ...T.muted }}>✕</button>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
            background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)', color: ok ? '#16a34a' : '#dc2626' }}>
            {ok ? '✓' : '✕'}
          </div>
          <h3 style={{ margin:'0 0 4px', fontSize:17, fontWeight:700, ...T.strong }}>
            {ok ? 'Successfully Uploaded' : 'Upload Failed'}
          </h3>
          <p style={{ margin:0, fontSize:13, ...T.muted }}>{ok ? 'Your file has been uploaded.' : 'Something went wrong.'}</p>
        </div>
        <div style={{ background:'var(--theme-bg-muted, #f8fafc)', borderRadius:10, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          <Row label="File Name" value={result.filename} />
          <Row label="Upload Time" value={result.timestamp} />
          <Row label="Type" value={result.type} />
          <Row label="Status" value={ok ? 'Completed' : 'Failed'} valueColor={ok ? '#16a34a' : '#dc2626'} />
          {!ok && <Row label="Reason" value={result.error} valueColor="#dc2626" />}
        </div>
        <button onClick={onClose} style={{ marginTop:18, width:'100%', padding:'11px', borderRadius:10, border:'none', fontWeight:700, fontSize:14, cursor:'pointer',
          background: ok ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#dc2626,#ef4444)', color:'var(--card-bg,#fff)' }}>
          {ok ? 'Done' : 'Close'}
        </button>
      </div>
    </div>
  );
};

const Row = ({ label, value, valueColor }) => (
  <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start' }}>
    <span style={{ fontSize:12, fontWeight:600, ...T.muted, flexShrink:0 }}>{label}</span>
    <span style={{ fontSize:13, fontWeight:600, textAlign:'right', color: valueColor || 'var(--theme-text-strong,#0f172a)', wordBreak:'break-all' }}>{value}</span>
  </div>
);

/* ===============================================================
   MAIN COMPONENT
=============================================================== */
const EmployeePersonalInfo = () => {
  const [profile,       setProfile]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [salaryData,    setSalaryData]    = useState(null);
  const [branding,      setBranding]      = useState({});
  const [myCardData,    setMyCardData]    = useState(null);

  // Upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cvUploading,    setCvUploading]    = useState(false);
  const [aadhaarUploading, setAadhaarUploading] = useState(false);
  const [panUploading,   setPanUploading]   = useState(false);
  const [uploadResult,   setUploadResult]   = useState(null);
  const [myDocs,         setMyDocs]         = useState([]);

  const photoInputRef    = useRef(null);
  const passportInputRef = useRef(null);
  const cvInputRef       = useRef(null);
  const aadhaarInputRef  = useRef(null);
  const panInputRef      = useRef(null);

  /* ── API loaders ─────────────────────────────────────────── */
  const loadSalary = async (empDetailId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/salary/my-history`, { headers: authH() });
      const history = res.data?.history || res.data?.data || [];
      const now = new Date();
      const latest = history.find(r => r.month_number === now.getMonth() + 1 && r.year === now.getFullYear()) || history[0] || null;
      setSalaryData(latest);
    } catch (_) {}
  };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await employeeAPI.getMyProfile();
      const emp = response.data?.employee;
      if (emp) {
        setProfile(emp);
        if (emp.employee_id) loadSalary(emp.employee_id);
        axios.get(`${API_BASE}/api/employees/my-id-card`, { headers: authH() })
          .then(r => { if (r.data?.success) setMyCardData(r.data.data); })
          .catch(() => {});
      } else {
        setError('Profile data not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading profile data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => {
    brandingAPI.get().then(res => {
      if (res.data?.success && res.data?.branding) setBranding(res.data.branding);
    }).catch(() => {});
  }, []);

  const loadMyDocs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/employees/my/documents`, { headers: authH() });
      setMyDocs(res.data?.documents || []);
    } catch (_) {}
  }, []);

  useEffect(() => { loadMyDocs(); }, [loadMyDocs]);

  /* ── Upload handlers ────────────────────────────────────── */
  const doUpload = async ({ endpoint, fieldName, file, label }) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append(fieldName, file);
      await axios.post(`${API_BASE}${endpoint}`, fd, {
        headers: { ...authH(), 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult({
        filename:  file.name,
        timestamp: new Date().toLocaleString('en-IN'),
        type:      label,
        error:     null,
      });
      await loadProfile();
      await loadMyDocs();
    } catch (err) {
      setUploadResult({
        filename:  file.name,
        timestamp: new Date().toLocaleString('en-IN'),
        type:      label,
        error:     err.response?.data?.message || 'Upload failed. Please try again.',
      });
    }
  };

  const handlePhotoChange = async (e) => {
    setPhotoUploading(true);
    await doUpload({ endpoint: '/api/employees/my/photo', fieldName: 'photo', file: e.target.files[0], label: 'Profile Photo' });
    setPhotoUploading(false);
    e.target.value = '';
  };

  const handlePassportChange = async (e) => {
    setPhotoUploading(true);
    await doUpload({ endpoint: '/api/employees/my/photo', fieldName: 'photo', file: e.target.files[0], label: 'Passport Photo' });
    setPhotoUploading(false);
    e.target.value = '';
  };

  const handleCvChange = async (e) => {
    setCvUploading(true);
    await doUpload({ endpoint: '/api/employees/my/cv', fieldName: 'cv', file: e.target.files[0], label: 'CV / Resume' });
    setCvUploading(false);
    e.target.value = '';
  };

  const handleAadhaarChange = async (e) => {
    setAadhaarUploading(true);
    await doUpload({ endpoint: '/api/employees/my/aadhaar', fieldName: 'aadhaar', file: e.target.files[0], label: 'Aadhaar Document' });
    setAadhaarUploading(false);
    e.target.value = '';
  };

  const handlePanChange = async (e) => {
    setPanUploading(true);
    await doUpload({ endpoint: '/api/employees/my/pan', fieldName: 'pan', file: e.target.files[0], label: 'PAN Document' });
    setPanUploading(false);
    e.target.value = '';
  };

  /* ── Helpers ────────────────────────────────────────────── */
  const getInitials = () => {
    const f = profile?.first_name?.[0] || '';
    const l = profile?.last_name?.[0]  || '';
    return `${f}${l}`.toUpperCase() || 'U';
  };
  const getFullName = () => `${profile?.first_name||''} ${profile?.last_name||''}`.trim() || 'User';
  const formatDate  = (d) => { if (!d) return '—'; const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' }); };

  const fileToken = localStorage.getItem('token');
  const withToken = (path) => path ? `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}?token=${encodeURIComponent(fileToken || '')}` : null;
  const photoUrl = profile?.profile_photo ? withToken(profile.profile_photo) : null;

  /* ── Loading / error states ─────────────────────────────── */
  if (loading) return (
    <div className="personal-info-section" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:36, height:36, border:'3px solid var(--card-border,#e2e8f0)', borderTop:'3px solid var(--color-primary,#4F46E5)', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
      <p style={{ ...T.muted, fontSize:14 }}>Loading your profile...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div className="personal-info-section">
      <div className="pi-error-container">
        <p className="pi-error-message">{error}</p>
        <button onClick={loadProfile} className="pi-retry-btn">Retry</button>
      </div>
    </div>
  );

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div style={{ padding:'22px 26px 32px', fontFamily:'Inter,system-ui,sans-serif', minHeight:'100%' }}>
      <UploadModal result={uploadResult} onClose={() => setUploadResult(null)} />

      <h2 style={{ margin:'0 0 20px', fontSize:20, fontWeight:800, ...T.strong }}>My Profile</h2>

      {/* ── Hero profile card ─────────────────────────────────── */}
      <div style={{ ...card({ padding:'24px 28px', marginBottom:18 }) }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>

          {/* Avatar */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:96, height:96, borderRadius:'50%', overflow:'hidden', border:'3px solid var(--color-primary,#4F46E5)', background:'linear-gradient(135deg,#4F46E5,#3B82F6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, fontWeight:800, color:'var(--card-bg,#fff)' }}>
              {photoUrl
                ? <img src={photoUrl} alt="profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : getInitials()}
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              title="Upload profile photo"
              style={{ position:'absolute', bottom:2, right:2, width:28, height:28, borderRadius:'50%', border:'2.5px solid var(--card-bg,#fff)', background:'var(--color-primary,#4F46E5)', color:'var(--card-bg,#fff)', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              {photoUploading ? '...' : '📷'}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:'none' }} />
          </div>

          {/* Info */}
          <div style={{ flex:1, minWidth:0 }}>
            <h3 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, ...T.strong }}>{getFullName()}</h3>
            <p style={{ margin:'0 0 2px', fontSize:14, fontWeight:600, color:'var(--color-primary,#4F46E5)' }}>{profile?.position||profile?.designation||'Employee'}</p>
            <p style={{ margin:'0 0 10px', fontSize:13, ...T.muted }}>{profile?.department_name||'—'}</p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[
                { label:'ID', value: profile?.employee_id||profile?.id||'—' },
                { label:'Email', value: profile?.email||'—' },
                { label:'Joined', value: formatDate(profile?.joining_date) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:8, padding:'6px 12px', fontSize:12 }}>
                  <span style={{ ...T.muted, fontWeight:700 }}>{label}: </span>
                  <span style={{ ...T.strong, fontWeight:700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginTop:22 }}>
          {[
            { label:'PHONE',      value: profile?.phone||'—' },
            { label:'CATEGORY',   value: profile?.employment_category||'Employee', cap:true },
            { label:'EXPERIENCE', value: profile?.experience_years ? `${profile.experience_years} yrs` : '—' },
            { label:'STATUS',     value: profile?.employment_status||profile?.status||'Active', cap:true },
          ].map(({ label, value, cap }) => (
            <div key={label} style={{ ...card({ padding:'12px 14px' }), background:'var(--theme-bg-muted,#f8fafc)' }}>
              <p style={{ margin:'0 0 4px', fontSize:10.5, fontWeight:700, ...T.muted, textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</p>
              <p style={{ margin:0, fontSize:14, fontWeight:700, ...T.strong, textTransform: cap ? 'capitalize' : 'none' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column: uploads + salary ─────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>

        {/* CV Upload */}
        <div style={{ ...card({ padding:'20px 22px' }) }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, ...T.strong }}>CV / Resume</h3>

          {/* Current CV */}
          {profile?.cv_path ? (
            <div style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10, padding:'12px 14px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>📄</span>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12.5, fontWeight:700, ...T.strong, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {profile.cv_path.split('/').pop() || 'resume.pdf'}
                  </p>
                  <p style={{ margin:'2px 0 0', fontSize:11, ...T.muted }}>Current resume on file</p>
                </div>
              </div>
              <a
                href={withToken(profile.cv_path)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding:'6px 14px', borderRadius:8, background:'var(--color-primary,#4F46E5)', color:'var(--card-bg,#fff)', fontWeight:700, fontSize:12, textDecoration:'none', flexShrink:0 }}>
                Download
              </a>
            </div>
          ) : (
            <div style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1.5px dashed var(--card-border,#cbd5e1)', borderRadius:10, padding:'18px', textAlign:'center', marginBottom:14 }}>
              <p style={{ margin:'0 0 4px', fontSize:13, ...T.muted }}>No CV uploaded yet</p>
            </div>
          )}

          <button
            onClick={() => cvInputRef.current?.click()}
            disabled={cvUploading}
            style={{ width:'100%', padding:'10px', borderRadius:10, border:'1.5px dashed var(--color-primary,#4F46E5)', background:'transparent', color:'var(--color-primary,#4F46E5)', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {cvUploading ? 'Uploading...' : '↑ Upload CV / Resume'}
          </button>
          <p style={{ margin:'8px 0 0', fontSize:11, ...T.muted, textAlign:'center' }}>PDF, DOC, DOCX – max 10 MB</p>
          <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCvChange} style={{ display:'none' }} />
        </div>

        {/* Passport Photo */}
        <div style={{ ...card({ padding:'20px 22px' }) }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, ...T.strong }}>Passport Photo</h3>
          <p style={{ margin:'0 0 14px', fontSize:12.5, ...T.muted }}>Used on your ID card, employee directory, and profile header.</p>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <div style={{ width:90, height:110, borderRadius:8, overflow:'hidden', border:'2px solid var(--card-border,#e2e8f0)', background:'var(--theme-bg-muted,#f8fafc)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {photoUrl
                ? <img src={photoUrl} alt="passport" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:13, ...T.muted, textAlign:'center', padding:4 }}>No photo</span>}
            </div>
            <button
              onClick={() => passportInputRef.current?.click()}
              disabled={photoUploading}
              style={{ padding:'9px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4F46E5,#3B82F6)', color:'var(--card-bg,#fff)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              {photoUploading ? '⏳ Uploading...' : '📷 Upload Passport Photo'}
            </button>
            <p style={{ margin:0, fontSize:11, ...T.muted }}>JPG, PNG, JPEG – max 5 MB</p>
          </div>
          <input ref={passportInputRef} type="file" accept=".jpg,.jpeg,.png" onChange={handlePassportChange} style={{ display:'none' }} />
        </div>
      </div>

      {/* ── Identity Documents Section ─────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>

        {/* Aadhaar Upload */}
        <div style={{ ...card({ padding:'20px 22px' }) }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, ...T.strong }}>Aadhaar Document</h3>
          <p style={{ margin:'0 0 14px', fontSize:12.5, ...T.muted }}>Upload a PDF or image copy of your Aadhaar card for identity verification.</p>

          {/* Current Aadhaar */}
          {profile?.aadhaar_doc_path ? (
            <div style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10, padding:'12px 14px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>📋</span>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12.5, fontWeight:700, ...T.strong, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {profile.aadhaar_doc_path.split('/').pop() || 'aadhaar.pdf'}
                  </p>
                  <p style={{ margin:'2px 0 0', fontSize:11, ...T.muted }}>Aadhaar on file</p>
                </div>
              </div>
              <a
                href={withToken(profile.aadhaar_doc_path)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding:'6px 14px', borderRadius:8, background:'var(--color-primary,#4F46E5)', color:'var(--card-bg,#fff)', fontWeight:700, fontSize:12, textDecoration:'none', flexShrink:0 }}>
                View
              </a>
            </div>
          ) : (
            <div style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1.5px dashed var(--card-border,#cbd5e1)', borderRadius:10, padding:'18px', textAlign:'center', marginBottom:14 }}>
              <p style={{ margin:'0 0 4px', fontSize:13, ...T.muted }}>No Aadhaar document uploaded</p>
            </div>
          )}

          <button
            onClick={() => aadhaarInputRef.current?.click()}
            disabled={aadhaarUploading}
            style={{ width:'100%', padding:'10px', borderRadius:10, border:'1.5px dashed var(--color-primary,#4F46E5)', background:'transparent', color:'var(--color-primary,#4F46E5)', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {aadhaarUploading ? '⏳ Uploading...' : 'â¬† Upload Aadhaar'}
          </button>
          <p style={{ margin:'8px 0 0', fontSize:11, ...T.muted, textAlign:'center' }}>PDF, JPG, PNG – max 10 MB</p>
          <input ref={aadhaarInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleAadhaarChange} style={{ display:'none' }} />
        </div>

        {/* PAN Upload */}
        <div style={{ ...card({ padding:'20px 22px' }) }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, ...T.strong }}>PAN Document</h3>
          <p style={{ margin:'0 0 14px', fontSize:12.5, ...T.muted }}>Upload a PDF or image copy of your PAN card for tax compliance.</p>

          {/* Current PAN */}
          {profile?.pan_doc_path ? (
            <div style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10, padding:'12px 14px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>📋</span>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12.5, fontWeight:700, ...T.strong, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {profile.pan_doc_path.split('/').pop() || 'pan.pdf'}
                  </p>
                  <p style={{ margin:'2px 0 0', fontSize:11, ...T.muted }}>PAN on file</p>
                </div>
              </div>
              <a
                href={withToken(profile.pan_doc_path)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding:'6px 14px', borderRadius:8, background:'var(--color-primary,#4F46E5)', color:'var(--card-bg,#fff)', fontWeight:700, fontSize:12, textDecoration:'none', flexShrink:0 }}>
                View
              </a>
            </div>
          ) : (
            <div style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1.5px dashed var(--card-border,#cbd5e1)', borderRadius:10, padding:'18px', textAlign:'center', marginBottom:14 }}>
              <p style={{ margin:'0 0 4px', fontSize:13, ...T.muted }}>No PAN document uploaded</p>
            </div>
          )}

          <button
            onClick={() => panInputRef.current?.click()}
            disabled={panUploading}
            style={{ width:'100%', padding:'10px', borderRadius:10, border:'1.5px dashed var(--color-primary,#4F46E5)', background:'transparent', color:'var(--color-primary,#4F46E5)', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {panUploading ? '⏳ Uploading...' : 'â¬† Upload PAN'}
          </button>
          <p style={{ margin:'8px 0 0', fontSize:11, ...T.muted, textAlign:'center' }}>PDF, JPG, PNG – max 10 MB</p>
          <input ref={panInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handlePanChange} style={{ display:'none' }} />
        </div>
      </div>

      {/* ── Salary card ─────────────────────────────────────── */}
      {salaryData && (
        <div style={{ ...card({ padding:'20px 22px', marginBottom:18 }) }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, ...T.strong }}>
            Salary – {MONTHS[(salaryData.month_number||salaryData.month||1)-1]} {salaryData.year}
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12 }}>
            {[
              { label:'Gross Salary', value:`₹${Number(salaryData.gross_salary||0).toLocaleString('en-IN')}`, color:'var(--theme-text-strong,#1f2937)' },
              { label:'Deductions',   value:`₹${Number(salaryData.deduction_amount||0).toLocaleString('en-IN')}`, color:'#ef4444' },
              { label:'Net Salary',   value:`₹${Number(salaryData.net_salary||0).toLocaleString('en-IN')}`, color:'#16a34a' },
              { label:'Status',       value: salaryData.payment_status||'Pending', isText:true },
            ].map(item => (
              <div key={item.label} style={{ ...card({ padding:'12px 14px', background:'var(--theme-bg-muted,#f8fafc)' }) }}>
                <p style={{ margin:'0 0 4px', fontSize:11, ...T.muted, fontWeight:700 }}>{item.label}</p>
                <p style={{ margin:0, fontSize:16, fontWeight:800, color: item.color || 'var(--theme-text-strong,#1f2937)', textTransform: item.isText ? 'capitalize' : 'none' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── My Uploaded Files ───────────────────────────────── */}
      <div style={{ ...card({ padding:'20px 22px', marginBottom:18 }) }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700, ...T.strong }}>My Uploaded Files</h3>
          <span style={{ fontSize:12, ...T.muted }}>{myDocs.length} file{myDocs.length !== 1 ? 's' : ''}</span>
        </div>

        {myDocs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'28px 0', background:'var(--theme-bg-muted,#f8fafc)', borderRadius:10, border:'1.5px dashed var(--card-border,#cbd5e1)' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
            <p style={{ margin:0, fontSize:13, ...T.muted }}>No uploads yet – photos and CVs you upload will appear here.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {myDocs.map(doc => {
              const isPhoto = doc.doc_type === 'photo';
              const sizeKB  = doc.file_size ? (doc.file_size / 1024).toFixed(1) + ' KB' : '—';
              const uploadedOn = doc.created_at
                ? new Date(doc.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
                : '—';
              return (
                <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10 }}>
                  <div style={{ width:38, height:38, borderRadius:9, background: isPhoto ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {isPhoto ? '🖼️' : '📄'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, ...T.strong, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.original_filename}</p>
                    <p style={{ margin:'2px 0 0', fontSize:11, ...T.muted }}>
                      <span style={{ background: isPhoto ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.12)', color: isPhoto ? '#7c3aed' : '#2563eb', fontWeight:700, fontSize:10, borderRadius:4, padding:'1px 6px', marginRight:6, textTransform:'uppercase' }}>{doc.doc_type}</span>
                      {sizeKB} · {uploadedOn}
                    </p>
                  </div>
                  <a href={withToken(doc.file_path)} target="_blank" rel="noopener noreferrer"
                    style={{ padding:'6px 14px', borderRadius:8, background:'var(--color-primary,#4F46E5)', color:'var(--card-bg,#fff)', fontWeight:700, fontSize:11, textDecoration:'none', flexShrink:0 }}>
                    View
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ID Card ─────────────────────────────────────────── */}
      <div style={{ ...card({ padding:'20px 22px', marginTop:18 }) }}>
        <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, ...T.strong }}>My ID Card</h3>
        <IDCardTemplate
          cardData={myCardData || profile}
          photoUrl={photoUrl}
          branding={branding}
        />
      </div>
    </div>
  );
};

export default EmployeePersonalInfo;

