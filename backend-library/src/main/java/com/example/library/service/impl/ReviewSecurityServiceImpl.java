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
 * 评论数据权限服务。
 * 用于校验当前登录用户是否拥有指定评论。
 */
@Service
@RequiredArgsConstructor
public class ReviewSecurityServiceImpl implements ReviewSecurityService {

    private final BookReviewRepository bookReviewRepository;

    /**
     * 判断当前用户是否拥有指定评论。
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
        // 评论主键在仓储层使用 Long，这里做一次安全转换后再查归属。
        Optional<BookReview> reviewOpt = bookReviewRepository.findById((long) reviewId);
        if (reviewOpt.isEmpty()) {
            return false;
        }

        return reviewOpt.get().getUser().getUserId().equals(userId);
    }
}
