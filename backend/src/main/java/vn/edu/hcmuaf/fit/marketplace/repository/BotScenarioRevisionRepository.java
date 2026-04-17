package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hcmuaf.fit.marketplace.entity.BotScenarioRevision;

import java.util.Optional;
import java.util.UUID;

public interface BotScenarioRevisionRepository extends JpaRepository<BotScenarioRevision, UUID> {
    Optional<BotScenarioRevision> findTopByStatusOrderByRevisionNumberDesc(BotScenarioRevision.ScenarioStatus status);
}

