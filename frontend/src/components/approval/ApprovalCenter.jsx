import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ApprovalInbox       from './ApprovalInbox';
import MyApprovalRequests  from './MyApprovalRequests';
import WorkflowBuilder     from './WorkflowBuilder';
import ApprovalAnalytics   from './ApprovalAnalytics';
import DelegationManager   from './DelegationManager';
import './ApprovalCenter.css';

const TABS = [
  { id: 'inbox',     label: '📋 Inbox',          roles: ['admin','hr','team_lead','employee','intern','consultant'] },
  { id: 'my',        label: '📤 My Requests',     roles: ['admin','hr','team_lead','employee','intern','consultant'] },
  { id: 'delegate',  label: '🔀 Delegation',       roles: ['admin','hr','team_lead','employee','intern','consultant'] },
  { id: 'analytics', label: '📊 Analytics',        roles: ['admin','hr'] },
  { id: 'builder',   label: '⚙️ Workflow Builder',  roles: ['admin'] },
];

export default function ApprovalCenter() {
  const { user } = useAuth();
  const [tab, setTab] = useState('inbox');

  const position = user?.position || 'employee';
  const isTeamLead = user?.is_team_lead;

  const visibleTabs = TABS.filter(t =>
    t.roles.includes(position) ||
    (isTeamLead && ['inbox','my','delegate'].includes(t.id))
  );

  const renderTab = () => {
    switch (tab) {
      case 'inbox':     return <ApprovalInbox />;
      case 'my':        return <MyApprovalRequests />;
      case 'delegate':  return <DelegationManager />;
      case 'analytics': return <ApprovalAnalytics />;
      case 'builder':   return <WorkflowBuilder />;
      default:          return <ApprovalInbox />;
    }
  };

  return (
    <div className="approval-center">
      <nav className="approval-center__tabs">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            className={`approval-center__tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="approval-center__body">
        {renderTab()}
      </div>
    </div>
  );
}
