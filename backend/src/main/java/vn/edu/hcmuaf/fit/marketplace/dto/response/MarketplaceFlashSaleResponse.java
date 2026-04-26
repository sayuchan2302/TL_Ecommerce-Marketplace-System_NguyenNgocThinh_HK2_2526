package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceFlashSaleResponse {
    private UUID campaignId;
    private String campaignName;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private LocalDateTime serverTime;
    private List<MarketplaceFlashSaleItemResponse> items;
}
