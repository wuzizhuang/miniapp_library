package com.example.library.controller;

import com.example.library.dto.user.AdminUserIdentityUpdateDto;
import com.example.library.dto.user.AdminUserStatusUpdateDto;
import com.example.library.dto.user.UserDto;
import com.example.library.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only user management endpoints.
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    /**
     * Updates a user's active/inactive status from the admin workflow.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('user:manage')")
    public ResponseEntity<UserDto> updateUserStatus(
            @PathVariable Integer id,
            @Valid @RequestBody AdminUserStatusUpdateDto dto) {
        return ResponseEntity.ok(userService.updateUserStatus(id, dto.getStatus()));
    }

    /**
     * Updates a user's identity type from the admin workflow.
     */
    @PatchMapping("/{id}/identity")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('user:manage')")
    public ResponseEntity<UserDto> updateUserIdentityType(
            @PathVariable Integer id,
            @Valid @RequestBody AdminUserIdentityUpdateDto dto) {
        return ResponseEntity.ok(userService.updateUserIdentityType(id, dto.getIdentityType()));
    }
}
