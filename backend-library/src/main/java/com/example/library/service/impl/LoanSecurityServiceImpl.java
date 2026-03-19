package com.example.library.service.impl;

import com.example.library.entity.Loan;
import com.example.library.repository.LoanRepository;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.LoanSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Checks whether the authenticated user owns a loan record.
 */
@Service
@RequiredArgsConstructor
public class LoanSecurityServiceImpl implements LoanSecurityService {
    private final LoanRepository loanRepository;

    /**
     * Returns true when the current user owns the loan.
     */
    @Override
    public boolean isLoanOwner(Authentication authentication, Integer loanId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl)) {
            return false;
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) principal;
        Integer userId = userDetails.getId();

        Optional<Loan> loanOpt = loanRepository.findById(loanId);
        if (loanOpt.isEmpty()) {
            return false;
        }

        return loanOpt.get().getUser().getUserId().equals(userId);
    }
}
