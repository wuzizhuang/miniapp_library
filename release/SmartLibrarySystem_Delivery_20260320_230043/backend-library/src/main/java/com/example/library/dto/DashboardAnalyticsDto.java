package com.example.library.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Full dashboard analytics payload.
 */
@Data
public class DashboardAnalyticsDto {
    private DashboardStatsDto summary;
    private List<DashboardTrendPointDto> loanTrend = new ArrayList<>();
    private List<DashboardBreakdownItemDto> reservationStatus = new ArrayList<>();
    private List<DashboardBreakdownItemDto> fineStatus = new ArrayList<>();
    private List<DashboardBreakdownItemDto> topKeywords = new ArrayList<>();
    private List<DashboardBreakdownItemDto> behaviorActions = new ArrayList<>();
    private List<DashboardRecentLoanDto> recentLoans = new ArrayList<>();
}
