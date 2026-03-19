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

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping
    public ResponseEntity<Page<RecommendationPostDto>> getFeed(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(recommendationService.getFeed(requireUserId(userDetails), scope, page, size));
    }

    @PostMapping
    public ResponseEntity<RecommendationPostDto> createRecommendation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody RecommendationCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recommendationService.createRecommendation(requireUserId(userDetails), dto));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deleteRecommendation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long postId) {
        recommendationService.deleteRecommendation(requireUserId(userDetails), postId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<Void> likeRecommendation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long postId) {
        recommendationService.likeRecommendation(requireUserId(userDetails), postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{postId}/like")
    public ResponseEntity<Void> unlikeRecommendation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long postId) {
        recommendationService.unlikeRecommendation(requireUserId(userDetails), postId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/teachers/{teacherUserId}/follow")
    public ResponseEntity<Void> followTeacher(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer teacherUserId) {
        recommendationService.followTeacher(requireUserId(userDetails), teacherUserId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/teachers/{teacherUserId}/follow")
    public ResponseEntity<Void> unfollowTeacher(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Integer teacherUserId) {
        recommendationService.unfollowTeacher(requireUserId(userDetails), teacherUserId);
        return ResponseEntity.noContent().build();
    }

    private Integer requireUserId(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new BadRequestException("User context is missing");
        }
        return userDetails.getId();
    }
}
