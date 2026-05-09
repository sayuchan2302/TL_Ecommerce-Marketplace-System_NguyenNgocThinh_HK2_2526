import { Bell, Info, Package, Star, Tag, Trash } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { notificationService } from '../../../../services/notificationService';
import ProfilePagination from '../ProfilePagination';
import type { ProfileTabContentProps } from '../ProfileTabContent.types';

const NotificationsTab = ({
  notifications,
  unreadCount,
  notificationPage,
  notificationsPerPage,
  onNotificationPageChange,
  onMarkAllNotificationsRead,
  onNotificationClick,
  onDeleteNotification,
}: Pick<ProfileTabContentProps,
  | 'notifications'
  | 'unreadCount'
  | 'notificationPage'
  | 'notificationsPerPage'
  | 'onNotificationPageChange'
  | 'onMarkAllNotificationsRead'
  | 'onNotificationClick'
  | 'onDeleteNotification'
>) => {
  const totalNotificationPages = Math.max(1, Math.ceil(notifications.length / notificationsPerPage));
  const safeNotificationPage = Math.min(notificationPage, totalNotificationPages);
  const pagedNotifications = useMemo(() => {
    const start = (safeNotificationPage - 1) * notificationsPerPage;
    return notifications.slice(start, start + notificationsPerPage);
  }, [notifications, notificationsPerPage, safeNotificationPage]);

  useEffect(() => {
    if (notificationPage > totalNotificationPages) {
      onNotificationPageChange(totalNotificationPages);
    }
  }, [notificationPage, onNotificationPageChange, totalNotificationPages]);

  return (
    <div className="tab-pane">
      <div className="profile-content-header notify-header">
        <h2 className="profile-content-title">Thông báo</h2>
        {notifications.length > 0 && (
          <button className="mark-all-read-text-btn" onClick={onMarkAllNotificationsRead} disabled={unreadCount === 0}>
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <Bell size={64} strokeWidth={1} />
          <p>Không có thông báo nào</p>
        </div>
      ) : (
        <div className="notifications-list">
          {pagedNotifications.map((notification) => (
            <div key={notification.id} className={`notification-card ${!notification.read ? 'unread' : ''}`} onClick={() => onNotificationClick(notification)}>
              <div className={`notification-icon notification-icon-${notification.type}`}>
                {notification.type === 'order' && <Package size={20} />}
                {notification.type === 'promotion' && <Tag size={20} />}
                {notification.type === 'review' && <Star size={20} />}
                {notification.type === 'system' && <Info size={20} />}
              </div>
              <div className="notification-content">
                <p className="notification-title">
                  {notification.title}
                  <span className="notification-time">{notificationService.formatTimeAgo(notification.createdAt)}</span>
                </p>
                <p className="notification-message">{notification.message}</p>
              </div>
              <button
                className="notification-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteNotification(notification.id);
                }}
                aria-label="Xóa thông báo"
              >
                <Trash size={16} aria-hidden="true" />
              </button>
              {!notification.read && <span className="notification-dot" />}
            </div>
          ))}

          <ProfilePagination
            page={safeNotificationPage}
            totalItems={notifications.length}
            totalPages={totalNotificationPages}
            itemsPerPage={notificationsPerPage}
            itemLabel="thông báo"
            onPageChange={onNotificationPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationsTab;
