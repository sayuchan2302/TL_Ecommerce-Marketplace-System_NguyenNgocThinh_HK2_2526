import { apiRequest } from './apiClient';

export type ContentType = 'FAQ' | 'POLICY';

export interface ContentPage {
  id: string;
  title: string;
  body: string;
  type: ContentType;
  displayOrder?: number;
  updatedAt?: string;
  updatedBy?: string;
}

interface ContentPagePayload {
  title: string;
  body: string;
  type: ContentType;
  displayOrder?: number;
}

export const contentService = {
  async list(type: ContentType): Promise<ContentPage[]> {
    return apiRequest<ContentPage[]>(`/api/admin/content?type=${type}`, {}, { auth: true });
  },

  async create(payload: ContentPagePayload): Promise<ContentPage> {
    return apiRequest<ContentPage>('/api/admin/content', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { auth: true });
  },

  async update(id: string, payload: ContentPagePayload): Promise<ContentPage> {
    return apiRequest<ContentPage>(`/api/admin/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, { auth: true });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/api/admin/content/${id}`, { method: 'DELETE' }, { auth: true });
  },

  async reorder(items: Array<{ id: string; displayOrder: number }>): Promise<void> {
    await apiRequest<void>('/api/admin/content/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }, { auth: true });
  },
};
