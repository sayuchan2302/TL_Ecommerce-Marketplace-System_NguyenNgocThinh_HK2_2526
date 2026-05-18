package vn.edu.hcmuaf.fit.marketplace.controller;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.marketplace.dto.request.AdminProcessReportRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminReportResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductReport;
import vn.edu.hcmuaf.fit.marketplace.service.ProductReportService;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminReportController {

    private final ProductReportService productReportService;

    @GetMapping
    public ResponseEntity<Page<AdminReportResponse>> getReports(
            @RequestParam(required = false) ProductReport.ReportStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(productReportService.getAdminReports(status, pageable));
    }

    @PatchMapping("/{reportId}/process")
    public ResponseEntity<Void> processReport(
            @PathVariable UUID reportId,
            @Valid @RequestBody AdminProcessReportRequest request,
            Authentication authentication) {
        String adminEmail = authentication != null ? authentication.getName() : null;
        productReportService.processReport(reportId, request, adminEmail);
        return ResponseEntity.noContent().build();
    }
}
