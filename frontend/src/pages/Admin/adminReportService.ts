import { apiRequest } from '../../services/apiClient';

export type ReportStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED';

export interface AdminReportResponse {
    id: string;
    productId: string;
    productName: string;
    productThumbnail: string;
    productSku?: string;
    productStatus?: string;
    productApprovalStatus?: string;
    productStockQuantity?: number;
    productReportCount: number;
    productPendingReportCount: number;
    storeId?: string;
    storeName?: string;
    storeSlug?: string;
    storeLogo?: string;
    storeStatus?: string;
    storeApprovalStatus?: string;
    storeContactEmail?: string;
    storePhone?: string;
    storeAddress?: string;
    storeTotalOrders?: number;
    storeRating?: number;
    sellerId?: string;
    sellerName?: string;
    sellerEmail?: string;
    sellerPhone?: string;
    userId: string;
    reporterName?: string;
    reporterEmail: string;
    reason: string;
    description?: string;
    status: ReportStatus;
    adminNote?: string;
    createdAt: string;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export const adminReportService = {
    listReports: async (status?: ReportStatus | 'ALL', page = 0, size = 20): Promise<PageResponse<AdminReportResponse>> => {
        const query = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (status && status !== 'ALL') {
            query.set('status', status);
        }
        return apiRequest<PageResponse<AdminReportResponse>>(`/api/admin/reports?${query.toString()}`, {}, { auth: true });
    },

    processReport: async (reportId: string, action: 'BAN' | 'DISMISS', adminNote?: string): Promise<void> => {
        return apiRequest<void>(
            `/api/admin/reports/${reportId}/process`,
            {
                method: 'PATCH',
                body: JSON.stringify({ action, adminNote }),
            },
            { auth: true }
        );
    }
};
