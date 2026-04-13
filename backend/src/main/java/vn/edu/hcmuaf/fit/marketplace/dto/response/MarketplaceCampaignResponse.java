package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class MarketplaceCampaignResponse {

    private String code;
    private int createdCount;
    private int failedCount;
    private List<StoreFailure> failures;

    @Data
    @Builder
    public static class StoreFailure {
        private UUID storeId;
        private String storeName;
        private String reason;
    }
}
