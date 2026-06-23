import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineBanknotes,
  HiOutlineArrowUpTray,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlinePhoto,
  HiOutlineTrash
} from 'react-icons/hi2';
import brandingAPI from '../../services/brandingAPI';
import BillingSettings from '../Accounts/BillingSettings';
import IDCardBrandingSettings from './IDCardBrandingSettings';
import './BrandingSettings.css';

const defaultTerms = [
  'The employee shall abide by all company policies, rules, and regulations.',
  'This offer is contingent upon satisfactory background verification and reference checks.',
  'The first three months shall be a probationary period, during which either party may terminate employment with one week notice.',
  'The company reserves the right to modify terms with prior notice.',
  'Confidentiality of company information must be maintained during and after employment.',
  'All intellectual property created during employment shall belong to the company.',
  'The employee agrees not to engage in any competing business during employment and for six months after termination.',
  'Employment may be terminated by either party with one month notice or payment in lieu thereof.'
];

const emptyForm = {
  company_name: '',
  company_tagline: '',
  company_cin: '',
  company_gst: '',
  hr_name: '',
  hr_designation: '',
  company_email: '',
  company_phone: '',
  company_website: '',
  company_address: '',
  default_terms: defaultTerms.join('\n'),
  watermark_enabled:  true,
  watermark_opacity:  0.07,
  watermark_size:     'medium',
  watermark_position: 'center',
};

const assetFields = [
  { key: 'company_logo', dbKey: 'logo_url', label: 'Company Logo' },
  { key: 'hr_signature', dbKey: 'signature_url', label: 'HR Signature' },
  { key: 'company_stamp', dbKey: 'stamp_url', label: 'Company Stamp' }
];

const BrandingSettings = ({ initialTab = 'branding' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [form, setForm] = useState(emptyForm);
  const [assets, setAssets] = useState({ logo_url: null, signature_url: null, stamp_url: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const parsedTerms = useMemo(
    () => form.default_terms.split('\n').map((term) => term.trim()).filter(Boolean),
    [form.default_terms]
  );

  const completedAssets = assetFields.filter((asset) => assets[asset.dbKey]).length;
  const requiredDetails = ['company_name', 'company_phone', 'company_website', 'company_email', 'company_address', 'hr_name', 'hr_designation'];
  const completedDetails = requiredDetails.filter((field) => String(form[field] || '').trim()).length;

  useEffect(() => {
    loadBranding();
  }, []);

  const parseTerms = (value) => {
    if (!value) return defaultTerms.join('\n');
    if (Array.isArray(value)) return value.join('\n');

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join('\n') : String(value);
    } catch {
      return String(value);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
  };

  const loadBranding = async () => {
    try {
      setLoading(true);
      const res = await brandingAPI.get();
      const branding = res.data?.branding || {};

      setForm({
        company_name:    branding.company_name    || '',
        company_tagline: branding.company_tagline || '',
        company_cin:     branding.company_cin     || '',
        company_gst:     branding.company_gst     || '',
        hr_name:         branding.hr_name         || '',
        hr_designation:  branding.hr_designation  || '',
        company_email:   branding.company_email   || '',
        company_phone:   branding.company_phone   || '',
        company_website: branding.company_website || '',
        company_address: branding.company_address || '',
        default_terms:   parseTerms(branding.default_terms),
        watermark_enabled:  branding.watermark_enabled !== false && branding.watermark_enabled !== 0,
        watermark_opacity:  Number(branding.watermark_opacity ?? 0.07),
        watermark_size:     branding.watermark_size     || 'medium',
        watermark_position: branding.watermark_position || 'center',
      });
      setAssets({
        logo_url: branding.logo_url || null,
        signature_url: branding.signature_url || null,
        stamp_url: branding.stamp_url || null
      });
    } catch (error) {
      console.error('Error loading branding settings:', error);
      showMessage('Unable to load branding settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await brandingAPI.update({
        ...form,
        hr_officer_name:    form.hr_name,
        company_tagline:    form.company_tagline,
        company_cin:        form.company_cin,
        company_gst:        form.company_gst,
        default_terms:      parsedTerms,
        watermark_enabled:  form.watermark_enabled,
        watermark_opacity:  Number(form.watermark_opacity),
        watermark_size:     form.watermark_size,
        watermark_position: form.watermark_position,
      });
      showMessage('Branding settings saved successfully.');
      await loadBranding();
    } catch (error) {
      console.error('Error saving branding settings:', error);
      showMessage(error.response?.data?.message || 'Failed to save branding settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    setMessage('');

    try {
      await brandingAPI.uploadImage(field, file);
      showMessage('Image uploaded successfully.');
      await loadBranding();
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage(error.response?.data?.message || 'Failed to upload image.', 'error');
    } finally {
      setUploadingField('');
    }
  };

  const handleDelete = async (field) => {
    setUploadingField(field);
    setMessage('');

    try {
      await brandingAPI.deleteImage(field);
      showMessage('Image removed successfully.');
      await loadBranding();
    } catch (error) {
      console.error('Error removing image:', error);
      showMessage(error.response?.data?.message || 'Failed to remove image.', 'error');
    } finally {
      setUploadingField('');
    }
  };

  if (loading) {
    return (
      <div className="branding-shell">
        <div className="branding-loading">Loading branding settings...</div>
      </div>
    );
  }

  return (
    <div className="branding-shell">
      <div className="branding-header">
        <div>
          <div className="branding-kicker">Settings</div>
          <h2><HiOutlineBuildingOffice2 /> Branding</h2>
        </div>
        {activeTab === 'branding' && (
          <button className="branding-primary-btn" type="button" onClick={handleSave} disabled={saving}>
            <HiOutlineCheckCircle />
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        )}
      </div>

      <div className="branding-tabs" role="tablist" aria-label="Settings sections">
        <button
          type="button"
          className={activeTab === 'branding' ? 'active' : ''}
          onClick={() => setActiveTab('branding')}
        >
          <HiOutlineBuildingOffice2 />
          Branding Information
        </button>
        <button
          type="button"
          className={activeTab === 'idcard' ? 'active' : ''}
          onClick={() => setActiveTab('idcard')}
        >
          <HiOutlinePhoto />
          ID Card Branding
        </button>
        <button
          type="button"
          className={activeTab === 'billing' ? 'active' : ''}
          onClick={() => setActiveTab('billing')}
        >
          <HiOutlineBanknotes />
          Billing Settings
        </button>
      </div>

      {activeTab === 'branding' && message && (  /* status alert — branding tab only */
        <div className={`branding-alert ${messageType === 'error' ? 'is-error' : ''}`}>
          {message}
        </div>
      )}

      {activeTab === 'branding' ? (  /* ── Branding Information tab ── */
        <>
          <div className="branding-stats">
            <div className="branding-stat">
              <span>Company Details</span>
              <strong>{completedDetails}/{requiredDetails.length}</strong>
            </div>
            <div className="branding-stat">
              <span>Brand Assets</span>
              <strong>{completedAssets}/{assetFields.length}</strong>
            </div>
            <div className="branding-stat">
              <span>Offer Terms</span>
              <strong>{parsedTerms.length}</strong>
            </div>
          </div>

          <form onSubmit={handleSave} className="branding-grid">
            <section className="branding-panel">
              <div className="branding-panel-title">
                <h3>Basic Information</h3>
                <span>Used on HR documents</span>
              </div>

              <div className="branding-form-grid">
                <label className="branding-field">
                  <span>Company Name</span>
                  <input value={form.company_name} onChange={(e) => handleChange('company_name', e.target.value)} placeholder="e.g. Kosqu Technology" />
                </label>
                <label className="branding-field">
                  <span>Tagline <small style={{ fontWeight: 400, color: '#9ca3af' }}>shown in header</small></span>
                  <input value={form.company_tagline} onChange={(e) => handleChange('company_tagline', e.target.value)} placeholder="e.g. Technology • AI • Growth" />
                </label>
                <label className="branding-field">
                  <span>Company Phone</span>
                  <input value={form.company_phone} onChange={(e) => handleChange('company_phone', e.target.value)} placeholder="+91 98765 43210" />
                </label>
                <label className="branding-field">
                  <span>Company Website</span>
                  <input value={form.company_website} onChange={(e) => handleChange('company_website', e.target.value)} placeholder="www.company.com" />
                </label>
                <label className="branding-field">
                  <span>Company Email</span>
                  <input type="email" value={form.company_email} onChange={(e) => handleChange('company_email', e.target.value)} />
                </label>
                <label className="branding-field">
                  <span>CIN Number <small style={{ fontWeight: 400, color: '#9ca3af' }}>optional</small></span>
                  <input value={form.company_cin} onChange={(e) => handleChange('company_cin', e.target.value)} placeholder="U12345MH2020PTC123456" />
                </label>
                <label className="branding-field">
                  <span>GST Number <small style={{ fontWeight: 400, color: '#9ca3af' }}>optional</small></span>
                  <input value={form.company_gst} onChange={(e) => handleChange('company_gst', e.target.value)} placeholder="27AABCU9603R1ZX" />
                </label>
                <label className="branding-field">
                  <span>HR Officer Name</span>
                  <input value={form.hr_name} onChange={(e) => handleChange('hr_name', e.target.value)} />
                </label>
                <label className="branding-field">
                  <span>HR Designation</span>
                  <input value={form.hr_designation} onChange={(e) => handleChange('hr_designation', e.target.value)} />
                </label>
              </div>

              <label className="branding-field is-wide">
                <span>Company Address</span>
                <textarea value={form.company_address} onChange={(e) => handleChange('company_address', e.target.value)} placeholder="Office no 306, Ellora Fiesta, Juinagar, Sanpada, Navi Mumbai, Maharashtra 400705" />
              </label>

              {/* ── Document Watermark Settings ── */}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 20, paddingTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>Document Watermark</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Company logo appears as a background watermark on all HR documents (Offer Letter, Salary Slip, etc.)
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>{form.watermark_enabled ? 'Enabled' : 'Disabled'}</span>
                    <div
                      onClick={() => handleChange('watermark_enabled', !form.watermark_enabled)}
                      style={{
                        width: 42, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background .2s',
                        background: form.watermark_enabled ? '#1C47C9' : '#d1d5db',
                        position: 'relative', flexShrink: 0
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 3, left: form.watermark_enabled ? 21 : 3,
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
                      }} />
                    </div>
                  </label>
                </div>

                {form.watermark_enabled && (
                  <div className="branding-form-grid" style={{ gap: 12 }}>
                    <label className="branding-field">
                      <span>Opacity <small style={{ fontWeight: 400, color: '#9ca3af' }}>2%–15%</small></span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="range" min="0.02" max="0.15" step="0.01"
                          value={form.watermark_opacity}
                          onChange={(e) => handleChange('watermark_opacity', Number(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, width: 36, textAlign: 'right' }}>
                          {Math.round(form.watermark_opacity * 100)}%
                        </span>
                      </div>
                    </label>

                    <label className="branding-field">
                      <span>Size</span>
                      <select
                        value={form.watermark_size}
                        onChange={(e) => handleChange('watermark_size', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
                      >
                        <option value="small">Small (35% of page width)</option>
                        <option value="medium">Medium (50% of page width)</option>
                        <option value="large">Large (65% of page width)</option>
                      </select>
                    </label>

                    <label className="branding-field">
                      <span>Position</span>
                      <select
                        value={form.watermark_position}
                        onChange={(e) => handleChange('watermark_position', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
                      >
                        <option value="center">Center</option>
                        <option value="top-center">Top Center</option>
                        <option value="bottom-center">Bottom Center</option>
                        <option value="diagonal">Diagonal</option>
                      </select>
                    </label>
                  </div>
                )}

                {!assets.logo_url && (
                  <div style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '8px 12px', marginTop: 10 }}>
                    No company logo uploaded. Upload a logo in Brand Assets above to enable the watermark.
                  </div>
                )}
              </div>

              <label className="branding-field is-wide">
                <span><HiOutlineDocumentText /> Default Terms and Conditions</span>
                <textarea className="branding-terms" value={form.default_terms} onChange={(e) => handleChange('default_terms', e.target.value)} />
              </label>
            </section>

            <aside className="branding-side">
              <section className="branding-panel">
                <div className="branding-panel-title">
                  <h3>Brand Assets</h3>
                  <span>Logo, signature and stamp</span>
                </div>

                <div className="branding-assets">
                  {assetFields.map((asset) => {
                    const currentUrl = assets[asset.dbKey] ? brandingAPI.getImageUrl(assets[asset.dbKey]) : null;
                    const busy = uploadingField === asset.key;

                    return (
                      <div key={asset.key} className="branding-asset-card">
                        <div className="branding-asset-head">
                          <div>
                            <h4>{asset.label}</h4>
                            <p>PNG, JPG, SVG up to 2MB</p>
                          </div>
                          {currentUrl && (
                            <button
                              className="branding-icon-btn danger"
                              type="button"
                              onClick={() => handleDelete(asset.key)}
                              disabled={busy}
                              title={`Remove ${asset.label}`}
                            >
                              <HiOutlineTrash />
                            </button>
                          )}
                        </div>

                        <div className="branding-preview-box">
                          {currentUrl ? (
                            <img src={currentUrl} alt={asset.label} />
                          ) : (
                            <div className="branding-empty-preview">
                              <HiOutlinePhoto />
                              <span>No image uploaded</span>
                            </div>
                          )}
                        </div>

                        <label className={`branding-upload-btn ${busy ? 'is-busy' : ''}`}>
                          <HiOutlineArrowUpTray />
                          {busy ? 'Uploading...' : 'Upload Image'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                            disabled={busy}
                            onChange={(e) => handleUpload(asset.key, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ── Live Document Header Preview ── */}
              <section className="branding-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="branding-panel-title" style={{ padding: '14px 18px 10px' }}>
                  <h3>Document Header Preview</h3>
                  <span>Matches Offer Letter, Salary Slip, all HR docs</span>
                </div>
                <div style={{ background: '#e5e7eb', padding: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{
                    background: '#fff', borderRadius: 6, overflow: 'hidden',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.12)', fontFamily: 'Arial,sans-serif',
                    color: '#000', colorScheme: 'light'
                  }}>
                    {/* Header table matching docHeaderService.js layout */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '14px 8px 10px 16px', verticalAlign: 'middle', width: '42%' }}>
                            {assets.logo_url
                              ? <img src={brandingAPI.getImageUrl(assets.logo_url)} alt="Logo"
                                  style={{ maxHeight: 56, maxWidth: 180, display: 'block', objectFit: 'contain', objectPosition: 'left center' }} />
                              : <div style={{ fontSize: 14, fontWeight: 800, color: '#111', letterSpacing: -.2 }}>
                                  {form.company_name || 'Company Name'}
                                </div>
                            }
                          </td>
                          <td style={{ width: 1, padding: '8px 0', verticalAlign: 'middle' }}>
                            <div style={{ width: 1, background: '#d1d5db', height: '100%', minHeight: 44 }} />
                          </td>
                          <td style={{ padding: '10px 16px 10px 10px', verticalAlign: 'middle', textAlign: 'right' }}>
                            {form.company_name && <div style={{ fontSize: 11, fontWeight: 800, color: '#111', marginBottom: 1 }}>{form.company_name}</div>}
                            {form.company_tagline && <div style={{ fontSize: 8, color: '#555', fontStyle: 'italic', marginBottom: 3 }}>{form.company_tagline}</div>}
                            {form.company_phone  && <div style={{ fontSize: 9, fontWeight: 700, color: '#111', marginBottom: 1 }}>{form.company_phone}</div>}
                            {form.company_website && <div style={{ fontSize: 8, color: '#333', marginBottom: 1 }}>{form.company_website}</div>}
                            {form.company_email  && <div style={{ fontSize: 7.5, color: '#555', marginBottom: 1 }}>{form.company_email}</div>}
                            {form.company_address && <div style={{ fontSize: 7.5, color: '#555', lineHeight: 1.4 }}>{form.company_address.split('\n').join(', ')}</div>}
                            {form.company_cin && <div style={{ fontSize: 7, color: '#777', marginTop: 2 }}>CIN: {form.company_cin}</div>}
                            {form.company_gst && <div style={{ fontSize: 7, color: '#777' }}>GST: {form.company_gst}</div>}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ height: 2.5, background: '#1C47C9' }} />
                    {/* Simulated content area */}
                    <div style={{ padding: '10px 16px 14px', background: '#fff' }}>
                      {[70, 90, 55, 80, 65].map((w, i) => (
                        <div key={i} style={{ height: 7, background: '#f1f5f9', borderRadius: 4, marginBottom: 5, width: `${w}%` }} />
                      ))}
                    </div>
                    {/* Footer */}
                    {form.company_address && (
                      <div style={{ borderTop: '1.5px solid #000', padding: '5px 16px', textAlign: 'center', fontSize: 7.5, color: '#444', background: '#fff' }}>
                        {[form.company_address.split('\n').join(', '), form.company_email, form.company_phone].filter(Boolean).join('  |  ')}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </form>
        </>
      ) : activeTab === 'idcard' ? (
        <div className="branding-tab-panel">
          <IDCardBrandingSettings />
        </div>
      ) : (
        <div className="branding-tab-panel">
          <BillingSettings />
        </div>
      )}
    </div>
  );
};

export default BrandingSettings;
