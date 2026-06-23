// src/pages/dashboard/admin/ServiceManagement.jsx
import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaReceipt, FaEnvelope, FaInfoCircle } from 'react-icons/fa';
import { serviceSettingAPI } from '../../../services/serviceSettingAPI';
import './Setting.css';

const ServiceManagement = () => {
  const [activeSetting, setActiveSetting] = useState('bank'); // 'bank' or 'gst'
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Bank Details State
  const [bankDetails, setBankDetails] = useState({
    account_holder: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
    branch: '',
    account_type: 'Current'
  });

  // GST Details State
  const [gstDetails, setGstDetails] = useState({
    gstin: '',
    pan_number: '',
    hsn_code: '',
    tax_rate: 18,
    is_gst_applicable: true,
    sgst_rate: 9,
    cgst_rate: 9,
    igst_rate: 18
  });

  // SMTP Details State
  const [smtpSettings, setSmtpSettings] = useState({
    smtp_provider: '',
    smtp_user: '',
    smtp_password: ''
  });

  // Load settings data
  useEffect(() => {
    loadSettingsData();
  }, [activeSetting]);

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      
      if (activeSetting === 'bank') {
        const response = await serviceSettingAPI.getBankDetails();
        if (response.data.success && response.data.bankDetails) {
          setBankDetails(response.data.bankDetails);
        }
      } else if (activeSetting === 'gst') {
        const response = await serviceSettingAPI.getGstDetails();
        if (response.data.success && response.data.gstDetails) {
          setGstDetails(response.data.gstDetails);
        }
      } else if (activeSetting === 'smtp') {
        const response = await serviceSettingAPI.getSmtpDetails();
        if (response.data.success && response.data.smtpDetails) {
          setSmtpSettings(response.data.smtpDetails);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('Error loading settings data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Bank Details Input Change
  const handleBankInputChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle GST Details Input Change
  const handleGstInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGstDetails(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save Bank Details
  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    
    if (!bankDetails.account_holder || !bankDetails.account_number || !bankDetails.bank_name || !bankDetails.ifsc_code) {
      alert('Please fill in all required bank details');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await serviceSettingAPI.updateBankDetails(bankDetails);
      
      if (response.data.success) {
        alert('Bank details saved successfully!');
        await loadSettingsData(); // Reload to get updated data
      } else {
        alert('Failed to save bank details: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error saving bank details:', error);
      const errorMessage = error.response?.data?.message || 'Error saving bank details. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save GST Details
  const handleSaveGstDetails = async (e) => {
    e.preventDefault();
    
    if (gstDetails.is_gst_applicable && (!gstDetails.gstin || !gstDetails.pan_number)) {
      alert('Please fill in GSTIN and PAN number for GST applicable services');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await serviceSettingAPI.updateGstDetails(gstDetails);
      
      if (response.data.success) {
        alert('GST details saved successfully!');
        await loadSettingsData(); // Reload to get updated data
      } else {
        alert('Failed to save GST details: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error saving GST details:', error);
      const errorMessage = error.response?.data?.message || 'Error saving GST details. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSmtpInputChange = (e) => {
    const { name, value } = e.target;
    setSmtpSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveSmtpSettings = async (e) => {
    e.preventDefault();
    if (!smtpSettings.smtp_provider || !smtpSettings.smtp_user || !smtpSettings.smtp_password) {
      alert('Please fill out all SMTP fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await serviceSettingAPI.updateSmtpDetails(smtpSettings);
      if (response.data.success) {
        alert('SMTP details saved successfully!');
        await loadSettingsData();
      } else {
        alert('Failed to save SMTP details: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error saving SMTP details:', error);
      alert('Error saving SMTP details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="setting-management-section setting-management-wrapper" id="settingManagementMain">
        <div className="loading-container">
          <div>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="setting-management-section setting-management-wrapper" id="settingManagementMain">
      <div className="setting-header setting-management-header" id="settingManagementHeader">
        <h2 className="setting-management-title setting-main-heading">Service Settings</h2>
      </div>

      <div className="setting-table-container setting-configuration-container" id="settingManagementContent">
        <div className="setting-table-header configuration-header" id="settingTableHeader">
          <h3 className="setting-configuration-title config-section-title">Configuration</h3>
          <div className="setting-table-actions settings-actions" id="settingTableActions">
            <div className="settings-tabs setting-settings-tabs" id="settingsTabsContainer">
              <button 
                className={`setting-filter-btn settings-tab-btn ${activeSetting === 'bank' ? 'active bank-tab-active' : 'bank-tab-inactive'}`}
                id="bankTabBtn"
                onClick={() => setActiveSetting('bank')}
              >
                <FaCreditCard className="setting-tab-icon bank-tab-icon" style={{ marginRight: '8px' }} />
                Bank Details
              </button>
              <button 
                className={`setting-filter-btn settings-tab-btn ${activeSetting === 'gst' ? 'active gst-tab-active' : 'gst-tab-inactive'}`}
                id="gstTabBtn"
                onClick={() => setActiveSetting('gst')}
              >
                <FaReceipt className="setting-tab-icon gst-tab-icon" style={{ marginRight: '8px' }} />
                GST Details
              </button>
              <button 
                className={`setting-filter-btn settings-tab-btn ${activeSetting === 'smtp' ? 'active gst-tab-active' : 'gst-tab-inactive'}`}
                id="smtpTabBtn"
                onClick={() => setActiveSetting('smtp')}
              >
                <FaEnvelope className="setting-tab-icon" style={{ marginRight: '8px' }} />
                SMTP Settings
              </button>
            </div>
          </div>
        </div>

        <div className="setting-modal-content settings-form-container" id="settingFormWrapper" style={{ margin: '0', boxShadow: 'none', maxWidth: '100%' }}>
          {/* Bank Details Form */}
          {activeSetting === 'bank' && (
            <form onSubmit={handleSaveBankDetails} className="setting-employee-form bank-details-form" id="bankDetailsForm">
              <div className="setting-form-section bank-info-section" id="bankFormSection">
                <h3 className="setting-section-title bank-section-title">Bank Account Information</h3>
                
                <div className="setting-form-row-three bank-form-row" id="bankFormRow1">
                  <div className="setting-form-group bank-form-group account-holder-group" id="accountHolderGroup">
                    <label htmlFor="accountHolder" className="setting-form-label bank-form-label">Account Holder Name *</label>
                    <input
                      type="text"
                      id="accountHolder"
                      name="account_holder"
                      value={bankDetails.account_holder}
                      onChange={handleBankInputChange}
                      placeholder="Enter account holder name"
                      className="setting-form-input bank-form-input account-holder-input"
                      required
                    />
                  </div>

                  <div className="setting-form-group bank-form-group account-number-group" id="accountNumberGroup">
                    <label htmlFor="accountNumber" className="setting-form-label bank-form-label">Account Number *</label>
                    <input
                      type="text"
                      id="accountNumber"
                      name="account_number"
                      value={bankDetails.account_number}
                      onChange={handleBankInputChange}
                      placeholder="Enter account number"
                      className="setting-form-input bank-form-input account-number-input"
                      required
                    />
                  </div>

                  <div className="setting-form-group bank-form-group bank-name-group" id="bankNameGroup">
                    <label htmlFor="bankName" className="setting-form-label bank-form-label">Bank Name *</label>
                    <input
                      type="text"
                      id="bankName"
                      name="bank_name"
                      value={bankDetails.bank_name}
                      onChange={handleBankInputChange}
                      placeholder="Enter bank name"
                      className="setting-form-input bank-form-input bank-name-input"
                      required
                    />
                  </div>
                </div>

                <div className="setting-form-row-three bank-form-row" id="bankFormRow2">
                  <div className="setting-form-group bank-form-group ifsc-code-group" id="ifscCodeGroup">
                    <label htmlFor="ifscCode" className="setting-form-label bank-form-label">IFSC Code *</label>
                    <input
                      type="text"
                      id="ifscCode"
                      name="ifsc_code"
                      value={bankDetails.ifsc_code}
                      onChange={handleBankInputChange}
                      placeholder="Enter IFSC code"
                      className="setting-form-input bank-form-input ifsc-code-input"
                      required
                    />
                  </div>

                  <div className="setting-form-group bank-form-group branch-group" id="branchGroup">
                    <label htmlFor="branch" className="setting-form-label bank-form-label">Branch</label>
                    <input
                      type="text"
                      id="branch"
                      name="branch"
                      value={bankDetails.branch}
                      onChange={handleBankInputChange}
                      placeholder="Enter branch name"
                      className="setting-form-input bank-form-input branch-input"
                    />
                  </div>

                  <div className="setting-form-group bank-form-group account-type-group" id="accountTypeGroup">
                    <label htmlFor="accountType" className="setting-form-label bank-form-label">Account Type</label>
                    <select
                      id="accountType"
                      name="account_type"
                      value={bankDetails.account_type}
                      onChange={handleBankInputChange}
                      className="setting-form-input bank-form-input account-type-select"
                    >
                      <option value="Current">Current</option>
                      <option value="Savings">Savings</option>
                      <option value="OD">Overdraft</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="setting-form-actions bank-form-actions" id="bankFormActions">
                <button
                  type="submit"
                  className="setting-submit-btn bank-submit-btn"
                  id="saveBankBtn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </form>
          )}

          {/* GST Details Form */}
          {activeSetting === 'gst' && (
            <form onSubmit={handleSaveGstDetails} className="setting-employee-form gst-details-form" id="gstDetailsForm">
              <div className="setting-form-section gst-info-section" id="gstFormSection">
                <h3 className="setting-section-title gst-section-title">GST & Tax Information</h3>

                <div className="setting-form-group gst-form-group gst-applicable-group" id="gstApplicableGroup">
                  <label className="setting-form-label gst-form-label">
                    <input
                      type="checkbox"
                      name="is_gst_applicable"
                      checked={gstDetails.is_gst_applicable}
                      onChange={handleGstInputChange}
                      className="gst-checkbox-input"
                    />
                    GST Applicable
                  </label>
                </div>

                {gstDetails.is_gst_applicable && (
                  <>
                    <div className="gst-form-row" id="gstFormRow1">
                      <div className="setting-form-group gst-form-group gstin-group" id="gstinGroup">
                        <label htmlFor="gstin" className="setting-form-label gst-form-label">GSTIN *</label>
                        <input
                          type="text"
                          id="gstin"
                          name="gstin"
                          value={gstDetails.gstin}
                          onChange={handleGstInputChange}
                          placeholder="Enter GSTIN"
                          className="setting-form-input gst-form-input gstin-input"
                          required
                        />
                      </div>

                      <div className="setting-form-group gst-form-group pan-group" id="panGroup">
                        <label htmlFor="panNumber" className="setting-form-label gst-form-label">PAN Number *</label>
                        <input
                          type="text"
                          id="panNumber"
                          name="pan_number"
                          value={gstDetails.pan_number}
                          onChange={handleGstInputChange}
                          placeholder="Enter PAN number"
                          className="setting-form-input gst-form-input pan-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="gst-form-row" id="gstFormRow2">
                      <div className="setting-form-group gst-form-group hsn-code-group" id="hsnCodeGroup">
                        <label htmlFor="hsnCode" className="setting-form-label gst-form-label">HSN/SAC Code</label>
                        <input
                          type="text"
                          id="hsnCode"
                          name="hsn_code"
                          value={gstDetails.hsn_code}
                          onChange={handleGstInputChange}
                          placeholder="Enter HSN/SAC code"
                          className="setting-form-input gst-form-input hsn-code-input"
                        />
                      </div>

                      <div className="setting-form-group gst-form-group tax-rate-group" id="taxRateGroup">
                        <label htmlFor="taxRate" className="setting-form-label gst-form-label">Total Tax Rate (%)</label>
                        <input
                          type="number"
                          id="taxRate"
                          name="tax_rate"
                          value={gstDetails.tax_rate}
                          onChange={handleGstInputChange}
                          placeholder="Total tax rate"
                          className="setting-form-input gst-form-input tax-rate-input"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>

                    <div className="tax-rates-row" id="gstFormRow3">
                      <div className="setting-form-group gst-form-group sgst-rate-group" id="sgstRateGroup">
                        <label htmlFor="sgstRate" className="setting-form-label gst-form-label">SGST Rate (%)</label>
                        <input
                          type="number"
                          id="sgstRate"
                          name="sgst_rate"
                          value={gstDetails.sgst_rate}
                          onChange={handleGstInputChange}
                          placeholder="SGST rate"
                          className="setting-form-input gst-form-input sgst-rate-input"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>

                      <div className="setting-form-group gst-form-group cgst-rate-group" id="cgstRateGroup">
                        <label htmlFor="cgstRate" className="setting-form-label gst-form-label">CGST Rate (%)</label>
                        <input
                          type="number"
                          id="cgstRate"
                          name="cgst_rate"
                          value={gstDetails.cgst_rate}
                          onChange={handleGstInputChange}
                          placeholder="CGST rate"
                          className="setting-form-input gst-form-input cgst-rate-input"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>

                      <div className="setting-form-group gst-form-group igst-rate-group" id="igstRateGroup">
                        <label htmlFor="igstRate" className="setting-form-label gst-form-label">IGST Rate (%)</label>
                        <input
                          type="number"
                          id="igstRate"
                          name="igst_rate"
                          value={gstDetails.igst_rate}
                          onChange={handleGstInputChange}
                          placeholder="IGST rate"
                          className="setting-form-input gst-form-input igst-rate-input"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="setting-form-actions gst-form-actions" id="gstFormActions">
                <button
                  type="submit"
                  className="setting-submit-btn gst-submit-btn"
                  id="saveGstBtn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save GST Details'}
                </button>
              </div>
            </form>
          )}

          {activeSetting === 'smtp' && (
            <form onSubmit={handleSaveSmtpSettings} className="setting-employee-form app-settings-form">
              <div className="setting-form-section app-info-section">
                <div style={{ marginBottom: "20px" }}>
                  <div className="smtp-tutorial-alert">
                    <FaInfoCircle size={24} color="#3182ce" />
                    <div style={{ marginLeft: "10px" }}>
                      <strong>How to get Application Password?</strong>
                      <p style={{ margin: "5px 0 0 0", fontSize: "0.9rem" }}>
                        <strong>Gmail:</strong> Go to Manage your Google Account &gt; Security &gt; 2-Step Verification &gt; App passwords. Create a new one and paste it below. <br/>
                        <strong>Outlook:</strong> Go to Microsoft Account Security &gt; Advanced Security Options &gt; App passwords.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="setting-form-row-three app-form-row">
                  <div className="setting-form-group app-form-group">
                    <label className="setting-form-label app-form-label">SMTP Provider *</label>
                    <select
                      name="smtp_provider"
                      value={smtpSettings.smtp_provider}
                      onChange={handleSmtpInputChange}
                      className="setting-form-input app-form-input"
                      required
                    >
                      <option value="">Select Provider</option>
                      <option value="gmail">Gmail</option>
                      <option value="outlook">Outlook</option>
                    </select>
                  </div>

                  <div className="setting-form-group app-form-group">
                    <label className="setting-form-label app-form-label">SMTP Email User *</label>
                    <input
                      type="email"
                      name="smtp_user"
                      value={smtpSettings.smtp_user}
                      onChange={handleSmtpInputChange}
                      placeholder="e.g. hr@company.com"
                      className="setting-form-input app-form-input"
                      required
                    />
                  </div>

                  <div className="setting-form-group app-form-group">
                    <label className="setting-form-label app-form-label">SMTP App Password *</label>
                    <input
                      type="password"
                      name="smtp_password"
                      value={smtpSettings.smtp_password}
                      onChange={handleSmtpInputChange}
                      placeholder="Paste app password here"
                      className="setting-form-input app-form-input"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="setting-form-actions app-form-actions">
                <button type="submit" className="setting-submit-btn app-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save SMTP Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceManagement;