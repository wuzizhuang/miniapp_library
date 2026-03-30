package com.example.library.controller;

import com.example.library.dto.ReviewDto;
import com.example.library.dto.ReviewResponseDto;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 图书评论控制器。
 * 提供读者发表评论、查询我的评论、修改和删除评论接口。
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    /**
     * 提交图书评论。
     */
    @PostMapping
    public ResponseEntity<ReviewResponseDto> createReview(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody ReviewDto reviewDto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.createReview(userDetails.getId(), reviewDto));
    }

    /**
     * 查询当前用户提交过的全部评论。
     */
    @GetMapping("/me")
    public ResponseEntity<Page<ReviewResponseDto>> getMyReviews(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
        return ResponseEntity.ok(
                reviewService.getReviewsByUser(userDetails.getId(), PageRequest.of(page, size, sort)));
    }

    /**
     * 更新评论内容。
     * 仅评论本人或管理员可操作。
     */
    @PutMapping("/{id}")
    @PreAuthorize("@reviewSecurityService.isReviewOwner(authentication, #id) or hasRole('ADMIN')")
    public ResponseEntity<ReviewResponseDto> updateReview(
            @PathVariable Integer id,
            @Valid @RequestBody ReviewDto reviewDto) {
        return ResponseEntity.ok(reviewService.updateReview(id, reviewDto));
    }

    /**
     * 删除评论。
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("@reviewSecurityService.isReviewOwner(authentication, #id) or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteReview(@PathVariable Integer id) {
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }
}
