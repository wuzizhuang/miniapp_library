package com.example.library.controller;

import com.example.library.dto.JwtResponseDto;
import com.example.library.dto.auth.AuthContextDto;
import com.example.library.dto.auth.ForgotPasswordRequestDto;
import com.example.library.dto.auth.LogoutRequestDto;
import com.example.library.dto.auth.PasswordResetActionResponseDto;
import com.example.library.dto.auth.PasswordResetTokenValidationDto;
import com.example.library.dto.auth.RefreshTokenRequestDto;
import com.example.library.dto.auth.ResetPasswordRequestDto;
import com.example.library.dto.user.UserCreateDto;
import com.example.library.dto.user.UserDto;
import com.example.library.dto.user.UserLoginDto;
import com.example.library.exception.UnauthorizedException;
import com.example.library.security.JwtUtils;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.TokenBlacklistService;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.PasswordResetService;
import com.example.library.service.RefreshTokenService;
import com.example.library.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * 认证控制器。
 * 负责登录、注册、会话刷新、退出登录以及找回密码相关接口。
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserService userService;
    private final PasswordResetService passwordResetService;
    private final RequestRateLimitService requestRateLimitService;
    private final RefreshTokenService refreshTokenService;

    /**
     * 获取当前登录用户的个人资料。
     */
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(userService.getUserByUsername(authenticatedUser.getUsername()));
    }

    /**
     * 获取当前用户的认证上下文。
     * 主要用于前端根据角色和权限渲染 RBAC 相关界面。
     */
    @GetMapping("/context")
    public ResponseEntity<AuthContextDto> getCurrentAuthContext(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserDetailsImpl authenticatedUser = requireAuthenticatedUser(userDetails);

        return ResponseEntity.ok(userService.getAuthContextByUsername(authenticatedUser.getUsername()));
    }

    /**
     * 注册新用户。
     */
    @PostMapping("/register")
    public ResponseEntity<UserDto> registerUser(
            HttpServletRequest request,
            @Valid @RequestBody UserCreateDto userCreateDto) {
        requestRateLimitService.checkRegisterLimit(request, userCreateDto.getUsername(), userCreateDto.getEmail());
        UserDto registeredUser = userService.createUser(userCreateDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(registeredUser);
    }

    /**
     * 用户登录并签发访问令牌与刷新令牌。
     */
    @PostMapping("/login")
    public ResponseEntity<JwtResponseDto> authenticateUser(
            HttpServletRequest request,
            @Valid @RequestBody UserLoginDto loginRequest) {
        requestRateLimitService.checkLoginLimit(request, loginRequest.getUsername());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(refreshTokenService.issueSession(userDetails.getId(), userDetails.getUsername()));
    }

    /**
     * 当前用户退出登录。
     * 除了清理安全上下文外，还会尝试撤销刷新令牌并将访问令牌加入黑名单。
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody(required = false) LogoutRequestDto requestDto) {
        if (userDetails != null) {
            userService.invalidateTokensForUserId(userDetails.getId());
        }
        if (requestDto != null && requestDto.getRefreshToken() != null && !requestDto.getRefreshToken().isBlank()) {
            refreshTokenService.revokeRefreshToken(requestDto.getRefreshToken());
        }

        String jwt = jwtUtils.parseJwt(request);
        if (jwt != null) {
            try {
                tokenBlacklistService.blacklistToken(jwt, jwtUtils.getExpirationFromJwtToken(jwt).toInstant());
                log.info("JWT added to blacklist on logout");
            } catch (Exception ex) {
                log.warn("Unable to blacklist JWT during logout: {}", ex.getMessage());
            }
        }

        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }

    /**
     * 使用刷新令牌换取一组新的访问令牌与刷新令牌。
     */
    @PostMapping("/refresh")
    public ResponseEntity<JwtResponseDto> refreshToken(@Valid @RequestBody RefreshTokenRequestDto requestDto) {
        return ResponseEntity.ok(refreshTokenService.refreshSession(requestDto.getRefreshToken()));
    }

    /**
     * 发起找回密码流程。
     * 无论邮箱是否存在，都返回统一响应，避免泄露账号存在性。
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<PasswordResetActionResponseDto> requestPasswordReset(
            HttpServletRequest request,
            @Valid @RequestBody ForgotPasswordRequestDto requestDto) {
        requestRateLimitService.checkForgotPasswordLimit(request, requestDto.getEmail());
        return ResponseEntity.accepted().body(passwordResetService.requestPasswordReset(requestDto.getEmail()));
    }

    /**
     * 校验密码重置令牌是否仍可使用。
     */
    @GetMapping("/reset-password/validate")
    public ResponseEntity<PasswordResetTokenValidationDto> validateResetToken(@RequestParam String token) {
        return ResponseEntity.ok(passwordResetService.validateResetToken(token));
    }

    /**
     * 使用有效的重置令牌完成密码重置。
     */
    @PostMapping("/reset-password")
    public ResponseEntity<PasswordResetActionResponseDto> resetPassword(
            HttpServletRequest request,
            @Valid @RequestBody ResetPasswordRequestDto requestDto) {
        requestRateLimitService.checkResetPasswordLimit(request);
        return ResponseEntity.ok(passwordResetService.resetPassword(requestDto.getToken(), requestDto.getPassword()));
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
