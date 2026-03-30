package com.example.library.dto.user;

import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Aggregated overview data for the current user.
 */
@Data
public class UserOverviewDto {
    private Integer userId;
    private String username;
    private String fullName;
    private Long activeLoanCount;
    private Long dueSoonLoanCount;
    private List<UserOverviewDueLoanDto> dueSoonLoans = new ArrayList<>();
    private Long activeReservationCount;
    private Long readyReservationCount;
    private Long pendingFineCount;
    private BigDecimal pendingFineTotal;
    private Long unreadNotificationCount;
    private Long favoriteCount;
    private Long pendingServiceAppointmentCount;
    private Long completedServiceAppointmentCount;
}
