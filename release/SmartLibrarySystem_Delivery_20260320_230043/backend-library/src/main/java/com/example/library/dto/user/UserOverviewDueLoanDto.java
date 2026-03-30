package com.example.library.dto.user;

import lombok.Data;

import java.time.LocalDate;

/**
 * Compact due-soon loan item for user overview.
 */
@Data
public class UserOverviewDueLoanDto {
    private Integer loanId;
    private Integer bookId;
    private String bookTitle;
    private LocalDate dueDate;
    private Long daysRemaining;
    private String status;
}
