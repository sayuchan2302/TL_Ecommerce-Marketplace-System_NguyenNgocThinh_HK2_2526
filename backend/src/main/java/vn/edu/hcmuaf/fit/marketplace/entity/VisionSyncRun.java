package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "vision_sync_runs")
public class VisionSyncRun extends BaseEntity {

    public enum Status {
        RUNNING,
        SUCCESS,
        ERROR
    }

    @Column(name = "job_id", unique = true, nullable = false, length = 80)
    private String jobId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "sync_token")
    private String syncToken;

    @Column(name = "index_version")
    private String indexVersion;

    @Column(name = "images_processed")
    @Builder.Default
    private Long imagesProcessed = 0L;

    @Column(name = "embeddings_inserted")
    @Builder.Default
    private Long embeddingsInserted = 0L;

    @Column(name = "embeddings_updated")
    @Builder.Default
    private Long embeddingsUpdated = 0L;

    @Column(name = "skipped_unchanged")
    @Builder.Default
    private Long skippedUnchanged = 0L;

    @Column(name = "failed_images")
    @Builder.Default
    private Long failedImages = 0L;

    @Column(name = "deactivated_rows")
    @Builder.Default
    private Long deactivatedRows = 0L;

    @Column(columnDefinition = "text")
    private String message;

    @Column(columnDefinition = "text")
    private String error;

    @OneToMany(mappedBy = "run", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<VisionSyncFailure> failures = new ArrayList<>();
}
