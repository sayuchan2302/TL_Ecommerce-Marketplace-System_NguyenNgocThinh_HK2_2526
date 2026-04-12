/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { authService } from '../services/authService';
import { notificationApiService } from '../services/notificationApiService';
import { notificationSocketService } from '../services/notificationSocketService';
import type { Notification } from '../services/notificationService';
import NotificationToastStack from '../components/NotificationToast/NotificationToastStack';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [popupNotifications, setPopupNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasBackendToken = useMemo(() => {
    const session = authService.getSession() || authService.getAdminSession();
    return Boolean(session?.token && authService.isBackendJwtToken(session.token));
  }, [isAuthenticated]);

  const loadSnapshot = useCallback(async () => {
    if (!isAuthenticated || !hasBackendToken) {
      setNotifications([]);
      setPopupNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const [listResponse, nextUnread] = await Promise.all([
        notificationApiService.listMine({ page: 0, size: 50 }),
        notificationApiService.getUnreadCount(),
      ]);
      setNotifications(listResponse.content || []);
      setUnreadCount(nextUnread);
    } catch {
      setNotifications([]);
      setPopupNotifications([]);
      setUnreadCount(0);
    }
  }, [hasBackendToken, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasBackendToken) {
      notificationSocketService.disconnect();
      setNotifications([]);
      setPopupNotifications([]);
      setUnreadCount(0);
      return;
    }

    void loadSnapshot();

    notificationSocketService.connect({
      onConnect: () => {
        void loadSnapshot();
      },
      onMessage: (payload) => {
        const incoming = notificationApiService.mapRealtimeNotification(payload.notification);
        if (incoming) {
          setNotifications((prev) => [incoming, ...prev.filter((item) => item.id !== incoming.id)]);
          setPopupNotifications((prev) => [incoming, ...prev.filter((item) => item.id !== incoming.id)].slice(0, 3));
        }
        if (typeof payload.unreadCount === 'number') {
          setUnreadCount(Math.max(payload.unreadCount, 0));
        } else if (incoming && !incoming.read) {
          setUnreadCount((prev) => prev + 1);
        }
      },
    });

    return () => {
      notificationSocketService.disconnect();
    };
  }, [hasBackendToken, isAuthenticated, loadSnapshot]);

  const refreshNotifications = useCallback(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const dismissPopup = useCallback((id: string) => {
    setPopupNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    const existing = notifications.find((item) => item.id === id);
    const wasUnread = existing ? !existing.read : false;

    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }

    void notificationApiService.markAsRead(id)
      .then((updated) => {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updated } : item)),
        );
      })
      .catch(() => {
        void loadSnapshot();
      });
  }, [loadSnapshot, notifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    void notificationApiService.markAllAsRead()
      .then((nextUnread) => {
        setUnreadCount(Math.max(nextUnread, 0));
      })
      .catch(() => {
        void loadSnapshot();
      });
  }, [loadSnapshot]);

  const deleteNotification = useCallback((id: string) => {
    const existing = notifications.find((item) => item.id === id);
    const wasUnread = existing ? !existing.read : false;

    setNotifications((prev) => prev.filter((item) => item.id !== id));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }

    void notificationApiService.delete(id).catch(() => {
      void loadSnapshot();
    });
  }, [loadSnapshot, notifications]);

  const value = useMemo<NotificationContextType>(() => ({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  }), [deleteNotification, markAllAsRead, markAsRead, notifications, refreshNotifications, unreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToastStack
        items={popupNotifications}
        onDismiss={dismissPopup}
        onMarkAsRead={markAsRead}
      />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
