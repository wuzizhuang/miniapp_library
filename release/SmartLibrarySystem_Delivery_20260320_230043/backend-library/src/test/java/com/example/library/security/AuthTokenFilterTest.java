package com.example.library.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class AuthTokenFilterTest {

    private final TimeZone originalTimeZone = TimeZone.getDefault();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TimeZone.setDefault(originalTimeZone);
    }

    @Test
    void blacklistedTokenDoesNotAuthenticateRequest() throws Exception {
        JwtUtils jwtUtils = mock(JwtUtils.class);
        UserDetailsServiceImpl userDetailsService = mock(UserDetailsServiceImpl.class);
        TokenBlacklistService tokenBlacklistService = mock(TokenBlacklistService.class);
        AuthTokenFilter filter = new AuthTokenFilter(jwtUtils, userDetailsService);
        filter.setTokenBlacklistService(tokenBlacklistService);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer blocked-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        when(jwtUtils.parseJwt(request)).thenReturn("blocked-token");
        when(tokenBlacklistService.isBlacklisted("blocked-token")).thenReturn(true);

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(jwtUtils, never()).validateJwtToken(anyString());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenInvalidationUsesServerTimezoneInsteadOfUtc() throws Exception {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Shanghai"));

        AuthTokenFilter filter = new AuthTokenFilter(mock(JwtUtils.class), mock(UserDetailsServiceImpl.class));
        Method method = AuthTokenFilter.class.getDeclaredMethod(
                "isTokenStillValidForUser",
                Date.class,
                LocalDateTime.class);
        method.setAccessible(true);

        boolean valid = (boolean) method.invoke(
                filter,
                Date.from(Instant.parse("2026-03-13T10:00:00Z")),
                LocalDateTime.of(2026, 3, 13, 18, 0, 0));

        assertThat(valid).isTrue();
    }
}
