// src/contexts/AuthContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [forcePasswordReset, setForcePasswordReset] = useState(false);

  // admin and hr both land on /admin (HR accesses HR modules, not system settings)
  const isAdmin = user?.position === 'admin' || user?.position === 'hr';
  const isClient = user?.position === 'client';

  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const syncSession = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData || isTokenExpired(token)) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      try {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData && !isTokenExpired(token)) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setForcePasswordReset(localStorage.getItem('forcePasswordReset') === '1');

        try {
          const response = await authAPI.getProfile();
          const profileUser = response.data?.user || response.data?.data;
          if (profileUser) {
            setUser(profileUser);
            localStorage.setItem('user', JSON.stringify(profileUser));
          }
        } catch (err) {
          console.error('Profile verification failed:', err);
          if (err.response?.status === 401) {
            logout({ redirect: false });
          }
        }
      } else if (token && isTokenExpired(token)) {
        logout({ redirect: false });
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout({ redirect: false });
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user: userData, forcePasswordReset } = response.data;

      if (!token || !userData) {
        return { success: false, message: 'Invalid server response' };
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('forcePasswordReset', forcePasswordReset ? '1' : '0');

      setUser(userData);
      setIsAuthenticated(true);
      setForcePasswordReset(!!forcePasswordReset);
      setLoading(false);

      return { success: true, user: userData, forcePasswordReset: !!forcePasswordReset };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const logout = ({ redirect = true } = {}) => {
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
