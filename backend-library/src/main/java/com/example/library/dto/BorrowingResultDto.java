package com.example.library.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BorrowingResultDto {
    private LoanDto loan;
    private boolean success;
    private List<String> messages = new ArrayList<>();
    private boolean hasWarnings;

    public static BorrowingResultDto success(LoanDto loan) {
        return BorrowingResultDto.builder()
                .loan(loan)
                .success(true)
                .build();
    }

    public static BorrowingResultDto success(LoanDto loan, String message) {
        BorrowingResultDto result = success(loan);
        result.getMessages().add(message);
        return result;
    }

    public static BorrowingResultDto failure(String errorMessage) {
        BorrowingResultDto result = new BorrowingResultDto();
        result.setSuccess(false);
        result.getMessages().add(errorMessage);
        return result;
    }

    public BorrowingResultDto addWarning(String warningMessage) {
        this.hasWarnings = true;
        this.messages.add("WARNING: " + warningMessage);
        return this;
    }
}