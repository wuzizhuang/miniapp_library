package com.example.library.service.impl;

import com.example.library.entity.BookReview;
import com.example.library.repository.BookReviewRepository;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.ReviewSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Checks whether the authenticated user owns a review.
 */
@Service
@RequiredArgsConstructor
public class ReviewSecurityServiceImpl implements ReviewSecurityService {

    private final BookReviewRepository bookReviewRepository;

    /**
     * Returns true when the current user owns the review.
     */
    @Override
    public boolean isReviewOwner(Authentication authentication, Integer reviewId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl userDetails)) {
            return false;
        }

        Integer userId = userDetails.getId();
        Optional<BookReview> reviewOpt = bookReviewRepository.findById((long) reviewId);
        if (reviewOpt.isEmpty()) {
            return false;
        }

        return reviewOpt.get().getUser().getUserId().equals(userId);
    }
}
