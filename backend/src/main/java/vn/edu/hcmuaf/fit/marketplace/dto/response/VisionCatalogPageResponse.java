package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisionCatalogPageResponse {
    private List<VisionCatalogItemResponse> items;
    private long totalProducts;
    private int page;
    private int size;
    private int totalPages;
    private LocalDateTime generatedAt;
}

