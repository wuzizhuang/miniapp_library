package com.example.library.dto;

import com.example.library.entity.Loan;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Loan response DTO.
 */
@Data
public class LoanDto {
    private Integer loanId;
    private Integer copyId;
    private Integer bookId;
    private String bookTitle;
    private String bookIsbn;
    private String bookCoverUrl;
    private String bookAuthorNames;
    private String categoryName;
    private String locationCode;
    private Integer userId;
    private String username;
    private String userFullName;
    private LocalDate borrowDate;
    private LocalDate dueDate;
    private LocalDate returnDate;
    private Loan.LoanStatus status;
    private Long daysOverdue;
    private Long daysRemaining;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    private Integer renewalCount;
}
