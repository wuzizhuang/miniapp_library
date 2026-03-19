package com.example.library.controller;

import com.example.library.dto.JwtResponseDto;
import com.example.library.dto.auth.LogoutRequestDto;
import com.example.library.dto.auth.RefreshTokenRequestDto;
import com.example.library.dto.auth.PasswordResetActionResponseDto;
import com.example.library.dto.auth.PasswordResetTokenValidationDto;
import com.example.library.dto.user.UserCreateDto;
import com.example.library.dto.user.UserDto;
import com.example.library.dto.user.UserLoginDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.SecurityConfig;
import com.example.library.security.TokenBlacklistService;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.PasswordResetService;
import com.example.library.service.RefreshTokenService;
import com.example.library.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Date;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WebMvc test for {@link AuthController}.
 */
@WebMvcTest(AuthController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private AuthenticationManager authenticationManager;

    @MockitoBean
    private PasswordResetService passwordResetService;

    @MockitoBean
    private TokenBlacklistService tokenBlacklistService;

    @MockitoBean
    private RequestRateLimitService requestRateLimitService;

    @MockitoBean
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        Mockito.reset(userService, authenticationManager, passwordResetService);
    }

    @Test
    void testRegister_Success() throws Exception {
        UserCreateDto createDto = new UserCreateDto();
        createDto.setUsername("testuser");
        createDto.setPassword("Password123!");
        createDto.setEmail("test@example.com");
        createDto.setFullName("Test User");

        UserDto returned = new UserDto();
        returned.setUserId(1);
        returned.setUsername("testuser");

        when(userService.createUser(any(UserCreateDto.class))).thenReturn(returned);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("testuser"));

        verify(requestRateLimitService).checkRegisterLimit(any(), eq("testuser"), eq("test@example.com"));
    }

    @Test
    void testLogin_Success() throws Exception {
        UserLoginDto loginDto = new UserLoginDto();
        loginDto.setUsername("admin");
        loginDto.setPassword("admin123");

        UserDetailsImpl userDetails = new UserDetailsImpl(
                1, "admin", "admin@example.com", "hashed",
                "Admin User", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null,
                userDetails.getAuthorities());

        when(authenticationManager.authenticate(any())).thenReturn(auth);
        JwtResponseDto session = new JwtResponseDto();
        session.setToken("mock-jwt-token");
        session.setRefreshToken("mock-refresh-token");
        session.setUsername("admin");
        session.setUserId(1);
        when(refreshTokenService.issueSession(1, "admin")).thenReturn(session);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock-jwt-token"))
                .andExpect(jsonPath("$.refreshToken").value("mock-refresh-token"))
                .andExpect(jsonPath("$.username").value("admin"));

        verify(requestRateLimitService).checkLoginLimit(any(), eq("admin"));
    }

    @Test
    void testGetMe_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("请先登录后再继续"))
                .andExpect(jsonPath("$.path").value("/api/auth/me"));
    }

    @Test
    void testGetMe_Authenticated() throws Exception {
        UserDto userDto = new UserDto();
        userDto.setUserId(1);
        userDto.setUsername("testuser");
        when(userService.getUserByUsername("testuser")).thenReturn(userDto);

        UserDetailsImpl userDetails = new UserDetailsImpl(
                1, "testuser", "test@example.com", "hashed",
                "Test User", List.of(new SimpleGrantedAuthority("ROLE_USER")));

        mockMvc.perform(get("/api/auth/me").with(user(userDetails)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @WithMockUser
    void testLogout_Success() throws Exception {
        when(jwtUtils.parseJwt(any())).thenReturn("logout-token");
        when(jwtUtils.getExpirationFromJwtToken("logout-token")).thenReturn(new Date(System.currentTimeMillis() + 60000));
        LogoutRequestDto logoutRequest = new LogoutRequestDto();
        logoutRequest.setRefreshToken("refresh-token");

        mockMvc.perform(post("/api/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logoutRequest))
                .header("Authorization", "Bearer logout-token"))
                .andExpect(status().isOk());

        verify(tokenBlacklistService).blacklistToken(eq("logout-token"), any());
        verify(refreshTokenService).revokeRefreshToken("refresh-token");
    }

    @Test
    void testRefreshToken_Success() throws Exception {
        JwtResponseDto session = new JwtResponseDto();
        session.setToken("new-access-token");
        session.setRefreshToken("new-refresh-token");
        session.setUsername("reader");
        RefreshTokenRequestDto refreshRequest = new RefreshTokenRequestDto();
        refreshRequest.setRefreshToken("refresh-token");
        when(refreshTokenService.refreshSession("refresh-token")).thenReturn(session);

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("new-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("new-refresh-token"));
    }

    @Test
    void testForgotPassword_Accepted() throws Exception {
        when(passwordResetService.requestPasswordReset("user@example.com"))
                .thenReturn(new PasswordResetActionResponseDto(
                        "If the email exists, a password reset link has been generated.",
                        "LOG",
                        30));

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"user@example.com"}
                        """))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.deliveryMethod").value("LOG"));

        verify(requestRateLimitService).checkForgotPasswordLimit(any(), eq("user@example.com"));
    }

    @Test
    void testValidateResetToken_Success() throws Exception {
        when(passwordResetService.validateResetToken("token-123"))
                .thenReturn(new PasswordResetTokenValidationDto(true, "Reset link is valid."));

        mockMvc.perform(get("/api/auth/reset-password/validate")
                .param("token", "token-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));
    }

    @Test
    void testResetPassword_Success() throws Exception {
        when(passwordResetService.resetPassword("token-123", "NewPassword123!"))
                .thenReturn(new PasswordResetActionResponseDto(
                        "Password reset successful. Please log in with your new password.",
                        "LOG",
                        null));

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"token":"token-123","password":"NewPassword123!"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password reset successful. Please log in with your new password."));

        verify(requestRateLimitService).checkResetPasswordLimit(any());
    }

    @Test
    void testLogin_RateLimited() throws Exception {
        UserLoginDto loginDto = new UserLoginDto();
        loginDto.setUsername("admin");
        loginDto.setPassword("admin123");
        doThrow(new com.example.library.exception.RateLimitExceededException("登录尝试过于频繁，请稍后再试", 60))
                .when(requestRateLimitService).checkLoginLimit(any(), eq("admin"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.retryAfterSeconds").value(60));
    }

    @Test
    void testRegister_RateLimited() throws Exception {
        UserCreateDto createDto = new UserCreateDto();
        createDto.setUsername("testuser");
        createDto.setPassword("Password123!");
        createDto.setEmail("test@example.com");
        createDto.setFullName("Test User");

        doThrow(new com.example.library.exception.RateLimitExceededException("注册请求过于频繁，请稍后再试", 120))
                .when(requestRateLimitService)
                .checkRegisterLimit(any(), eq("testuser"), eq("test@example.com"));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.retryAfterSeconds").value(120));
    }
}
