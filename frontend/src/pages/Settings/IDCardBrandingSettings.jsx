/**
 * IDCardBrandingSettings
 * Settings → Branding → ID Card Branding
 *
 * Admin-only panel to upload / replace / reset the Header and Footer
 * images used across all ID cards (Admin, HR, Employee portals).
 */
import React, { useEffect, useRef, useState } from 'react';
import brandingAPI from '../../services/brandingAPI';
import IDCardTemplate from '../../components/IDCard/IDCardTemplate';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

/* ── helper: build a full URL for a stored path ── */
const fullUrl = (path) =>
  path ? (path.startsWith('http') ? path : `${API_BASE}${path}`) : null;

/* ── status message component ── */
const StatusMsg = ({ msg, type }) => {
  if (!msg) return null;
  const colors = {
    success: { bg:'#f0fdf4', border:'#86efac', text:'#16a34a' },
    error:   { bg:'#fef2f2', border:'#fca5a5', text:'#dc2626' },
    info:    { bg:'#eff6ff', border:'#93c5fd', text:'#2563eb' },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.text,
      borderRadius:8, padding:'10px 14px', fontSize:13, fontWeight:600, marginBottom:16 }}>
      {msg}
    </div>
  );
};

/* ── single upload zone ── */
const UploadZone = ({ label, sublabel, currentUrl, field, uploading, onUpload, onReset }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    const file = files[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/jpg','image/webp'].includes(file.type)) {
      alert('Only PNG, JPG, JPEG, WEBP files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB.');
      return;
    }
    onUpload(field, file);
  };

  return (
    <div style={{ border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:12, overflow:'hidden', background:'var(--card-bg,#fff)' }}>
      {/* Zone header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--card-border,#e2e8f0)', background:'var(--theme-bg-muted,#f8fafc)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>{label}</div>
          <div style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)', marginTop:2 }}>{sublabel}</div>
        </div>
        {currentUrl && (
          <button onClick={() => onReset(field)}
            style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontWeight:700, fontSize:12, cursor:'pointer' }}>
            Remove
          </button>
        )}
      </div>

      {/* Current image preview */}
      {currentUrl && (
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--card-border,#e2e8f0)' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--theme-text-muted,#64748b)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
            Current Active Image
          </div>
          <img
            src={currentUrl}
            alt={label}
            style={{ maxWidth:'100%', maxHeight:120, borderRadius:8, border:'1px solid var(--card-border,#e2e8f0)', display:'block', objectFit:'cover' }}
          />
        </div>
      )}

      {/* Drop zone */}
      <div
        style={{
          margin:16, borderRadius:10,
          border:`2px dashed ${dragOver ? '#1C2D5E' : 'var(--card-border,#cbd5e1)'}`,
          background: dragOver ? 'rgba(28,45,94,0.04)' : 'var(--theme-bg-muted,#f8fafc)',
          padding:'28px 20px', textAlign:'center', cursor:'pointer',
          transition:'border-color .15s, background .15s',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <div style={{ fontSize:28, marginBottom:8 }}>🖼️</div>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', marginBottom:4 }}>
          {currentUrl ? 'Replace Image' : 'Upload Image'}
        </div>
        <div style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>
          PNG, JPG, JPEG, WEBP · Max 5 MB · Recommended: 680×142 px
        </div>
        {uploading && (
          <div style={{ marginTop:10, fontSize:12, color:'#2563eb', fontWeight:600 }}>⏳ Uploading...</div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display:'none' }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────────────*/
const IDCardBrandingSettings = () => {
  const [branding, setBranding] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [uploading, setUploading] = useState('');   // field name being uploaded
  const [msg, setMsg]   = useState('');
  const [msgType, setMsgType] = useState('info');
  const [showPreview, setShowPreview] = useState(false);

  const notify = (text, type = 'success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const loadBranding = async () => {
    try {
      setLoading(true);
      const res = await brandingAPI.get();
      if (res.data?.success) setBranding(res.data.branding || {});
    } catch { notify('Failed to load branding settings.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBranding(); }, []);

  const handleUpload = async (field, file) => {
    setUploading(field);
    try {
      const res = await brandingAPI.uploadImage(field, file);
      if (res.data?.success) {
        notify(`${field === 'idcard_header' ? 'Header' : 'Footer'} image uploaded successfully.`);
        await loadBranding();
      } else {
        notify(res.data?.message || 'Upload failed.', 'error');
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploading('');
    }
  };

  const handleReset = async (field) => {
    if (!confirm(`Remove the ${field === 'idcard_header' ? 'header' : 'footer'} image? The default design will be used.`)) return;
    try {
      await brandingAPI.deleteImage(field);
      notify(`${field === 'idcard_header' ? 'Header' : 'Footer'} image removed. Default design restored.`);
      await loadBranding();
    } catch {
      notify('Failed to remove image.', 'error');
    }
  };

  const headerUrl = branding.idcard_header_url ? fullUrl(branding.idcard_header_url) : null;
  const footerUrl = branding.idcard_footer_url ? fullUrl(branding.idcard_footer_url) : null;

  /* Demo card data for preview */
  const demoCard = {
    first_name: 'Shaikh', last_name: 'Aaqib',
    position: 'Sr. Full Stack Developer',
    emp_number: '91001083',
    email: 'aaqib.shaikh@kosqu.com',
    phone: '+91 8237278996',
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'60px 0' }}>
      <div style={{ fontSize:13, color:'var(--theme-text-muted,#64748b)' }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ padding:24, fontFamily:'Inter,system-ui,sans-serif', maxWidth:900 }}>

      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'var(--theme-text-strong,#0f172a)' }}>
          ID Card Branding
        </h2>
        <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--theme-text-muted,#64748b)' }}>
          Upload custom Header and Footer images. The same images are automatically used across
          Admin, HR, and Employee portals. Only one active template at a time.
        </p>
      </div>

      <StatusMsg msg={msg} type={msgType}/>

      {/* Active template status */}
      <div style={{
        display:'flex', gap:10, alignItems:'center',
        background: (headerUrl || footerUrl) ? '#f0fdf4' : 'var(--theme-bg-muted,#f8fafc)',
        border:`1.5px solid ${(headerUrl || footerUrl) ? '#86efac' : 'var(--card-border,#e2e8f0)'}`,
        borderRadius:10, padding:'12px 16px', marginBottom:24,
      }}>
        <span style={{ fontSize:20 }}>{(headerUrl || footerUrl) ? '✅' : '⚙️'}</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>
            {(headerUrl || footerUrl) ? 'Custom Template Active' : 'Using Default SVG Design'}
          </div>
          <div style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)', marginTop:1 }}>
            {headerUrl && footerUrl ? 'Both header and footer are using uploaded images.' :
             headerUrl ? 'Header is custom · Footer is default SVG.' :
             footerUrl ? 'Header is default SVG · Footer is custom.' :
             'No images uploaded. Default navy/orange wave design is active.'}
          </div>
        </div>
      </div>

      {/* Upload zones */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:28 }}>
        <UploadZone
          label="Header Image"
          sublabel="Top banner shown on every ID card"
          currentUrl={headerUrl}
          field="idcard_header"
          uploading={uploading === 'idcard_header'}
          onUpload={handleUpload}
          onReset={handleReset}
        />
        <UploadZone
          label="Footer Image"
          sublabel="Bottom banner shown on every ID card"
          currentUrl={footerUrl}
          field="idcard_footer"
          uploading={uploading === 'idcard_footer'}
          onUpload={handleUpload}
          onReset={handleReset}
        />
      </div>

      {/* Preview section */}
      <div style={{ border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:12, overflow:'hidden', background:'var(--card-bg,#fff)' }}>
        <div style={{
          padding:'14px 18px',
          borderBottom:'1px solid var(--card-border,#e2e8f0)',
          background:'var(--theme-bg-muted,#f8fafc)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>Template Preview</div>
            <div style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)', marginTop:2 }}>
              Live preview using current header/footer + sample employee data
            </div>
          </div>
          <button onClick={() => setShowPreview(p => !p)}
            style={{
              padding:'7px 18px', borderRadius:9, border:'none', cursor:'pointer',
              background:'#1C2D5E', color:'#fff', fontWeight:700, fontSize:12,
            }}>
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {showPreview && (
          <div style={{ padding:24 }}>
            {/* Sizing note */}
            <div style={{
              background:'#eff6ff', border:'1px solid #93c5fd', borderRadius:8,
              padding:'9px 14px', fontSize:12, color:'#1d4ed8', fontWeight:500, marginBottom:20,
            }}>
              💡 Recommended image dimensions: Header 680 × 142 px · Footer 680 × 110 px (2× for Retina).
              Images are displayed at card width (340 px) with <code>object-fit: cover</code>.
            </div>
            <IDCardTemplate
              cardData={demoCard}
              photoUrl={null}
              branding={branding}
            />
          </div>
        )}
      </div>

      {/* Technical info */}
      <div style={{ marginTop:20, padding:'14px 18px', background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--theme-text-muted,#64748b)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
          How It Works
        </div>
        <ul style={{ margin:0, paddingLeft:16, fontSize:12, color:'var(--theme-text-muted,#64748b)', lineHeight:1.8 }}>
          <li>Uploaded images are stored per-tenant. One active header, one active footer.</li>
          <li>Changes apply immediately to all portals — no restart needed.</li>
          <li>If no image is uploaded, the default navy + orange wave SVG design is used.</li>
          <li>The employee body (photo, name, ID, designation, details) is never affected by uploads.</li>
          <li>Bulk ID card generation uses the same active template automatically.</li>
        </ul>
      </div>
    </div>
  );
};

export default IDCardBrandingSettings;
