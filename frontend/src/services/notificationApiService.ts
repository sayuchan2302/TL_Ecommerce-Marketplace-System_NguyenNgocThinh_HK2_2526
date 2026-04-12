import { apiRequest } from './apiClient';
import type { Notification, NotificationType } from './notificationService';

interface BackendNotification {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  image?: string;
  link?: string;
  read?: boolean;
  createdAt?: string;
}

interface BackendPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

interface UnreadCountResponse {
  unreadCount?: number;
}

export interface NotificationRealtimePayload {
  event?: string;
  notification?: BackendNotification;
  unreadCount?: number;
}

const normalizeType = (raw?: string): NotificationType => {
  const normalized = (raw || '').trim().toLowerCase();
  if (normalized === 'order') return 'order';
  if (normalized === 'promotion') return 'promotion';
  if (normalized === 'review') return 'review';
  return 'system';
};

const mapNotification = (raw: BackendNotification): Notification => ({
  id: raw.id,
  type: normalizeType(raw.type),
  title: raw.title || 'Thông báo',
  message: raw.message || '',
  image: raw.image || undefined,
  link: raw.link || undefined,
  read: Boolean(raw.read),
  createdAt: raw.createdAt || new Date().toISOString(),
});

export const notificationApiService = {
  mapRealtimeNotification(raw?: BackendNotification): Notification | null {
    if (!raw?.id) return null;
    return mapNotification(raw);
  },

  async listMine(params: {
    page?: number;
    size?: number;
    read?: boolean;
    type?: NotificationType;
  } = {}): Promise<BackendPage<Notification>> {
    const query = new URLSearchParams();
    query.set('page', String(Math.max(params.page ?? 0, 0)));
    query.set('size', String(Math.min(Math.max(params.size ?? 50, 1), 100)));
    if (params.read !== undefined) {
      query.set('read', String(params.read));
    }
    if (params.type) {
      query.set('type', params.type);
    }
    const response = await apiRequest<BackendPage<BackendNotification>>(
      `/api/notifications/me?${query.toString()}`,
      {},
      { auth: true },
    );
    return {
      ...response,
      content: (response.content || []).map(mapNotification),
    };
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiRequest<UnreadCountResponse>(
      '/api/notifications/me/unread-count',
      {},
      { auth: true },
    );
    return Number(response.unreadCount || 0);
  },

  async markAsRead(id: string): Promise<Notification> {
    const response = await apiRequest<BackendNotification>(
      `/api/notifications/${encodeURIComponent(id)}/read`,
      { method: 'PATCH' },
      { auth: true },
    );
    return mapNotification(response);
  },

  async markAllAsRead(): Promise<number> {
    const response = await apiRequest<UnreadCountResponse>(
      '/api/notifications/me/read-all',
      { method: 'PATCH' },
      { auth: true },
    );
    return Number(response.unreadCount || 0);
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(
      `/api/notifications/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      { auth: true },
    );
  },
};
