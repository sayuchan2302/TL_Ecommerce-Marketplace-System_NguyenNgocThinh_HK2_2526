import { Bell, Info, Package, Star, Tag, Trash } from 'lucide-react';
import { notificationService } from '../../../../services/notificationService';
import type { ProfileTabContentProps } from '../ProfileTabContent.types';

const NotificationsTab = ({
  notifications,
  displayedNotifications,
  unreadCount,
  showAllNotifications,
  hasMoreNotifications,
  onShowAllNotifications,
  onMarkAllNotificationsRead,
  onNotificationClick,
  onDeleteNotification,
}: Pick<ProfileTabContentProps,
  | 'notifications'
  | 'displayedNotifications'
  | 'unreadCount'
  | 'showAllNotifications'
  | 'hasMoreNotifications'
  | 'onShowAllNotifications'
  | 'onMarkAllNotificationsRead'
  | 'onNotificationClick'
  | 'onDeleteNotification'
>) => (
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
        {displayedNotifications.map((notification) => (
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

        {!showAllNotifications && hasMoreNotifications && (
          <div className="notifications-show-all-wrap">
            <button type="button" className="notifications-show-all-btn" onClick={() => onShowAllNotifications(true)}>
              Xem tất cả
            </button>
          </div>
        )}
      </div>
    )}
  </div>
);

export default NotificationsTab;
