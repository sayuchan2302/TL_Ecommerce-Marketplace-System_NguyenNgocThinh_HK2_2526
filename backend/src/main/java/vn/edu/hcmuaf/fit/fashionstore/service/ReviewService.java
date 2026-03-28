package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.ReviewResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.Review;
import vn.edu.hcmuaf.fit.fashionstore.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.fashionstore.repository.ReviewRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;

    public ReviewService(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    private List<String> toPlainImages(Review review) {
        List<String> images = review.getImages();
        if (images == null || images.isEmpty()) {
            return Collections.emptyList();
        }
        // Break Hibernate lazy collection reference before leaving transaction boundary.
        return new ArrayList<>(images);
    }

    private ReviewResponse toReviewResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .storeId(review.getStoreId())
                .productId(review.getProduct() != null ? review.getProduct().getId() : null)
                .productName(review.getProduct() != null ? review.getProduct().getName() : "Unknown Product")
                .productImage(review.getProduct() != null && review.getProduct().getImages() != null && !review.getProduct().getImages().isEmpty() ? review.getProduct().getImages().get(0).getUrl() : null)
                .customerName(review.getUser() != null ? review.getUser().getName() : "Unknown Customer")
                .customerEmail(review.getUser() != null ? review.getUser().getEmail() : "Unknown Email")
                .rating(review.getRating())
                .content(review.getContent())
                .images(toPlainImages(review))
                .date(review.getCreatedAt())
                .status(review.getStatus() != null ? review.getStatus().name() : null)
                .reply(review.getShopReply())
                .replyAt(review.getShopReplyAt())
                .orderId(review.getOrder() != null ? review.getOrder().getId().toString() : null)
                .version(review.getVersion())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getAllReviews(Review.ReviewStatus status, Pageable pageable) {
        Page<Review> page = status == null ? reviewRepository.findAll(pageable) : reviewRepository.findByStatus(status, pageable);
        List<ReviewResponse> content = page.getContent().stream()
                .map(this::toReviewResponse)
                .collect(Collectors.toList());
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getStoreReviews(UUID storeId, Review.ReviewStatus status, Pageable pageable) {
        Page<Review> page = status == null
                ? reviewRepository.findByStoreId(storeId, pageable)
                : reviewRepository.findByStoreIdAndStatus(storeId, status, pageable);

        List<ReviewResponse> content = page.getContent().stream()
                .map(this::toReviewResponse)
                .collect(Collectors.toList());
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    @Transactional
    public ReviewResponse updateStatus(UUID id, Review.ReviewStatus status) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        review.setStatus(status);
        return toReviewResponse(reviewRepository.save(review));
    }

    @Transactional
    public ReviewResponse addReply(UUID id, String reply) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        review.setShopReply(reply);
        review.setShopReplyAt(LocalDateTime.now());
        // Auto-approve if pending
        if (review.getStatus() == Review.ReviewStatus.PENDING) {
            review.setStatus(Review.ReviewStatus.APPROVED);
        }
        return toReviewResponse(reviewRepository.save(review));
    }

    @Transactional
    public ReviewResponse addStoreReply(UUID id, UUID storeId, String reply) {
        Review review = reviewRepository.findByIdAndStoreId(id, storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        review.setShopReply(reply);
        review.setShopReplyAt(LocalDateTime.now());
        if (review.getStatus() == Review.ReviewStatus.PENDING) {
            review.setStatus(Review.ReviewStatus.APPROVED);
        }
        return toReviewResponse(reviewRepository.save(review));
    }

    @Transactional
    public void deleteReview(UUID id) {
        if (!reviewRepository.existsById(id)) {
            throw new ResourceNotFoundException("Review not found");
        }
        reviewRepository.deleteById(id);
    }
}
