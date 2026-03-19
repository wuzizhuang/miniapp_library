package com.example.library.dto;

import com.example.library.entity.Fine;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Fine response DTO.
 */
@Data
public class FineDto {
    private Integer fineId;
    private Integer loanId;
    private String bookTitle;
    private Integer userId;
    private String username;
    private String userFullName;
    private BigDecimal amount;
    private String type;
    private String reason;
    private LocalDate dateIssued;
    private LocalDate datePaid;
    private Fine.FineStatus status;
}
