export type NotificationType = 'order' | 'promotion' | 'review' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  image?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const parseDate = (dateString: string) => {
  const direct = new Date(dateString);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  // Backend can return `yyyy-MM-dd HH:mm:ss`; normalize to ISO-like string.
  const normalized = dateString.includes(' ') ? dateString.replace(' ', 'T') : dateString;
  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

export const notificationService = {
  formatTimeAgo(dateString: string): string {
    const date = parseDate(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  },
};
