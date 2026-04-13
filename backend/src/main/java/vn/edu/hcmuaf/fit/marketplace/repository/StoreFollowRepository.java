package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.StoreFollow;
import vn.edu.hcmuaf.fit.marketplace.entity.User;

import java.util.List;
import java.util.UUID;

@Repository
public interface StoreFollowRepository extends JpaRepository<StoreFollow, UUID> {

    interface StoreFollowerCountProjection {
        UUID getStoreId();
        Long getFollowerCount();
    }

    long countByStoreId(UUID storeId);

    long countByUserId(UUID userId);

    boolean existsByUserIdAndStoreId(UUID userId, UUID storeId);

    void deleteByUserIdAndStoreId(UUID userId, UUID storeId);

    @Query("""
            SELECT sf
            FROM StoreFollow sf
            JOIN FETCH sf.store s
            WHERE sf.user.id = :userId
              AND s.approvalStatus = :approvalStatus
              AND s.status = :storeStatus
            ORDER BY sf.createdAt DESC
            """)
    List<StoreFollow> findPublicStoreFollowsByUserIdOrderByCreatedAtDesc(
            @Param("userId") UUID userId,
            @Param("approvalStatus") Store.ApprovalStatus approvalStatus,
            @Param("storeStatus") Store.StoreStatus storeStatus
    );

    @Query("""
            SELECT sf.store.id AS storeId, COUNT(sf.id) AS followerCount
            FROM StoreFollow sf
            WHERE sf.store.id IN :storeIds
            GROUP BY sf.store.id
            """)
    List<StoreFollowerCountProjection> countFollowersByStoreIds(@Param("storeIds") List<UUID> storeIds);

    @Query("""
            SELECT DISTINCT sf.user.id
            FROM StoreFollow sf
            WHERE sf.store.id = :storeId
              AND sf.user.role = :role
              AND sf.user.isActive = true
            """)
    List<UUID> findFollowerUserIdsByStoreIdAndRoleAndActive(
            @Param("storeId") UUID storeId,
            @Param("role") User.Role role
    );
}
