package com.example.library.controller;

import com.example.library.dto.recommendation.RecommendationCreateDto;
import com.example.library.dto.recommendation.RecommendationPostDto;
import com.example.library.exception.BadRequestException;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 推荐动态控制器。
 * 提供推荐流查看、发帖、点赞以及关注教师推荐人的接口。
 */
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * 获取推荐动态流。
     * scope 支持 `all`、`following`、`mine` 三种范围。
     */
    @GetMapping
    public ResponseEntity<Page<RecommendationPostDto>> getFeed(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(recommendationService.getFeed(requireUserId(userDetails), scope, page, size));
    }

    /**
     * 发布一条新的图书推荐动态。
     */
    @PostMapping
    public ResponseEntity<RecommendationPostDto> createRecommendation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody RecommendationCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recommendationService.createRecommendation(requireUserId(userDetails), dto));
    }

    /**
     * 删除推荐动态。
     */
    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deleteRecommendation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long postId) {
        recommendationService.deleteRecommendation(requireUserId(userDetails), postId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 点赞推荐动态。
     */
    @PostMapping("/{postId}/like")
    public ResponseEntity<Void> likeRecommendation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long postId) {
        recommendationService.likeRecommendation(requireUserId(userDetails), postId);
        return ResponseEntity.ok().build();
    }

    /**
     * 取消点赞推荐动态。
     */
    @DeleteMapping("/{postId}/like")
    public ResponseEntity<Void> unlikeRecommendation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long postId) {
        recommendationService.unlikeRecommendation(requireUserId(userDetails), postId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 关注某位教师推荐人。
     */
    @PostMapping("/teachers/{teacherUserId}/follow")
    public ResponseEntity<Void> followTeacher(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer teacherUserId) {
        recommendationService.followTeacher(requireUserId(userDetails), teacherUserId);
        return ResponseEntity.ok().build();
    }

    /**
     * 取消关注某位教师推荐人。
     */
    @DeleteMapping("/teachers/{teacherUserId}/follow")
    public ResponseEntity<Void> unfollowTeacher(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer teacherUserId) {
        recommendationService.unfollowTeacher(requireUserId(userDetails), teacherUserId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 从认证上下文中提取用户 ID。
     */
    private Integer requireUserId(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new BadRequestException("User context is missing");
        }
        return userDetails.getId();
    }
}
