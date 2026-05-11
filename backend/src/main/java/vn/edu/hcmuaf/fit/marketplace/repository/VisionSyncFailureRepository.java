package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.VisionSyncFailure;
import vn.edu.hcmuaf.fit.marketplace.entity.VisionSyncRun;

import java.util.List;
import java.util.UUID;

@Repository
public interface VisionSyncFailureRepository extends JpaRepository<VisionSyncFailure, UUID> {
    List<VisionSyncFailure> findTop100ByRunOrderByCreatedAtAsc(VisionSyncRun run);
}
