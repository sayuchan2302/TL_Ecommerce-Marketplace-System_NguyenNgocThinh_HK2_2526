/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { notificationService, type Notification } from '../services/notificationService';

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
  const [notifications, setNotifications] = useState<Notification[]>(() => notificationService.getAll());

  const refreshNotifications = useCallback(() => {
    setNotifications(notificationService.getAll());
  }, []);

  const unreadCount = useMemo(
    () => notifications.reduce((count, notification) => count + (notification.read ? 0 : 1), 0),
    [notifications],
  );

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
    refreshNotifications();
  }, [refreshNotifications]);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
    refreshNotifications();
  }, [refreshNotifications]);

  const deleteNotification = useCallback((id: string) => {
    notificationService.delete(id);
    refreshNotifications();
  }, [refreshNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      refreshNotifications,
    }}>
      {children}
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
