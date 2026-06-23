// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PrivateRoute from './components/common/PrivateRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import { CustomDialogMount } from './components/ui/CustomDialog';

const Login = React.lazy(() => import('./pages/auth/Login'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));
const ForceResetPassword = React.lazy(() => import('./pages/auth/ForceResetPassword'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const EmployeeApp = React.lazy(() => import('./pages/employees/EmployeeApp'));
const ClientApp = React.lazy(() => import('./pages/client/ClientApp'));

const AppContent = () => {
  const { user, loading, isAdmin, isClient } = useAuth();

  const getDashboardPath = (userData) => {
    if (!userData) return '/login';
    // admin and hr both use the admin panel
    if (isAdmin || userData?.position === 'admin' || userData?.position === 'hr') return '/admin';
    if (isClient || userData?.position === 'client') return '/client';
    return '/dashboard';
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Loading application..." />
      </div>
    );
  }

  return (
    <React.Suspense fallback={<LoadingSpinner text="Loading page..." />}>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to={getDashboardPath(user)} replace /> : <Login />
          }
        />
        <Route
          path="/forgot-password"
          element={
            user ? <Navigate to={getDashboardPath(user)} replace /> : <Login />
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            user ? <Navigate to={getDashboardPath(user)} replace /> : <ResetPassword />
          }
        />
        <Route
          path="/force-reset-password"
          element={
            !user ? <Navigate to="/login" replace /> : <ForceResetPassword />
          }
        />

        <Route
          path="/admin/*"
          element={
            <PrivateRoute adminOnly>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute employeeOnly>
              <EmployeeApp />
            </PrivateRoute>
          }
        />

        <Route
          path="/client/*"
          element={
            <PrivateRoute clientOnly>
              <ClientApp />
            </PrivateRoute>
          }
        />

        <Route
          path="/"
          element={
            user ? (
              <Navigate to={getDashboardPath(user)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={
            user ? <Navigate to={getDashboardPath(user)} replace /> : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </React.Suspense>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <div className="App">
              <AppContent />
              <CustomDialogMount />
            </div>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
