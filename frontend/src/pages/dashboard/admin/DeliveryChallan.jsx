import React, { useState, useEffect } from 'react';
import { deliveryAPI } from '../../../services/deliveryAPI';
import { deliveryPDFService } from '../../../services/deliveryPDFService';
import { FaExclamationTriangle } from 'react-icons/fa';
import './DeliveryChallan.css';

const DeliveryChallanManagement = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);

  // Function to load settings from localStorage
  const loadSettingsFromStorage = () => {
    const savedSettings = localStorage.getItem('deliveryChallanSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return {
      from_address: '',
      contact_info: '',
      payment_info: '100% against delivery'
    };
  };

  const [formData, setFormData] = useState({
    challan_no: `2026/D-${Math.floor(1000 + Math.random() * 9000)}`,
    challan_date: new Date().toISOString().split('T')[0],
    destination: '',
    dispatched_through: 'By Hand',
    to_address: '',
    ...loadSettingsFromStorage(), // Load settings from localStorage
    items: [{ sr_no: 1, description: '', quantity: 1 }]
  });

  const [followUpText, setFollowUpText] = useState('');

  // Listen for storage changes (when settings are updated in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'deliveryChallanSettings') {
        const updatedSettings = JSON.parse(e.newValue);
        setFormData(prev => ({
          ...prev,
          from_address: updatedSettings.from_address,
          contact_info: updatedSettings.contact_info,
          payment_info: updatedSettings.payment_info
        }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check for settings updates periodically (for same-tab updates)
  useEffect(() => {
    const checkSettings = () => {
      const savedSettings = localStorage.getItem('deliveryChallanSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setFormData(prev => ({
          ...prev,
          from_address: settings.from_address,
          contact_info: settings.contact_info,
          payment_info: settings.payment_info
        }));
      }
    };

    // Check immediately
    checkSettings();

    // Set up interval to check every 2 seconds
    const interval = setInterval(checkSettings, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load challans on component mount
  useEffect(() => {
    loadChallans();
  }, []);

  const loadChallans = async () => {
    try {
      setLoading(true);
      const response = await deliveryAPI.getAll();
      setChallans(response.data.challans || []);
    } catch (error) {
      console.error('Error loading delivery challans:', error);
      alert('Failed to load delivery challans');
    } finally {
      setLoading(false);
    }
  };

  // Handle download delivery challan as PDF
  const handleDownloadChallan = async (challan) => {
    try {
      const downloadBtn = document.querySelector(`.download-btn-${challan.id}`);
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = 'Downloading...';
      }

      await deliveryPDFService.downloadChallanPDF(challan);
      
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = 'Download';
      }
      
      alert('Delivery Challan downloaded successfully as PDF!');
    } catch (error) {
      console.error('Error downloading delivery challan:', error);
      
      const downloadBtn = document.querySelector(`.download-btn-${challan.id}`);
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = 'Download';
      }
      
      alert('Failed to download delivery challan');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Don't allow changes to disabled fields
    if (name === 'from_address' || name === 'contact_info' || name === 'payment_info') {
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { sr_no: prev.items.length + 1, description: '', quantity: 1 }
      ]
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, sr_no: idx + 1 }));
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Get latest settings from localStorage
      const settings = loadSettingsFromStorage();
      
      // Prepare data for API - use settings for disabled fields
      const challanData = {
        challan_no: formData.challan_no,
        challan_date: formData.challan_date,
        destination: formData.destination,
        dispatched_through: formData.dispatched_through,
        to_address: formData.to_address,
        from_address: settings.from_address,
        contact_info: settings.contact_info,
        payment_info: settings.payment_info,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0
        }))
      };

      await deliveryAPI.create(challanData);
      await loadChallans();
      
      // Reset form with new challan number but keep settings
      setFormData({
        challan_no: `2026/D-${Math.floor(1000 + Math.random() * 9000)}`,
        challan_date: new Date().toISOString().split('T')[0],
        destination: '',
        dispatched_through: 'By Hand',
        to_address: '',
        from_address: settings.from_address,
        contact_info: settings.contact_info,
        payment_info: settings.payment_info,
        items: [{ sr_no: 1, description: '', quantity: 1 }]
      });
      
      alert('Delivery Challan created successfully!');
    } catch (error) {
      console.error('Error creating delivery challan:', error);
      alert(error.response?.data?.message || 'Failed to create delivery challan');
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpText.trim()) {
      alert('Please enter follow-up notes');
      return;
    }

    try {
      await deliveryAPI.addFollowUp(selectedChallan.id, followUpText);
      await loadChallans();
      
      // Refresh selected challan
      const response = await deliveryAPI.getById(selectedChallan.id);
      setSelectedChallan(response.data.challan);
      
      setFollowUpText('');
      alert('Follow-up added successfully!');
    } catch (error) {
      console.error('Error adding follow-up:', error);
      alert('Failed to add follow-up');
    }
  };

  const handleViewChallan = async (challan) => {
    try {
      const response = await deliveryAPI.getById(challan.id);
      setSelectedChallan(response.data.challan);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching delivery challan:', error);
      alert('Failed to load delivery challan details');
    }
  };

  const handleDeleteChallan = (challan) => {
    setSelectedChallan(challan);
    setIsDeleteModalOpen(true);
  };

  const handleShowHistory = () => {
    setIsHistoryModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deliveryAPI.delete(selectedChallan.id);
      await loadChallans();
      
      setIsDeleteModalOpen(false);
      setSelectedChallan(null);
      alert('Delivery Challan deleted successfully!');
    } catch (error) {
      console.error('Error deleting delivery challan:', error);
      alert('Failed to delete delivery challan');
    }
  };

 

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN');
    } catch (error) {
      return dateString;
    }
  };

  if (loading && challans.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      Loading delivery challans...
    </div>;
  }

  return (
    <div className="quotation-dashboard" id="quotation-dashboard">
      <div className="quotation-header-panel" id="quotation-header-panel">
        <h2 id="quotation-main-title">Delivery Challan Management</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="quotation-history-btn"
            id="quotation-history-button"
            onClick={handleShowHistory}
          >
            Challan History
          </button>
        </div>
      </div>

      {/* Delivery Challan Creation Form */}
      <div className="quotation-form-wrapper" id="quotation-form-wrapper">
        <div className="quotation-form-card" id="quotation-form-card">
          <h3 id="quotation-form-title">Create Delivery Challan</h3>
          <form onSubmit={handleSubmit} className="quotation-input-form" id="quotation-input-form">
            {/* Delivery Challan Details */}
            <fieldset className="quotation-field-group" id="quotation-details-fieldset">
              <legend>Delivery Challan Details</legend>
              <div className="quotation-form-grid-four1" id="quotation-basic-details-grid">
                <div className="quotation-input-group" id="quotation-no-group">
                  <label htmlFor="quotation-no-input">Challan No:</label>
                  <input
                    type="text"
                    id="quotation-no-input"
                    name="challan_no"
                    value={formData.challan_no}
                    onChange={handleInputChange}
                    placeholder="Auto-generated"
                  />
                </div>
                <div className="quotation-input-group" id="quotation-date-group">
                  <label htmlFor="quotation-date-input">Challan Date:</label>
                  <input
                    type="date"
                    id="quotation-date-input"
                    name="challan_date"
                    value={formData.challan_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="quotation-input-group" id="destination-group">
                  <label htmlFor="destination-input">Destination:</label>
                  <input
                    type="text"
                    id="destination-input"
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    placeholder="Enter destination"
                    required
                  />
                </div>
              </div>
              
              {/* Dispatched Through */}
              <div className="dispatched-to-grid" id="dispatched-to-grid">
                <div className="quotation-input-group" id="dispatched-through-group">
                  <label htmlFor="dispatched-through-input">Dispatched Through:</label>
                  <select
                    id="dispatched-through-input"
                    name="dispatched_through"
                    value={formData.dispatched_through}
                    onChange={handleInputChange}
                    className="quotation-input-group"
                  >
                    <option value="By Hand">By Hand</option>
                    <option value="Road Transport">Road Transport</option>
                    <option value="Rail Transport">Rail Transport</option>
                    <option value="Air Transport">Air Transport</option>
                    <option value="Sea Transport">Sea Transport</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>
                  {/* Payment Info - Disabled */}
              <div className="quotation-input-group" id="payment-info-group">
                <label htmlFor="payment-info-input">Payment Info:</label>
                <input
                  type="text"
                  id="payment-info-input"
                  name="payment_info"
                  value={formData.payment_info}
                  disabled
                  placeholder="Payment terms"
                  style={{ backgroundColor: 'var(--theme-surface-muted,#f5f5f5)', cursor: 'not-allowed', width: '100%' }}
                />
              
              </div>
              </div>

              {/* Address Information */}
              <div className="quotation-form-grid-two" id="address-grid">
                <div className="quotation-input-group" id="to-address-group">
                  <label htmlFor="to-address-input">To Address:</label>
                  <textarea
                    id="to-address-input"
                    name="to_address"
                    value={formData.to_address}
                    onChange={handleInputChange}
                    placeholder="Recipient full address"
                    rows="3"
                    required
                  />
                </div>
                
                {/* From Address - Disabled */}
                <div className="quotation-input-group" id="from-address-group">
                  <label htmlFor="from-address-input">From Address:</label>
                  <textarea
                    id="from-address-input"
                    name="from_address"
                    value={formData.from_address}
                    disabled
                    placeholder="Your company address"
                    rows="3"
                    style={{ backgroundColor: 'var(--theme-surface-muted,#f5f5f5)', cursor: 'not-allowed' }}
                  />
                 
                </div>
              </div>

              {/* Contact Information - Disabled */}
              <div className="quotation-input-group" id="contact-info-group">
                <label htmlFor="contact-info-input">Contact Information:</label>
                <textarea
                  id="contact-info-input"
                  name="contact_info"
                  value={formData.contact_info}
                  disabled
                  placeholder="Email, phone number, etc."
                  rows="2"
                  style={{ backgroundColor: 'var(--theme-surface-muted,#f5f5f5)', cursor: 'not-allowed', width: '100%' }}
                />
               
              </div>

            
            </fieldset>

            {/* Goods Details */}
            <fieldset className="quotation-field-group" id="goods-details-fieldset">
              <legend>Goods Details</legend>
              <table className="quotation-items-grid" id="quotation-items-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Description of Goods</th>
                    <th>Qty</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="quotation-item-row">
                      <td>{item.sr_no}</td>
                      <td>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="quotation-item-description"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          step="0.01"
                          min="0"
                          className="quotation-item-quantity"
                          required
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="quotation-remove-btn"
                          onClick={() => removeItemRow(index)}
                          disabled={formData.items.length === 1}
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="quotation-add-row-btn"
                id="add-item-button"
                onClick={addItemRow}
              >
                + Add Item
              </button>
            </fieldset>

            <div className="quotation-action-buttons" id="quotation-form-actions">
              <button
                type="button"
                onClick={() => {
                  const settings = loadSettingsFromStorage();
                  setFormData({
                    challan_no: `2026/D-${Math.floor(1000 + Math.random() * 9000)}`,
                    challan_date: new Date().toISOString().split('T')[0],
                    destination: '',
                    dispatched_through: 'By Hand',
                    to_address: '',
                    from_address: settings.from_address,
                    contact_info: settings.contact_info,
                    payment_info: settings.payment_info,
                    items: [{ sr_no: 1, description: '', quantity: 1 }]
                  });
                }}
                className="quotation-cancel-btn"
                id="clear-form-button"
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="quotation-submit-btn"
                id="generate-quotation-button"
              >
                Generate Delivery Challan
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delivery Challan History Modal */}
      {isHistoryModalOpen && (
        <div className="quotation-modal-overlay" id="history-modal-overlay">
          <div className="quotation-modal-window quotation-large-modal" id="history-modal">
            <div className="quotation-modal-header" id="history-modal-header">
              <h2 id="history-modal-title">Challan History</h2>
              <button 
                className="quotation-close-btn"
                id="close-history-modal"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="quotation-history-content" id="quotation-history-content">
              <div className="quotation-table-container" id="history-table-container">
                <table className="quotation-history-table" id="quotation-history-table">
                  <thead>
                    <tr>
                      <th>Challan ID</th>
                      <th>Challan No</th>
                      <th>Challan Date</th>
                      <th>Destination</th>
                      <th>Dispatch Method</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challans.map(challan => (
                      <tr key={challan.id} className="quotation-history-row">
                        <td>DC{String(challan.id).padStart(3, '0')}</td>
                        <td>{challan.challan_no}</td>
                        <td>{formatDate(challan.challan_date)}</td>
                        <td>{challan.destination}</td>
                        <td>{challan.dispatched_through}</td>
                        <td>
                          <div className="quotation-action-buttons" style={{ justifyContent: 'center', gap: '0.25rem' }}>
                            <button
                              type="button"
                              onClick={() => handleViewChallan(challan)}
                              className="quotation-edit-btn"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadChallan(challan)}
                              className={`quotation-download-btn download-btn-${challan.id}`}
                              style={{ 
                                padding: '0.25rem 0.5rem', 
                                fontSize: '0.75rem',
                                background: '#10b981',
                                color: 'var(--card-bg,#fff)',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteChallan(challan)}
                              className="quotation-remove-btn"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {challans.length === 0 && (
                <div className="quotation-empty-state" id="empty-quotation-state">
                  <div className="quotation-empty-icon">📋</div>
                  <p>No delivery challan history found</p>
                  <p className="quotation-empty-subtext">
                    Get started by creating your first delivery challan.
                  </p>
                </div>
              )}
            </div>

            <div className="quotation-action-buttons" id="history-modal-actions">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="quotation-cancel-btn"
                id="close-history-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Delivery Challan Details Modal */}
      {isViewModalOpen && selectedChallan && (
        <div className="quotation-modal-overlay" id="view-modal-overlay">
          <div className="quotation-modal-window quotation-large-modal" id="view-quotation-modal">
            <div className="quotation-modal-header" id="view-modal-header">
              <h2 id="view-modal-title">Delivery Challan Details</h2>
              <button 
                className="quotation-close-btn"
                id="close-view-modal"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="quotation-details-panel" id="quotation-details-panel">
              {/* Delivery Challan Information */}
              <div className="quotation-detail-section" id="quotation-info-section">
                <h3 className="quotation-section-title">Delivery Challan Information</h3>
                <div className="quotation-detail-grid" id="quotation-info-grid">
                  <div className="quotation-detail-item" id="quotation-id-item">
                    <label>Challan ID</label>
                    <span>DC{String(selectedChallan.id).padStart(3, '0')}</span>
                  </div>
                  <div className="quotation-detail-item" id="quotation-no-item">
                    <label>Challan No</label>
                    <span>{selectedChallan.challan_no}</span>
                  </div>
                  <div className="quotation-detail-item" id="quotation-date-item">
                    <label>Challan Date</label>
                    <span>{formatDate(selectedChallan.challan_date)}</span>
                  </div>
                  <div className="quotation-detail-item" id="destination-item">
                    <label>Destination</label>
                    <span>{selectedChallan.destination}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="quotation-detail-section" id="quotation-details-section">
                <h3 className="quotation-section-title">Delivery Details</h3>
                <div className="dispatched-to-grid-view" id="quotation-details-grid">
                  <div className="quotation-detail-item" id="dispatched-through-item">
                    <label>Dispatched Through</label>
                    <span>{selectedChallan.dispatched_through}</span>
                  </div>
                  <div className="quotation-detail-item" id="payment-info-item">
                    <label>Payment Info</label>
                    <span>{selectedChallan.payment_info}</span>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="quotation-detail-section" id="address-section">
                <h3 className="quotation-section-title">Address Information</h3>
                <div className="quotation-form-grid-two" id="address-details-grid">
                  <div className="quotation-detail-item" id="to-address-item">
                    <label>To Address</label>
                    <div style={{ 
                      whiteSpace: 'pre-line',
                      padding: '8px',
                      backgroundColor: 'var(--theme-surface-muted,#f8f9fa)',
                      borderRadius: '4px',
                      border: '1px solid var(--card-border,#dee2e6)'
                    }}>
                      {selectedChallan.to_address}
                    </div>
                  </div>
                  
                  <div className="quotation-detail-item" id="from-address-item">
                    <label>From Address</label>
                    <div >
                      {selectedChallan.from_address}
                    </div>
                  </div>
                </div>
                
                <div className="quotation-detail-item" id="contact-info-item" style={{ marginTop: '1rem' }}>
                  <label>Contact Information</label>
                  <div style={{ 
                    whiteSpace: 'pre-line',
                    padding: '8px',
                    backgroundColor: 'var(--theme-surface-muted,#f8f9fa)',
                    borderRadius: '4px',
                    border: '1px solid var(--card-border,#dee2e6)'
                  }}>
                    {selectedChallan.contact_info}
                  </div>
                </div>
              </div>

              {/* Goods Details */}
              <div className="quotation-detail-section" id="view-goods-section">
                <h3 className="quotation-section-title">Goods Details</h3>
                <div className="quotation-table-container" id="view-items-table-container">
                  <table className="quotation-history-table" id="view-items-table">
                    <thead>
                      <tr>
                        <th>Sr. No.</th>
                        <th>Description of Goods</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChallan.items && selectedChallan.items.map((item, index) => (
                        <tr key={index} className="view-item-row">
                          <td>{item.sr_no}</td>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
             
              {/* Delivery Challan History */}
              <div className="quotation-detail-section" id="quotation-history-section">
                <h3 className="quotation-section-title">Delivery Challan History</h3>
                <div className="quotation-table-container" id="history-table-container-view">
                  <table className="quotation-history-table" id="quotation-history-table-view">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Follow Up</th>
                        <th>Action</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChallan.history && selectedChallan.history.map((entry, index) => (
                        <tr key={index} className="history-entry-row">
                          <td className="quotation-history-date">
                            {formatDate(entry.date)}
                          </td>
                          <td className="quotation-history-followup">
                            {entry.follow_up || 'No follow-up notes'}
                          </td>
                          <td className="quotation-history-action">
                            {entry.action}
                          </td>
                          <td className="quotation-history-user">
                            {entry.user}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Follow-up Section */}
              <div className="quotation-detail-section" id="follow-up-section">
                <h3 className="quotation-section-title">Add Follow-up</h3>
                <div className="quotation-input-group">
                  <textarea
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    placeholder="Enter follow-up notes..."
                    rows="3"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: '4px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddFollowUp}
                  className="quotation-submit-btn"
                  style={{ marginTop: '0.5rem' }}
                >
                  Add Follow-up
                </button>
              </div>

              <div className="quotation-action-buttons" id="view-modal-actions">
                <button
                  type="button"
                  onClick={() => handleDownloadChallan(selectedChallan)}
                  className="quotation-download-btn"
                  style={{ 
                    background: '#10b981', 
                    color: 'var(--card-bg,#fff)', 
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>📥</span> Download Challan
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="quotation-cancel-btn"
                  id="close-view-button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedChallan && (
        <div className="quotation-modal-overlay" id="delete-modal-overlay">
          <div className="quotation-modal-window" id="delete-confirmation-modal">
            <div className="quotation-modal-header" id="delete-modal-header">
              <h2 className="quotation-modal-title" id="delete-modal-title">Delete Delivery Challan</h2>
              <button 
                className="quotation-close-btn"
                id="close-delete-modal"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="quotation-delete-confirm" id="delete-confirmation-content">
              <div className="quotation-delete-icon" id="delete-warning-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="quotation-delete-title" id="delete-confirmation-title">
                Delete Delivery Challan?
              </h3>
              <p className="quotation-delete-message" id="delete-confirmation-message">
                Are you sure you want to delete the delivery challan with challan number "<strong>{selectedChallan.challan_no}</strong>"? 
                This action cannot be undone.
              </p>

              <div className="quotation-delete-actions" id="delete-confirmation-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="quotation-cancel-btn"
                  id="cancel-delete-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="quotation-delete-btn"
                  id="confirm-delete-button"
                >
                  Delete Delivery Challan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryChallanManagement;