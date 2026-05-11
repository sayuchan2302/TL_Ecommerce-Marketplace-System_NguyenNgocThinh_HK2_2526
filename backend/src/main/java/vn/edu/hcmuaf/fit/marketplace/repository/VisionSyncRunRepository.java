package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.VisionSyncRun;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VisionSyncRunRepository extends JpaRepository<VisionSyncRun, UUID> {
    Optional<VisionSyncRun> findByJobId(String jobId);

    Optional<VisionSyncRun> findFirstByOrderByStartedAtDesc();

    Optional<VisionSyncRun> findFirstByStatusOrderByStartedAtDesc(VisionSyncRun.Status status);

    boolean existsByStatus(VisionSyncRun.Status status);
}
