package com.example.library.service;

import com.example.library.dto.recommendation.PersonalRecommendationDto;

/**
 * 个人化推荐服务接口。
 * 基于用户的借阅历史、收藏记录、兴趣标签和相似用户行为，
 * 为其生成多维度的个性化图书推荐列表。
 */
public interface PersonalRecommendationService {

    /**
     * 获取指定用户的个人推荐结果。
     *
     * @param userId 当前登录用户 ID
     * @param limit  每个推荐维度最多返回的图书数量
     * @return 多维度推荐结果
     */
    PersonalRecommendationDto getPersonalRecommendations(Integer userId, int limit);
}
