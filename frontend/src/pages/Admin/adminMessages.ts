export const ADMIN_TOAST_MESSAGES = {
  viewCopied: 'Đã copy link view hiện tại.',
  copyFailed: 'Không thể copy link, vui lòng thử lại.',
  advancedFilterComingSoon: 'Bộ lọc nâng cao sẽ sớm được cập nhật.',
  promoTypeFilterComingSoon: 'Bộ lọc theo loại khuyến mãi sẽ sớm được cập nhật.',
  orderDetail: {
    transitionFailed: 'Không thể cập nhật trạng thái đơn hàng.',
    auditExported: (orderCode: string) => `Đã xuất audit log cho ${orderCode}.`,
  },
  orders: {
    resetView: 'Đã đặt lại view đơn hàng về mặc định.',
    noEligibleBulkConfirm: 'Không có đơn hợp lệ để xác nhận.',
    bulkConfirmedWithSkipped: (updated: number, skipped: number) =>
      `Đã xác nhận ${updated} đơn, bỏ qua ${skipped} đơn không hợp lệ.`,
    bulkConfirmed: (updated: number) => `Đã xác nhận ${updated} đơn hàng.`,
    preparingPrint: (count: number) => `Đang chuẩn bị in ${count} hóa đơn...`,
  },
  products: {
    resetView: 'Đã đặt lại view sản phẩm.',
    priceUpdated: (sku: string) => `Đã cập nhật giá cho ${sku}.`,
    stockTargetMissing: 'Không tìm thấy sản phẩm để cập nhật tồn kho.',
    stockAdjusted: (sku: string, before: number, after: number) =>
      `Đã điều chỉnh tồn kho ${sku} (${before} -> ${after}).`,
    saved: 'Đã lưu thay đổi.',
    variantsSynced: 'Đã lưu cấu hình biến thể và đồng bộ tồn kho.',
  },
  customers: {
    resetView: 'Đã đặt lại view khách hàng về mặc định.',
    lockReasonRequired: 'Vui lòng nhập lý do khóa tài khoản.',
    lockedAccount: (name: string) => `Đã khóa tài khoản ${name}.`,
    unlockedAccount: (name: string) => `Đã mở khóa tài khoản ${name}.`,
    noteSaved: 'Đã lưu ghi chú nội bộ.',
    vouchersSent: (count: number) => `Đã gửi voucher cho ${count} khách hàng.`,
    alreadyBanned: 'Các tài khoản đã ở trạng thái bị khóa.',
    bulkLocked: (count: number) => `Đã khóa ${count} tài khoản.`,
    emailsSent: (count: number) => `Đã gửi email đến ${count} khách hàng.`,
    exportRequested: (count: number) => `Đã tạo yêu cầu xuất dữ liệu ${count} khách hàng.`,
    deleted: (count: number) => `Đã xóa ${count} khách hàng.`,
  },
  categories: {
    resetView: 'Đã đặt lại view danh mục về mặc định.',
    syncRollback: 'Không thể đồng bộ dữ liệu, đã hoàn tác thay đổi.',
    noDeletable: 'Không có danh mục hợp lệ để xóa. Vui lòng xử lý danh mục con hoặc sản phẩm trước.',
    skippedBlocked: (count: number) => `Đã bỏ qua ${count} danh mục còn dữ liệu ràng buộc.`,
  },
  promotions: {
    resetView: 'Đã đặt lại view khuyến mãi về mặc định.',
    updated: 'Đã cập nhật chiến dịch khuyến mãi.',
    created: 'Đã tạo chiến dịch khuyến mãi mới.',
    noEligiblePauseBulk: 'Không có chiến dịch hợp lệ để tạm dừng.',
    bulkPaused: (count: number) => `Đã tạm dừng ${count} chiến dịch.`,
    bulkDeleted: (count: number) => `Đã xóa ${count} chiến dịch đã chọn.`,
  },
} as const;
