package com.example.library.dto;

import lombok.Data;

import java.time.LocalDate;

/**
 * Recent loan item for dashboard.
 */
@Data
public class DashboardRecentLoanDto {
    private Integer loanId;
    private String bookTitle;
    private String bookCoverUrl;
    private String userFullName;
    private LocalDate borrowDate;
    private LocalDate dueDate;
    private String status;
}
