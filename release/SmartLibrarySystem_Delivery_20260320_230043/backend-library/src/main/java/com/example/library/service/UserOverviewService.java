package com.example.library.service;

import com.example.library.dto.user.UserOverviewDto;

/**
 * Aggregates current-user overview data.
 */
public interface UserOverviewService {

    /**
     * Returns the overview payload for a user.
     */
    UserOverviewDto getOverview(Integer userId);
}
