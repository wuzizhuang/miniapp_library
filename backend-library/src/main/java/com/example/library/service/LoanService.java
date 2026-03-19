package com.example.library.service;

import com.example.library.dto.LoanCreateDto;
import com.example.library.dto.LoanDto;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Loan management service.
 */
public interface LoanService {
    /**
     * Returns paged loan records.
     */
    Page<LoanDto> getAllLoans(int page, int size, String sortBy, String direction, String status);

    /**
     * Backward-compatible overload for callers that don't pass status filter.
     */
    default Page<LoanDto> getAllLoans(int page, int size, String sortBy, String direction) {
        return getAllLoans(page, size, sortBy, direction, null);
    }

    /**
     * Returns a user's loan records.
     */
    Page<LoanDto> getLoansByUser(Integer userId, int page, int size);

    /**
     * Returns a user's currently active (not yet returned) loans.
     */
    Page<LoanDto> getActiveLoans(Integer userId, int page, int size);

    /**
     * Returns a loan by id.
     */
    LoanDto getLoanById(Integer loanId);

    /**
     * Returns overdue loans and updates their status if needed.
     */
    List<LoanDto> checkForOverdueLoans();

    /**
     * Returns paged overdue loans.
     */
    Page<LoanDto> getOverdueLoans(int page, int size);

    /**
     * Creates a new loan.
     */
    LoanDto createLoan(LoanCreateDto loanCreateDto);

    /**
     * Returns a loan and applies fines if needed.
     */
    LoanDto returnLoan(Integer loanId);

    /**
     * Renews a loan.
     */
    LoanDto renewLoan(Integer loanId);

    /**
     * Marks a loan as lost and creates a fine.
     */
    LoanDto markLoanAsLost(Integer loanId);
}
