import React from 'react';
import { useModuleAccess } from '../../contexts/ModuleAccessContext';
import './ReadOnlyBanner.css';

const ReadOnlyBanner = () => {
  const { isReadOnly, activeModule } = useModuleAccess();

  if (!isReadOnly || !activeModule) return null;

  return (
    <div className="read-only-banner" role="status">
      <i className="fas fa-eye" aria-hidden="true" />
      <span>
        You have <strong>read-only</strong> access in this section. Create, edit, and delete actions are disabled.
      </span>
    </div>
  );
};

export default ReadOnlyBanner;
