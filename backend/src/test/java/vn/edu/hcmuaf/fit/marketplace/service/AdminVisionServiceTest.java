package vn.edu.hcmuaf.fit.marketplace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.config.VisionSearchProperties;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminVisionOverviewResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.VisionSyncFailure;
import vn.edu.hcmuaf.fit.marketplace.entity.VisionSyncRun;
import vn.edu.hcmuaf.fit.marketplace.repository.VisionSyncFailureRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.VisionSyncRunRepository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminVisionServiceTest {

    @Mock
    private VisionSyncRunRepository syncRunRepository;

    @Mock
    private VisionSyncFailureRepository syncFailureRepository;

    private FakeVisionAdminClient visionAdminClient;
    private VisionSearchProperties properties;
    private AdminVisionService adminVisionService;
    private AtomicReference<VisionSyncRun> savedRun;

    @BeforeEach
    void setUp() {
        properties = new VisionSearchProperties();
        properties.setEnabled(true);
        properties.setBaseUrl("http://localhost:8001");
        properties.setInternalSecret("test-secret");
        visionAdminClient = new FakeVisionAdminClient();
        savedRun = new AtomicReference<>();

        lenient().when(syncRunRepository.save(any(VisionSyncRun.class))).thenAnswer(invocation -> {
            VisionSyncRun run = invocation.getArgument(0);
            savedRun.set(run);
            return run;
        });
        lenient().when(syncFailureRepository.findTop100ByRunOrderByCreatedAtAsc(any(VisionSyncRun.class)))
                .thenAnswer(invocation -> {
                    VisionSyncRun run = invocation.getArgument(0);
                    return run.getFailures() == null ? List.of() : run.getFailures();
                });

        adminVisionService = new AdminVisionService(visionAdminClient,
                properties, syncRunRepository, syncFailureRepository);
    }

    @Test
    void overviewMarksEngineDownWhenVisionEngineCannotBeReached() {
        visionAdminClient.healthError =
                new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Unable to reach vision engine");
        when(syncRunRepository.findFirstByOrderByStartedAtDesc())
                .thenReturn(Optional.empty());

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
    void syncCatalogStartsAsyncJobAndReconcilesSuccessWithFailures() {
        configureHealthyVision();
        visionAdminClient.startPayload =
                new VisionAdminClient.SyncCatalogJobStartPayload(
                        "job-1",
                        "running",
                        "2026-05-10T13:00:00Z");
        when(syncRunRepository.findFirstByStatusOrderByStartedAtDesc(
                VisionSyncRun.Status.RUNNING)).thenReturn(Optional.empty());
        when(syncRunRepository.findFirstByOrderByStartedAtDesc())
                .thenAnswer(invocation -> Optional.ofNullable(savedRun.get()));

        AdminVisionOverviewResponse started = adminVisionService.syncCatalog();

        assertEquals("syncing", started.getSyncSummary().getStatus());
        assertEquals("job-1", started.getSyncSummary().getJobId());

        visionAdminClient.jobPayload =
                new VisionAdminClient.SyncCatalogJobPayload(
                        "job-1",
                        "success",
                        "2026-05-10T13:00:00Z",
                        "2026-05-10T13:00:04Z",
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
                                        "error", "Host is not allowed"))),
                        null);

        AdminVisionOverviewResponse overview = adminVisionService.getOverview();

        assertEquals("success", overview.getSyncSummary().getStatus());
        assertEquals(12L, overview.getSyncSummary().getImagesProcessed());
        assertEquals(4000L, overview.getSyncSummary().getDurationMs());
        assertEquals(99L, overview.getIndexSummary().getActiveImageCount());
        assertEquals(10L, overview.getSearchMetrics().getInvalidImageRequests());
        assertEquals(1, overview.getFailures().size());
        assertEquals("blocked", overview.getFailures().get(0).getStatus());
    }

    @Test
    void overviewReadsLatestHistoryFromDatabase() {
        VisionSyncRun run = VisionSyncRun.builder()
                .jobId("persisted-job")
                .status(VisionSyncRun.Status.SUCCESS)
                .startedAt(Instant.parse("2026-05-10T12:00:00Z"))
                .finishedAt(Instant.parse("2026-05-10T12:00:03Z"))
                .durationMs(3000L)
                .syncToken("sync-token")
                .imagesProcessed(7L)
                .message("done")
                .build();
        VisionSyncFailure failure = VisionSyncFailure.builder()
                .run(run)
                .productId("product-2")
                .imageUrl("/uploads/products/bad.jpg")
                .reason("decode_error")
                .note("Cannot decode")
                .status("error")
                .build();
        when(syncRunRepository.findFirstByOrderByStartedAtDesc())
                .thenReturn(Optional.of(run));
        when(syncFailureRepository.findTop100ByRunOrderByCreatedAtAsc(run))
                .thenReturn(List.of(failure));

        AdminVisionOverviewResponse overview = adminVisionService.getOverview();

        assertEquals("success", overview.getSyncSummary().getStatus());
        assertEquals("persisted-job", overview.getSyncSummary().getJobId());
        assertEquals(7L, overview.getSyncSummary().getImagesProcessed());
        assertEquals(1, overview.getFailures().size());
        assertEquals("product-2", overview.getFailures().get(0).getProductId());
    }

    @Test
    void syncCatalogRequiresConfiguredSecret() {
        properties.setInternalSecret("");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> adminVisionService.syncCatalog());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
    }

    private void configureHealthyVision() {
        visionAdminClient.healthPayload = new VisionAdminClient.HealthPayload("ok");
        visionAdminClient.readyPayload = new VisionAdminClient.ReadyPayload(true);
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
    }

    private static final class FakeVisionAdminClient extends VisionAdminClient {

        private ResponseStatusException healthError;
        private ResponseStatusException readyError;
        private ResponseStatusException indexInfoError;
        private ResponseStatusException metricsError;
        private HealthPayload healthPayload;
        private ReadyPayload readyPayload;
        private IndexInfoPayload indexInfoPayload;
        private MetricsPayload metricsPayload;
        private SyncCatalogJobStartPayload startPayload;
        private SyncCatalogJobPayload jobPayload;

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
        public SyncCatalogJobStartPayload startSyncCatalogJob() {
            return startPayload;
        }

        @Override
        public SyncCatalogJobPayload getSyncCatalogJob(String jobId) {
            return jobPayload;
        }
    }
}
