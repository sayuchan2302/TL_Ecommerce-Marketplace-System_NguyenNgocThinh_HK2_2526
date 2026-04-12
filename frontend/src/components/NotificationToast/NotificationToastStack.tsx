import { useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Info, Package, Star, Tag, X } from 'lucide-react';
import type { Notification, NotificationType } from '../../services/notificationService';
import { notificationService } from '../../services/notificationService';
import './NotificationToastStack.css';

interface NotificationToastStackProps {
  items: Notification[];
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}

interface NotificationToastItemProps {
  item: Notification;
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}

const AUTO_DISMISS_MS = 5000;

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order':
      return <Package size={18} className="notification-toast-icon order" />;
    case 'promotion':
      return <Tag size={18} className="notification-toast-icon promotion" />;
    case 'review':
      return <Star size={18} className="notification-toast-icon review" />;
    case 'system':
    default:
      return <Info size={18} className="notification-toast-icon system" />;
  }
};

const NotificationToastItem = ({ item, onDismiss, onMarkAsRead }: NotificationToastItemProps) => {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss(item.id);
    }, AUTO_DISMISS_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [item.id, onDismiss]);

  const handleOpenNotification = () => {
    if (!item.read) {
      onMarkAsRead(item.id);
    }
    onDismiss(item.id);
    if (item.link) {
      window.location.assign(item.link);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenNotification();
    }
  };

  return (
    <article className="notification-toast-item" role="status" aria-live="polite">
      <div
        className="notification-toast-body"
        role="button"
        tabIndex={0}
        onClick={handleOpenNotification}
        onKeyDown={handleKeyDown}
      >
        <div className="notification-toast-icon-wrap">
          {getNotificationIcon(item.type)}
        </div>
        <div className="notification-toast-content">
          <p className="notification-toast-title">{item.title}</p>
          <p className="notification-toast-message">{item.message}</p>
          <span className="notification-toast-time">{notificationService.formatTimeAgo(item.createdAt)}</span>
        </div>
      </div>

      <button
        type="button"
        className="notification-toast-close"
        onClick={() => onDismiss(item.id)}
        aria-label="Đóng thông báo"
      >
        <X size={14} />
      </button>

      <div className="notification-toast-progress" />
    </article>
  );
};

const NotificationToastStack = ({ items, onDismiss, onMarkAsRead }: NotificationToastStackProps) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className="notification-toast-stack">
      {items.map((item) => (
        <NotificationToastItem
          key={item.id}
          item={item}
          onDismiss={onDismiss}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  );
};

export default NotificationToastStack;
