import React, { useState } from 'react';
import { FaLock, FaInfoCircle } from 'react-icons/fa';
import './Settings.css';

const ServiceManagement = () => {
  const [activeSetting, setActiveSetting] = useState('app'); // Only 'app' now

  // Add new state for app settings
  const [appSettings, setAppSettings] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    app_version: 'v2.1.0'
  });

  // Add handler for app settings input change
  const handleAppInputChange = (e) => {
    const { name, value } = e.target;
    setAppSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add save handler for app settings
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
              {/* Only App Settings tab remains */}
            
            </div>
          </div>
        </div>

        <div className="setting-modal-content settings-form-container" id="settingFormWrapper" style={{ margin: '0', boxShadow: 'none', maxWidth: '100%' }}>
          {/* Only App Settings Form remains */}
          <form onSubmit={handleSaveAppSettings} className="setting-employee-form app-settings-form" id="appSettingsForm">
            <div className="setting-form-section app-info-section" id="appFormSection">
             
              
              <div className="setting-form-row-three app-form-row" id="appFormRow1">
                <div className="setting-form-group app-form-group current-password-group" id="currentPasswordGroup">
                  <label htmlFor="currentPassword" className="setting-form-label app-form-label">Current Password *</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="current_password"
                    value={appSettings.current_password}
                    onChange={handleAppInputChange}
                    placeholder="Enter current password"
                    className="setting-form-input app-form-input current-password-input"
                    required
                  />
                </div>

                <div className="setting-form-group app-form-group new-password-group" id="newPasswordGroup">
                  <label htmlFor="newPassword" className="setting-form-label app-form-label">New Password *</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="new_password"
                    value={appSettings.new_password}
                    onChange={handleAppInputChange}
                    placeholder="Enter new password"
                    className="setting-form-input app-form-input new-password-input"
                    required
                  />
                </div>

                <div className="setting-form-group app-form-group confirm-password-group" id="confirmPasswordGroup">
                  <label htmlFor="confirmPassword" className="setting-form-label app-form-label">Confirm Password *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirm_password"
                    value={appSettings.confirm_password}
                    onChange={handleAppInputChange}
                    placeholder="Confirm new password"
                    className="setting-form-input app-form-input confirm-password-input"
                    required
                  />
                </div>
              </div>

              <div className="setting-form-row-three app-form-row" id="appFormRow2">
                <div className="setting-form-group app-form-group app-version-group" id="appVersionGroup">
                  <label htmlFor="appVersion" className="setting-form-label app-form-label">App Version</label>
                  <div className="app-version-display">
                    <FaInfoCircle className="version-icon" style={{ marginRight: '8px', color: 'var(--theme-text,#718096)' }} />
                    <span className="version-text">{appSettings.app_version}</span>
                  </div>
                  <input
                    type="hidden"
                    id="appVersion"
                    name="app_version"
                    value={appSettings.app_version}
                    className="setting-form-input app-form-input app-version-input"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="setting-form-actions app-form-actions" id="appFormActions">
              <button
                type="submit"
                className="setting-submit-btn app-submit-btn"
                id="saveAppBtn"
              >
                Save App Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceManagement;