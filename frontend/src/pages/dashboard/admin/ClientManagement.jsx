import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaPlus, FaTimes } from 'react-icons/fa';
import './Client.css';
import { clientAPI } from '../../../services/clientAPI';
import * as XLSX from 'xlsx';

const ClientsManagement = () => {
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const statusOptions = ['active', 'prospective', 'inactive'];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isAddIndustryModalOpen, setIsAddIndustryModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  
  const [filters, setFilters] = useState({
    search: '',
    industry: '',
    status: '',
    assigned_manager: '',
    location: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    location: '',
    assigned_manager: '',
    status: 'prospective'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    industry: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    location: '',
    assigned_manager: '',
    status: ''
  });

  const [interactionFormData, setInteractionFormData] = useState({
    type: 'meeting',
    date: '',
    title: '',
    description: '',
    participants: []
  });

  const [newIndustry, setNewIndustry] = useState('');

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch clients when filters change
  useEffect(() => {
    fetchClients();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsResponse, managersResponse, industriesResponse] = await Promise.all([
        clientAPI.getAll(filters),
        clientAPI.getManagers(),
        clientAPI.getIndustries()
      ]);
      
      setClients(clientsResponse.data.clients || []);
      setManagers(managersResponse.data.managers || []);
      setIndustries(industriesResponse.data.industries || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load clients. Please try again.');
      setClients([]);
      setManagers([]);
      setIndustries(['Technology', 'Retail', 'Healthcare', 'Finance', 'Manufacturing', 'Education', 'Other']);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientAPI.getAll(filters);
      setClients(response.data.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setClients([]);
    }
  };

  const handleAddIndustry = async (e) => {
    e.preventDefault();
    
    if (!newIndustry.trim()) {
      alert('Please enter an industry name');
      return;
    }

    try {
      await clientAPI.addIndustry(newIndustry.trim());
      
      // Refresh industries list
      const industriesResponse = await clientAPI.getIndustries();
      setIndustries(industriesResponse.data.industries || []);
      
      setNewIndustry('');
      setIsAddIndustryModalOpen(false);
      alert('Industry added successfully!');
    } catch (err) {
      console.error('Failed to add industry:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add industry. Please try again.';
      alert(errorMessage);
    }
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

  const handleInteractionInputChange = (e) => {
    const { name, value } = e.target;
    setInteractionFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedClients = () => {
    let sortedList = [...clients];
    
    sortedList.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sortedList;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contact_person || !formData.contact_email) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await clientAPI.create(formData);
      await fetchClients();
      
      // Reset form
      setFormData({
        name: '',
        industry: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        location: '',
        assigned_manager: '',
        status: 'prospective'
      });
      
      setIsModalOpen(false);
      alert('Client added successfully!');
    } catch (err) {
      console.error('Failed to create client:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create client. Please try again.';
      alert(errorMessage);
    }
  };

  const handleViewClient = async (client) => {
    try {
      const response = await clientAPI.getById(client.id);
      setSelectedClient(response.data.client);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch client details:', err);
      alert('Failed to load client details. Please try again.');
    }
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setEditFormData({
      name: client.name,
      industry: client.industry,
      contact_person: client.contact_person,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      location: client.location,
      assigned_manager: client.assigned_manager,
      status: client.status
    });
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    
    if (!editFormData.name || !editFormData.contact_person || !editFormData.contact_email) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await clientAPI.update(selectedClient.id, editFormData);
      await fetchClients();

      setIsEditModalOpen(false);
      setSelectedClient(null);
      alert('Client updated successfully!');
    } catch (err) {
      console.error('Failed to update client:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update client. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteClick = (client) => {
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      await clientAPI.delete(selectedClient.id);
      await fetchClients();
      
      setIsDeleteModalOpen(false);
      setIsViewModalOpen(false);
      setSelectedClient(null);
      alert('Client deleted successfully!');
    } catch (err) {
      console.error('Failed to delete client:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete client. Please try again.';
      alert(errorMessage);
    }
  };

  const handleViewInteraction = (interaction) => {
    setSelectedInteraction(interaction);
    setIsInteractionModalOpen(true);
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    
    if (!interactionFormData.title || !interactionFormData.date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await clientAPI.addInteraction(selectedClient.id, interactionFormData);
      
      // Refresh client details
      const response = await clientAPI.getById(selectedClient.id);
      setSelectedClient(response.data.client);

      setInteractionFormData({
        type: 'meeting',
        date: '',
        title: '',
        description: '',
        participants: []
      });

      setIsInteractionModalOpen(false);
      alert('Interaction added successfully!');
    } catch (err) {
      console.error('Failed to add interaction:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add interaction. Please try again.';
      alert(errorMessage);
    }
  };
  const handleExport = () => {
    try {
      // If no data to export
      if (clients.length === 0) {
        alert('No clients to export!');
        return;
      }

      // Prepare data for export
      const exportData = clients.map(client => ({
        'Client ID': `CLT${String(client.id).padStart(3, '0')}`,
        'Client Name': client.name,
        'Industry': client.industry,
        'Contact Person': client.contact_person,
        'Contact Email': client.contact_email,
        'Contact Phone': client.contact_phone,
        'Location': client.location,
        'Assigned Manager': client.assigned_manager,
        'Status': client.status.toUpperCase(),
        'Created Date': client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A',
        'Last Updated': client.updated_at ? new Date(client.updated_at).toLocaleDateString() : 'N/A'
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        { wch: 15 },  // Client ID
        { wch: 25 },  // Client Name
        { wch: 20 },  // Industry
        { wch: 20 },  // Contact Person
        { wch: 25 },  // Contact Email
        { wch: 15 },  // Contact Phone
        { wch: 20 },  // Location
        { wch: 20 },  // Assigned Manager
        { wch: 15 },  // Status
        { wch: 15 },  // Created Date
        { wch: 15 }   // Last Updated
      ];
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

      // Generate file name with current date
      const fileName = `Clients_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      XLSX.writeFile(workbook, fileName);
     
      alert(`Exported ${clients.length} clients successfully!`);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'client-status-active', text: 'ACTIVE' },
      prospective: { class: 'client-status-prospective', text: 'PROSPECTIVE' },
      inactive: { class: 'client-status-inactive', text: 'INACTIVE' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    
    return (
      <span className={`client-status-badge ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const getInteractionIcon = (type) => {
    const icons = {
      meeting: 'calendar_today',
      call: 'call',
      email: 'email'
    };
    return icons[type] || 'note';
  };

  if (loading) {
    return (
      <div className="client-management-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-management-section">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Clients</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-management-section">
      {/* Header */}
      <div className="client-management-header">
        <h2 className="client-management-title">Clients Management</h2>
        <button 
          className="client-add-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="client-btn-icon">+</span>
          Add Client
        </button>
      </div>

      {/* Clients Table */}
      <div className="client-table-container glass-form-client">
        <div className="client-table-header">
          <h3 className="client-table-title">Clients Directory</h3>
          <div className="client-table-actions">
            <div className="client-search-container">
              <input
                type="text"
                placeholder="Search clients..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="client-search-input"
              />
            </div>
            <button 
            className="client-export-btn"
            onClick={handleExport}
            disabled={clients.length === 0}
          >
            Export
          </button>
          </div>
        </div>
        
        <div className="client-table-wrapper">
          <table className="client-management-table">
            <thead>
              <tr>
                <th className="client-table-head sortable" onClick={() => handleSort('name')}>
                  Client Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="client-table-head sortable" onClick={() => handleSort('industry')}>
                  Industry {sortConfig.key === 'industry' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="client-table-head sortable" onClick={() => handleSort('contact_person')}>
                  Contact Person {sortConfig.key === 'contact_person' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="client-table-head">Contact Info</th>
                <th className="client-table-head sortable" onClick={() => handleSort('location')}>
                  Location {sortConfig.key === 'location' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="client-table-head sortable" onClick={() => handleSort('assigned_manager')}>
                  Assigned Manager {sortConfig.key === 'assigned_manager' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="client-table-head sortable" onClick={() => handleSort('status')}>
                  Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedClients().map(client => (
                <tr key={client.id} className="client-table-row">

                  <td className="client-table-cell">
                    <div className="client-name-cell">
                      <div 
                        className="client-name-link"
                        onClick={() => handleViewClient(client)}
                      >
                        {client.name}
                      </div>
                      <div className="client-id-text">
                        ID: CLT{String(client.id).padStart(3, '0')}
                      </div>
                    </div>
                  </td>
                  <td className="client-table-cell">
                    <div className="client-industry">{client.industry}</div>
                  </td>
                  <td className="client-table-cell">
                    <div className="client-contact-person">{client.contact_person}</div>
                  </td>
                  <td className="client-table-cell">
                    <div className="client-contact-info">
                      <div className="client-email">{client.contact_email}</div>
                      <div className="client-phone">{client.contact_phone}</div>
                    </div>
                  </td>
                  <td className="client-table-cell">
                    <div className="client-location">{client.location}</div>
                  </td>
                  <td className="client-table-cell">
                    <div className="client-manager">
                      {client.assigned_manager}
                      {managers.find(m => m.name === client.assigned_manager) && (
                        <div className="client-manager-position">
                          {managers.find(m => m.name === client.assigned_manager)?.position}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="client-table-cell">
                    {getStatusBadge(client.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {clients.length === 0 && (
          <div className="client-no-data">
            <div className="client-no-data-icon">👥</div>
            <p className="client-no-data-text">No clients found</p>
            <p className="client-no-data-subtext">
              {filters.search ? 
                'Try changing your search to see more results.' :
                'Get started by adding your first client.'}
            </p>
            {!filters.search && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="client-add-first-btn"
              >
                Add First Client
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="client-modal-overlay">
          <div className="client-modal-content">
            <div className="client-modal-header">
              <h2 className="client-modal-title">Add New Client</h2>
              <button 
                className="client-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="client-form">
              <div className="client-form-section">
                <h3 className="client-section-title">Client Information</h3>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Client Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter client company name"
                      className="client-form-input"
                      required
                    />
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Industry</label>
                    <div className="industry-select-container">
                      <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleInputChange}
                        className="client-form-select"
                      >
                        <option value="">Select Industry</option>
                        {industries.map(industry => (
                          <option key={industry} value={industry}>{industry}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="add-industry-btn"
                        onClick={() => setIsAddIndustryModalOpen(true)}
                        title="Add New Industry"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Contact Person *</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      placeholder="Enter contact person name"
                      className="client-form-input"
                      required
                    />
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Contact Email *</label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className="client-form-input"
                      required
                    />
                  </div>
                </div>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Contact Phone</label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className="client-form-input"
                    />
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Enter location"
                      className="client-form-input"
                    />
                  </div>
                </div>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Assigned Manager</label>
                    <select
                      name="assigned_manager"
                      value={formData.assigned_manager}
                      onChange={handleInputChange}
                      className="client-form-select"
                    >
                      <option value="">Select Manager</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.name}>
                          {manager.name} - {manager.position}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="client-form-select"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="client-form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="client-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="client-submit-btn"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Industry Modal */}
      {isAddIndustryModalOpen && (
        <div className="client-modal-overlay">
          <div className="client-modal-content client-small-modal">
            <div className="client-modal-header">
              <h2 className="client-modal-title">Add New Industry</h2>
              <button 
                className="client-close-btn"
                onClick={() => {
                  setIsAddIndustryModalOpen(false);
                  setNewIndustry('');
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddIndustry} className="client-form">
              <div className="client-form-section">
                <div className="client-form-group">
                  <label className="client-form-label">Industry Name *</label>
                  <input
                    type="text"
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    placeholder="Enter new industry name"
                    className="client-form-input"
                    required
                  />
                </div>
              </div>

              <div className="client-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddIndustryModalOpen(false);
                    setNewIndustry('');
                  }}
                  className="client-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="client-submit-btn"
                >
                  Add Industry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Client Details Modal */}
      {isViewModalOpen && selectedClient && (
        <div className="client-modal-overlay">
          <div className="client-modal-content client-large-modal">
            <div className="client-modal-header">
              <h2 className="client-modal-title">Client Details - {selectedClient.name}</h2>
              <button 
                className="client-close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="client-details-content">
              {/* Client Information - Single Line Layout */}
              <div className="client-form-section">
                <h3 className="client-section-title">Company Information</h3>
                <div className="client-details-single-line">
                  <div className="client-detail-item-inline">
                    <label className="client-detail-label">Client ID</label>
                    <span className="client-detail-value">CLT{String(selectedClient.id).padStart(3, '0')}</span>
                  </div>
                  <div className="client-detail-item-inline">
                    <label className="client-detail-label">Company Name</label>
                    <span className="client-detail-value">{selectedClient.name}</span>
                  </div>
                  <div className="client-detail-item-inline">
                    <label className="client-detail-label">Industry</label>
                    <span className="client-detail-value">{selectedClient.industry}</span>
                  </div>
                  <div className="client-detail-item-inline">
                    <label className="client-detail-label">Location</label>
                    <span className="client-detail-value">{selectedClient.location}</span>
                  </div>
                  <div className="client-detail-item-inline">
                    <label className="client-detail-label">Assigned Manager</label>
                    <span className="client-detail-value">{selectedClient.assigned_manager}</span>
                  </div>
                  <div className="client-detail-item-inline">
                    <label className="client-detail-label">Status</label>
                    <span className="client-detail-value">{getStatusBadge(selectedClient.status)}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="client-form-section">
                <h3 className="client-section-title">Contact Information</h3>
                <div className="client-details-grid">
                  <div className="client-detail-item">
                    <label className="client-detail-label">Contact Person</label>
                    <span className="client-detail-value">{selectedClient.contact_person}</span>
                  </div>
                  <div className="client-detail-item">
                    <label className="client-detail-label">Email</label>
                    <span className="client-detail-value">{selectedClient.contact_email}</span>
                  </div>
                  <div className="client-detail-item">
                    <label className="client-detail-label">Phone</label>
                    <span className="client-detail-value">{selectedClient.contact_phone}</span>
                  </div>
                </div>
              </div>

              {/* Company Details */}
              {selectedClient.company_info && (
                <div className="client-form-section">
                  <h3 className="client-section-title">Company Details</h3>
                  <div className="client-details-grid">
                    <div className="client-detail-item">
                      <label className="client-detail-label">Founded</label>
                      <span className="client-detail-value">{selectedClient.company_info.founded || 'N/A'}</span>
                    </div>
                    <div className="client-detail-item">
                      <label className="client-detail-label">Employees</label>
                      <span className="client-detail-value">{selectedClient.company_info.employees || 'N/A'}</span>
                    </div>
                    <div className="client-detail-item">
                      <label className="client-detail-label">Revenue</label>
                      <span className="client-detail-value">{selectedClient.company_info.revenue || 'N/A'}</span>
                    </div>
                    <div className="client-detail-item">
                      <label className="client-detail-label">Website</label>
                      <span className="client-detail-value">{selectedClient.company_info.website || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedClient.notes && (
                <div className="client-form-section">
                  <h3 className="client-section-title">Notes</h3>
                  <div className="client-notes">
                    <p>{selectedClient.notes}</p>
                  </div>
                </div>
              )}

              {/* Interaction History */}
              <div className="client-form-section">
                <div className="client-section-header">
                  <h3 className="client-section-title">
                    Interaction History ({selectedClient.interactions ? selectedClient.interactions.length : 0})
                  </h3>
                  <button 
                    className="client-add-interaction-btn"
                    onClick={() => setIsInteractionModalOpen(true)}
                  >
                    + Add Interaction
                  </button>
                </div>
                <div className="client-interaction-grid">
                  {selectedClient.interactions && selectedClient.interactions.map(interaction => (
                    <div 
                      key={interaction.id} 
                      className="client-interaction-card"
                      onClick={() => handleViewInteraction(interaction)}
                    >
                      <div className="client-interaction-card-header">
                        <div className="client-interaction-icon">
                          <span className="material-icons">{getInteractionIcon(interaction.type)}</span>
                        </div>
                        <div className="client-interaction-card-title">
                          <div className="client-interaction-title">{interaction.title}</div>
                          <div className="client-interaction-date">{interaction.date}</div>
                        </div>
                      </div>
                      <div className="client-interaction-description">{interaction.description}</div>
                    </div>
                  ))}
                  {(!selectedClient.interactions || selectedClient.interactions.length === 0) && (
                    <div className="client-no-interactions">
                      <p>No interactions recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Associations */}
              <div className="client-form-section">
                <h3 className="client-section-title">
                  Project Associations ({selectedClient.projects ? selectedClient.projects.length : 0})
                </h3>
                <div className="client-projects-list">
                  {selectedClient.projects && selectedClient.projects.map(project => (
                    <div key={project.id} className="client-project-item">
                      <div className="client-project-name">{project.name}</div>
                      <div className="client-project-status">{project.status}</div>
                      <div className="client-project-dates">
                        {project.start_date} to {project.end_date}
                      </div>
                    </div>
                  ))}
                  {(!selectedClient.projects || selectedClient.projects.length === 0) && (
                    <div className="client-no-projects">
                      <p>No projects associated with this client.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="client-form-section">
                <h3 className="client-section-title">
                  Documents ({selectedClient.documents ? selectedClient.documents.length : 0})
                </h3>
                <div className="client-documents-list">
                  {selectedClient.documents && selectedClient.documents.map(document => (
                    <div key={document.id} className="client-document-item">
                      <div className="client-document-icon">
                        <span className="material-icons">description</span>
                      </div>
                      <div className="client-document-content">
                        <div className="client-document-name">{document.name}</div>
                        <div className="client-document-details">
                          {document.type} • {document.size} • {document.upload_date}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!selectedClient.documents || selectedClient.documents.length === 0) && (
                    <div className="client-no-documents">
                      <p>No documents uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Communication Preferences */}
              {selectedClient.communication_preferences && (
                <div className="client-form-section">
                  <h3 className="client-section-title">Communication Preferences</h3>
                  <div className="client-details-grid">
                    <div className="client-detail-item">
                      <label className="client-detail-label">Preferred Contact</label>
                      <span className="client-detail-value">
                        {selectedClient.communication_preferences.preferred_contact}
                      </span>
                    </div>
                    <div className="client-detail-item">
                      <label className="client-detail-label">Follow-up Frequency</label>
                      <span className="client-detail-value">
                        {selectedClient.communication_preferences.follow_up_frequency}
                      </span>
                    </div>
                    <div className="client-detail-item">
                      <label className="client-detail-label">Next Follow-up</label>
                      <span className="client-detail-value">
                        {selectedClient.communication_preferences.next_follow_up || 'Not scheduled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="client-form-actions">
                <button
                  type="button"
                  onClick={() => handleEditClient(selectedClient)}
                  className="client-edit-btn"
                >
                  Edit Client
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(selectedClient)}
                  className="client-delete-btn"
                >
                  Delete Client
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="client-cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {isEditModalOpen && selectedClient && (
        <div className="client-modal-overlay">
          <div className="client-modal-content">
            <div className="client-modal-header">
              <h2 className="client-modal-title">Edit Client</h2>
              <button 
                className="client-close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="client-form">
              <div className="client-form-section">
                <h3 className="client-section-title">Client Information</h3>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Client Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      placeholder="Enter client company name"
                      className="client-form-input"
                      required
                    />
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Industry</label>
                    <div className="industry-select-container">
                      <select
                        name="industry"
                        value={editFormData.industry}
                        onChange={handleEditInputChange}
                        className="client-form-select"
                      >
                        <option value="">Select Industry</option>
                        {industries.map(industry => (
                          <option key={industry} value={industry}>{industry}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="add-industry-btn"
                        onClick={() => setIsAddIndustryModalOpen(true)}
                        title="Add New Industry"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Contact Person *</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={editFormData.contact_person}
                      onChange={handleEditInputChange}
                      placeholder="Enter contact person name"
                      className="client-form-input"
                      required
                    />
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Contact Email *</label>
                    <input
                      type="email"
                      name="contact_email"
                      value={editFormData.contact_email}
                      onChange={handleEditInputChange}
                      placeholder="Enter email address"
                      className="client-form-input"
                      required
                    />
                  </div>
                </div>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Contact Phone</label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={editFormData.contact_phone}
                      onChange={handleEditInputChange}
                      placeholder="Enter phone number"
                      className="client-form-input"
                    />
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={editFormData.location}
                      onChange={handleEditInputChange}
                      placeholder="Enter location"
                      className="client-form-input"
                    />
                  </div>
                </div>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Assigned Manager</label>
                    <select
                      name="assigned_manager"
                      value={editFormData.assigned_manager}
                      onChange={handleEditInputChange}
                      className="client-form-select"
                    >
                      <option value="">Select Manager</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.name}>
                          {manager.name} - {manager.position}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Status</label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="client-form-select"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="client-form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="client-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="client-submit-btn"
                >
                  Update Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Interaction Modal */}
      {isInteractionModalOpen && selectedClient && (
        <div className="client-modal-overlay">
          <div className="client-modal-content">
            <div className="client-modal-header">
              <h2 className="client-modal-title">Add Interaction</h2>
              <button 
                className="client-close-btn"
                onClick={() => setIsInteractionModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddInteraction} className="client-form">
              <div className="client-form-section">
                <h3 className="client-section-title">Interaction Details</h3>
                <div className="client-form-row">
                  <div className="client-form-group">
                    <label className="client-form-label">Type *</label>
                    <select
                      name="type"
                      value={interactionFormData.type}
                      onChange={handleInteractionInputChange}
                      className="client-form-select"
                      required
                    >
                      <option value="meeting">Meeting</option>
                      <option value="call">Phone Call</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div className="client-form-group">
                    <label className="client-form-label">Date *</label>
                    <input
                      type="date"
                      name="date"
                      value={interactionFormData.date}
                      onChange={handleInteractionInputChange}
                      className="client-form-input"
                      required
                    />
                  </div>
                </div>
                <div className="client-form-group">
                  <label className="client-form-label">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={interactionFormData.title}
                    onChange={handleInteractionInputChange}
                    placeholder="Enter interaction title"
                    className="client-form-input"
                    required
                  />
                </div>
                <div className="client-form-group">
                  <label className="client-form-label">Description</label>
                  <textarea
                    name="description"
                    value={interactionFormData.description}
                    onChange={handleInteractionInputChange}
                    placeholder="Enter interaction details"
                    className="client-form-textarea"
                    rows="4"
                  />
                </div>
              </div>

              <div className="client-form-actions">
                <button
                  type="button"
                  onClick={() => setIsInteractionModalOpen(false)}
                  className="client-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="client-submit-btn"
                >
                  Add Interaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Interaction Modal */}
      {isInteractionModalOpen && selectedInteraction && (
        <div className="client-modal-overlay">
          <div className="client-modal-content">
            <div className="client-modal-header">
              <h2 className="client-modal-title">Interaction Details</h2>
              <button 
                className="client-close-btn"
                onClick={() => {
                  setIsInteractionModalOpen(false);
                  setSelectedInteraction(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="client-interaction-details">
              <div className="client-interaction-header">
                <div className="client-interaction-icon-large">
                  <span className="material-icons">{getInteractionIcon(selectedInteraction.type)}</span>
                </div>
                <div className="client-interaction-header-content">
                  <h3 className="client-interaction-title-large">{selectedInteraction.title}</h3>
                  <div className="client-interaction-date-large">{selectedInteraction.date}</div>
                </div>
              </div>
              
              <div className="client-form-section">
                <h4 className="client-section-title">Description</h4>
                <p className="client-interaction-description-large">{selectedInteraction.description}</p>
              </div>

              {selectedInteraction.participants && selectedInteraction.participants.length > 0 && (
                <div className="client-form-section">
                  <h4 className="client-section-title">Participants</h4>
                  <div className="client-participants-list">
                    {selectedInteraction.participants.map((participant, index) => (
                      <div key={index} className="client-participant-item">
                        {participant}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="client-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsInteractionModalOpen(false);
                    setSelectedInteraction(null);
                  }}
                  className="client-cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedClient && (
        <div className="client-modal-overlay">
          <div className="client-modal-content">
            <div className="client-modal-header">
              <h2 className="client-modal-title">Delete Client</h2>
              <button 
                className="client-close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="client-delete-confirmation">
              <div className="client-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="client-delete-title">
                Delete {selectedClient.name}?
              </h3>
              <p className="client-delete-message">
                Are you sure you want to delete the <strong>{selectedClient.name}</strong> client record? 
                This action cannot be undone and all associated data will be permanently removed.
              </p>

              <div className="client-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="client-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClient}
                  className="client-delete-btn"
                >
                  Delete Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsManagement;