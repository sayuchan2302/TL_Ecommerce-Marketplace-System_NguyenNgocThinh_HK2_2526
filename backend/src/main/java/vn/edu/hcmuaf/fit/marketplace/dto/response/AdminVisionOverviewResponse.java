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
public class AdminVisionOverviewResponse {
    private List<HealthItem> healthItems;
    private IndexSummary indexSummary;
    private SearchMetrics searchMetrics;
    private SyncSummary syncSummary;
    private List<SyncFailure> failures;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HealthItem {
        private String id;
        private String label;
        private String value;
        private String detail;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IndexSummary {
        private String modelName;
        private String modelPretrained;
        private Integer embeddingDimension;
        private Long activeImageCount;
        private Long activeProductCount;
        private String indexVersion;
        private String lastUpdatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchMetrics {
        private Long totalRequests;
        private Long acceptedRequests;
        private Long emptyRequests;
        private Long lowConfidenceRequests;
        private Long invalidImageRequests;
        private Double searchLatencyP95Ms;
        private Double averageTopScore;
        private String lastSearchAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncSummary {
        private String status;
        private String jobId;
        private String lastSyncedAt;
        private String startedAt;
        private String finishedAt;
        private Long durationMs;
        private Long imagesProcessed;
        private Long embeddingsInserted;
        private Long embeddingsUpdated;
        private Long skippedUnchanged;
        private Long failedImages;
        private Long deactivatedRows;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncFailure {
        private String productId;
        private String imageUrl;
        private String reason;
        private String note;
        private String status;
    }
}
