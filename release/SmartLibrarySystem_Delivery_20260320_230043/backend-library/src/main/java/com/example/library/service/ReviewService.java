package com.example.library.service;

import com.example.library.dto.ReviewDto;
import com.example.library.dto.ReviewResponseDto;
import com.example.library.entity.BookReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Review service.
 */
public interface ReviewService {
    /**
     * Creates a review for a book.
     */
    ReviewResponseDto createReview(Integer userId, ReviewDto reviewDto);

    /**
     * Returns approved reviews for a book.
     */
    Page<ReviewResponseDto> getReviewsByBookId(Integer bookId, Pageable pageable);

    /**
     * Updates review moderation status.
     */
    void updateReviewStatus(Long reviewId, BookReview.ReviewStatus status);

    /**
     * Returns pending reviews for admin audit.
     */
    Page<ReviewResponseDto> getPendingReviews(Pageable pageable);

    /**
     * Returns admin review list with optional status and keyword filters.
     */
    Page<ReviewResponseDto> getAdminReviews(BookReview.ReviewStatus status, String keyword, Pageable pageable);

    /**
     * Approves or rejects a review.
     */
    ReviewResponseDto auditReview(Integer reviewId, boolean approved);

    /**
     * Returns reviews submitted by a specific user.
     */
    Page<ReviewResponseDto> getReviewsByUser(Integer userId, Pageable pageable);

    /**
     * Updates a review's content.
     */
    ReviewResponseDto updateReview(Integer reviewId, ReviewDto reviewDto);

    /**
     * Deletes a review.
     */
    void deleteReview(Integer reviewId);
}
