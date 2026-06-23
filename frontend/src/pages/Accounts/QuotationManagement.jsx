import React, { useState, useEffect } from 'react';
import { quotationAPI } from '../../services/quotationAPI';
import { useAuth } from '../../contexts/AuthContext';
import { FaExclamationTriangle } from 'react-icons/fa';
import { quotationPDFService } from '../../services/quotationPDFService';
import { serviceSettingAPI } from '../../services/serviceSettingAPI';
import { useTableControls } from '../../hooks/useTableControls';
import './QuotationManagement.css';
import '../../styles/tableControls.css';

const QUOTATION_SEARCH_FIELDS = ['quotation_no', 'ref_no', 'buyer_gstin', 'party_address', 'status', 'quotation_date', 'total_after_tax', 'valid_until'];

const QuotationManagement = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  // Service Settings State
  const [serviceSettings, setServiceSettings] = useState({
    bank: null,
    gst: null
  });

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    quotation_no: `${Math.floor(1000 + Math.random() * 9000)}`,
    quotation_date: '',
    ref_no: '',
    buyer_gstin: '',
    party_address: '',
    items: [{ sr_no: 1, description: '', quantity: 1, rate: 0, total_amount: 0 }],
    total_before_discount: 0,
    discount: 0,
    gst_details: [{ tax_type: 'CGST', percentage: 0 }],
    round_off: 0,
    total_after_tax: 0,
    valid_until: ''
  });

  const [editFormData, setEditFormData] = useState({
    quotation_no: '',
    quotation_date: '',
    ref_no: '',
    buyer_gstin: '',
    party_address: '',
    items: [],
    total_before_discount: 0,
    discount: 0,
    gst_details: [],
    round_off: 0,
    total_after_tax: 0,
    valid_until: ''
  });

  const [followUpText, setFollowUpText] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const {
    controlledRows: visibleQuotations,
    requestSort,
    searchTerm,
    setSearchTerm,
    sortLabel,
  } = useTableControls(quotations, QUOTATION_SEARCH_FIELDS, { key: 'quotation_date', accessor: 'quotation_date', direction: 'desc' });

  useEffect(() => {
    loadQuotations();
    loadServiceSettings();
  }, [filter]);

  const loadServiceSettings = async () => {
    try {
      setSettingsLoading(true);
     
      const response = await serviceSettingAPI.getQuotationSettings();
     
      
      if (response.data.success && response.data.settings) {
      
        
     
        const bankData = response.data.settings.bankDetails || response.data.settings.bank;
        const gstData = response.data.settings.gstDetails || response.data.settings.gst;
        
        // Check if we have valid data (not just empty objects)
        const hasValidBankData = bankData && bankData.account_holder && bankData.account_number;
        const hasValidGstData = gstData && gstData.gstin && gstData.pan_number;
        
     
        
        // Set the state with the correct structure
        setServiceSettings({
          bank: hasValidBankData ? bankData : null,
          gst: hasValidGstData ? gstData : null
        });
        
      } else {
   
        setServiceSettings({
          bank: null,
          gst: null
        });
      }
    } catch (error) {
      console.error('❌ Error loading service settings:', error);
      console.error('Error details:', error.response?.data);
      setServiceSettings({
        bank: null,
        gst: null
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const filters = filter !== 'all' ? { status: filter } : {};
      const response = await quotationAPI.getAll(filters);
      setQuotations(response.data.quotations);
      
      // If service settings are included in response
      if (response.data.service_settings) {
        setServiceSettings(response.data.service_settings);
      }
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculation functions
  const calculateItemTotal = (quantity, rate) => {
    return (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
  };

  const calculateTotalBeforeDiscount = (items) => {
    return items.reduce((total, item) => total + (parseFloat(item.total_amount) || 0), 0);
  };

  const calculateTotalAfterTax = (totalBeforeDiscount, discount, gstDetails, roundOff) => {
    const discountAmount = (parseFloat(discount) || 0);
    const taxableAmount = totalBeforeDiscount - discountAmount;
    
    const gstAmount = gstDetails.reduce((total, gst) => {
      return total + (taxableAmount * (parseFloat(gst.percentage) || 0) / 100);
    }, 0);
    
    return taxableAmount + gstAmount + (parseFloat(roundOff) || 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Quotation Handlers
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].total_amount = calculateItemTotal(
        field === 'quantity' ? value : updatedItems[index].quantity,
        field === 'rate' ? value : updatedItems[index].rate
      );
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      total_before_discount: calculateTotalBeforeDiscount(updatedItems)
    }));
  };

  const handleEditItemChange = (index, field, value) => {
    const updatedItems = [...editFormData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].total_amount = calculateItemTotal(
        field === 'quantity' ? value : updatedItems[index].quantity,
        field === 'rate' ? value : updatedItems[index].rate
      );
    }
    
    setEditFormData(prev => ({
      ...prev,
      items: updatedItems,
      total_before_discount: calculateTotalBeforeDiscount(updatedItems)
    }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { sr_no: prev.items.length + 1, description: '', quantity: 1, rate: 0, total_amount: 0 }
      ]
    }));
  };

  const addEditItemRow = () => {
    setEditFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { sr_no: prev.items.length + 1, description: '', quantity: 1, rate: 0, total_amount: 0 }
      ]
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, sr_no: idx + 1 }));
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems,
        total_before_discount: calculateTotalBeforeDiscount(updatedItems)
      }));
    }
  };

  const removeEditItemRow = (index) => {
    if (editFormData.items.length > 1) {
      const updatedItems = editFormData.items.filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, sr_no: idx + 1 }));
      
      setEditFormData(prev => ({
        ...prev,
        items: updatedItems,
        total_before_discount: calculateTotalBeforeDiscount(updatedItems)
      }));
    }
  };

  const handleGSTChange = (index, field, value) => {
    const updatedGST = [...formData.gst_details];
    updatedGST[index] = {
      ...updatedGST[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      gst_details: updatedGST
    }));
  };

  const handleEditGSTChange = (index, field, value) => {
    const updatedGST = [...editFormData.gst_details];
    updatedGST[index] = {
      ...updatedGST[index],
      [field]: value
    };
    
    setEditFormData(prev => ({
      ...prev,
      gst_details: updatedGST
    }));
  };

  const addGSTRow = () => {
    setFormData(prev => ({
      ...prev,
      gst_details: [
        ...prev.gst_details,
        { tax_type: 'CGST', percentage: 0 }
      ]
    }));
  };

  const addEditGSTRow = () => {
    setEditFormData(prev => ({
      ...prev,
      gst_details: [
        ...prev.gst_details,
        { tax_type: 'CGST', percentage: 0 }
      ]
    }));
  };

  const removeGSTRow = (index) => {
    if (formData.gst_details.length > 1) {
      const updatedGST = formData.gst_details.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        gst_details: updatedGST
      }));
    }
  };

  const removeEditGSTRow = (index) => {
    if (editFormData.gst_details.length > 1) {
      const updatedGST = editFormData.gst_details.filter((_, i) => i !== index);
      setEditFormData(prev => ({
        ...prev,
        gst_details: updatedGST
      }));
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpText.trim()) {
      alert('Please enter follow-up notes');
      return;
    }

    try {
      await quotationAPI.addFollowUp(selectedQuotation.id, followUpText);
      await loadQuotations();
      
      // Refresh selected quotation
      const response = await quotationAPI.getById(selectedQuotation.id);
      setSelectedQuotation(response.data.quotation);
      
      setFollowUpText('');
      alert('Follow-up added successfully!');
    } catch (error) {
      console.error('Error adding follow-up:', error);
      alert('Failed to add follow-up');
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Check if we have actual data, not just objects
  const hasBankData = serviceSettings.bank && 
                     serviceSettings.bank.account_holder && 
                     serviceSettings.bank.account_number;
  
  const hasGstData = serviceSettings.gst && 
                    serviceSettings.gst.gstin && 
                    serviceSettings.gst.pan_number;
  
  if (!hasBankData || !hasGstData) {
    alert('Please configure Service Settings (Bank and GST details) before creating a quotation');
    return;
  }
  
  try {
    const totalAfterTax = calculateTotalAfterTax(
      formData.total_before_discount,
      formData.discount,
      formData.gst_details,
      formData.round_off
    );

    // Prepare the data in the format backend expects
    const quotationData = {
      ...formData,
      total_after_tax: totalAfterTax,
      valid_until: formData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      // Send service settings as separate fields, not as service_settings object
      service_bank_details: serviceSettings.bank,
      service_gst_details: serviceSettings.gst
    };

    await quotationAPI.create(quotationData);
    await loadQuotations();
    
    // Reset form data
    setFormData({
      quotation_no: `${Math.floor(1000 + Math.random() * 9000)}`,
      quotation_date: '',
      ref_no: '',
      buyer_gstin: '',
      party_address: '',
      items: [{ sr_no: 1, description: '', quantity: 1, rate: 0, total_amount: 0 }],
      total_before_discount: 0,
      discount: 0,
      gst_details: [{ tax_type: 'CGST', percentage: 0 }],
      round_off: 0,
      total_after_tax: 0,
      valid_until: ''
    });
    
    alert('Quotation created successfully with service settings!');
  } catch (error) {
    console.error('Error creating quotation:', error);
    alert('Failed to create quotation');
  }
};

  const handleViewQuotation = async (quotation) => {
    try {
      const response = await quotationAPI.getById(quotation.id);
      setSelectedQuotation(response.data.quotation);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching quotation:', error);
    }
  };

  const handleEditQuotation = async (quotation) => {
    try {
      const response = await quotationAPI.getById(quotation.id);
      const quotationData = response.data.quotation;
      
      setEditFormData({
        quotation_no: quotationData.quotation_no,
        quotation_date: quotationData.quotation_date,
        ref_no: quotationData.ref_no,
        buyer_gstin: quotationData.buyer_gstin,
        party_address: quotationData.party_address,
        items: quotationData.items,
        total_before_discount: quotationData.total_before_discount,
        discount: quotationData.discount,
        gst_details: quotationData.gst_details,
        round_off: quotationData.round_off,
        total_after_tax: quotationData.total_after_tax,
        valid_until: quotationData.valid_until
      });
      
      setSelectedQuotation(quotationData);
      setIsViewModalOpen(false);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching quotation for edit:', error);
    }
  };

  const handleDeleteQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    setIsViewModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleShowHistory = () => {
    setIsHistoryModalOpen(true);
  };

  const handleUpdateQuotation = async (e) => {
    e.preventDefault();
    
    try {
      const totalAfterTax = calculateTotalAfterTax(
        editFormData.total_before_discount,
        editFormData.discount,
        editFormData.gst_details,
        editFormData.round_off
      );

      const quotationData = {
        ...editFormData,
        total_after_tax: totalAfterTax
      };

      await quotationAPI.update(selectedQuotation.id, quotationData);
      await loadQuotations();
      
      setIsEditModalOpen(false);
      setSelectedQuotation(null);
      alert('Quotation updated successfully!');
    } catch (error) {
      console.error('Error updating quotation:', error);
      alert('Failed to update quotation');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await quotationAPI.delete(selectedQuotation.id);
      await loadQuotations();
      
      setIsDeleteModalOpen(false);
      setSelectedQuotation(null);
      alert('Quotation deleted successfully!');
    } catch (error) {
      console.error('Error deleting quotation:', error);
      alert('Failed to delete quotation');
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await quotationAPI.updateStatus(selectedQuotation.id, status);
      await loadQuotations();
      
      // Refresh selected quotation
      const response = await quotationAPI.getById(selectedQuotation.id);
      setSelectedQuotation(response.data.quotation);
      
      alert(`Quotation status updated to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

const handleDownloadQuotation = async (quotation) => {
  try {
    // Show loading state
    const downloadBtn = document.querySelector(`.download-btn-${quotation.id}`);
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = 'Downloading...';
    }

    // Include service settings in PDF download - ensure proper structure
    const quotationWithSettings = {
      ...quotation,
      service_bank_details: quotation.service_bank_details || serviceSettings.bank,
      service_gst_details: quotation.service_gst_details || serviceSettings.gst
    };
    
    await quotationPDFService.downloadQuotationPDF(quotationWithSettings);
    
    // Reset button state
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = 'Download';
    }
    
    alert('Quotation downloaded successfully as PDF with service settings!');
  } catch (error) {
    console.error('Error downloading quotation:', error);
    
    // Reset button state on error
    const downloadBtn = document.querySelector(`.download-btn-${quotation.id}`);
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = 'Download';
    }
    
    alert('Failed to download quotation');
  }
};

  // View Service Settings button
  const handleViewServiceSettings = () => {
    // Calculate if we have valid data
    const hasBankData = serviceSettings.bank && 
                       serviceSettings.bank.account_holder && 
                       serviceSettings.bank.account_number;
    
    const hasGstData = serviceSettings.gst && 
                      serviceSettings.gst.gstin && 
                      serviceSettings.gst.pan_number;
    
    alert(`Current Service Settings:\n\n` +
          `Bank Details: ${hasBankData ? 'Configured' : 'Not Configured'}\n` +
          `GST Details: ${hasGstData ? 'Configured' : 'Not Configured'}\n\n` +
          `Note: These settings will be automatically included in new quotations.`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: { background: 'var(--theme-bg-muted,#f3f4f6)', color: 'var(--theme-text,#374151)' },
      sent: { background: 'rgba(37,99,235,0.12)', color: '#2563eb' },
      accepted: { background: 'rgba(16,185,129,0.12)', color: '#059669' },
      rejected: { background: 'rgba(220,38,38,0.12)', color: '#dc2626' },
      expired: { background: 'rgba(245,158,11,0.12)', color: '#d97706' }
    };
    
    const colors = statusColors[status] || { background: 'var(--theme-bg-muted,#f3f4f6)', color: 'var(--theme-text,#374151)' };
    
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '500',
        background: colors.background,
        color: colors.color
      }}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      Loading quotations...
    </div>;
  }

  // Calculate if we have valid data
  const hasBankData = serviceSettings.bank && 
                     serviceSettings.bank.account_holder && 
                     serviceSettings.bank.account_number;
  
  const hasGstData = serviceSettings.gst && 
                    serviceSettings.gst.gstin && 
                    serviceSettings.gst.pan_number;
  
  const allSettingsValid = hasBankData && hasGstData;

  return (
    <div className="quotation-dashboard" id="quotation-dashboard">
      <div className="quotation-header-panel" id="quotation-header-panel">
        <h2 id="quotation-main-title">Quotation Management</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--card-border,#e2e8f0)',
              borderRadius: '6px',
              background: 'var(--card-bg,#fff)',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <input
            className="table-search-input"
            type="search"
            placeholder="Search quotation, GSTIN, ref, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="table-count-label">{visibleQuotations.length} of {quotations.length}</span>
          
          {/* Service Settings Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: allSettingsValid ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            borderRadius: '6px',
            border: `1px solid ${allSettingsValid ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: allSettingsValid ? '#10b981' : '#f59e0b'
            }}></div>
            <span style={{
              fontSize: '0.8rem',
              color: allSettingsValid ? '#065f46' : '#92400e'
            }}>
              {allSettingsValid ? 'Settings Active' : 'Settings Needed'}
            </span>
            {!hasBankData && <span style={{ fontSize: '0.7rem', color: '#92400e' }}> (Bank)</span>}
            {!hasGstData && <span style={{ fontSize: '0.7rem', color: '#92400e' }}> (GST)</span>}
            <button
              onClick={handleViewServiceSettings}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                fontSize: '0.8rem',
                textDecoration: 'underline'
              }}
            >
              View Settings
            </button>
          </div>
          
          <button 
            className="quotation-history-btn"
            id="quotation-history-button"
            onClick={handleShowHistory}
          >
            Quotation History
          </button>
        </div>
      </div>

      {/* Service Settings Status Banner */}
      {(!hasBankData || !hasGstData) && (
        <div style={{
          backgroundColor: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: '6px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '1.25rem' }} />
          <div>
            <strong style={{ color: '#92400e' }}>Service Settings Required</strong>
            <p style={{ color: '#92400e', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              Please configure {!hasBankData && !hasGstData ? 'Bank and GST' : !hasBankData ? 'Bank' : 'GST'} details in Service Settings to create quotations.
            </p>
          </div>
        </div>
      )}

      {/* Quotation Creation Form */}
      <div className="quotation-form-wrapper" id="quotation-form-wrapper">
        <div className="quotation-form-card" id="quotation-form-card">
          <h3 id="quotation-form-title">Create Quotation</h3>
          
          {/* Service Settings Preview */}
          {(hasBankData || hasGstData) && (
            <div style={{
              backgroundColor: 'rgba(14,165,233,0.08)',
              border: '1px solid rgba(14,165,233,0.35)',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <h4 style={{ marginTop: 0, color: '#0369a1', fontSize: '0.9rem' }}>
                Service Settings Included:
              </h4>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8rem' }}>
                {hasBankData && (
                  <div>
                    <strong>Bank Details:</strong>
                    <div>{serviceSettings.bank.bank_name}</div>
                    <div>A/C: {serviceSettings.bank.account_number}</div>
                  </div>
                )}
                {hasGstData && (
                  <div>
                    <strong>GST Details:</strong>
                    <div>GSTIN: {serviceSettings.gst.gstin}</div>
                    <div>Tax Rate: {serviceSettings.gst.tax_rate}%</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="quotation-input-form" id="quotation-input-form">
            {/* Quotation Details */}
            <fieldset className="quotation-field-group" id="quotation-details-fieldset">
              <legend>Quotation Details</legend>
              <div className="quotation-form-grid-four" id="quotation-basic-details-grid">
                <div className="quotation-input-group" id="quotation-no-group">
                  <label htmlFor="quotation-no-input">Quotation No:</label>
                  <input
                    type="text"
                    id="quotation-no-input"
                    name="quotation_no"
                    value={formData.quotation_no}
                    onChange={handleInputChange}
                    placeholder="Auto-generated"
                  />
                </div>
                <div className="quotation-input-group" id="quotation-date-group">
                  <label htmlFor="quotation-date-input">Quotation Date:</label>
                  <input
                    type="date"
                    id="quotation-date-input"
                    name="quotation_date"
                    value={formData.quotation_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="quotation-input-group" id="valid-until-group">
                  <label htmlFor="valid-until-input">Valid Until:</label>
                  <input
                    type="date"
                    id="valid-until-input"
                    name="valid_until"
                    value={formData.valid_until}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="quotation-input-group" id="ref-no-group">
                  <label htmlFor="ref-no-input">Ref. No:</label>
                  <input
                    type="text"
                    id="ref-no-input"
                    name="ref_no"
                    value={formData.ref_no}
                    onChange={handleInputChange}
                    placeholder="Reference number"
                  />
                </div>
              </div>
              <div className="quotation-form-grid-four" id="quotation-tax-grid">
                <div className="quotation-input-group" id="gstin-group">
                  <label htmlFor="gstin-input">GSTIN:</label>
                  <input
                    type="text"
                    id="gstin-input"
                    name="buyer_gstin"
                    value={formData.buyer_gstin}
                    onChange={handleInputChange}
                    placeholder="GSTIN number"
                  />
                </div>
              </div>
              <div className="quotation-form-grid-two" id="quotation-address-grid">
                <div className="quotation-input-group" id="party-address-group">
                  <label htmlFor="party-address-input">Party Address:</label>
                  <textarea
                    id="party-address-input"
                    name="party_address"
                    value={formData.party_address}
                    onChange={handleInputChange}
                    placeholder="Party address"
                    rows="2"
                  />
                </div>
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
                    <th>Rate</th>
                    <th>Total Amount</th>
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
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          step="0.01"
                          min="0"
                          className="quotation-item-rate"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.total_amount}
                          readOnly
                          className="quotation-readonly-field quotation-item-total"
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

              <div className="quotation-input-group" id="total-before-discount-group">
                <label>Total (Before Discount):</label>
                <input
                  type="number"
                  value={formData.total_before_discount}
                  readOnly
                  className="quotation-readonly-field"
                />
              </div>
            </fieldset>

            {/* Calculations */}
            <fieldset className="quotation-field-group" id="calculations-fieldset">
              <legend>Calculations</legend>
              <div className="quotation-form-grid-two" id="discount-roundoff-grid">
                <div className="quotation-input-group" id="discount-group">
                  <label htmlFor="discount-input">Discount:</label>
                  <input
                    type="number"
                    id="discount-input"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="quotation-input-group" id="round-off-group">
                  <label htmlFor="round-off-input">Rounded Off:</label>
                  <input
                    type="number"
                    id="round-off-input"
                    name="round_off"
                    value={formData.round_off}
                    onChange={handleInputChange}
                    step="0.01"
                  />
                </div>
              </div>

              <h4>GST Details</h4>
              <table className="quotation-gst-grid" id="gst-details-table">
                <thead>
                  <tr>
                    <th>Tax Type</th>
                    <th>Percentage (%)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.gst_details.map((gst, index) => (
                    <tr key={index} className="quotation-gst-row">
                      <td>
                        <select
                          value={gst.tax_type}
                          onChange={(e) => handleGSTChange(index, 'tax_type', e.target.value)}
                          className="quotation-gst-type"
                        >
                          <option value="CGST">CGST</option>
                          <option value="SGST">SGST</option>
                          <option value="IGST">IGST</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={gst.percentage}
                          onChange={(e) => handleGSTChange(index, 'percentage', e.target.value)}
                          step="0.01"
                          min="0"
                          max="100"
                          className="quotation-gst-percentage"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="quotation-remove-btn"
                          onClick={() => removeGSTRow(index)}
                          disabled={formData.gst_details.length === 1}
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
                id="add-gst-button"
                onClick={addGSTRow}
              >
                + Add GST Row
              </button>

              <div className="quotation-input-group" id="total-after-tax-group">
                <label>Total Amount After Tax:</label>
                <input
                  type="number"
                  value={calculateTotalAfterTax(
                    formData.total_before_discount,
                    formData.discount,
                    formData.gst_details,
                    formData.round_off
                  )}
                  readOnly
                  className="quotation-readonly-field"
                />
              </div>
            </fieldset>

            <div className="quotation-action-buttons" id="quotation-form-actions">
              <button
                type="button"
                onClick={() => setFormData({
                  quotation_no: `${Math.floor(1000 + Math.random() * 9000)}`,
                  quotation_date: '',
                  ref_no: '',
                  buyer_gstin: '',
                  party_address: '',
                  items: [{ sr_no: 1, description: '', quantity: 1, rate: 0, total_amount: 0 }],
                  total_before_discount: 0,
                  discount: 0,
                  gst_details: [{ tax_type: 'CGST', percentage: 0 }],
                  round_off: 0,
                  total_after_tax: 0,
                  valid_until: ''
                })}
                className="quotation-cancel-btn"
                id="clear-form-button"
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="quotation-submit-btn"
                id="generate-quotation-button"
                disabled={!hasBankData || !hasGstData}
              >
                {hasBankData && hasGstData ? 'Generate Quotation' : 'Configure Settings First'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quotation History Modal */}
      {isHistoryModalOpen && (
        <div className="quotation-modal-overlay" id="history-modal-overlay">
          <div className="quotation-modal-window quotation-large-modal" id="history-modal">
            <div className="quotation-modal-header" id="history-modal-header">
              <h2 id="history-modal-title">Quotation History</h2>
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
                      <th className="sortable-th" onClick={() => requestSort('id', 'id')}>Quotation ID{sortLabel('id')}</th>
                      <th className="sortable-th" onClick={() => requestSort('quotation_no', 'quotation_no')}>Quotation No{sortLabel('quotation_no')}</th>
                      <th className="sortable-th" onClick={() => requestSort('quotation_date', 'quotation_date')}>Quotation Date{sortLabel('quotation_date')}</th>
                      <th className="sortable-th" onClick={() => requestSort('ref_no', 'ref_no')}>Ref. No{sortLabel('ref_no')}</th>
                      <th className="sortable-th" onClick={() => requestSort('buyer_gstin', 'buyer_gstin')}>GSTIN{sortLabel('buyer_gstin')}</th>
                      <th className="sortable-th" onClick={() => requestSort('total_after_tax', 'total_after_tax')}>Total Amount{sortLabel('total_after_tax')}</th>
                      <th className="sortable-th" onClick={() => requestSort('status', 'status')}>Status{sortLabel('status')}</th>
                      <th className="sortable-th" onClick={() => requestSort('valid_until', 'valid_until')}>Valid Until{sortLabel('valid_until')}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleQuotations.map(quotation => (
                      <tr key={quotation.id} className="quotation-history-row">
                        <td>{String(quotation.id).padStart(3, '0')}</td>
                        <td>{quotation.quotation_no}</td>
                        <td>{formatDate(quotation.quotation_date)}</td>
                        <td>{quotation.ref_no}</td>
                        <td>{quotation.buyer_gstin}</td>
                        <td>{formatCurrency(quotation.total_after_tax)}</td>
                        <td>{getStatusBadge(quotation.status)}</td>
                        <td>{formatDate(quotation.valid_until)}</td>
                        <td>
                          <div className="quotation-action-buttons" id="history-row-actions" style={{ justifyContent: 'center', gap: '0.25rem' }}>
                            <button
                              type="button"
                              onClick={() => handleViewQuotation(quotation)}
                              className="quotation-edit-btn"
                              id={`view-quotation-${quotation.id}`}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditQuotation(quotation)}
                              className="quotation-submit-btn"
                              id={`edit-quotation-${quotation.id}`}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadQuotation(quotation)}
                              className={`quotation-download-btn download-btn-${quotation.id}`}
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
                              onClick={() => handleDeleteQuotation(quotation)}
                              className="quotation-remove-btn"
                              id={`delete-quotation-${quotation.id}`}
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

              {visibleQuotations.length === 0 && (
                <div className="quotation-empty-state" id="empty-quotation-state">
                  <div className="quotation-empty-icon">📋</div>
                  <p>No quotation history found</p>
                  <p className="quotation-empty-subtext">
                    Get started by creating your first quotation.
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

      {/* View Quotation Details Modal */}
      {isViewModalOpen && selectedQuotation && (
        <div className="quotation-modal-overlay" id="view-modal-overlay">
          <div className="quotation-modal-window quotation-large-modal" id="view-quotation-modal">
            <div className="quotation-modal-header1" id="view-modal-header">
              <h2 id="view-modal-title">Quotation Details</h2>
              <button 
                className="quotation-close-btn"
                id="close-view-modal"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="quotation-details-panel" id="quotation-details-panel">
              {/* Quotation Information */}
              <div className="quotation-detail-section" id="quotation-info-section">
                <h3 className="quotation-section-title">Quotation Information</h3>
                <div className="quotation-detail-grid" id="quotation-info-grid">
                  <div className="quotation-detail-item" id="quotation-id-item">
                    <label>Quotation ID</label>
                    <span>{String(selectedQuotation.id).padStart(3, '0')}</span>
                  </div>
                  <div className="quotation-detail-item" id="quotation-no-item">
                    <label>Quotation No</label>
                    <span>{selectedQuotation.quotation_no}</span>
                  </div>
                  <div className="quotation-detail-item" id="quotation-date-item">
                    <label>Quotation Date</label>
                    <span>{formatDate(selectedQuotation.quotation_date)}</span>
                  </div>
                  <div className="quotation-detail-item" id="valid-until-item">
                    <label>Valid Until</label>
                    <span>{formatDate(selectedQuotation.valid_until)}</span>
                  </div>
                  <div className="quotation-detail-item" id="ref-no-item">
                    <label>Ref. No</label>
                    <span>{selectedQuotation.ref_no}</span>
                  </div>
                  <div className="quotation-detail-item" id="status-item">
                    <label>Status</label>
                    <span>{getStatusBadge(selectedQuotation.status)}</span>
                  </div>
                </div>
              </div>

              {/* Quotation Details */}
              <div className="quotation-detail-section" id="quotation-details-section">
                <h3 className="quotation-section-title">Quotation Details</h3>
                <div className="quotation-detail-grid" id="quotation-details-grid">
                  <div className="quotation-detail-item" id="gstin-item">
                    <label>GSTIN</label>
                    <span>{selectedQuotation.buyer_gstin}</span>
                  </div>
                  <div className="quotation-detail-item" id="party-address-item" style={{ gridColumn: 'span 2' }}>
                    <label>Party Address</label>
                    <span>{selectedQuotation.party_address}</span>
                  </div>
                </div>
              </div>

              {/* Service Settings Section */}
              <div className="quotation-detail-section" id="service-settings-section">
                <h3 className="quotation-section-title">Service Settings (Automatically Included)</h3>
                
                {/* Bank Details */}
                {selectedQuotation.service_bank_details && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#1e40af', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Bank Details for Payment
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      backgroundColor: 'rgba(14,165,233,0.08)',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(14,165,233,0.35)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>Account Holder</div>
                        <div style={{ fontWeight: '500' }}>{selectedQuotation.service_bank_details.account_holder}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>Account Number</div>
                        <div style={{ fontWeight: '500' }}>{selectedQuotation.service_bank_details.account_number}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>Bank Name</div>
                        <div style={{ fontWeight: '500' }}>{selectedQuotation.service_bank_details.bank_name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>IFSC Code</div>
                        <div style={{ fontWeight: '500' }}>{selectedQuotation.service_bank_details.ifsc_code}</div>
                      </div>
                      {selectedQuotation.service_bank_details.branch && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>Branch</div>
                          <div style={{ fontWeight: '500' }}>{selectedQuotation.service_bank_details.branch}</div>
                        </div>
                      )}
                      {selectedQuotation.service_bank_details.account_type && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>Account Type</div>
                          <div style={{ fontWeight: '500' }}>{selectedQuotation.service_bank_details.account_type}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* GST Details */}
                {selectedQuotation.service_gst_details && selectedQuotation.service_gst_details.is_gst_applicable && (
                  <div>
                    <h4 style={{ color: '#1e40af', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      GST & Tax Information
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      backgroundColor: 'rgba(14,165,233,0.08)',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(14,165,233,0.35)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>GSTIN</div>
                        <div style={{ fontWeight: '500' }}>{selectedQuotation.service_gst_details.gstin}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>PAN Number</div>
                        <div style={{ fontWeight: '500' }}>{selectedQuotation.service_gst_details.pan_number}</div>
                      </div>
                      {selectedQuotation.service_gst_details.hsn_code && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>HSN/SAC Code</div>
                          <div style={{ fontWeight: '500' }}>{selectedQuotation.service_gst_details.hsn_code}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>Tax Rate</div>
                        <div style={{ fontWeight: '500' }}>{selectedQuotation.service_gst_details.tax_rate}%</div>
                      </div>
                      {selectedQuotation.service_gst_details.sgst_rate && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>SGST Rate</div>
                          <div style={{ fontWeight: '500' }}>{selectedQuotation.service_gst_details.sgst_rate}%</div>
                        </div>
                      )}
                      {selectedQuotation.service_gst_details.cgst_rate && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>CGST Rate</div>
                          <div style={{ fontWeight: '500' }}>{selectedQuotation.service_gst_details.cgst_rate}%</div>
                        </div>
                      )}
                      {selectedQuotation.service_gst_details.igst_rate && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>IGST Rate</div>
                          <div style={{ fontWeight: '500' }}>{selectedQuotation.service_gst_details.igst_rate}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                        <th>Rate</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuotation.items.map((item, index) => (
                        <tr key={index} className="view-item-row">
                          <td>{item.sr_no}</td>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.rate)}</td>
                          <td>{formatCurrency(item.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="quotation-detail-grid" id="view-calculations-grid" style={{ marginTop: '1rem' }}>
                  <div className="quotation-detail-item" id="total-before-discount-item">
                    <label>Total Before Discount</label>
                    <span>{formatCurrency(selectedQuotation.total_before_discount)}</span>
                  </div>
                  <div className="quotation-detail-item" id="discount-item">
                    <label>Discount</label>
                    <span>{formatCurrency(selectedQuotation.discount)}</span>
                  </div>
                  <div className="quotation-detail-item" id="round-off-item">
                    <label>Rounded Off</label>
                    <span>{formatCurrency(selectedQuotation.round_off)}</span>
                  </div>
                  <div className="quotation-detail-item" id="total-after-tax-item">
                    <label>Total After Tax</label>
                    <span style={{ fontWeight: 'bold', color: 'var(--theme-text-strong,#2d3748)' }}>
                      {formatCurrency(selectedQuotation.total_after_tax)}
                    </span>
                  </div>
                </div>
              </div>

              {/* GST Details */}
              <div className="quotation-detail-section" id="view-gst-section">
                <h3 className="quotation-section-title">GST Details</h3>
                <div className="quotation-table-container" id="view-gst-table-container">
                  <table className="quotation-history-table" id="view-gst-table">
                    <thead>
                      <tr>
                        <th>Tax Type</th>
                        <th>Percentage (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuotation.gst_details.map((gst, index) => (
                        <tr key={index} className="view-gst-row">
                          <td>{gst.tax_type}</td>
                          <td>{gst.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
             
              {/* Quotation History */}
              <div className="quotation-detail-section" id="quotation-history-section">
                <h3 className="quotation-section-title">Quotation History</h3>
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
                      {selectedQuotation.history.map((entry, index) => (
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

              {/* Status Actions */}
              <div className="quotation-detail-section" id="status-actions-section">
                <h3 className="quotation-section-title">Update Status</h3>
                <div className="quotation-action-buttons">
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('sent')}
                    className="quotation-edit-btn"
                    disabled={selectedQuotation.status === 'sent' || selectedQuotation.status === 'accepted' || selectedQuotation.status === 'rejected'}
                  >
                    Mark as Sent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('accepted')}
                    className="quotation-submit-btn"
                    disabled={selectedQuotation.status === 'accepted'}
                  >
                    Mark as Accepted
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('rejected')}
                    className="quotation-remove-btn"
                    disabled={selectedQuotation.status === 'rejected'}
                  >
                    Mark as Rejected
                  </button>
                </div>
              </div>

              <div className="quotation-action-buttons" id="view-modal-actions">
                <button
                  type="button"
                  onClick={() => handleEditQuotation(selectedQuotation)}
                  className="quotation-edit-btn"
                  id="edit-from-view-button"
                >
                  Edit Quotation
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadQuotation(selectedQuotation)}
                  className="quotation-download-btn"
                  style={{ background: '#10b981', color: 'var(--card-bg,#fff)', border: 'none' }}
                >
                  Download with Settings
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQuotation(selectedQuotation)}
                  className="quotation-remove-btn"
                  id="delete-from-view-button"
                >
                  Delete Quotation
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

      {/* Edit Quotation Modal */}
      {isEditModalOpen && selectedQuotation && (
        <div className="quotation-modal-overlay" id="edit-modal-overlay">
          <div className="quotation-modal-window quotation-large-modal" id="edit-quotation-modal">
            <div className="quotation-modal-header" id="edit-modal-header">
              <h2 id="edit-modal-title">Edit Quotation</h2>
              <button 
                className="quotation-close-btn"
                id="close-edit-modal"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateQuotation} className="quotation-input-form" id="edit-quotation-form">
              {/* Service Settings Notice */}
              <div style={{
                backgroundColor: 'rgba(14,165,233,0.08)',
                border: '1px solid rgba(14,165,233,0.35)',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#0ea5e9'
                  }}></div>
                  <strong style={{ color: '#0369a1', fontSize: '0.9rem' }}>
                    Service Settings Included
                  </strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>
                  This quotation was created with service settings. The original settings will be preserved.
                </div>
              </div>

              {/* Quotation Details */}
              <fieldset className="quotation-field-group" id="edit-quotation-details">
                <legend>Quotation Details</legend>
                <div className="quotation-form-grid-four" id="edit-basic-details-grid">
                  <div className="quotation-input-group" id="edit-quotation-no-group">
                    <label htmlFor="edit-quotation-no-input">Quotation No:</label>
                    <input
                      type="text"
                      id="edit-quotation-no-input"
                      name="quotation_no"
                      value={editFormData.quotation_no}
                      onChange={handleEditInputChange}
                      placeholder="Auto-generated"
                    />
                  </div>
                  <div className="quotation-input-group" id="edit-quotation-date-group">
                    <label htmlFor="edit-quotation-date-input">Quotation Date:</label>
                    <input
                      type="date"
                      id="edit-quotation-date-input"
                      name="quotation_date"
                      value={editFormData.quotation_date}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className="quotation-input-group" id="edit-valid-until-group">
                    <label htmlFor="edit-valid-until-input">Valid Until:</label>
                    <input
                      type="date"
                      id="edit-valid-until-input"
                      name="valid_until"
                      value={editFormData.valid_until}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className="quotation-input-group" id="edit-ref-no-group">
                    <label htmlFor="edit-ref-no-input">Ref. No:</label>
                    <input
                      type="text"
                      id="edit-ref-no-input"
                      name="ref_no"
                      value={editFormData.ref_no}
                      onChange={handleEditInputChange}
                      placeholder="Reference number"
                    />
                  </div>
                </div>
                <div className="quotation-form-grid-two" id="edit-address-grid">
                  <div className="quotation-input-group" id="edit-gstin-group">
                    <label htmlFor="edit-gstin-input">GSTIN:</label>
                    <input
                      type="text"
                      id="edit-gstin-input"
                      name="buyer_gstin"
                      value={editFormData.buyer_gstin}
                      onChange={handleEditInputChange}
                      placeholder="GSTIN number"
                    />
                  </div>
                </div>
                <div className="quotation-form-grid-two" id="edit-party-address-grid">
                  <div className="quotation-input-group" id="edit-party-address-group">
                    <label htmlFor="edit-party-address-input">Party Address:</label>
                    <textarea
                      id="edit-party-address-input"
                      name="party_address"
                      value={editFormData.party_address}
                      onChange={handleEditInputChange}
                      placeholder="Party address"
                      rows="2"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Goods Details */}
              <fieldset className="quotation-field-group" id="edit-goods-details">
                <legend>Goods Details</legend>
                <table className="quotation-items-grid" id="edit-items-table">
                  <thead>
                    <tr>
                      <th>Sr. No.</th>
                      <th>Description of Goods</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editFormData.items.map((item, index) => (
                      <tr key={index} className="edit-item-row">
                        <td>{item.sr_no}</td>
                        <td>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleEditItemChange(index, 'description', e.target.value)}
                            placeholder="Description"
                            className="edit-item-description"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleEditItemChange(index, 'quantity', e.target.value)}
                            step="0.01"
                            min="0"
                            className="edit-item-quantity"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleEditItemChange(index, 'rate', e.target.value)}
                            step="0.01"
                            min="0"
                            className="edit-item-rate"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.total_amount}
                            readOnly
                            className="quotation-readonly-field edit-item-total"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="quotation-remove-btn"
                            onClick={() => removeEditItemRow(index)}
                            disabled={editFormData.items.length === 1}
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
                  id="edit-add-item-button"
                  onClick={addEditItemRow}
                >
                  + Add Item
                </button>

                <div className="quotation-input-group" id="edit-total-before-discount-group">
                  <label>Total (Before Discount):</label>
                  <input
                    type="number"
                    value={editFormData.total_before_discount}
                    readOnly
                    className="quotation-readonly-field"
                  />
                </div>
              </fieldset>

              {/* Calculations */}
              <fieldset className="quotation-field-group" id="edit-calculations">
                <legend>Calculations</legend>
                <div className="quotation-form-grid-two" id="edit-discount-roundoff-grid">
                  <div className="quotation-input-group" id="edit-discount-group">
                    <label htmlFor="edit-discount-input">Discount:</label>
                    <input
                      type="number"
                      id="edit-discount-input"
                      name="discount"
                      value={editFormData.discount}
                      onChange={handleEditInputChange}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="quotation-input-group" id="edit-round-off-group">
                    <label htmlFor="edit-round-off-input">Rounded Off:</label>
                    <input
                      type="number"
                      id="edit-round-off-input"
                      name="round_off"
                      value={editFormData.round_off}
                      onChange={handleEditInputChange}
                      step="0.01"
                    />
                  </div>
                </div>

                <h4>GST Details</h4>
                <table className="quotation-gst-grid" id="edit-gst-table">
                  <thead>
                    <tr>
                      <th>Tax Type</th>
                      <th>Percentage (%)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editFormData.gst_details.map((gst, index) => (
                      <tr key={index} className="edit-gst-row">
                        <td>
                          <select
                            value={gst.tax_type}
                            onChange={(e) => handleEditGSTChange(index, 'tax_type', e.target.value)}
                            className="edit-gst-type"
                          >
                            <option value="CGST">CGST</option>
                            <option value="SGST">SGST</option>
                            <option value="IGST">IGST</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={gst.percentage}
                            onChange={(e) => handleEditGSTChange(index, 'percentage', e.target.value)}
                            step="0.01"
                            min="0"
                            max="100"
                            className="edit-gst-percentage"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="quotation-remove-btn"
                            onClick={() => removeEditGSTRow(index)}
                            disabled={editFormData.gst_details.length === 1}
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
                  id="edit-add-gst-button"
                  onClick={addEditGSTRow}
                >
                  + Add GST Row
                </button>

                <div className="quotation-input-group" id="edit-total-after-tax-group">
                  <label>Total Amount After Tax:</label>
                  <input
                    type="number"
                    value={calculateTotalAfterTax(
                      editFormData.total_before_discount,
                      editFormData.discount,
                      editFormData.gst_details,
                      editFormData.round_off
                    )}
                    readOnly
                    className="quotation-readonly-field"
                  />
                </div>
              </fieldset>

              <div className="quotation-action-buttons" id="edit-form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="quotation-cancel-btn"
                  id="cancel-edit-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="quotation-submit-btn"
                  id="update-quotation-button"
                >
                  Update Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedQuotation && (
        <div className="quotation-modal-overlay" id="delete-modal-overlay">
          <div className="quotation-modal-window" id="delete-confirmation-modal">
            <div className="quotation-modal-header" id="delete-modal-header">
              <h2 className="quotation-modal-title" id="delete-modal-title">Delete Quotation</h2>
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
                Delete Quotation?
              </h3>
              <p className="quotation-delete-message" id="delete-confirmation-message">
                Are you sure you want to delete the quotation with quotation number "<strong>{selectedQuotation.quotation_no}</strong>"? 
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
                  Delete Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationManagement;
