package com.example.library.controller;

import com.example.library.dto.ReviewResponseDto;
import com.example.library.entity.BookReview;
import com.example.library.exception.BadRequestException;
import com.example.library.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Admin endpoints for managing book reviews (audit/approval).
 */
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
public class AdminReviewController {

    private final ReviewService reviewService;

    /**
     * Returns pending reviews for admin audit.
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('review:audit')")
    public ResponseEntity<Page<ReviewResponseDto>> getPendingReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(
                reviewService.getPendingReviews(PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "createTime"))));
    }

    /**
     * Returns review list for admin with optional status and keyword filters.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('review:audit')")
    public ResponseEntity<Page<ReviewResponseDto>> getReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        BookReview.ReviewStatus parsedStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                parsedStatus = BookReview.ReviewStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Invalid review status: " + status);
            }
        }

        return ResponseEntity.ok(
                reviewService.getAdminReviews(
                        parsedStatus,
                        keyword,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"))));
    }

    /**
     * Approves or rejects a review.
     *
     * @param id       review ID
     * @param approved true to approve, false to reject
     */
    @PutMapping("/{id}/audit")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('review:audit')")
    public ResponseEntity<ReviewResponseDto> auditReview(
            @PathVariable Integer id,
            @RequestParam boolean approved) {
        return ResponseEntity.ok(reviewService.auditReview(id, approved));
    }
}
