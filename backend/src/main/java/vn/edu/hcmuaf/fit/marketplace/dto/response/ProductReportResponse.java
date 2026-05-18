package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductReport;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ProductReportResponse {
    private UUID id;
    private UUID productId;
    private ProductReport.ReportReason reason;
    private String description;
    private ProductReport.ReportStatus status;
    private LocalDateTime createdAt;
}
