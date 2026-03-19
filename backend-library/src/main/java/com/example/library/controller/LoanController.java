package com.example.library.controller;

import com.example.library.dto.LoanCreateDto;
import com.example.library.dto.LoanDto;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.LoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Loan management endpoints.
 */
@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    /**
     * Returns all loans (admin only).
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage')")
    public ResponseEntity<Page<LoanDto>> getAllLoans(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "borrowDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(loanService.getAllLoans(page, size, sortBy, direction, status));
    }

    /**
     * Returns the current user's active (not yet returned) loans.
     */
    @GetMapping("/my")
    public ResponseEntity<Page<LoanDto>> getMyLoans(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(loanService.getActiveLoans(userDetails.getId(), page, size));
    }

    /**
     * Returns personal loan history (returned/all loans).
     */
    @GetMapping("/history")
    public ResponseEntity<Page<LoanDto>> getMyHistory(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(loanService.getLoansByUser(userDetails.getId(), page, size));
    }

    /**
     * Returns a loan by id (admin or owner).
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @loanSecurityService.isLoanOwner(authentication, #id)")
    public ResponseEntity<LoanDto> getLoanById(@PathVariable Integer id) {
        return ResponseEntity.ok(loanService.getLoanById(id));
    }

    /**
     * Creates a new loan.
     * - Normal users: always borrow for themselves.
     * - Admin: can specify userId to borrow on behalf of another user.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:write') or hasAuthority('loan:manage')")
    public ResponseEntity<LoanDto> createLoan(
            @Valid @RequestBody LoanCreateDto loanCreateDto,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        // Non-admin users can only borrow for themselves (ignore any userId in request)
        if (!isAdmin) {
            loanCreateDto.setUserId(userDetails.getId());
        } else if (loanCreateDto.getUserId() == null) {
            // Admin didn't specify a user — default to self
            loanCreateDto.setUserId(userDetails.getId());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(loanService.createLoan(loanCreateDto));
    }

    /**
     * Returns a borrowed copy (admin or owner).
     */
    @PutMapping("/{id}/return")
    @PreAuthorize("hasRole('ADMIN') or @loanSecurityService.isLoanOwner(authentication, #id)")
    public ResponseEntity<LoanDto> returnLoan(@PathVariable Integer id) {
        return ResponseEntity.ok(loanService.returnLoan(id));
    }

    /**
     * Renews a loan (admin or owner).
     */
    @PutMapping("/{id}/renew")
    @PreAuthorize("hasRole('ADMIN') or @loanSecurityService.isLoanOwner(authentication, #id)")
    public ResponseEntity<LoanDto> renewLoan(@PathVariable Integer id) {
        return ResponseEntity.ok(loanService.renewLoan(id));
    }

    /**
     * Marks a loan as lost (admin or owner).
     */
    @PutMapping("/{id}/lost")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage')")
    public ResponseEntity<LoanDto> markLoanAsLost(@PathVariable Integer id) {
        return ResponseEntity.ok(loanService.markLoanAsLost(id));
    }

    /**
     * Returns overdue loans (admin only).
     */
    @GetMapping("/overdue")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage')")
    public ResponseEntity<Page<LoanDto>> getOverdueLoans(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(loanService.getOverdueLoans(page, size));
    }
}
