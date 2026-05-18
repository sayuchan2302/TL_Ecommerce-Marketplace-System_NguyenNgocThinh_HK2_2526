package vn.edu.hcmuaf.fit.marketplace.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductReport;

@Getter
@Setter
public class ProductReportRequest {

    @NotNull(message = "Reason is required")
    private ProductReport.ReportReason reason;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
}
