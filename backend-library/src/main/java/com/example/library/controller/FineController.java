package com.example.library.controller;

import com.example.library.dto.FineDto;
import com.example.library.entity.Fine;
import com.example.library.exception.UnauthorizedException;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.FineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Fine management endpoints.
 */
@RestController
@RequestMapping("/api/fines")
@RequiredArgsConstructor
public class FineController {

    private final FineService fineService;

    /**
     * Returns the current user's fines (paginated).
     */
    @GetMapping("/me")
    public ResponseEntity<Page<FineDto>> getMyFines(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(fineService.getFinesByUser(authenticatedUser.getId(), page, size));
    }

    /**
     * Returns all fines (admin only).
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage') or hasAuthority('fine:waive')")
    public ResponseEntity<Page<FineDto>> getAllFines(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Fine.FineStatus status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(fineService.getAllFines(page, size, status, keyword));
    }

    /**
     * Returns the total unpaid amount across the system.
     */
    @GetMapping("/pending-total")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage') or hasAuthority('fine:waive')")
    public ResponseEntity<java.math.BigDecimal> getPendingTotal() {
        return ResponseEntity.ok(fineService.getTotalPendingFines());
    }

    /**
     * Returns a fine by ID (admin or fine owner).
     */
    @GetMapping("/{fineId}")
    @PreAuthorize("hasRole('ADMIN') or @fineSecurityService.isFineOwner(authentication, #fineId)")
    public ResponseEntity<FineDto> getFineById(@PathVariable Integer fineId) {
        return ResponseEntity.ok(fineService.getFineById(fineId));
    }

    /**
     * Returns fines for a specific user (admin only).
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage')")
    public ResponseEntity<Page<FineDto>> getFinesByUser(
            @PathVariable Integer userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(fineService.getFinesByUser(userId, page, size));
    }

    /**
     * Pays a fine (admin or fine owner).
     */
    @PostMapping("/{fineId}/pay")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage') or @fineSecurityService.isFineOwner(authentication, #fineId)")
    public ResponseEntity<FineDto> payFine(@PathVariable Integer fineId) {
        return ResponseEntity.ok(fineService.payFine(fineId));
    }

    /**
     * Waives a fine (admin only).
     */
    @PostMapping("/{fineId}/waive")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('fine:waive')")
    public ResponseEntity<FineDto> waiveFine(@PathVariable Integer fineId) {
        return ResponseEntity.ok(fineService.waiveFine(fineId));
    }

    private UserDetailsImpl requireAuthenticatedUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }

        return userDetails;
    }
}
