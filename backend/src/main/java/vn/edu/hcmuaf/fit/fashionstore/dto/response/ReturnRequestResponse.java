package vn.edu.hcmuaf.fit.fashionstore.dto.response;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hcmuaf.fit.fashionstore.entity.ReturnRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class ReturnRequestResponse {
    private UUID id;
    private UUID orderId;
    private UUID userId;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private ReturnRequest.ReturnReason reason;
    private String note;
    private ReturnRequest.ReturnResolution resolution;
    private ReturnRequest.ReturnStatus status;
    private List<ReturnItem> items;
    private String adminNote;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter
    @Builder
    public static class ReturnItem {
        private UUID orderItemId;
        private String productName;
        private String variantName;
        private String imageUrl;
        private Integer quantity;
        private Double unitPrice;
    }
}
