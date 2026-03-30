package com.example.library.controller;

import com.example.library.dto.LoanDto;
import com.example.library.dto.user.UserDto;
import com.example.library.dto.user.UserOverviewDto;
import com.example.library.dto.user.UserProfileDto;
import com.example.library.dto.user.ProfileUpdateDto;
import com.example.library.dto.user.UserUpdateDto;
import com.example.library.entity.User;
import com.example.library.exception.UnauthorizedException;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.LoanService;
import com.example.library.service.UserOverviewService;
import com.example.library.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * User management endpoints.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final LoanService loanService;
    private final UserOverviewService userOverviewService;

    /**
     * Returns current user's aggregated overview.
     */
    @GetMapping("/me/overview")
    public ResponseEntity<UserOverviewDto> getMyOverview(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(userOverviewService.getOverview(authenticatedUser.getId()));
    }

    /**
     * Returns the current user's full profile (for frontend settings page).
     */
    @GetMapping("/me/profile")
    public ResponseEntity<UserProfileDto> getMyProfile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(userService.getUserProfile(authenticatedUser.getUsername()));
    }

    /**
     * Updates the current user's personal profile.
     */
    @PutMapping("/me/profile")
    public ResponseEntity<UserProfileDto> updateMyProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody ProfileUpdateDto profileUpdateDto) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(userService.updateProfile(authenticatedUser.getUsername(), profileUpdateDto));
    }

    /**
     * Returns all users with pagination (admin only).
     *
     * @param page page index, 0-based (default 0)
     * @param size page size (default 10)
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('user:manage')")
    public ResponseEntity<Page<UserDto>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        User.UserStatus statusFilter = parseStatus(status);

        if ((keyword == null || keyword.isBlank()) && (role == null || role.isBlank()) && statusFilter == null) {
            return ResponseEntity.ok(userService.getAllUsers(page, size));
        }

        return ResponseEntity.ok(userService.getAllUsers(page, size, keyword, role, statusFilter));
    }

    /**
     * Returns a single user's profile (admin or self).
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or authentication.principal.id == #id")
    public ResponseEntity<UserDto> getUserById(@PathVariable Integer id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    /**
     * Returns a single user's overview (admin or self).
     */
    @GetMapping("/{id}/overview")
    @PreAuthorize("hasRole('ADMIN') or authentication.principal.id == #id")
    public ResponseEntity<UserOverviewDto> getUserOverviewById(@PathVariable Integer id) {
        return ResponseEntity.ok(userOverviewService.getOverview(id));
    }

    /**
     * Updates a user profile (self only).
     */
    @PutMapping("/{id}")
    @PreAuthorize("authentication.principal.id == #id")
    public ResponseEntity<UserDto> updateUser(@PathVariable Integer id,
            @Valid @RequestBody UserUpdateDto userUpdateDto) {
        userUpdateDto.setRole(null);
        userUpdateDto.setStatus(null);
        return ResponseEntity.ok(userService.updateUser(id, userUpdateDto));
    }

    /**
     * Deactivates a user (admin only).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('user:manage')")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns a user's loan records (admin or self).
     */
    @GetMapping("/{id}/loans")
    @PreAuthorize("hasRole('ADMIN') or authentication.principal.id == #id")
    public ResponseEntity<Page<LoanDto>> getUserLoans(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(loanService.getLoansByUser(id, page, size));
    }

    private User.UserStatus parseStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return null;
        }

        try {
            return User.UserStatus.valueOf(rawStatus.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid status: " + rawStatus);
        }
    }

    private UserDetailsImpl requireAuthenticatedUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }

        return userDetails;
    }
}
