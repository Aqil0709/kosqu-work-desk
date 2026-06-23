import React, { useState, useEffect } from 'react';
import { deliveryAPI } from '../../../services/deliveryAPI';
import './BillingSettings.css';

const BillingSettings = () => {
  const [settings, setSettings] = useState({
    from_address: '',
    contact_info: '',
    payment_info: '100% against delivery'
  });
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Try to load from localStorage first for faster display
      const savedSettings = localStorage.getItem('deliveryChallanSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      
      // Then try to fetch from API
      try {
        const response = await deliveryAPI.getSettings();
        if (response.data && response.data.success) {
          setSettings(response.data.settings);
          // Save to localStorage
          localStorage.setItem('deliveryChallanSettings', JSON.stringify(response.data.settings));
        }
      } catch (apiError) {
        // API not available, falling back to localStorage settings
      
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
    if (saveSuccess) setSaveSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Always save to localStorage first (this will always work)
      localStorage.setItem('deliveryChallanSettings', JSON.stringify(settings));
    
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error in save process:', error);
      // Even if everything fails, at least try localStorage
      localStorage.setItem('deliveryChallanSettings', JSON.stringify(settings));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/delivery-challan';
  };

  if (loading && !settings.from_address) {
    return (
      <div className="quotation-dashboard">
        <div className="loading-container">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="quotation-dashboard">
      {/* Header */}
      <div className="quotation-header-panel">
        <h2>Billing Settings</h2>
       
      </div>

      {/* Settings Form */}
      <div className="quotation-form-wrapper">
        <div className="quotation-form-card">
          <h3>Billing Configuration</h3>
          <form onSubmit={handleSubmit} className="quotation-input-form">
            
            {/* From Address Section */}
            <fieldset className="quotation-field-group">
              <legend>From Address</legend>
              <div className="form-group">
                <textarea
                  id="from_address"
                  name="from_address"
                  value={settings.from_address}
                  onChange={handleInputChange}
                  rows="5"
                  required
                  placeholder="Enter your company's full address"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: '6px', fontFamily: 'inherit' }}
                />
              </div>
            </fieldset>

            {/* Contact Information Section */}
            <fieldset className="quotation-field-group">
              <legend>Contact Information</legend>
              <div className="form-group">
                <textarea
                  id="contact_info"
                  name="contact_info"
                  value={settings.contact_info}
                  onChange={handleInputChange}
                  rows="4"
                  required
                  placeholder="Enter email, phone numbers, etc. (one per line)"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: '6px', fontFamily: 'inherit' }}
                />
                <small style={{ color: 'var(--theme-text-muted,#666)', display: 'block', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  Add each contact method on a new line for better formatting
                </small>
              </div>
            </fieldset>

            {/* Payment Information Section */}
            <fieldset className="quotation-field-group">
              <legend>Payment Information</legend>
              <div className="form-group">
                <input
                  type="text"
                  id="payment_info"
                  name="payment_info"
                  value={settings.payment_info}
                  onChange={handleInputChange}
                  placeholder="e.g., 100% against delivery"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: '6px', fontFamily: 'inherit' }}
                />
              </div>
            </fieldset>


            {/* Form Actions */}
            <div className="quotation-action-buttons">
        
              <button
                type="submit"
                className="quotation-submit-btn"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BillingSettings;