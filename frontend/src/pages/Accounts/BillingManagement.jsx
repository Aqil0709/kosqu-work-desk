import React, { useState, useEffect } from 'react';
import { billingAPI } from '../../services/billingAPI';
import { useAuth } from '../../contexts/AuthContext';
import { FaExclamationTriangle } from 'react-icons/fa';
import { invoicePDFService } from '../../services/invoicePDFService';
import { serviceSettingAPI } from '../../services/serviceSettingAPI'; // Added import
import { useTableControls } from '../../hooks/useTableControls';
import './BillingManagement.css';
import '../../styles/tableControls.css';

const INVOICE_SEARCH_FIELDS = ['invoice_no', 'ref_no', 'buyer_gstin', 'party_address', 'status', 'invoice_date', 'total_after_tax'];

const BillingManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  // Service Settings State
  const [serviceSettings, setServiceSettings] = useState({
    bank: null,
    gst: null
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    invoice_no: `${Math.floor(1000 + Math.random() * 9000)}`,
    invoice_date: '',
    ref_no: '',
    buyer_gstin: '',
    party_address: '',
    items: [{ sr_no: 1, description: '', hsn_code: '', quantity: 1, rate: 0, total_amount: 0 }],
    total_before_discount: 0,
    gst_details: [{ tax_type: 'CGST', percentage: 0 }],
    round_off: 0,
    total_after_tax: 0
  });

  const [editFormData, setEditFormData] = useState({
    invoice_no: '',
    invoice_date: '',
    ref_no: '',
    buyer_gstin: '',
    party_address: '',
    items: [],
    total_before_discount: 0,
    gst_details: [],
    round_off: 0,
    total_after_tax: 0
  });

  const [followUpText, setFollowUpText] = useState('');
  const {
    controlledRows: visibleInvoices,
    requestSort,
    searchTerm,
    setSearchTerm,
    sortLabel,
  } = useTableControls(invoices, INVOICE_SEARCH_FIELDS, { key: 'invoice_date', accessor: 'invoice_date', direction: 'desc' });

  useEffect(() => {
    loadInvoices();
    loadServiceSettings();
  }, [filter]);

  const loadServiceSettings = async () => {
    try {
      setSettingsLoading(true);
     
      const response = await serviceSettingAPI.getQuotationSettings();
     
      
      if (response.data.success && response.data.settings) {
     
        
        // Extract the actual data from backend response
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

      setServiceSettings({
        bank: null,
        gst: null
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const filters = filter !== 'all' ? { status: filter } : {};
      const response = await billingAPI.getAll(filters);
      setInvoices(response.data.invoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
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

  const calculateTotalAfterTax = (totalBeforeDiscount, gstDetails, roundOff) => {
    const taxableAmount = totalBeforeDiscount;
    
    const gstAmount = gstDetails.reduce((total, gst) => {
      return total + (taxableAmount * (parseFloat(gst.percentage) || 0) / 100);
    }, 0);
    
    return taxableAmount + gstAmount + (parseFloat(roundOff) || 0);
  };

  // Add this function to handle download
  const handleDownloadInvoice = async (invoice) => {
    try {
      // Show loading state
      const downloadBtn = document.querySelector(`.download-btn-${invoice.id}`);
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = 'Downloading...';
      }

      // Include service settings in PDF download
      const invoiceWithSettings = {
        ...invoice,
        service_bank_details: invoice.service_bank_details || serviceSettings.bank,
        service_gst_details: invoice.service_gst_details || serviceSettings.gst
      };
      
      await invoicePDFService.downloadInvoicePDF(invoiceWithSettings);
      
      // Reset button state
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = 'Download';
      }
      
      alert('Invoice downloaded successfully as PDF with service settings!');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      
      // Reset button state on error
      const downloadBtn = document.querySelector(`.download-btn-${invoice.id}`);
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = 'Download';
      }
      
      alert('Failed to download invoice');
    }
  };

  // Form handlers
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

  // Item management functions
  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { sr_no: prev.items.length + 1, description: '', hsn_code: '', quantity: 1, rate: 0, total_amount: 0 }
      ]
    }));
  };

  const addEditItemRow = () => {
    setEditFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { sr_no: prev.items.length + 1, description: '', hsn_code: '', quantity: 1, rate: 0, total_amount: 0 }
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

  // GST management functions
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

  // API handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if we have service settings
    const hasBankData = serviceSettings.bank && 
                       serviceSettings.bank.account_holder && 
                       serviceSettings.bank.account_number;
    
    const hasGstData = serviceSettings.gst && 
                      serviceSettings.gst.gstin && 
                      serviceSettings.gst.pan_number;
    
    if (!hasBankData || !hasGstData) {
      alert('Please configure Service Settings (Bank and GST details) before creating an invoice');
      return;
    }
    
    try {
      const totalAfterTax = calculateTotalAfterTax(
        formData.total_before_discount,
        formData.gst_details,
        formData.round_off
      );

      const invoiceData = {
        ...formData,
        total_after_tax: totalAfterTax,
        service_bank_details: serviceSettings.bank,
        service_gst_details: serviceSettings.gst
      };

      await billingAPI.create(invoiceData);
      await loadInvoices();
      
      // Reset form
      setFormData({
        invoice_no: `${Math.floor(1000 + Math.random() * 9000)}`,
        invoice_date: '',
        ref_no: '',
        buyer_gstin: '',
        party_address: '',
        items: [{ sr_no: 1, description: '', hsn_code: '', quantity: 1, rate: 0, total_amount: 0 }],
        total_before_discount: 0,
        gst_details: [{ tax_type: 'CGST', percentage: 0 }],
        round_off: 0,
        total_after_tax: 0
      });
      
      alert('Tax Invoice created successfully with service settings!');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    }
  };

  const handleUpdateInvoice = async (e) => {
    e.preventDefault();
    
    try {
      const totalAfterTax = calculateTotalAfterTax(
        editFormData.total_before_discount,
        editFormData.gst_details,
        editFormData.round_off
      );

      const invoiceData = {
        ...editFormData,
        total_after_tax: totalAfterTax
        // Note: Service settings are preserved from original invoice
      };

      await billingAPI.update(selectedInvoice.id, invoiceData);
      await loadInvoices();
      
      setIsEditModalOpen(false);
      setSelectedInvoice(null);
      alert('Tax Invoice updated successfully!');
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Failed to update invoice');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await billingAPI.delete(selectedInvoice.id);
      await loadInvoices();
      
      setIsDeleteModalOpen(false);
      setSelectedInvoice(null);
      alert('Tax Invoice deleted successfully!');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpText.trim()) {
      alert('Please enter follow-up notes');
      return;
    }

    try {
      await billingAPI.addFollowUp(selectedInvoice.id, followUpText);
      await loadInvoices();
      
      // Refresh selected invoice
      const response = await billingAPI.getById(selectedInvoice.id);
      setSelectedInvoice(response.data.invoice);
      
      setFollowUpText('');
      alert('Follow-up added successfully!');
    } catch (error) {
      console.error('Error adding follow-up:', error);
      alert('Failed to add follow-up');
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await billingAPI.updateStatus(selectedInvoice.id, status);
      await loadInvoices();
      
      // Refresh selected invoice
      const response = await billingAPI.getById(selectedInvoice.id);
      setSelectedInvoice(response.data.invoice);
      
      alert(`Invoice status updated to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleViewInvoice = async (invoice) => {
    try {
      const response = await billingAPI.getById(invoice.id);
      setSelectedInvoice(response.data.invoice);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching invoice:', error);
    }
  };

  const handleEditInvoice = async (invoice) => {
    try {
      const response = await billingAPI.getById(invoice.id);
      const invoiceData = response.data.invoice;
      
      setEditFormData({
        invoice_no: invoiceData.invoice_no,
        invoice_date: invoiceData.invoice_date,
        ref_no: invoiceData.ref_no,
        buyer_gstin: invoiceData.buyer_gstin,
        party_address: invoiceData.party_address,
        items: invoiceData.items,
        total_before_discount: invoiceData.total_before_discount,
        gst_details: invoiceData.gst_details,
        round_off: invoiceData.round_off,
        total_after_tax: invoiceData.total_after_tax
      });
      
      setSelectedInvoice(invoiceData);
      setIsViewModalOpen(false);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching invoice for edit:', error);
    }
  };

  const handleDeleteInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleShowHistory = () => {
    setIsHistoryModalOpen(true);
  };

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
          `Note: These settings will be automatically included in new invoices.`);
  };

  // UI helper functions
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
      draft: { background: 'var(--color-bg-muted)', color: 'var(--color-text-muted)' },
      sent: { background: 'var(--color-accent-soft)', color: 'var(--color-accent-text)' },
      paid: { background: 'var(--color-success-soft)', color: 'var(--color-success-text)' },
      cancelled: { background: 'var(--color-danger-soft)', color: 'var(--color-danger-text)' }
    };

    const colors = statusColors[status] || { background: 'var(--color-bg-muted)', color: 'var(--color-text-muted)' };
    
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

  // Calculate if we have valid data
  const hasBankData = serviceSettings.bank && 
                     serviceSettings.bank.account_holder && 
                     serviceSettings.bank.account_number;
  
  const hasGstData = serviceSettings.gst && 
                    serviceSettings.gst.gstin && 
                    serviceSettings.gst.pan_number;
  
  const allSettingsValid = hasBankData && hasGstData;

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      Loading invoices...
    </div>;
  }

  return (
    <div className="taxinvoice-dashboard">
      <div className="taxinvoice-header-panel">
        <h2>Tax Invoice Management</h2>
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
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            className="table-search-input"
            type="search"
            placeholder="Search invoice, GSTIN, ref, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
                    
          {/* Service Settings Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: allSettingsValid ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
            borderRadius: '6px',
            border: `1px solid ${allSettingsValid ? 'var(--color-success)' : 'var(--color-warning)'}`
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: allSettingsValid ? 'var(--color-success)' : 'var(--color-warning)'
            }}></div>
            <span style={{
              fontSize: '0.8rem',
              color: allSettingsValid ? 'var(--color-success-text)' : 'var(--color-warning-text)'
            }}>
              {allSettingsValid ? 'Settings Active' : 'Settings Needed'}
            </span>
            {!hasBankData && <span style={{ fontSize: '0.7rem', color: 'var(--color-warning-text)' }}> (Bank)</span>}
            {!hasGstData && <span style={{ fontSize: '0.7rem', color: 'var(--color-warning-text)' }}> (GST)</span>}
            <button
              onClick={handleViewServiceSettings}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-accent)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                textDecoration: 'underline'
              }}
            >
              View Settings
            </button>
          </div>
          
          <button 
            className="taxinvoice-history-btn"
            onClick={handleShowHistory}
          >
            Invoice History
          </button>
        </div>
      </div>

      {/* Service Settings Status Banner */}
      {(!hasBankData || !hasGstData) && (
        <div style={{
          backgroundColor: 'var(--color-warning-soft)',
          border: '1px solid var(--color-warning)',
          borderRadius: '6px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <FaExclamationTriangle style={{ color: 'var(--color-warning)', fontSize: '1.25rem' }} />
          <div>
            <strong style={{ color: 'var(--color-warning-text)' }}>Service Settings Required</strong>
            <p style={{ color: 'var(--color-warning-text)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              Please configure {!hasBankData && !hasGstData ? 'Bank and GST' : !hasBankData ? 'Bank' : 'GST'} details in Service Settings to create invoices.
            </p>
          </div>
        </div>
      )}

      {/* Invoice Creation Form */}
      <div className="taxinvoice-form-wrapper">
        <div className="taxinvoice-form-card">
          <h3>Create Tax Invoice</h3>
          
          {/* Service Settings Preview */}
          {(hasBankData || hasGstData) && (
            <div style={{
              backgroundColor: 'var(--color-info-soft)',
              border: '1px solid var(--color-info)',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <h4 style={{ marginTop: 0, color: 'var(--color-info)', fontSize: '0.9rem' }}>
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
          
          <form onSubmit={handleSubmit} className="taxinvoice-input-form">
            {/* Tax Invoice Details */}
            <fieldset className="taxinvoice-field-group">
              <legend>Tax Invoice Details</legend>
              <div className="taxinvoice-form-grid-four">
                <div className="taxinvoice-input-group">
                  <label>Invoice No:</label>
                  <input
                    type="text"
                    name="invoice_no"
                    value={formData.invoice_no}
                    onChange={handleInputChange}
                    placeholder="Auto-generated"
                  />
                </div>
                <div className="taxinvoice-input-group">
                  <label>Invoice Date:</label>
                  <input
                    type="date"
                    name="invoice_date"
                    value={formData.invoice_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="taxinvoice-input-group">
                  <label>Ref. No:</label>
                  <input
                    type="text"
                    name="ref_no"
                    value={formData.ref_no}
                    onChange={handleInputChange}
                    placeholder="Reference number"
                  />
                </div>
                <div className="taxinvoice-input-group">
                  <label>GSTIN:</label>
                  <input
                    type="text"
                    name="buyer_gstin"
                    value={formData.buyer_gstin}
                    onChange={handleInputChange}
                    placeholder="GSTIN number"
                  />
                </div>
              </div>
              <div className="taxinvoice-form-grid-two">
                <div className="taxinvoice-input-group">
                  <label>Party Address:</label>
                  <textarea
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
            <fieldset className="taxinvoice-field-group">
              <legend>Goods Details</legend>
              <table className="taxinvoice-items-grid">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Description of Goods</th>
                    <th>HSN Code</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.sr_no}</td>
                      <td>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.hsn_code}
                          onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                          placeholder="HSN Code"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.total_amount}
                          readOnly
                          className="taxinvoice-readonly-field"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="taxinvoice-remove-btn"
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
                className="taxinvoice-add-row-btn"
                onClick={addItemRow}
              >
                + Add Item
              </button>

            </fieldset>

            {/* Calculations */}
            <fieldset className="taxinvoice-field-group">
              <legend>Calculations</legend>
              <div className="taxinvoice-form-grid-two">
                <div className="taxinvoice-input-group">
                  <label>Rounded Off:</label>
                  <input
                    type="number"
                    name="round_off"
                    value={formData.round_off}
                    onChange={handleInputChange}
                    step="0.01"
                  />
                </div>
              </div>

              <h4>GST Details</h4>
              <table className="taxinvoice-gst-grid">
                <thead>
                  <tr>
                    <th>Tax Type</th>
                    <th>Percentage (%)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.gst_details.map((gst, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          value={gst.tax_type}
                          onChange={(e) => handleGSTChange(index, 'tax_type', e.target.value)}
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
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="taxinvoice-remove-btn"
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
                className="taxinvoice-add-row-btn"
                onClick={addGSTRow}
              >
                + Add GST Row
              </button>

              <div className="taxinvoice-input-group">
                <label>Total Amount After Tax:</label>
                <input
                  type="number"
                  value={calculateTotalAfterTax(
                    formData.total_before_discount,
                    formData.gst_details,
                    formData.round_off
                  )}
                  readOnly
                  className="taxinvoice-readonly-field"
                />
              </div>
            </fieldset>

            <div className="taxinvoice-action-buttons">
              <button
                type="button"
                onClick={() => setFormData({
                  invoice_no: `${Math.floor(1000 + Math.random() * 9000)}`,
                  invoice_date: '',
                  ref_no: '',
                  buyer_gstin: '',
                  party_address: '',
                  items: [{ sr_no: 1, description: '', hsn_code: '', quantity: 1, rate: 0, total_amount: 0 }],
                  total_before_discount: 0,
                  gst_details: [{ tax_type: 'CGST', percentage: 0 }],
                  round_off: 0,
                  total_after_tax: 0
                })}
                className="taxinvoice-cancel-btn"
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="taxinvoice-submit-btn"
                disabled={!hasBankData || !hasGstData}
              >
                {hasBankData && hasGstData ? 'Generate Invoice' : 'Configure Settings First'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Invoice History Modal */}
      {isHistoryModalOpen && (
        <div className="taxinvoice-modal-overlay">
          <div className="taxinvoice-modal-window taxinvoice-large-modal">
            <div className="taxinvoice-modal-header">
              <h2>Invoice History</h2>
              <button 
                className="taxinvoice-close-btn"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="taxinvoice-history-content">
              <div className="taxinvoice-table-container">
                <table className="taxinvoice-history-table">
                  <thead>
                    <tr>
                      <th className="sortable-th" onClick={() => requestSort('id', 'id')}>Invoice ID{sortLabel('id')}</th>
                      <th className="sortable-th" onClick={() => requestSort('invoice_no', 'invoice_no')}>Invoice No{sortLabel('invoice_no')}</th>
                      <th className="sortable-th" onClick={() => requestSort('invoice_date', 'invoice_date')}>Invoice Date{sortLabel('invoice_date')}</th>
                      <th className="sortable-th" onClick={() => requestSort('ref_no', 'ref_no')}>Ref. No{sortLabel('ref_no')}</th>
                      <th className="sortable-th" onClick={() => requestSort('buyer_gstin', 'buyer_gstin')}>GSTIN{sortLabel('buyer_gstin')}</th>
                      <th className="sortable-th" onClick={() => requestSort('total_after_tax', 'total_after_tax')}>Total Amount{sortLabel('total_after_tax')}</th>
                      <th className="sortable-th" onClick={() => requestSort('status', 'status')}>Status{sortLabel('status')}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleInvoices.map(invoice => (
                      <tr key={invoice.id}>
                        <td>INV{String(invoice.id).padStart(3, '0')}</td>
                        <td>{invoice.invoice_no}</td>
                        <td>{formatDate(invoice.invoice_date)}</td>
                        <td>{invoice.ref_no}</td>
                        <td>{invoice.buyer_gstin}</td>
                        <td>{formatCurrency(invoice.total_after_tax)}</td>
                        <td>{getStatusBadge(invoice.status)}</td>
                        <td>
                          <div className="taxinvoice-action-buttons" style={{ justifyContent: 'center', gap: '0.25rem' }}>
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(invoice)}
                              className="taxinvoice-edit-btn"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditInvoice(invoice)}
                              className="taxinvoice-submit-btn"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(invoice)}
                              className={`taxinvoice-download-btn download-btn-${invoice.id}`}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                background: 'var(--color-success)',
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
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="taxinvoice-remove-btn"
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

              {visibleInvoices.length === 0 && (
                <div className="taxinvoice-empty-state">
                  <div className="taxinvoice-empty-icon">📋</div>
                  <p>No invoice history found</p>
                  <p className="taxinvoice-empty-subtext">
                    Get started by creating your first tax invoice.
                  </p>
                </div>
              )}
            </div>

            <div className="taxinvoice-action-buttons">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="taxinvoice-cancel-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Details Modal */}
      {isViewModalOpen && selectedInvoice && (
        <div className="taxinvoice-modal-overlay">
          <div className="taxinvoice-modal-window taxinvoice-large-modal">
            <div className="taxinvoice-modal-header">
              <h2>Invoice Details</h2>
              <button 
                className="taxinvoice-close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="taxinvoice-details-panel">
              {/* Service Settings Section */}
              <div className="taxinvoice-detail-section">
                <h3 className="taxinvoice-section-title">Service Settings (Automatically Included)</h3>
                
                {/* Bank Details */}
                {selectedInvoice.service_bank_details && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: 'var(--color-accent-text)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Bank Details for Payment
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      backgroundColor: 'var(--color-info-soft)',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid var(--color-info)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Account Holder</div>
                        <div style={{ fontWeight: '500' }}>{selectedInvoice.service_bank_details.account_holder}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Account Number</div>
                        <div style={{ fontWeight: '500' }}>{selectedInvoice.service_bank_details.account_number}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Bank Name</div>
                        <div style={{ fontWeight: '500' }}>{selectedInvoice.service_bank_details.bank_name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>IFSC Code</div>
                        <div style={{ fontWeight: '500' }}>{selectedInvoice.service_bank_details.ifsc_code}</div>
                      </div>
                      {selectedInvoice.service_bank_details.branch && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Branch</div>
                          <div style={{ fontWeight: '500' }}>{selectedInvoice.service_bank_details.branch}</div>
                        </div>
                      )}
                      {selectedInvoice.service_bank_details.account_type && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Account Type</div>
                          <div style={{ fontWeight: '500' }}>{selectedInvoice.service_bank_details.account_type}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* GST Details */}
                {selectedInvoice.service_gst_details && selectedInvoice.service_gst_details.is_gst_applicable && (
                  <div>
                    <h4 style={{ color: 'var(--color-accent-text)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      GST & Tax Information
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      backgroundColor: 'var(--color-info-soft)',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(14,165,233,0.35)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>GSTIN</div>
                        <div style={{ fontWeight: '500' }}>{selectedInvoice.service_gst_details.gstin}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>PAN Number</div>
                        <div style={{ fontWeight: '500' }}>{selectedInvoice.service_gst_details.pan_number}</div>
                      </div>
                      {selectedInvoice.service_gst_details.hsn_code && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>HSN/SAC Code</div>
                          <div style={{ fontWeight: '500' }}>{selectedInvoice.service_gst_details.hsn_code}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Tax Rate</div>
                        <div style={{ fontWeight: '500' }}>{selectedInvoice.service_gst_details.tax_rate}%</div>
                      </div>
                      {selectedInvoice.service_gst_details.sgst_rate && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>SGST Rate</div>
                          <div style={{ fontWeight: '500' }}>{selectedInvoice.service_gst_details.sgst_rate}%</div>
                        </div>
                      )}
                      {selectedInvoice.service_gst_details.cgst_rate && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>CGST Rate</div>
                          <div style={{ fontWeight: '500' }}>{selectedInvoice.service_gst_details.cgst_rate}%</div>
                        </div>
                      )}
                      {selectedInvoice.service_gst_details.igst_rate && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>IGST Rate</div>
                          <div style={{ fontWeight: '500' }}>{selectedInvoice.service_gst_details.igst_rate}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Information */}
              <div className="taxinvoice-detail-section">
                <h3 className="taxinvoice-section-title">Invoice Information</h3>
                <div className="taxinvoice-detail-grid">
                  <div className="taxinvoice-detail-item">
                    <label>Invoice ID</label>
                    <span>INV{String(selectedInvoice.id).padStart(3, '0')}</span>
                  </div>
                  <div className="taxinvoice-detail-item">
                    <label>Invoice No</label>
                    <span>{selectedInvoice.invoice_no}</span>
                  </div>
                  <div className="taxinvoice-detail-item">
                    <label>Invoice Date</label>
                    <span>{formatDate(selectedInvoice.invoice_date)}</span>
                  </div>
                  <div className="taxinvoice-detail-item">
                    <label>Ref. No</label>
                    <span>{selectedInvoice.ref_no}</span>
                  </div>
                  <div className="taxinvoice-detail-item">
                    <label>Status</label>
                    <span>{getStatusBadge(selectedInvoice.status)}</span>
                  </div>
                </div>
              </div>

              {/* Tax Invoice Details */}
              <div className="taxinvoice-detail-section">
                <h3 className="taxinvoice-section-title">Tax Invoice Details</h3>
                <div className="taxinvoice-detail-grid">
                  <div className="taxinvoice-detail-item">
                    <label>GSTIN</label>
                    <span>{selectedInvoice.buyer_gstin}</span>
                  </div>
                  <div className="taxinvoice-detail-item" style={{ gridColumn: 'span 2' }}>
                    <label>Party Address</label>
                    <span>{selectedInvoice.party_address}</span>
                  </div>
                </div>
              </div>

              {/* Goods Details */}
              <div className="taxinvoice-detail-section">
                <h3 className="taxinvoice-section-title">Goods Details</h3>
                <div className="taxinvoice-table-container">
                  <table className="taxinvoice-history-table">
                    <thead>
                      <tr>
                        <th>Sr. No.</th>
                        <th>Description of Goods</th>
                        <th>HSN Code</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.sr_no}</td>
                          <td>{item.description}</td>
                          <td>{item.hsn_code}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.rate)}</td>
                          <td>{formatCurrency(item.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="taxinvoice-detail-grid" style={{ marginTop: '1rem' }}>
                  <div className="taxinvoice-detail-item">
                    <label>Total Before Discount</label>
                    <span>{formatCurrency(selectedInvoice.total_before_discount)}</span>
                  </div>
                  <div className="taxinvoice-detail-item">
                    <label>Rounded Off</label>
                    <span>{formatCurrency(selectedInvoice.round_off)}</span>
                  </div>
                  <div className="taxinvoice-detail-item">
                    <label>Total After Tax</label>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-navy)' }}>
                      {formatCurrency(selectedInvoice.total_after_tax)}
                    </span>
                  </div>
                </div>
              </div>

              {/* GST Details */}
              <div className="taxinvoice-detail-section">
                <h3 className="taxinvoice-section-title">GST Details</h3>
                <div className="taxinvoice-table-container">
                  <table className="taxinvoice-history-table">
                    <thead>
                      <tr>
                        <th>Tax Type</th>
                        <th>Percentage (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.gst_details.map((gst, index) => (
                        <tr key={index}>
                          <td>{gst.tax_type}</td>
                          <td>{gst.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
             
              {/* Invoice History */}
              <div className="taxinvoice-detail-section">
                <h3 className="taxinvoice-section-title">Invoice History</h3>
                <div className="taxinvoice-table-container">
                  <table className="taxinvoice-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Follow Up</th>
                        <th>Action</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.history.map((entry, index) => (
                        <tr key={index}>
                          <td className="taxinvoice-history-date">
                            {formatDate(entry.date)}
                          </td>
                          <td className="taxinvoice-history-followup">
                            {entry.follow_up || 'No follow-up notes'}
                          </td>
                          <td className="taxinvoice-history-action">
                            {entry.action}
                          </td>
                          <td className="taxinvoice-history-user">
                            {entry.user}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Follow-up Section */}
              <div className="taxinvoice-detail-section">
                <h3 className="taxinvoice-section-title">Add Follow-up</h3>
                <div className="taxinvoice-input-group">
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
                  className="taxinvoice-submit-btn"
                  style={{ marginTop: '0.5rem' }}
                >
                  Add Follow-up
                </button>
              </div>

              {/* Status Actions */}
              <div className="taxinvoice-detail-section">
                <h3 className="taxinvoice-section-title">Update Status</h3>
                <div className="taxinvoice-action-buttons">
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('sent')}
                    className="taxinvoice-edit-btn"
                    disabled={selectedInvoice.status === 'sent' || selectedInvoice.status === 'paid'}
                  >
                    Mark as Sent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('paid')}
                    className="taxinvoice-submit-btn"
                    disabled={selectedInvoice.status === 'paid'}
                  >
                    Mark as Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate('cancelled')}
                    className="taxinvoice-remove-btn"
                    disabled={selectedInvoice.status === 'cancelled'}
                  >
                    Cancel Invoice
                  </button>
                </div>
              </div>

              <div className="taxinvoice-action-buttons">
                <button
                  type="button"
                  onClick={() => handleEditInvoice(selectedInvoice)}
                  className="taxinvoice-edit-btn"
                >
                  Edit Invoice
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="taxinvoice-download-btn"
                  style={{ background: '#10b981', color: 'var(--card-bg,#fff)', border: 'none' }}
                >
                  Download with Settings
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteInvoice(selectedInvoice)}
                  className="taxinvoice-remove-btn"
                >
                  Delete Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="taxinvoice-cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {isEditModalOpen && selectedInvoice && (
        <div className="taxinvoice-modal-overlay">
          <div className="taxinvoice-modal-window taxinvoice-large-modal">
            <div className="taxinvoice-modal-header">
              <h2>Edit Invoice</h2>
              <button 
                className="taxinvoice-close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateInvoice} className="taxinvoice-input-form">
              {/* Service Settings Notice */}
              <div style={{
                backgroundColor: 'var(--color-info-soft)',
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
                    backgroundColor: 'var(--color-info)'
                  }}></div>
                  <strong style={{ color: 'var(--color-info-text)', fontSize: '0.9rem' }}>
                    Service Settings Included
                  </strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  This invoice was created with service settings. The original settings will be preserved.
                </div>
              </div>

              {/* Tax Invoice Details */}
              <fieldset className="taxinvoice-field-group">
                <legend>Tax Invoice Details</legend>
                <div className="taxinvoice-form-grid-four">
                  <div className="taxinvoice-input-group">
                    <label>Invoice No:</label>
                    <input
                      type="text"
                      name="invoice_no"
                      value={editFormData.invoice_no}
                      onChange={handleEditInputChange}
                      placeholder="Auto-generated"
                    />
                  </div>
                  <div className="taxinvoice-input-group">
                    <label>Invoice Date:</label>
                    <input
                      type="date"
                      name="invoice_date"
                      value={editFormData.invoice_date}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className="taxinvoice-input-group">
                    <label>Ref. No:</label>
                    <input
                      type="text"
                      name="ref_no"
                      value={editFormData.ref_no}
                      onChange={handleEditInputChange}
                      placeholder="Reference number"
                    />
                  </div>
                  <div className="taxinvoice-input-group">
                    <label>GSTIN:</label>
                    <input
                      type="text"
                      name="buyer_gstin"
                      value={editFormData.buyer_gstin}
                      onChange={handleEditInputChange}
                      placeholder="GSTIN number"
                    />
                  </div>
                </div>
                <div className="taxinvoice-form-grid-two">
                  <div className="taxinvoice-input-group">
                    <label>Party Address:</label>
                    <textarea
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
              <fieldset className="taxinvoice-field-group">
                <legend>Goods Details</legend>
                <table className="taxinvoice-items-grid">
                  <thead>
                    <tr>
                      <th>Sr. No.</th>
                      <th>Description of Goods</th>
                      <th>HSN Code</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editFormData.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.sr_no}</td>
                        <td>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleEditItemChange(index, 'description', e.target.value)}
                            placeholder="Description"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.hsn_code}
                            onChange={(e) => handleEditItemChange(index, 'hsn_code', e.target.value)}
                            placeholder="HSN Code"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleEditItemChange(index, 'quantity', e.target.value)}
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleEditItemChange(index, 'rate', e.target.value)}
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.total_amount}
                            readOnly
                            className="taxinvoice-readonly-field"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="taxinvoice-remove-btn"
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
                  className="taxinvoice-add-row-btn"
                  onClick={addEditItemRow}
                >
                  + Add Item
                </button>


              </fieldset>

              {/* Calculations */}
              <fieldset className="taxinvoice-field-group">
                <legend>Calculations</legend>
                <div className="taxinvoice-form-grid-two">
                  <div className="taxinvoice-input-group">
                    <label>Rounded Off:</label>
                    <input
                      type="number"
                      name="round_off"
                      value={editFormData.round_off}
                      onChange={handleEditInputChange}
                      step="0.01"
                    />
                  </div>
                </div>

                <h4>GST Details</h4>
                <table className="taxinvoice-gst-grid">
                  <thead>
                    <tr>
                      <th>Tax Type</th>
                      <th>Percentage (%)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editFormData.gst_details.map((gst, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            value={gst.tax_type}
                            onChange={(e) => handleEditGSTChange(index, 'tax_type', e.target.value)}
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
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="taxinvoice-remove-btn"
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
                  className="taxinvoice-add-row-btn"
                  onClick={addEditGSTRow}
                >
                  + Add GST Row
                </button>

                <div className="taxinvoice-input-group">
                  <label>Total Amount After Tax:</label>
                  <input
                    type="number"
                    value={calculateTotalAfterTax(
                      editFormData.total_before_discount,
                      editFormData.gst_details,
                      editFormData.round_off
                    )}
                    readOnly
                    className="taxinvoice-readonly-field"
                  />
                </div>
              </fieldset>

              <div className="taxinvoice-action-buttons">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="taxinvoice-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="taxinvoice-submit-btn"
                >
                  Update Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedInvoice && (
        <div className="taxinvoice-modal-overlay">
          <div className="taxinvoice-modal-window">
            <div className="taxinvoice-modal-header">
              <h2 className="taxinvoice-modal-title">Delete Invoice</h2>
              <button 
                className="taxinvoice-close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="taxinvoice-delete-confirm">
              <div className="taxinvoice-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="taxinvoice-delete-title">
                Delete Invoice?
              </h3>
              <p className="taxinvoice-delete-message">
                Are you sure you want to delete the invoice with invoice number "<strong>{selectedInvoice.invoice_no}</strong>"? 
                This action cannot be undone.
              </p>

              <div className="taxinvoice-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="taxinvoice-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="taxinvoice-delete-btn"
                >
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingManagement;
