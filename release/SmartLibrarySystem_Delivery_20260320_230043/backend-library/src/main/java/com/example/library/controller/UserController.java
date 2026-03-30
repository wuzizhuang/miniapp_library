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
 * 用户控制器。
 * 提供用户个人中心、资料维护、后台用户查询以及借阅概览接口。
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final LoanService loanService;
    private final UserOverviewService userOverviewService;

    /**
     * 获取当前用户个人中心总览数据。
     */
    @GetMapping("/me/overview")
    public ResponseEntity<UserOverviewDto> getMyOverview(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(userOverviewService.getOverview(authenticatedUser.getId()));
    }

    /**
     * 获取当前用户完整资料。
     */
    @GetMapping("/me/profile")
    public ResponseEntity<UserProfileDto> getMyProfile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(userService.getUserProfile(authenticatedUser.getUsername()));
    }

    /**
     * 更新当前用户个人资料。
     */
    @PutMapping("/me/profile")
    public ResponseEntity<UserProfileDto> updateMyProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody ProfileUpdateDto profileUpdateDto) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(userService.updateProfile(authenticatedUser.getUsername(), profileUpdateDto));
    }

    /**
     * 分页查询用户列表。
     * 支持关键字、角色和状态筛选，供后台用户管理页面使用。
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
     * 根据用户 ID 查询基础资料。
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or authentication.principal.id == #id")
    public ResponseEntity<UserDto> getUserById(@PathVariable Integer id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    /**
     * 根据用户 ID 查询个人中心总览。
     */
    @GetMapping("/{id}/overview")
    @PreAuthorize("hasRole('ADMIN') or authentication.principal.id == #id")
    public ResponseEntity<UserOverviewDto> getUserOverviewById(@PathVariable Integer id) {
        return ResponseEntity.ok(userOverviewService.getOverview(id));
    }

    /**
     * 更新指定用户资料。
     * 该接口仅允许本人修改，且会主动屏蔽角色和状态字段。
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
     * 删除用户。
     * 当前业务语义通常是停用或逻辑删除用户。
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('user:manage')")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 查询指定用户的借阅记录。
     */
    @GetMapping("/{id}/loans")
    @PreAuthorize("hasRole('ADMIN') or authentication.principal.id == #id")
    public ResponseEntity<Page<LoanDto>> getUserLoans(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(loanService.getLoansByUser(id, page, size));
    }

    /**
     * 将字符串状态安全转换为用户状态枚举。
     */
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

    /**
     * 要求当前请求必须处于已登录状态。
     */
    private UserDetailsImpl requireAuthenticatedUser(UserDetailsImpl userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("请先登录后再继续");
        }

        return userDetails;
    }
}
