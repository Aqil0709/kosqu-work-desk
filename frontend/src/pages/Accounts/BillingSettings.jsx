import { useEffect, useState } from 'react';
import {
  HiOutlineBanknotes,
  HiOutlineBuildingLibrary,
  HiOutlineCheckCircle,
  HiOutlineIdentification,
  HiOutlineReceiptPercent
} from 'react-icons/hi2';
import { serviceSettingAPI } from '../../services/serviceSettingAPI';
import './BillingSettings.css';

const defaultBank = {
  account_holder: '',
  account_number: '',
  bank_name: '',
  ifsc_code: '',
  branch: '',
  account_type: 'Current'
};

const defaultGst = {
  gstin: '',
  pan_number: '',
  hsn_code: '',
  tax_rate: 18,
  is_gst_applicable: 1,
  sgst_rate: 9,
  cgst_rate: 9,
  igst_rate: 18
};

const BillingSettings = () => {
  const [bank, setBank] = useState(defaultBank);
  const [gst, setGst] = useState(defaultGst);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const completedBankFields = ['account_holder', 'account_number', 'bank_name', 'ifsc_code']
    .filter((field) => String(bank[field] || '').trim()).length;
  const completedGstFields = ['gstin', 'pan_number', 'tax_rate']
    .filter((field) => String(gst[field] || '').trim()).length;
  const isReady = completedBankFields === 4 && completedGstFields === 3;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await serviceSettingAPI.getQuotationSettings();
      const settings = response.data?.settings || {};
      setBank({ ...defaultBank, ...(settings.bankDetails || settings.bank || {}) });
      setGst({ ...defaultGst, ...(settings.gstDetails || settings.gst || {}) });
    } catch (error) {
      console.error('Error loading billing settings:', error);
      setMessage('Unable to load billing settings.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const updateBank = (field, value) => {
    setBank((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const updateGst = (field, value) => {
    setGst((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await serviceSettingAPI.updateBankDetails(bank);
      await serviceSettingAPI.updateGstDetails(gst);
      setMessage('Billing settings saved successfully.');
      setMessageType('success');
      await loadSettings();
    } catch (error) {
      console.error('Error saving billing settings:', error);
      setMessage(error.response?.data?.message || 'Failed to save billing settings.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="billing-settings-loading">Loading billing settings...</div>;
  }

  return (
    <div className="billing-settings-page">
      <div className="billing-settings-header">
        <div>
          {/* <div className="billing-settings-kicker">Account Module</div> */}
          <h2><HiOutlineBanknotes /> Billing Settings</h2>
          <p>Configure the invoice payment and tax profile used in Billing Management.</p>
        </div>
        <div className={`billing-readiness ${isReady ? 'ready' : ''}`}>
          <HiOutlineCheckCircle />
          <span>{isReady ? 'Ready for invoices' : 'Setup pending'}</span>
        </div>
      </div>

      {message && (
        <div className={`billing-settings-alert ${messageType === 'error' ? 'is-error' : ''}`}>
          {message}
        </div>
      )}

      <div className="billing-settings-stats">
        <div className="billing-stat-card">
          <span>Bank Profile</span>
          <strong>{completedBankFields}/4</strong>
        </div>
        <div className="billing-stat-card">
          <span>GST Profile</span>
          <strong>{completedGstFields}/3</strong>
        </div>
        <div className="billing-stat-card">
          <span>Default Tax</span>
          <strong>{Number(gst.tax_rate || 0)}%</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="billing-settings-form">
        <div className="billing-settings-layout">
          <div className="billing-settings-main">
            <section className="billing-settings-card">
              <div className="billing-card-title">
                <div className="billing-card-icon"><HiOutlineBuildingLibrary /></div>
                <div>
                  <h3>Bank Details</h3>
                  <p>Shown in the payment block of generated invoices.</p>
                </div>
              </div>

              <div className="billing-settings-grid">
                <label>
                  <span>Account Holder</span>
                  <input value={bank.account_holder} onChange={(e) => updateBank('account_holder', e.target.value)} required />
                </label>
                <label>
                  <span>Account Number</span>
                  <input value={bank.account_number} onChange={(e) => updateBank('account_number', e.target.value)} required />
                </label>
                <label>
                  <span>Bank Name</span>
                  <input value={bank.bank_name} onChange={(e) => updateBank('bank_name', e.target.value)} required />
                </label>
                <label>
                  <span>IFSC Code</span>
                  <input value={bank.ifsc_code} onChange={(e) => updateBank('ifsc_code', e.target.value.toUpperCase())} required />
                </label>
                <label>
                  <span>Branch</span>
                  <input value={bank.branch} onChange={(e) => updateBank('branch', e.target.value)} />
                </label>
                <label>
                  <span>Account Type</span>
                  <select value={bank.account_type} onChange={(e) => updateBank('account_type', e.target.value)}>
                    <option value="Current">Current</option>
                    <option value="Savings">Savings</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="billing-settings-card">
              <div className="billing-card-title">
                <div className="billing-card-icon"><HiOutlineReceiptPercent /></div>
                <div>
                  <h3>GST Details</h3>
                  <p>Used for invoice GSTIN, HSN and default tax split.</p>
                </div>
              </div>

              <div className="billing-settings-grid">
                <label>
                  <span>GSTIN</span>
                  <input value={gst.gstin} onChange={(e) => updateGst('gstin', e.target.value.toUpperCase())} required />
                </label>
                <label>
                  <span>PAN Number</span>
                  <input value={gst.pan_number} onChange={(e) => updateGst('pan_number', e.target.value.toUpperCase())} required />
                </label>
                <label>
                  <span>Default HSN Code</span>
                  <input value={gst.hsn_code} onChange={(e) => updateGst('hsn_code', e.target.value)} />
                </label>
                <label>
                  <span>Total Tax Rate (%)</span>
                  <input type="number" step="0.01" value={gst.tax_rate} onChange={(e) => updateGst('tax_rate', e.target.value)} />
                </label>
                <label>
                  <span>SGST Rate (%)</span>
                  <input type="number" step="0.01" value={gst.sgst_rate} onChange={(e) => updateGst('sgst_rate', e.target.value)} />
                </label>
                <label>
                  <span>CGST Rate (%)</span>
                  <input type="number" step="0.01" value={gst.cgst_rate} onChange={(e) => updateGst('cgst_rate', e.target.value)} />
                </label>
                <label>
                  <span>IGST Rate (%)</span>
                  <input type="number" step="0.01" value={gst.igst_rate} onChange={(e) => updateGst('igst_rate', e.target.value)} />
                </label>
                <label className="billing-settings-check">
                  <input
                    type="checkbox"
                    checked={Boolean(Number(gst.is_gst_applicable))}
                    onChange={(e) => updateGst('is_gst_applicable', e.target.checked ? 1 : 0)}
                  />
                  <span>GST applicable on invoices</span>
                </label>
              </div>
            </section>
          </div>

          <aside className="billing-preview-card">
            <div className="billing-preview-head">
              <HiOutlineIdentification />
              <div>
                <strong>Invoice Profile</strong>
                <span>{isReady ? 'Configured' : 'Needs details'}</span>
              </div>
            </div>

            <div className="billing-preview-section">
              <span>Bank</span>
              <strong>{bank.bank_name || 'Bank Name'}</strong>
              <small>{bank.account_holder || 'Account Holder'}</small>
              <small>{bank.account_number || 'Account Number'}</small>
              <small>{bank.ifsc_code || 'IFSC Code'}</small>
            </div>

            <div className="billing-preview-section">
              <span>Tax</span>
              <strong>{gst.gstin || 'GSTIN'}</strong>
              <small>PAN: {gst.pan_number || 'PAN Number'}</small>
              <small>HSN: {gst.hsn_code || 'Default HSN'}</small>
              <small>CGST {gst.cgst_rate || 0}% + SGST {gst.sgst_rate || 0}%</small>
            </div>

            <div className="billing-settings-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Billing Settings'}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
};

export default BillingSettings;
