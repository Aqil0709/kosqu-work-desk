import React, { useState, useEffect } from 'react';
import { FaLock, FaInfoCircle, FaEnvelope } from 'react-icons/fa';
import { serviceSettingAPI } from '../../../services/serviceSettingAPI';
import './Settings.css';

const ServiceManagement = () => {
  const [activeSetting, setActiveSetting] = useState('app'); // 'app' or 'smtp'
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // App Settings State
  const [appSettings, setAppSettings] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    app_version: 'v2.1.0'
  });

  // SMTP Settings State
  const [smtpSettings, setSmtpSettings] = useState({
    smtp_provider: '', // 'gmail' or 'outlook'
    smtp_user: '',
    smtp_password: ''
  });

  useEffect(() => {
    if (activeSetting === 'smtp') {
      fetchSmtpSettings();
    }
  }, [activeSetting]);

  const fetchSmtpSettings = async () => {
    setIsLoading(true);
    try {
      const res = await serviceSettingAPI.getSmtpDetails();
      if (res.data.success && res.data.smtpDetails) {
        setSmtpSettings(res.data.smtpDetails);
      }
    } catch (error) {
      console.error('Error fetching SMTP settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppInputChange = (e) => {
    const { name, value } = e.target;
    setAppSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSmtpInputChange = (e) => {
    const { name, value } = e.target;
    setSmtpSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveAppSettings = (e) => {
    e.preventDefault();
    if (!appSettings.current_password || !appSettings.new_password || !appSettings.confirm_password) {
      alert('Please fill in all password fields');
      return;
    }
    if (appSettings.new_password !== appSettings.confirm_password) {
      alert('New password and confirm password do not match');
      return;
    }
    alert('App settings saved successfully!');
  };

  const handleSaveSmtpSettings = async (e) => {
    e.preventDefault();
    if (!smtpSettings.smtp_provider || !smtpSettings.smtp_user || !smtpSettings.smtp_password) {
      alert('Please fill out all SMTP fields');
      return;
    }
    setIsSaving(true);
    try {
      const res = await serviceSettingAPI.updateSmtpDetails(smtpSettings);
      if (res.data.success) {
        alert('SMTP Details saved successfully!');
      } else {
        alert(res.data.message || 'Failed to save SMTP settings');
      }
    } catch (error) {
      console.error('Error saving SMTP settings', error);
      alert('Failed to save SMTP settings');
    } finally {
      setIsSaving(false);
    }
  };

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
                className={`setting-filter-btn settings-tab-btn ${activeSetting === 'app' ? 'active app-tab-active' : 'app-tab-inactive'}`}
                onClick={() => setActiveSetting('app')}
              >
                <FaLock className="setting-tab-icon" style={{ marginRight: '8px' }} />
                App Settings
              </button>
              <button 
                className={`setting-filter-btn settings-tab-btn ${activeSetting === 'smtp' ? 'active app-tab-active' : 'app-tab-inactive'}`}
                onClick={() => setActiveSetting('smtp')}
              >
                <FaEnvelope className="setting-tab-icon" style={{ marginRight: '8px' }} />
                SMTP Settings
              </button>
            </div>
          </div>
        </div>

        <div className="setting-modal-content settings-form-container" id="settingFormWrapper" style={{ margin: '0', boxShadow: 'none', maxWidth: '100%' }}>
          {activeSetting === 'app' && (
            <form onSubmit={handleSaveAppSettings} className="setting-employee-form app-settings-form" id="appSettingsForm">
              <div className="setting-form-section app-info-section" id="appFormSection">
                <div className="setting-form-row-three app-form-row">
                  <div className="setting-form-group app-form-group current-password-group">
                    <label htmlFor="currentPassword" className="setting-form-label app-form-label">Current Password *</label>
                    <input
                      type="password" name="current_password" value={appSettings.current_password} onChange={handleAppInputChange}
                      placeholder="Enter current password" className="setting-form-input app-form-input" required />
                  </div>
                  <div className="setting-form-group app-form-group new-password-group">
                    <label htmlFor="newPassword" className="setting-form-label app-form-label">New Password *</label>
                    <input
                      type="password" name="new_password" value={appSettings.new_password} onChange={handleAppInputChange}
                      placeholder="Enter new password" className="setting-form-input app-form-input" required />
                  </div>
                  <div className="setting-form-group app-form-group confirm-password-group">
                    <label htmlFor="confirmPassword" className="setting-form-label app-form-label">Confirm Password *</label>
                    <input
                      type="password" name="confirm_password" value={appSettings.confirm_password} onChange={handleAppInputChange}
                      placeholder="Confirm new password" className="setting-form-input app-form-input" required />
                  </div>
                </div>

                <div className="setting-form-row-three app-form-row">
                  <div className="setting-form-group app-form-group">
                    <label className="setting-form-label app-form-label">App Version</label>
                    <div className="app-version-display">
                      <FaInfoCircle className="version-icon" style={{ marginRight: '8px', color: 'var(--theme-text,#718096)' }} />
                      <span className="version-text">{appSettings.app_version}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="setting-form-actions app-form-actions">
                <button type="submit" className="setting-submit-btn app-submit-btn">Save App Settings</button>
              </div>
            </form>
          )}

          {activeSetting === 'smtp' && (
            <form onSubmit={handleSaveSmtpSettings} className="setting-employee-form app-settings-form">
              {isLoading && <p>Loading SMTP settings...</p>}
              {!isLoading && (
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
              )}
              
              <div className="setting-form-actions app-form-actions">
                <button type="submit" className="setting-submit-btn app-submit-btn" disabled={isSaving || isLoading}>
                  {isSaving ? 'Saving...' : 'Save SMTP Settings'}
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