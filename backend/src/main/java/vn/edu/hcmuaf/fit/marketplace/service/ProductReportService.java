package vn.edu.hcmuaf.fit.marketplace.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.dto.request.AdminProcessReportRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.request.ProductReportRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminReportResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.ProductReportResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Notification;
import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductAuditLog;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductReport;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.NotificationRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductAuditLogRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductReportRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductReportService {

    private final ProductReportRepository productReportRepository;
    private final ProductRepository productRepository;
    private final ProductAuditLogRepository productAuditLogRepository;
    private final NotificationRepository notificationRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    private static final int REPORT_THRESHOLD = 5;

    @Transactional
    public ProductReportResponse submitReport(UUID productId, UUID userId, ProductReportRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (product.getApprovalStatus() != Product.ApprovalStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Sản phẩm hiện không ở trạng thái cho phép. Không thể báo cáo.");
        }

        if (productReportRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã tố cáo sản phẩm này rồi.");
        }

        ProductReport report = ProductReport.builder()
                .productId(productId)
                .userId(userId)
                .reason(request.getReason())
                .description(request.getDescription())
                .status(ProductReport.ReportStatus.PENDING)
                .build();

        report = productReportRepository.save(report);
        checkAutoEscalate(productId);

        return toReportResponse(report);
    }

    private void checkAutoEscalate(UUID productId) {
        long pendingReports = productReportRepository.countByProductIdAndStatus(productId,
                ProductReport.ReportStatus.PENDING);
        if (pendingReports >= REPORT_THRESHOLD) {
            productRepository.findById(productId).ifPresent(product -> {
                if (product.getApprovalStatus() == Product.ApprovalStatus.APPROVED) {
                    product.setApprovalStatus(Product.ApprovalStatus.UNDER_REVIEW);
                    productRepository.save(product);

                    ProductAuditLog audit = ProductAuditLog.builder()
                            .productId(productId)
                            .action(ProductAuditLog.Action.REPORT_CONFIRMED)
                            .reason("Auto-escalated to UNDER_REVIEW due to reaching " + REPORT_THRESHOLD + " reports")
                            .build();
                    productAuditLogRepository.save(audit);

                    notifyVendorOnGovernanceAction(product, "UNDER_REVIEW",
                            "Sản phẩm đang bị xem xét do nhận được quá nhiều báo cáo vi phạm.");
                    notifyAdmin(product, pendingReports);
                }
            });
        }
    }

    @Transactional
    public void processReport(UUID reportId, AdminProcessReportRequest request, String adminEmail) {
        ProductReport report = productReportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));

        if (report.getStatus() != ProductReport.ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report has already been processed.");
        }

        Product product = productRepository.findById(report.getProductId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        User admin = userRepository.findByEmail(adminEmail).orElse(null);
        UUID adminId = admin != null ? admin.getId() : null;

        AdminProcessReportRequest.ProcessAction action = request.getAction();
        String adminNote = normalizeNote(request.getAdminNote());
        List<ProductReport> allPendingReports = productReportRepository.findByProductIdAndStatus(product.getId(),
                ProductReport.ReportStatus.PENDING);

        if (action == AdminProcessReportRequest.ProcessAction.BAN) {
            product.setApprovalStatus(Product.ApprovalStatus.BANNED);
            productRepository.save(product);

            for (ProductReport p : allPendingReports) {
                p.setStatus(ProductReport.ReportStatus.CONFIRMED);
                p.setAdminNote(adminNote);
            }
            productReportRepository.saveAll(allPendingReports);

            ProductAuditLog audit = ProductAuditLog.builder()
                    .productId(product.getId())
                    .adminId(adminId)
                    .action(ProductAuditLog.Action.REPORT_CONFIRMED)
                    .reason(adminNote)
                    .build();
            productAuditLogRepository.save(audit);

            notifyVendorOnGovernanceAction(product, "BANNED",
                    buildBanNotificationReason(adminNote));

        } else if (action == AdminProcessReportRequest.ProcessAction.DISMISS) {
            if (product.getApprovalStatus() == Product.ApprovalStatus.UNDER_REVIEW) {
                product.setApprovalStatus(Product.ApprovalStatus.APPROVED);
                productRepository.save(product);
            }

            for (ProductReport p : allPendingReports) {
                p.setStatus(ProductReport.ReportStatus.DISMISSED);
                p.setAdminNote(adminNote);
            }
            productReportRepository.saveAll(allPendingReports);

            ProductAuditLog audit = ProductAuditLog.builder()
                    .productId(product.getId())
                    .adminId(adminId)
                    .action(ProductAuditLog.Action.REPORT_DISMISSED)
                    .reason(adminNote)
                    .build();
            productAuditLogRepository.save(audit);

            if (product.getApprovalStatus() == Product.ApprovalStatus.APPROVED) {
                notifyVendorOnGovernanceAction(product, "APPROVED",
                        "Các báo cáo vi phạm về sản phẩm đã được bác bỏ. Sản phẩm được hiển thị lại.");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action. Must be BAN or DISMISS.");
        }
    }

    @Transactional(readOnly = true)
    public Page<AdminReportResponse> getAdminReports(ProductReport.ReportStatus status, Pageable pageable) {
        Page<ProductReport> reports;
        if (status != null) {
            reports = productReportRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            reports = productReportRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return reports.map(this::toAdminReportResponse);
    }

    private String normalizeNote(String note) {
        return note == null ? "" : note.trim();
    }

    private String normalizeDisplayName(String value) {
        return value == null ? "" : value.trim();
    }

    private String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private String buildBanNotificationReason(String adminNote) {
        String baseMessage = "Sản phẩm đã bị cấm sau khi xem xét các tố cáo.";
        if (adminNote.isBlank()) {
            return baseMessage;
        }
        return baseMessage + " Lý do: " + adminNote;
    }

    private void notifyVendorOnGovernanceAction(Product product, String actionType, String messageReason) {
        if (product.getStoreId() == null)
            return;

        Optional<Store> storeOpt = storeRepository.findById(product.getStoreId());
        if (storeOpt.isEmpty() || storeOpt.get().getOwner() == null)
            return;

        User vendor = storeOpt.get().getOwner();

        String title;
        if ("UNDER_REVIEW".equals(actionType)) {
            title = "Sản phẩm đang bị xem xét";
        } else if ("BANNED".equals(actionType)) {
            title = "Sản phẩm bị chặn";
        } else {
            title = "Sản phẩm được gỡ chặn";
        }

        Notification notification = Notification.builder()
                .user(vendor)
                .type(Notification.NotificationType.SYSTEM)
                .title(title)
                .message(messageReason + " [Sản phẩm: " + product.getName() + "]")
                .link("/vendor/products")
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    private void notifyAdmin(Product product, long count) {
        List<User> admins = userRepository.findByRole(User.Role.SUPER_ADMIN);
        for (User admin : admins) {
            Notification notification = Notification.builder()
                    .user(admin)
                    .type(Notification.NotificationType.SYSTEM)
                    .title("Cảnh báo: Sản phẩm bị tố cáo nhiều")
                    .message("Sản phẩm '" + product.getName() + "' đã nhận được " + count
                            + " tố cáo và đang chờ xem xét.")
                    .link("/admin/reports")
                    .isRead(false)
                    .build();
            notificationRepository.save(notification);
        }
    }

    private ProductReportResponse toReportResponse(ProductReport report) {
        return ProductReportResponse.builder()
                .id(report.getId())
                .productId(report.getProductId())
                .reason(report.getReason())
                .description(report.getDescription())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private AdminReportResponse toAdminReportResponse(ProductReport report) {
        Product p = productRepository.findById(report.getProductId()).orElse(null);
        String productName = p != null ? p.getName() : "Unknown";
        String thumb = "";
        String productSku = null;
        String productStatus = null;
        String productApprovalStatus = null;
        Integer productStockQuantity = null;
        String storeName = "Unknown";
        UUID storeId = null;
        String storeSlug = null;
        String storeLogo = null;
        String storeStatus = null;
        String storeApprovalStatus = null;
        String storeContactEmail = null;
        String storePhone = null;
        String storeAddress = null;
        Integer storeTotalOrders = null;
        Double storeRating = null;
        UUID sellerId = null;
        String sellerName = null;
        String sellerEmail = null;
        String sellerPhone = null;

        if (p != null) {
            String firstImage = p.getImages() != null && !p.getImages().isEmpty() ? p.getImages().get(0).getUrl() : "";
            thumb = firstImage;
            productSku = p.getSku();
            productStatus = enumName(p.getStatus());
            productApprovalStatus = enumName(p.getApprovalStatus());
            productStockQuantity = p.getStockQuantity();
            storeId = p.getStoreId();
            if (storeId != null) {
                Store store = storeRepository.findById(storeId).orElse(null);
                if (store != null) {
                    storeName = store.getName();
                    storeSlug = store.getSlug();
                    storeLogo = store.getLogo();
                    storeStatus = enumName(store.getStatus());
                    storeApprovalStatus = enumName(store.getApprovalStatus());
                    storeContactEmail = store.getContactEmail();
                    storePhone = store.getPhone();
                    storeAddress = store.getAddress();
                    storeTotalOrders = store.getTotalOrders();
                    storeRating = store.getRating();

                    User seller = store.getOwner();
                    if (seller != null) {
                        sellerId = seller.getId();
                        sellerName = normalizeDisplayName(seller.getName());
                        sellerEmail = seller.getEmail();
                        sellerPhone = seller.getPhone();
                    }
                }
            }
        }

        User reporter = userRepository.findById(report.getUserId()).orElse(null);
        String reporterEmail = reporter != null ? reporter.getEmail() : "Unknown";
        String reporterName = reporter != null ? normalizeDisplayName(reporter.getName()) : "";
        long productReportCount = productReportRepository.countByProductId(report.getProductId());
        long productPendingReportCount = productReportRepository.countByProductIdAndStatus(report.getProductId(),
                ProductReport.ReportStatus.PENDING);

        return AdminReportResponse.builder()
                .id(report.getId())
                .productId(report.getProductId())
                .productName(productName)
                .productThumbnail(thumb)
                .productSku(productSku)
                .productStatus(productStatus)
                .productApprovalStatus(productApprovalStatus)
                .productStockQuantity(productStockQuantity)
                .productReportCount(productReportCount)
                .productPendingReportCount(productPendingReportCount)
                .storeId(storeId)
                .storeName(storeName)
                .storeSlug(storeSlug)
                .storeLogo(storeLogo)
                .storeStatus(storeStatus)
                .storeApprovalStatus(storeApprovalStatus)
                .storeContactEmail(storeContactEmail)
                .storePhone(storePhone)
                .storeAddress(storeAddress)
                .storeTotalOrders(storeTotalOrders)
                .storeRating(storeRating)
                .sellerId(sellerId)
                .sellerName(sellerName)
                .sellerEmail(sellerEmail)
                .sellerPhone(sellerPhone)
                .userId(report.getUserId())
                .reporterName(reporterName)
                .reporterEmail(reporterEmail)
                .reason(report.getReason())
                .description(report.getDescription())
                .status(report.getStatus())
                .adminNote(report.getAdminNote())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
