// src/components/common/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = ({
  children,
  requiredRole,
  adminOnly = false,
  employeeOnly = false,
  clientOnly = false,
}) => {
  const { isAuthenticated, user, loading, isAdmin, isClient, forcePasswordReset } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (forcePasswordReset) {
    return <Navigate to="/force-reset-password" replace />;
  }

  if (adminOnly && !isAdmin) {
    return isClient ? <Navigate to="/client" replace /> : <Navigate to="/dashboard" replace />;
  }

  if (employeeOnly && (isAdmin || isClient)) {
    return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/client" replace />;
  }

  if (clientOnly && !isClient && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole && user?.position !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
