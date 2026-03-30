package com.example.library.service;

import com.example.library.dto.DashboardStatsDto;
import com.example.library.dto.DashboardAnalyticsDto;

/**
 * Admin statistics service.
 */
public interface StatisticsService {

    /**
     * Returns core dashboard statistics.
     */
    DashboardStatsDto getCoreDashboardStatistics();

    /**
     * Returns dashboard analytics payload for charts and recent activity.
     */
    DashboardAnalyticsDto getDashboardAnalytics();
}
