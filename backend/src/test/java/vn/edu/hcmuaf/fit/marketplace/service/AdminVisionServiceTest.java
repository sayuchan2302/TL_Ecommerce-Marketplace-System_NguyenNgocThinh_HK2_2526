package vn.edu.hcmuaf.fit.marketplace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminVisionOverviewResponse;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AdminVisionServiceTest {

    private FakeVisionAdminClient visionAdminClient;
    private VisionSearchProperties properties;
    private AdminVisionService adminVisionService;

    @BeforeEach
    void setUp() {
        properties = new VisionSearchProperties();
        properties.setEnabled(true);
        properties.setBaseUrl("http://localhost:8001");
        properties.setInternalSecret("test-secret");
        visionAdminClient = new FakeVisionAdminClient();
        adminVisionService = new AdminVisionService(visionAdminClient,
                properties);
    }

    @Test
    void overviewMarksEngineDownWhenVisionEngineCannotBeReached() {
        visionAdminClient.healthError =
                new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Unable to reach vision engine");

        AdminVisionOverviewResponse overview = adminVisionService.getOverview();

        AdminVisionOverviewResponse.HealthItem engine = overview.getHealthItems()
                .stream()
                .filter(item -> "engine".equals(item.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals("down", engine.getStatus());
        assertEquals("Down", engine.getValue());
        assertEquals("idle", overview.getSyncSummary().getStatus());
    }

    @Test
    void syncCatalogMapsSummaryAndFailures() {
        visionAdminClient.syncCatalogPayload =
                new VisionAdminClient.SyncCatalogPayload(
                        12L,
                        3L,
                        4L,
                        5L,
                        1L,
                        2L,
                        "2026-05-10T13:00:00+00:00",
                        "sync-token",
                        List.of(Map.of(
                                "backend_product_id", "product-1",
                                "image_url", "https://example.com/p.jpg",
                                "reason", "disallowed_image_url",
                                "error", "Host is not allowed")));
        visionAdminClient.healthPayload = new VisionAdminClient.HealthPayload(
                "ok");
        visionAdminClient.readyPayload = new VisionAdminClient.ReadyPayload(
                true);
        visionAdminClient.indexInfoPayload =
                new VisionAdminClient.IndexInfoPayload(true,
                        "ViT-B-32",
                        "laion2b_s34b_b79k",
                        512,
                        99L,
                        40L,
                        "sync-token");
        visionAdminClient.metricsPayload =
                new VisionAdminClient.MetricsPayload(
                        10L,
                        8L,
                        1L,
                        1L,
                        1L,
                        2L,
                        3L,
                        4L,
                        280.0,
                        0.72,
                        "2026-05-10T13:01:00+00:00");

        AdminVisionOverviewResponse overview = adminVisionService.syncCatalog();

        assertEquals("success", overview.getSyncSummary().getStatus());
        assertEquals(12L, overview.getSyncSummary().getImagesProcessed());
        assertEquals(99L, overview.getIndexSummary().getActiveImageCount());
        assertEquals(10L, overview.getSearchMetrics().getInvalidImageRequests());
        assertEquals(1, overview.getFailures().size());
        assertEquals("blocked", overview.getFailures().get(0).getStatus());
    }

    @Test
    void syncCatalogRequiresConfiguredSecret() {
        properties.setInternalSecret("");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> adminVisionService.syncCatalog());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
        AdminVisionOverviewResponse overview = adminVisionService.getOverview();
        AdminVisionOverviewResponse.HealthItem backend = overview.getHealthItems()
                .stream()
                .filter(item -> "backend".equals(item.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals("warning", backend.getStatus());
        assertEquals("Missing secret", backend.getValue());
    }

    private static final class FakeVisionAdminClient extends VisionAdminClient {

        private ResponseStatusException healthError;
        private ResponseStatusException readyError;
        private ResponseStatusException indexInfoError;
        private ResponseStatusException metricsError;
        private ResponseStatusException syncCatalogError;
        private HealthPayload healthPayload;
        private ReadyPayload readyPayload;
        private IndexInfoPayload indexInfoPayload;
        private MetricsPayload metricsPayload;
        private SyncCatalogPayload syncCatalogPayload;

        private FakeVisionAdminClient() {
            super(new VisionSearchProperties(), new ObjectMapper());
        }

        @Override
        public HealthPayload getHealth() {
            if (healthError != null) {
                throw healthError;
            }
            return healthPayload;
        }

        @Override
        public ReadyPayload getReady() {
            if (readyError != null) {
                throw readyError;
            }
            return readyPayload;
        }

        @Override
        public IndexInfoPayload getIndexInfo() {
            if (indexInfoError != null) {
                throw indexInfoError;
            }
            return indexInfoPayload;
        }

        @Override
        public MetricsPayload getMetrics() {
            if (metricsError != null) {
                throw metricsError;
            }
            return metricsPayload;
        }

        @Override
        public SyncCatalogPayload syncCatalog() {
            if (syncCatalogError != null) {
                throw syncCatalogError;
            }
            return syncCatalogPayload;
        }
    }
}
