package vn.edu.hcmuaf.fit.marketplace.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class VisionAdminClient {

    private final VisionSearchProperties properties;
    private final ObjectMapper objectMapper;

    public VisionAdminClient(VisionSearchProperties properties,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public HealthPayload getHealth() {
        return exchange("/health", "GET", false, HealthPayload.class);
    }

    public ReadyPayload getReady() {
        return exchange("/ready", "GET", false, ReadyPayload.class);
    }

    public IndexInfoPayload getIndexInfo() {
        return exchange("/v1/index/info", "GET", false,
                IndexInfoPayload.class);
    }

    public MetricsPayload getMetrics() {
        return exchange("/v1/metrics", "GET", true, MetricsPayload.class);
    }

    public SyncCatalogPayload syncCatalog() {
        return exchange("/v1/admin/sync-catalog", "POST", true,
                SyncCatalogPayload.class);
    }

    public SyncCatalogJobStartPayload startSyncCatalogJob() {
        return exchange("/v1/admin/sync-catalog/jobs", "POST", true,
                SyncCatalogJobStartPayload.class);
    }

    public SyncCatalogJobPayload getSyncCatalogJob(String jobId) {
        return exchange("/v1/admin/sync-catalog/jobs/" + jobId, "GET", true,
                SyncCatalogJobPayload.class);
    }

    private <T> T exchange(String path, String method, boolean useSecret,
            Class<T> responseType) {
        ensureConfigured(useSecret);
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(
                    normalizeBaseUrl(properties.getBaseUrl()) + path)
                    .openConnection();
            connection.setConnectTimeout(
                    Math.max(500, properties.getConnectTimeoutMs()));
            connection.setReadTimeout(
                    Math.max(1000, properties.getReadTimeoutMs()));
            connection.setRequestMethod(method);
            connection.setRequestProperty("Accept", "application/json");
            if (useSecret) {
                connection.setRequestProperty("X-Vision-Internal-Secret",
                        properties.getInternalSecret());
            }

            int statusCode = connection.getResponseCode();
            String responseBody = readResponseBody(connection, statusCode);
            if (statusCode >= 400) {
                throw translateError(statusCode, responseBody);
            }
            return objectMapper.readValue(responseBody, responseType);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Unable to reach vision engine", ex);
        }
    }

    private void ensureConfigured(boolean needsSecret) {
        if (!properties.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image search service is disabled");
        }
        if (properties.getBaseUrl() == null
                || properties.getBaseUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image search service is not configured");
        }
        if (needsSecret && (properties.getInternalSecret() == null
                || properties.getInternalSecret().isBlank())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Image search secret is not configured");
        }
    }

    private String normalizeBaseUrl(String value) {
        return value == null ? "" : value.replaceAll("/+$", "");
    }

    private String readResponseBody(HttpURLConnection connection,
            int statusCode) throws IOException {
        InputStream stream = statusCode >= 400 ? connection.getErrorStream()
                : connection.getInputStream();
        if (stream == null) {
            connection.disconnect();
            return "";
        }
        try (InputStream inputStream = stream) {
            return new String(inputStream.readAllBytes(),
                    StandardCharsets.UTF_8);
        } finally {
            connection.disconnect();
        }
    }

    private ResponseStatusException translateError(int statusCode,
            String responseBody) {
        HttpStatus status = switch (statusCode) {
        case 409 -> HttpStatus.CONFLICT;
        case 404 -> HttpStatus.NOT_FOUND;
        case 503 -> HttpStatus.SERVICE_UNAVAILABLE;
        case 504 -> HttpStatus.GATEWAY_TIMEOUT;
        default -> HttpStatus.BAD_GATEWAY;
        };
        return new ResponseStatusException(status,
                extractErrorMessage(responseBody));
    }

    private String extractErrorMessage(String body) {
        if (body == null || body.isBlank()) {
            return "Vision engine returned an error";
        }
        try {
            ErrorPayload payload = objectMapper.readValue(body,
                    ErrorPayload.class);
            if (payload.detail != null && !payload.detail.isBlank()) {
                return payload.detail;
            }
        } catch (IOException ignored) {
            // Keep raw body when upstream error payload is not JSON.
        }
        return body;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HealthPayload(String status) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReadyPayload(Boolean ready) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record IndexInfoPayload(
            Boolean ready,
            @JsonProperty("model_name") String modelName,
            @JsonProperty("model_pretrained") String modelPretrained,
            @JsonProperty("embedding_dimension") Integer embeddingDimension,
            @JsonProperty("active_image_count") Long activeImageCount,
            @JsonProperty("active_product_count") Long activeProductCount,
            @JsonProperty("index_version") String indexVersion) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MetricsPayload(
            @JsonProperty("total_requests") Long totalRequests,
            @JsonProperty("accepted_requests") Long acceptedRequests,
            @JsonProperty("empty_requests") Long emptyRequests,
            @JsonProperty("low_confidence_requests") Long lowConfidenceRequests,
            @JsonProperty("invalid_content_type_requests") Long invalidContentTypeRequests,
            @JsonProperty("empty_payload_requests") Long emptyPayloadRequests,
            @JsonProperty("oversized_payload_requests") Long oversizedPayloadRequests,
            @JsonProperty("decode_error_requests") Long decodeErrorRequests,
            @JsonProperty("search_latency_p95_ms") Double searchLatencyP95Ms,
            @JsonProperty("average_top_score") Double averageTopScore,
            @JsonProperty("last_search_at") String lastSearchAt) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SyncCatalogPayload(
            @JsonProperty("images_processed") Long imagesProcessed,
            @JsonProperty("embeddings_inserted") Long embeddingsInserted,
            @JsonProperty("embeddings_updated") Long embeddingsUpdated,
            @JsonProperty("skipped_unchanged") Long skippedUnchanged,
            @JsonProperty("failed_images") Long failedImages,
            @JsonProperty("deactivated_rows") Long deactivatedRows,
            @JsonProperty("sync_token") String syncToken,
            @JsonProperty("index_version") String indexVersion,
            List<Map<String, Object>> failures) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SyncCatalogJobStartPayload(
            @JsonProperty("job_id") String jobId,
            String status,
            @JsonProperty("started_at") String startedAt) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SyncCatalogJobPayload(
            @JsonProperty("job_id") String jobId,
            String status,
            @JsonProperty("started_at") String startedAt,
            @JsonProperty("finished_at") String finishedAt,
            SyncCatalogPayload result,
            String error) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ErrorPayload {
        @JsonProperty("detail")
        private String detail;
    }
}
