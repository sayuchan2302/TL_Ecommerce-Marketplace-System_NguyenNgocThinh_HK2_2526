import { ApiError } from '../services/apiClient';

const STATUS_FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.',
  401: 'Hết phiên đăng nhập. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu đang xung đột. Vui lòng tải lại và thử lại.',
  422: 'Thông tin nhập vào chưa hợp lệ.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  500: 'Hệ thống đang bận. Vui lòng thử lại sau.',
  502: 'Máy chủ tạm thời không khả dụng. Vui lòng thử lại sau.',
  503: 'Dịch vụ đang bảo trì hoặc quá tải. Vui lòng thử lại sau.',
  504: 'Máy chủ phản hồi quá chậm. Vui lòng thử lại sau.',
};

const resolveStatusFallback = (status?: number): string => {
  if (!status) {
    return 'Có lỗi xảy ra. Vui lòng thử lại.';
  }
  return STATUS_FALLBACK_MESSAGES[status] || `Yêu cầu thất bại (HTTP ${status}).`;
};

const cleanMessage = (value?: string | null) => {
  if (!value) return '';
  return value.trim();
};

const isGenericUnauthorizedMessage = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('authentication required')
    || normalized.includes('full authentication')
    || normalized.includes('token is invalid')
    || normalized.includes('jwt')
    || normalized.includes('session expired')
  );
};

export const getUiErrorMessage = (error: unknown, fallback?: string): string => {
  if (error instanceof ApiError) {
    const apiMessage = cleanMessage(error.message);
    if (error.status === 401 && isGenericUnauthorizedMessage(apiMessage)) {
      return STATUS_FALLBACK_MESSAGES[401];
    }
    if (apiMessage) {
      return apiMessage;
    }
    return fallback || resolveStatusFallback(error.status);
  }

  if (error instanceof Error) {
    const message = cleanMessage(error.message);
    if (message) {
      return message;
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = cleanMessage((error as { message?: string }).message);
    if (message) {
      return message;
    }
  }

  return fallback || 'Có lỗi xảy ra. Vui lòng thử lại.';
};

export const getReasonToastMessage = (reason?: string | null): string | null => {
  switch ((reason || '').toLowerCase()) {
    case 'session-expired':
      return 'Hết phiên đăng nhập, vui lòng đăng nhập lại.';
    case 'unauthorized':
      return 'Bạn cần đăng nhập để tiếp tục.';
    default:
      return null;
  }
};

export const getReasonToast = (
  reason?: string | null,
): { message: string; type: 'success' | 'error' | 'info' } | null => {
  if ((reason || '').toLowerCase() === 'password-reset-success') {
    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.', type: 'success' };
  }

  const message = getReasonToastMessage(reason);
  return message ? { message, type: 'error' } : null;
};
