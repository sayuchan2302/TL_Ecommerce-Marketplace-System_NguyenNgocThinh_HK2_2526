import { apiRequest } from './apiClient';

export interface ProductReportRequest {
    reason: 'FAKE_PRODUCT' | 'WRONG_INFO' | 'INAPPROPRIATE' | 'PROHIBITED' | 'OTHER';
    description?: string;
}

export interface ProductReportResponse {
    id: string;
    productId: string;
    reason: string;
    description?: string;
    status: string;
    createdAt: string;
}

export const reportService = {
    submitProductReport: async (
        productId: string,
        reason: ProductReportRequest['reason'],
        description?: string,
    ): Promise<ProductReportResponse> => {
        return apiRequest<ProductReportResponse>(
            `/api/products/${productId}/report`,
            {
                method: 'POST',
                body: JSON.stringify({ reason, description }),
            },
            { auth: true }
        );
    }
};
