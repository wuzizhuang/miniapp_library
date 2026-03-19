package com.example.library.service;

import com.example.library.dto.recommendation.RecommendationCreateDto;
import com.example.library.dto.recommendation.RecommendationPostDto;
import org.springframework.data.domain.Page;

public interface RecommendationService {

    Page<RecommendationPostDto> getFeed(Integer currentUserId, String scope, int page, int size);

    RecommendationPostDto createRecommendation(Integer currentUserId, RecommendationCreateDto dto);

    void deleteRecommendation(Integer currentUserId, Long postId);

    void likeRecommendation(Integer currentUserId, Long postId);

    void unlikeRecommendation(Integer currentUserId, Long postId);

    void followTeacher(Integer currentUserId, Integer teacherUserId);

    void unfollowTeacher(Integer currentUserId, Integer teacherUserId);
}
