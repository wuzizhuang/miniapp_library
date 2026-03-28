package com.example.library.controller;

import com.example.library.dto.recommendation.PersonalRecommendationDto;
import com.example.library.exception.BadRequestException;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.PersonalRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 个人推荐控制器。
 * 为登录用户提供基于借阅历史、收藏、兴趣标签和行为画像的多维度图书推荐。
 */
@RestController
@RequestMapping("/api/personal-recommendations")
@RequiredArgsConstructor
public class PersonalRecommendationController {

    private final PersonalRecommendationService personalRecommendationService;

    /**
     * 获取当前登录用户的个人推荐列表。
     *
     * @param userDetails 从 JWT Token 中解析的用户上下文
     * @param limit       每个推荐维度最多返回多少本书（默认 6，最大 20）
     * @return 多维度的推荐结果
     */
    @GetMapping
    public ResponseEntity<PersonalRecommendationDto> getPersonalRecommendations(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "6") int limit) {
        if (userDetails == null) {
            throw new BadRequestException("User context is missing");
        }
        return ResponseEntity.ok(
                personalRecommendationService.getPersonalRecommendations(userDetails.getId(), limit));
    }
}
