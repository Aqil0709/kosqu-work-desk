import React, { useState } from 'react';
import ClientLayout from './ClientLayout';
import ClientDashboard from './ClientDashboard';
import ClientLeaveApprovals from './ClientLeaveApprovals';

const ClientApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigate = (tab) => setActiveTab(tab);

  return (
    <ClientLayout activeTab={activeTab} onNavigate={navigate}>
      {activeTab === 'dashboard' && <ClientDashboard onNavigate={navigate} />}
      {activeTab === 'approvals' && <ClientLeaveApprovals />}
    </ClientLayout>
  );
};

export default ClientApp;
