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

    /**
     * 柜台代借时由操作员二次输入的读者账号，用于复核 userId 是否录入正确。
     */
    private String confirmUsername;
}
