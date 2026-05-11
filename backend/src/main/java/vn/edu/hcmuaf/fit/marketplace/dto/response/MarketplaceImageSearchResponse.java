package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceImageSearchResponse {
    private List<MarketplaceProductCardResponse> items;
    private Integer totalCandidates;
    private String mode;
    private String indexVersion;
    private String inferredCategory;
    private Double inferredCategoryScore;
    private String categoryFilterApplied;
    private Integer returnedCandidates;
    private Integer groupedCandidates;
    private Integer thresholdFilteredCandidates;
    private Double topScore;
    private Double scoreFloor;
    private List<ImageSearchMatch> matches;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageSearchMatch {
        private UUID productId;
        private Integer rank;
        private Double score;
        private String matchedImageUrl;
        private Integer matchedImageIndex;
        private Boolean isPrimary;
    }
}
