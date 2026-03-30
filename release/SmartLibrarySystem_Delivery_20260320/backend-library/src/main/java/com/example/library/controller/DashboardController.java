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
 * Dashboard endpoints for admin statistics.
 */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final StatisticsService statisticsService;

    /**
     * Returns core dashboard statistics (admin only).
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('report:view')")
    public ResponseEntity<DashboardStatsDto> getCoreStats() {
        return ResponseEntity.ok(statisticsService.getCoreDashboardStatistics());
    }

    /**
     * Returns dashboard analytics payload (admin only).
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('report:view')")
    public ResponseEntity<DashboardAnalyticsDto> getAnalytics() {
        return ResponseEntity.ok(statisticsService.getDashboardAnalytics());
    }
}
