package com.example.library.controller;

import com.example.library.dto.DashboardAnalyticsDto;
import com.example.library.dto.DashboardStatsDto;
import com.example.library.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 后台看板控制器。
 * 提供后台首页统计卡片和分析图表数据接口。
 */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final StatisticsService statisticsService;

    /**
     * 获取后台核心统计卡片数据。
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('report:view')")
    public ResponseEntity<DashboardStatsDto> getCoreStats() {
        return ResponseEntity.ok(statisticsService.getCoreDashboardStatistics());
    }

    /**
     * 获取后台分析图表数据。
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('report:view')")
    public ResponseEntity<DashboardAnalyticsDto> getAnalytics() {
        return ResponseEntity.ok(statisticsService.getDashboardAnalytics());
    }
}
