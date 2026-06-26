// src/contexts/AuthContext.jsx
import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [forcePasswordReset, setForcePasswordReset] = useState(false);
  const refreshTimerRef = useRef(null);

  // admin and hr both land on /admin (HR accesses HR modules, not system settings)
  const isAdmin  = user?.position === 'admin' || user?.position === 'hr';
  const isClient = user?.position === 'client';

  /* ── silent token refresh every 13 min (access token lives 15 min) ─── */
  const scheduleRefresh = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await authAPI.refresh();
        if (res.data?.token) {
          // token returned for backward compat with API clients; cookie already updated
        }
        scheduleRefresh();
      } catch {
        // refresh failed → access token expired, redirect to login
        logout({ redirect: true });
      }
    }, 13 * 60 * 1000);
  };

  useEffect(() => {
    checkAuthStatus();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Call /profile — it reads the HttpOnly access_token cookie automatically.
      // If the cookie is missing / expired the server returns 401.
      const response = await authAPI.getProfile();
      const profileUser = response.data?.user || response.data?.data;
      if (profileUser) {
        setUser(profileUser);
        setIsAuthenticated(true);
        // Keep localStorage user for non-security data (position, name, modules)
        localStorage.setItem('user', JSON.stringify(profileUser));
        scheduleRefresh();
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      // 401 → try to silently refresh
      if (err.response?.status === 401) {
        try {
          await authAPI.refresh();
          // retry profile once
          const response = await authAPI.getProfile();
          const profileUser = response.data?.user || response.data?.data;
          if (profileUser) {
            setUser(profileUser);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(profileUser));
            scheduleRefresh();
            return;
          }
        } catch {
          // both failed → not logged in
        }
      }
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user: userData, forcePasswordReset } = response.data;

      if (!userData) {
        return { success: false, message: 'Invalid server response' };
      }

      // Cookies are set server-side (HttpOnly). Keep only non-sensitive user data in localStorage.
      localStorage.setItem('user', JSON.stringify(userData));
      // token still returned for backward compat; store for API header fallback
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('forcePasswordReset', forcePasswordReset ? '1' : '0');

      setUser(userData);
      setIsAuthenticated(true);
      setForcePasswordReset(!!forcePasswordReset);
      setLoading(false);
      scheduleRefresh();

      return { success: true, user: userData, forcePasswordReset: !!forcePasswordReset };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const logout = async ({ redirect = true } = {}) => {
    try {
      // Tell server to revoke refresh token and clear cookies
      await authAPI.logout();
    } catch { /* ignore — clear client state regardless */ }

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('forcePasswordReset');
    setUser(null);
    setIsAuthenticated(false);
    setForcePasswordReset(false);
    setLoading(false);

    if (redirect && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  const clearForceReset = () => {
    setForcePasswordReset(false);
    localStorage.removeItem('forcePasswordReset');
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isClient,
    forcePasswordReset,
    clearForceReset,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
