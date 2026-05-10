import { apiRequest } from './apiClient';

export type VisionHealthStatus = 'ready' | 'warning' | 'down';
export type VisionSyncState = 'idle' | 'syncing' | 'success' | 'error';
export type VisionFailureStatus = 'blocked' | 'warning' | 'error';

export interface VisionHealthItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: VisionHealthStatus;
}

export interface VisionIndexSummary {
  modelName: string;
  modelPretrained: string;
  embeddingDimension: number;
  activeImageCount: number;
  activeProductCount: number;
  indexVersion: string;
  lastUpdatedAt?: string | null;
}

export interface VisionSearchMetrics {
  totalRequests: number;
  acceptedRequests: number;
  emptyRequests: number;
  lowConfidenceRequests: number;
  invalidImageRequests: number;
  searchLatencyP95Ms: number;
  averageTopScore: number;
  lastSearchAt?: string | null;
}

export interface VisionSyncSummary {
  status: VisionSyncState;
  lastSyncedAt?: string | null;
  imagesProcessed: number;
  embeddingsInserted: number;
  embeddingsUpdated: number;
  skippedUnchanged: number;
  failedImages: number;
  deactivatedRows: number;
  message?: string | null;
}

export interface VisionSyncFailure {
  productId: string;
  imageUrl: string;
  reason: string;
  note: string;
  status: VisionFailureStatus;
}

export interface AdminVisionOverview {
  healthItems: VisionHealthItem[];
  indexSummary: VisionIndexSummary;
  searchMetrics: VisionSearchMetrics;
  syncSummary: VisionSyncSummary;
  failures: VisionSyncFailure[];
}

export const adminVisionService = {
  getOverview(): Promise<AdminVisionOverview> {
    return apiRequest<AdminVisionOverview>('/api/admin/vision/overview', {}, { auth: true });
  },

  syncCatalog(): Promise<AdminVisionOverview> {
    return apiRequest<AdminVisionOverview>('/api/admin/vision/sync-catalog', {
      method: 'POST',
    }, { auth: true });
  },
};
