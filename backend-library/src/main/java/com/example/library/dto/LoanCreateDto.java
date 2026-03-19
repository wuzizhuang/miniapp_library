package com.example.library.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Loan creation request DTO.
 */
@Data
public class LoanCreateDto {
    @NotNull(message = "Copy ID is required")
    private Integer copyId;

    private Integer userId;
}
