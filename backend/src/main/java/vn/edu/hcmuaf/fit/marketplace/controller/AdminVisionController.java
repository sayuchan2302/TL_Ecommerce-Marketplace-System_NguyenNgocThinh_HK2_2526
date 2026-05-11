package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hcmuaf.fit.marketplace.dto.response.AdminVisionOverviewResponse;
import vn.edu.hcmuaf.fit.marketplace.service.AdminVisionService;

@RestController
@RequestMapping("/api/admin/vision")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminVisionController {

    private final AdminVisionService adminVisionService;

    public AdminVisionController(AdminVisionService adminVisionService) {
        this.adminVisionService = adminVisionService;
    }

    @GetMapping("/overview")
    public ResponseEntity<AdminVisionOverviewResponse> getOverview() {
        return ResponseEntity.ok(adminVisionService.getOverview());
    }

    @PostMapping("/sync-catalog")
    public ResponseEntity<AdminVisionOverviewResponse> syncCatalog() {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(adminVisionService.syncCatalog());
    }
}
