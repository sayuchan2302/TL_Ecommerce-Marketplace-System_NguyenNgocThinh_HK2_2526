package vn.edu.hcmuaf.fit.marketplace.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.FlashSaleCampaign;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlashSaleCampaignRepository extends JpaRepository<FlashSaleCampaign, UUID> {

    @Query("""
            SELECT c
            FROM FlashSaleCampaign c
            WHERE c.status = :status
              AND c.startAt <= :now
              AND c.endAt >= :now
            ORDER BY c.startAt DESC, c.createdAt DESC
            """)
    List<FlashSaleCampaign> findActiveAt(
            @Param("status") FlashSaleCampaign.CampaignStatus status,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    default Optional<FlashSaleCampaign> findFirstActiveAt(LocalDateTime now) {
        List<FlashSaleCampaign> rows = findActiveAt(FlashSaleCampaign.CampaignStatus.RUNNING, now, PageRequest.of(0, 1));
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c
            FROM FlashSaleCampaign c
            WHERE c.id = :id
            """)
    Optional<FlashSaleCampaign> findByIdForUpdate(@Param("id") UUID id);
}
