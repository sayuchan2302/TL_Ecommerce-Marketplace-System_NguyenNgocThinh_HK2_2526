package vn.edu.hcmuaf.fit.marketplace.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductReport;

import java.util.List;
import java.util.UUID;

public interface ProductReportRepository extends JpaRepository<ProductReport, UUID> {

    boolean existsByProductIdAndUserId(UUID productId, UUID userId);

    long countByProductId(UUID productId);

    long countByProductIdAndStatus(UUID productId, ProductReport.ReportStatus status);

    Page<ProductReport> findByStatusOrderByCreatedAtDesc(ProductReport.ReportStatus status, Pageable pageable);

    Page<ProductReport> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<ProductReport> findByProductIdAndStatus(UUID productId, ProductReport.ReportStatus status);
}
