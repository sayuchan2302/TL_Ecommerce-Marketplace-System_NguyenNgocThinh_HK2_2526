package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductReport;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class AdminReportResponse {
    private UUID id;
    private UUID productId;
    private String productName;
    private String productThumbnail;
    private String productSku;
    private String productStatus;
    private String productApprovalStatus;
    private Integer productStockQuantity;
    private long productReportCount;
    private long productPendingReportCount;
    private UUID storeId;
    private String storeName;
    private String storeSlug;
    private String storeLogo;
    private String storeStatus;
    private String storeApprovalStatus;
    private String storeContactEmail;
    private String storePhone;
    private String storeAddress;
    private Integer storeTotalOrders;
    private Double storeRating;
    private UUID sellerId;
    private String sellerName;
    private String sellerEmail;
    private String sellerPhone;
    private UUID userId;
    private String reporterName;
    private String reporterEmail;
    private ProductReport.ReportReason reason;
    private String description;
    private ProductReport.ReportStatus status;
    private String adminNote;
    private LocalDateTime createdAt;
}
