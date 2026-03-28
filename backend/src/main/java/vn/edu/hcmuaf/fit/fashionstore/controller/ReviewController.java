package vn.edu.hcmuaf.fit.fashionstore.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ReviewReplyRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ReviewStatusUpdateRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.ReviewResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.Review;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext;
import vn.edu.hcmuaf.fit.fashionstore.service.ReviewService;

import java.util.UUID;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final AuthContext authContext;

    public ReviewController(ReviewService reviewService, AuthContext authContext) {
        this.reviewService = reviewService;
        this.authContext = authContext;
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<ReviewResponse>> getAllReviews(
            @RequestParam(required = false) Review.ReviewStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(reviewService.getAllReviews(status, pageable));
    }

    @PatchMapping("/admin/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ReviewResponse> updateReviewStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewStatusUpdateRequest request) {
        return ResponseEntity.ok(reviewService.updateStatus(id, request.getStatus()));
    }

    @PostMapping("/admin/{id}/reply")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ReviewResponse> addAdminReply(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewReplyRequest request) {
        return ResponseEntity.ok(reviewService.addReply(id, request.getReply()));
    }

    @GetMapping("/my-store")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Page<ReviewResponse>> getMyStoreReviews(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) UUID storeId,
            @RequestParam(required = false) Review.ReviewStatus status,
            Pageable pageable) {
        AuthContext.UserContext ctx = authContext.requireVendor(authHeader);
        UUID resolvedStoreId = authContext.resolveStoreId(ctx, storeId);
        return ResponseEntity.ok(reviewService.getStoreReviews(resolvedStoreId, status, pageable));
    }

    @PostMapping("/my-store/{id}/reply")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<ReviewResponse> addStoreReply(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestParam(required = false) UUID storeId,
            @Valid @RequestBody ReviewReplyRequest request) {
        AuthContext.UserContext ctx = authContext.requireVendor(authHeader);
        UUID resolvedStoreId = authContext.resolveStoreId(ctx, storeId);
        return ResponseEntity.ok(reviewService.addStoreReply(id, resolvedStoreId, request.getReply()));
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteReview(@PathVariable UUID id) {
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }
}
