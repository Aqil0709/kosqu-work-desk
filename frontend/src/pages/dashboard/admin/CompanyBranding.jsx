// src/pages/dashboard/admin/CompanyBranding.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaBuilding, FaImage, FaCloudUploadAlt, FaTrash, FaSyncAlt } from 'react-icons/fa';
import { brandingAPI } from '../../../services/brandingAPI';
import { API_BASE_URL } from '../../../services/api';
import './CompanyBranding.css';

const ImageUploadCard = ({ label, hint, fieldKey, currentUrl, onUpload, onRemove }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);

    const fullUrl = currentUrl ? `${API_BASE_URL}${currentUrl}` : null;

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            setError('Only PNG, JPG, SVG files allowed');
            return;
        }
        const maxSize = fieldKey === 'company_logo' ? 2 * 1024 * 1024 : 1 * 1024 * 1024;
        if (file.size > maxSize) {
            setError(`File too large. Max ${maxSize / 1024 / 1024}MB`);
            return;
        }

        setError('');
        setUploading(true);
        setProgress(30);

        try {
            setProgress(60);
            const res = await brandingAPI.uploadImage(fieldKey, file);
            setProgress(100);
            if (res.data.success) {
                onUpload(fieldKey, res.data.url);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            setProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = async () => {
        try {
            await brandingAPI.deleteImage(fieldKey);
            onRemove(fieldKey);
        } catch (err) {
            setError('Failed to remove image');
        }
    };

    return (
        <div className={`upload-card ${fullUrl ? 'has-image' : ''}`}>
            <div className="upload-card-label">{label}</div>
            <div className="upload-card-hint">{hint}</div>

            <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            {fullUrl ? (
                <div className="image-preview-container">
                    <img src={`${fullUrl}?t=${Date.now()}`} alt={label} className="image-preview" />
                    <div className="image-overlay">
                        <button className="overlay-btn replace" onClick={() => fileInputRef.current?.click()}>
                            <FaSyncAlt style={{ marginRight: 4 }} /> Replace
                        </button>
                        <button className="overlay-btn remove" onClick={handleRemove}>
                            <FaTrash style={{ marginRight: 4 }} /> Remove
                        </button>
                    </div>
                </div>
            ) : (
                <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                    <FaCloudUploadAlt className="upload-icon" />
                    <p>Drag & drop or <span>click to upload</span></p>
                </div>
            )}

            {uploading && (
                <div className="upload-progress">
                    <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}
            {error && <div className="upload-error">{error}</div>}
        </div>
    );
};

const CompanyBranding = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [branding, setBranding] = useState({
        company_name: '',
        hr_name: '',
        hr_designation: '',
        company_address: '',
        company_email: '',
        company_phone: '',
        company_website: '',
        default_terms: '',
        logo_url: null,
        signature_url: null,
        stamp_url: null
    });

    useEffect(() => {
        loadBranding();
    }, []);

    const loadBranding = async () => {
        try {
            setLoading(true);
            const res = await brandingAPI.get();
            if (res.data.success && res.data.branding) {
                const b = res.data.branding;
                // Convert stored JSON terms back to plain text lines for textarea
                let termsText = '';
                if (b.default_terms) {
                    try {
                        const parsed = typeof b.default_terms === 'string' ? JSON.parse(b.default_terms) : b.default_terms;
                        if (Array.isArray(parsed)) {
                            termsText = parsed.join('\n');
                        } else {
                            termsText = b.default_terms;
                        }
                    } catch (e) {
                        termsText = b.default_terms;
                    }
                }
                setBranding({
                    ...b,
                    default_terms: termsText
                });
            }
        } catch (err) {
            console.error('Error loading branding:', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBranding(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { company_name, hr_name, hr_designation, company_address, company_email, company_phone, company_website, default_terms } = branding;
            // Convert newline-separated terms to JSON array
            const termsArray = default_terms
                .split('\n')
                .map(t => t.trim())
                .filter(t => t !== '');
            const defaultTermsJson = JSON.stringify(termsArray);
            
            const res = await brandingAPI.update({
                company_name,
                hr_name,
                hr_designation,
                company_address,
                company_email,
                company_phone,
                company_website,
                default_terms: defaultTermsJson
            });
            if (res.data.success) {
                showToast('success', 'Branding settings saved successfully!');
            }
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = (fieldKey, url) => {
        const columnMap = { company_logo: 'logo_url', hr_signature: 'signature_url', company_stamp: 'stamp_url' };
        setBranding(prev => ({ ...prev, [columnMap[fieldKey]]: url }));
        showToast('success', 'Image uploaded successfully!');
    };

    const handleImageRemove = (fieldKey) => {
        const columnMap = { company_logo: 'logo_url', hr_signature: 'signature_url', company_stamp: 'stamp_url' };
        setBranding(prev => ({ ...prev, [columnMap[fieldKey]]: null }));
        showToast('success', 'Image removed');
    };

    if (loading) {
        return (
            <div className="branding-settings">
                <div className="branding-loading">
                    <div className="branding-spinner" />
                    Loading branding settings...
                </div>
            </div>
        );
    }

    return (
        <div className="branding-settings">
            {toast && (
                <div className={`branding-toast ${toast.type}`}>{toast.message}</div>
            )}

            <div className="branding-header">
                <h2>Company Branding</h2>
                <p>Configure your company's branding for all HR documents -- offer letters, salary slips, and more.</p>
            </div>

            {/* Image Uploads Section */}
            <div className="branding-section">
                <h3><FaImage className="section-icon" /> Document Assets</h3>
                <p className="section-desc">Upload your company logo, HR signature, and company stamp. These will appear on all generated documents.</p>

                <div className="image-upload-grid">
                    <ImageUploadCard
                        label="Company Logo"
                        hint="PNG, JPG, SVG -- max 2 MB"
                        fieldKey="company_logo"
                        currentUrl={branding.logo_url}
                        onUpload={handleImageUpload}
                        onRemove={handleImageRemove}
                    />
                    <ImageUploadCard
                        label="HR Signature"
                        hint="PNG (transparent bg preferred) -- max 1 MB"
                        fieldKey="hr_signature"
                        currentUrl={branding.signature_url}
                        onUpload={handleImageUpload}
                        onRemove={handleImageRemove}
                    />
                    <ImageUploadCard
                        label="Company Stamp"
                        hint="PNG (transparent bg preferred) -- max 1 MB"
                        fieldKey="company_stamp"
                        currentUrl={branding.stamp_url}
                        onUpload={handleImageUpload}
                        onRemove={handleImageRemove}
                    />
                </div>
            </div>

            {/* Text Fields Section */}
            <div className="branding-section">
                <h3><FaBuilding className="section-icon" /> Company Information</h3>
                <p className="section-desc">These details will be used in document headers and footers.</p>

                <form className="branding-form" onSubmit={handleSave}>
                    <div className="branding-form-group">
                        <label htmlFor="brand_company_name">Company Name</label>
                        <input
                            type="text"
                            id="brand_company_name"
                            name="company_name"
                            value={branding.company_name || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. Arham IT Solutions"
                        />
                    </div>

                    <div className="branding-form-group">
                        <label htmlFor="brand_hr_name">HR Officer Name</label>
                        <input
                            type="text"
                            id="brand_hr_name"
                            name="hr_name"
                            value={branding.hr_name || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. Shaikh Arshan"
                        />
                    </div>

                    <div className="branding-form-group">
                        <label htmlFor="brand_hr_designation">HR Designation</label>
                        <input
                            type="text"
                            id="brand_hr_designation"
                            name="hr_designation"
                            value={branding.hr_designation || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. Human Resources Manager"
                        />
                    </div>

                    <div className="branding-form-group">
                        <label htmlFor="brand_company_email">Company Email</label>
                        <input
                            type="email"
                            id="brand_company_email"
                            name="company_email"
                            value={branding.company_email || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. hr@company.com"
                        />
                    </div>

                    <div className="branding-form-group">
                        <label htmlFor="brand_company_phone">Company Phone</label>
                        <input
                            type="tel"
                            id="brand_company_phone"
                            name="company_phone"
                            value={branding.company_phone || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. +1-234-567-8900"
                        />
                    </div>

                    <div className="branding-form-group">
                        <label htmlFor="brand_company_website">Company Website</label>
                        <input
                            type="url"
                            id="brand_company_website"
                            name="company_website"
                            value={branding.company_website || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. https://company.com"
                        />
                    </div>

                    <div className="branding-form-group full-width">
                        <label htmlFor="brand_company_address">Company Address</label>
                        <textarea
                            id="brand_company_address"
                            name="company_address"
                            value={branding.company_address || ''}
                            onChange={handleInputChange}
                            placeholder="Full mailing address"
                            rows={3}
                        />
                    </div>

                    <div className="branding-form-group full-width">
                        <label htmlFor="brand_default_terms">Default Terms & Conditions (Appears at the end of every offer letter)</label>
                        <textarea
                            id="brand_default_terms"
                            name="default_terms"
                            value={branding.default_terms || ''}
                            onChange={handleInputChange}
                            placeholder="Enter default terms and conditions that will appear in every offer letter. Leave empty to use system defaults."
                            rows={6}
                        />
                        <small className="form-hint">These terms will be appended to all offer letters unless overwritten by specific terms in the offer letter form.</small>
                    </div>

                    <div className="branding-form-actions">
                        <button type="submit" className="branding-save-btn" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Branding Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyBranding;
