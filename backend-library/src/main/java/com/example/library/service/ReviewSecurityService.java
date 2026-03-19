package com.example.library.service;

import org.springframework.security.core.Authentication;

/**
 * Security checks for review ownership.
 */
public interface ReviewSecurityService {

    /**
     * Returns true if the authenticated user owns the review.
     */
    boolean isReviewOwner(Authentication authentication, Integer reviewId);
}
