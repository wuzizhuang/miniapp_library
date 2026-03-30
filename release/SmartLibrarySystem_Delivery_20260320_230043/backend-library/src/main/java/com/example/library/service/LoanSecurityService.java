package com.example.library.service;

import org.springframework.security.core.Authentication;

/**
 * Security checks for loan ownership.
 */
public interface LoanSecurityService {

    /**
     * Returns true if the authenticated user owns the loan.
     */
    boolean isLoanOwner(Authentication authentication, Integer loanId);
}
