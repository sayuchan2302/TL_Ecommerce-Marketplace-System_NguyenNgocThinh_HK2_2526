package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "product_reports", indexes = {
        @Index(name = "idx_product_reports_product_id", columnList = "product_id"),
        @Index(name = "idx_product_reports_user_id", columnList = "user_id"),
        @Index(name = "idx_product_reports_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_product_reports_product_user", columnNames = { "product_id", "user_id" })
})
public class ProductReport extends BaseEntity {

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReportReason reason;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "admin_note", columnDefinition = "text")
    private String adminNote;

    public enum ReportReason {
        FAKE_PRODUCT,
        WRONG_INFO,
        INAPPROPRIATE,
        PROHIBITED,
        OTHER
    }

    public enum ReportStatus {
        PENDING, CONFIRMED, DISMISSED
    }
}
