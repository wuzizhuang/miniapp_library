package com.example.library.dto;

import lombok.Data;
import java.math.BigDecimal;

/**
 * Dashboard statistics DTO.
 */
@Data
public class DashboardStatsDto {
    private Long totalUsers;
    private Long activeLoans;
    private Long overdueLoans;
    private Long availableCopies;
    private Long pendingReservations;
    private BigDecimal totalPendingFines;
}
