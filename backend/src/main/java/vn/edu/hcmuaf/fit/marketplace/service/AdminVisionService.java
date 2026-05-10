package vn.edu.hcmuaf.fit.marketplace.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminVisionOverviewResponse;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

@Service
public class AdminVisionService {

    private static final Logger logger = LoggerFactory.getLogger(AdminVisionService.class);

    private final VisionAdminClient visionAdminClient;
    private final VisionSearchProperties visionSearchProperties;
    private final AtomicBoolean syncRunning = new AtomicBoolean(false);
    private volatile AdminVisionOverviewResponse.SyncSummary lastSyncSummary = idleSyncSummary();
    private volatile List<AdminVisionOverviewResponse.SyncFailure> lastFailures = List.of();

    public AdminVisionService(VisionAdminClient visionAdminClient,
            VisionSearchProperties visionSearchProperties) {
        this.visionAdminClient = visionAdminClient;
        this.visionSearchProperties = visionSearchProperties;
    }

    public AdminVisionOverviewResponse getOverview() {
        Optional<VisionAdminClient.HealthPayload> health = safeCall(
                "vision health", visionAdminClient::getHealth);
        Optional<VisionAdminClient.ReadyPayload> ready = safeCall(
                "vision readiness", visionAdminClient::getReady);
        Optional<VisionAdminClient.IndexInfoPayload> index = safeCall(
                "vision index info", visionAdminClient::getIndexInfo);
        Optional<VisionAdminClient.MetricsPayload> metrics = safeCall(
                "vision metrics", visionAdminClient::getMetrics);

        AdminVisionOverviewResponse.SyncSummary syncSummary = syncRunning.get()
                ? syncSummary("syncing", lastSyncSummary.getLastSyncedAt(),
                        lastSyncSummary, "Đang đồng bộ catalog")
                : lastSyncSummary;
        List<AdminVisionOverviewResponse.SyncFailure> failures = List.copyOf(lastFailures);

        return AdminVisionOverviewResponse.builder()
                .healthItems(List.of(
                        buildEngineHealth(health, ready),
                        buildVectorDbHealth(ready),
                        buildBackendConfigHealth(),
                        buildCatalogHealth(syncSummary, failures)))
                .indexSummary(buildIndexSummary(index, syncSummary))
                .searchMetrics(buildSearchMetrics(metrics))
                .syncSummary(syncSummary)
                .failures(failures)
                .build();
    }

    public AdminVisionOverviewResponse syncCatalog() {
        ensureSyncAllowed();
        if (!syncRunning.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Catalog sync is already running");
        }

        try {
            lastSyncSummary = syncSummary("syncing",
                    lastSyncSummary.getLastSyncedAt(), lastSyncSummary,
                    "Đang đồng bộ catalog");
            VisionAdminClient.SyncCatalogPayload payload = visionAdminClient.syncCatalog();
            lastFailures = mapFailures(payload.failures());
            lastSyncSummary = syncSummary("success", payload.syncToken(), payload,
                    "Đồng bộ catalog hoàn tất");
        } catch (ResponseStatusException ex) {
            lastSyncSummary = syncSummary("error", Instant.now().toString(),
                    lastSyncSummary, ex.getReason());
            throw ex;
        } finally {
            syncRunning.set(false);
        }

        return getOverview();
    }

    private void ensureSyncAllowed() {
        if (!visionSearchProperties.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image search service is disabled");
        }
        if (visionSearchProperties.getBaseUrl() == null
                || visionSearchProperties.getBaseUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image search service is not configured");
        }
        if (visionSearchProperties.getInternalSecret() == null
                || visionSearchProperties.getInternalSecret().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image search secret is not configured");
        }
    }

    private <T> Optional<T> safeCall(String label, Supplier<T> supplier) {
        try {
            return Optional.ofNullable(supplier.get());
        } catch (ResponseStatusException ex) {
            logger.warn("{} unavailable: {}", label, ex.getReason());
            return Optional.empty();
        }
    }

    private AdminVisionOverviewResponse.HealthItem buildEngineHealth(
            Optional<VisionAdminClient.HealthPayload> health,
            Optional<VisionAdminClient.ReadyPayload> ready) {
        if (health.isEmpty()) {
            return healthItem("engine", "Vision Engine", "Down",
                    "Không gọi được vision-engine tại "
                            + safeBaseUrl(),
                    "down");
        }
        if (!Boolean.TRUE.equals(ready.map(VisionAdminClient.ReadyPayload::ready)
                .orElse(false))) {
            return healthItem("engine", "Vision Engine", "Not ready",
                    "Service phản hồi nhưng model hoặc database chưa sẵn sàng",
                    "warning");
        }
        return healthItem("engine", "Vision Engine", "Ready",
                "Service " + safeBaseUrl() + " sẵn sàng nhận search",
                "ready");
    }

    private AdminVisionOverviewResponse.HealthItem buildVectorDbHealth(
            Optional<VisionAdminClient.ReadyPayload> ready) {
        if (ready.isEmpty()) {
            return healthItem("database", "Vector DB", "Unknown",
                    "Không kiểm tra được kết nối pgvector từ vision-engine",
                    "down");
        }
        if (!Boolean.TRUE.equals(ready.get().ready())) {
            return healthItem("database", "Vector DB", "Not ready",
                    "Vision readiness chưa xác nhận được database/model",
                    "warning");
        }
        return healthItem("database", "Vector DB", "Connected",
                "pgvector schema vision.product_image_embeddings", "ready");
    }

    private AdminVisionOverviewResponse.HealthItem buildBackendConfigHealth() {
        if (!visionSearchProperties.isEnabled()) {
            return healthItem("backend", "Backend Vision", "Disabled",
                    "APP_VISION_ENABLED đang tắt", "down");
        }
        if (visionSearchProperties.getBaseUrl() == null
                || visionSearchProperties.getBaseUrl().isBlank()) {
            return healthItem("backend", "Backend Vision", "Missing base URL",
                    "APP_VISION_BASE_URL chưa được cấu hình", "down");
        }
        if (visionSearchProperties.getInternalSecret() == null
                || visionSearchProperties.getInternalSecret().isBlank()) {
            return healthItem("backend", "Backend Vision", "Missing secret",
                    "APP_VISION_INTERNAL_SECRET chưa được cấu hình",
                    "warning");
        }
        return healthItem("backend", "Backend Vision", "Enabled",
                "Public image search đang bật qua marketplace API", "ready");
    }

    private AdminVisionOverviewResponse.HealthItem buildCatalogHealth(
            AdminVisionOverviewResponse.SyncSummary syncSummary,
            List<AdminVisionOverviewResponse.SyncFailure> failures) {
        if ("syncing".equals(syncSummary.getStatus())) {
            return healthItem("catalog", "Catalog Guard", "Syncing",
                    "Đang đồng bộ ảnh sản phẩm sang vector index", "warning");
        }
        if ("error".equals(syncSummary.getStatus())) {
            return healthItem("catalog", "Catalog Guard", "Sync error",
                    emptyToDefault(syncSummary.getMessage(),
                            "Lần đồng bộ gần nhất bị lỗi"),
                    "down");
        }
        if (!failures.isEmpty()) {
            return healthItem("catalog", "Catalog Guard",
                    failures.size() + " cảnh báo",
                    "Một số ảnh bị bỏ qua hoặc lỗi khi sync catalog",
                    "warning");
        }
        return healthItem("catalog", "Catalog Guard", "Clean",
                "Chưa ghi nhận lỗi sync catalog trong phiên backend này",
                "ready");
    }

    private AdminVisionOverviewResponse.IndexSummary buildIndexSummary(
            Optional<VisionAdminClient.IndexInfoPayload> payload,
            AdminVisionOverviewResponse.SyncSummary syncSummary) {
        VisionAdminClient.IndexInfoPayload index = payload.orElse(null);
        String indexVersion = index == null ? "empty" : emptyToDefault(index.indexVersion(), "empty");
        return AdminVisionOverviewResponse.IndexSummary.builder()
                .modelName(index == null ? "unknown" : emptyToDefault(index.modelName(), "unknown"))
                .modelPretrained(index == null ? "unknown" : emptyToDefault(index.modelPretrained(), "unknown"))
                .embeddingDimension(index == null || index.embeddingDimension() == null ? 0 : index.embeddingDimension())
                .activeImageCount(index == null ? 0L : nullToZero(index.activeImageCount()))
                .activeProductCount(index == null ? 0L : nullToZero(index.activeProductCount()))
                .indexVersion(indexVersion)
                .lastUpdatedAt(resolveLastUpdatedAt(syncSummary, indexVersion))
                .build();
    }

    private AdminVisionOverviewResponse.SearchMetrics buildSearchMetrics(
            Optional<VisionAdminClient.MetricsPayload> payload) {
        VisionAdminClient.MetricsPayload metrics = payload.orElse(null);
        if (metrics == null) {
            return AdminVisionOverviewResponse.SearchMetrics.builder()
                    .totalRequests(0L)
                    .acceptedRequests(0L)
                    .emptyRequests(0L)
                    .lowConfidenceRequests(0L)
                    .invalidImageRequests(0L)
                    .searchLatencyP95Ms(0.0)
                    .averageTopScore(0.0)
                    .lastSearchAt(null)
                    .build();
        }

        long invalidImageRequests = nullToZero(metrics.invalidContentTypeRequests())
                + nullToZero(metrics.emptyPayloadRequests())
                + nullToZero(metrics.oversizedPayloadRequests())
                + nullToZero(metrics.decodeErrorRequests());
        return AdminVisionOverviewResponse.SearchMetrics.builder()
                .totalRequests(nullToZero(metrics.totalRequests()))
                .acceptedRequests(nullToZero(metrics.acceptedRequests()))
                .emptyRequests(nullToZero(metrics.emptyRequests()))
                .lowConfidenceRequests(nullToZero(metrics.lowConfidenceRequests()))
                .invalidImageRequests(invalidImageRequests)
                .searchLatencyP95Ms(nullToZero(metrics.searchLatencyP95Ms()))
                .averageTopScore(metrics.averageTopScore() == null ? 0.0 : metrics.averageTopScore())
                .lastSearchAt(metrics.lastSearchAt())
                .build();
    }

    private AdminVisionOverviewResponse.SyncSummary syncSummary(String status,
            String lastSyncedAt,
            VisionAdminClient.SyncCatalogPayload payload,
            String message) {
        return AdminVisionOverviewResponse.SyncSummary.builder()
                .status(status)
                .lastSyncedAt(lastSyncedAt)
                .imagesProcessed(nullToZero(payload.imagesProcessed()))
                .embeddingsInserted(nullToZero(payload.embeddingsInserted()))
                .embeddingsUpdated(nullToZero(payload.embeddingsUpdated()))
                .skippedUnchanged(nullToZero(payload.skippedUnchanged()))
                .failedImages(nullToZero(payload.failedImages()))
                .deactivatedRows(nullToZero(payload.deactivatedRows()))
                .message(message)
                .build();
    }

    private AdminVisionOverviewResponse.SyncSummary syncSummary(String status,
            String lastSyncedAt,
            AdminVisionOverviewResponse.SyncSummary current,
            String message) {
        return AdminVisionOverviewResponse.SyncSummary.builder()
                .status(status)
                .lastSyncedAt(lastSyncedAt)
                .imagesProcessed(current.getImagesProcessed())
                .embeddingsInserted(current.getEmbeddingsInserted())
                .embeddingsUpdated(current.getEmbeddingsUpdated())
                .skippedUnchanged(current.getSkippedUnchanged())
                .failedImages(current.getFailedImages())
                .deactivatedRows(current.getDeactivatedRows())
                .message(message)
                .build();
    }

    private static AdminVisionOverviewResponse.SyncSummary idleSyncSummary() {
        return AdminVisionOverviewResponse.SyncSummary.builder()
                .status("idle")
                .lastSyncedAt(null)
                .imagesProcessed(0L)
                .embeddingsInserted(0L)
                .embeddingsUpdated(0L)
                .skippedUnchanged(0L)
                .failedImages(0L)
                .deactivatedRows(0L)
                .message("Chưa chạy sync trong phiên backend này")
                .build();
    }

    private List<AdminVisionOverviewResponse.SyncFailure> mapFailures(
            List<Map<String, Object>> failures) {
        if (failures == null || failures.isEmpty()) {
            return List.of();
        }
        return failures.stream()
                .map(this::mapFailure)
                .limit(100)
                .toList();
    }

    private AdminVisionOverviewResponse.SyncFailure mapFailure(
            Map<String, Object> failure) {
        String reason = valueAsString(failure.get("reason"));
        return AdminVisionOverviewResponse.SyncFailure.builder()
                .productId(valueAsString(failure.get("backend_product_id")))
                .imageUrl(valueAsString(failure.get("image_url")))
                .reason(reason)
                .note(emptyToDefault(valueAsString(failure.get("error")),
                        "Không có mô tả lỗi"))
                .status(failureStatus(reason))
                .build();
    }

    private String failureStatus(String reason) {
        if ("disallowed_image_url".equals(reason)) {
            return "blocked";
        }
        if ("download_too_large".equals(reason)) {
            return "warning";
        }
        return "error";
    }

    private AdminVisionOverviewResponse.HealthItem healthItem(String id,
            String label, String value, String detail, String status) {
        return AdminVisionOverviewResponse.HealthItem.builder()
                .id(id)
                .label(label)
                .value(value)
                .detail(detail)
                .status(status)
                .build();
    }

    private String resolveLastUpdatedAt(
            AdminVisionOverviewResponse.SyncSummary syncSummary,
            String indexVersion) {
        if ("success".equals(syncSummary.getStatus())
                && syncSummary.getLastSyncedAt() != null
                && !syncSummary.getLastSyncedAt().isBlank()) {
            return syncSummary.getLastSyncedAt();
        }
        return "empty".equals(indexVersion) ? null : indexVersion;
    }

    private String safeBaseUrl() {
        return emptyToDefault(visionSearchProperties.getBaseUrl(), "chưa cấu hình");
    }

    private String valueAsString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String emptyToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private long nullToZero(Long value) {
        return value == null ? 0L : value;
    }

    private double nullToZero(Double value) {
        return value == null ? 0.0 : value;
    }
}
