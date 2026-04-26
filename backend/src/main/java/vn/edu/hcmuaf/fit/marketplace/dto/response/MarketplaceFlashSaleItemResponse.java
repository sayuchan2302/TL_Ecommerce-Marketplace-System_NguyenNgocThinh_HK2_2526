package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceFlashSaleItemResponse {
    private UUID flashSaleItemId;
    private UUID productId;
    private String productSlug;
    private String productCode;
    private UUID variantId;
    private String name;
    private String image;
    private BigDecimal flashPrice;
    private String flashPriceAmount;
    private BigDecimal originalPrice;
    private String originalPriceAmount;
    private Integer soldCount;
    private Integer quota;
    private UUID storeId;
    private String storeName;
    private String storeSlug;
    private Boolean officialStore;
    private List<String> colors;
    private List<String> sizes;
    private List<MarketplaceProductCardResponse.VariantOption> variants;
}
