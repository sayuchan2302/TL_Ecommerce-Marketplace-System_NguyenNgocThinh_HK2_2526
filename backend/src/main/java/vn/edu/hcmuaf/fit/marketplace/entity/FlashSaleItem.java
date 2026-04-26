package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "flash_sale_items",
        indexes = {
                @Index(name = "idx_flash_sale_item_campaign", columnList = "campaign_id"),
                @Index(name = "idx_flash_sale_item_product_variant", columnList = "product_id, variant_id"),
                @Index(name = "idx_flash_sale_item_status", columnList = "status")
        }
)
public class FlashSaleItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private FlashSaleCampaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @Column(name = "flash_price", nullable = false)
    private BigDecimal flashPrice;

    @Column(nullable = false)
    private Integer quota = 0;

    @Column(name = "sold_count", nullable = false)
    private Integer soldCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemStatus status = ItemStatus.ACTIVE;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    public enum ItemStatus {
        ACTIVE,
        INACTIVE
    }
}
