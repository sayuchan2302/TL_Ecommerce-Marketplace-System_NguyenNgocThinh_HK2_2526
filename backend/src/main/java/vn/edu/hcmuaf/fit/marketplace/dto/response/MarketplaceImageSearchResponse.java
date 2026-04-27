package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceImageSearchResponse {
    private List<MarketplaceProductCardResponse> items;
    private Integer totalCandidates;
    private String mode;
    private String indexVersion;
}

