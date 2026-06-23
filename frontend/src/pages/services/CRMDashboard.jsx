import React, { useState } from 'react';
import ClientTable from '../../components/clients/ClientTable';
import ServiceTable from '../../components/services/ServiceTable';
import './CRMDashboard.css';

const CRMDashboard = ({ initialTab = 'clients' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="crm-dashboard-container">
      <div className="crm-header">
        <h1 className="crm-title">Business Operations Hub</h1>
        <p className="crm-subtitle">Manage your clients and service operations in one place</p>
      </div>

      <div className="crm-tabs-wrapper">
        <div className="crm-tabs">
          <button
            className={`crm-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            <span className="tab-icon">👥</span>
            Client Management
          </button>

          <button
            className={`crm-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <span className="tab-icon">🛠️</span>
            Service Management
          </button>
        </div>
      </div>

      <div className="crm-content-area">
        {activeTab === 'clients' ? <ClientTable /> : <ServiceTable />}
      </div>
    </div>
  );
};

export default CRMDashboard;
