import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${apiBase}/api/notifications?limit=20&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return; // non-2xx: skip silently, no crash
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch (_) {
      // Network error — bell stays intact, no console spam
    }
  }, [apiBase]);

  const markAllRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${apiBase}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (_) {}
  }, [apiBase]);

  const markOneRead = useCallback(async (notifId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${apiBase}/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  }, [apiBase]);

  // Socket.IO connection – only when user is logged in
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(apiBase, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    const onNotification = (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 30));
      setUnreadCount(prev => prev + 1);
    };

    // fetchNotifications on reconnect (not initial connect — polling covers initial load)
    const onReconnect = () => fetchNotifications();

    socket.on('notification', onNotification);
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('notification', onNotification);
      socket.io.off('reconnect', onReconnect);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, apiBase]); // fetchNotifications intentionally excluded — reconnect handler captures latest via closure

  // Polling fallback (30s) in case socket drops
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAllRead, markOneRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

