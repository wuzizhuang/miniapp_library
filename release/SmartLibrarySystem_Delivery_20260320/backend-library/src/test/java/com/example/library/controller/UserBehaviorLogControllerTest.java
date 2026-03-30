package com.example.library.controller;

import com.example.library.dto.UserBehaviorRequestDto;
import com.example.library.exception.RateLimitExceededException;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.UserBehaviorLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WebMvc test for {@link UserBehaviorLogController}.
 */
@WebMvcTest(UserBehaviorLogController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
class UserBehaviorLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserBehaviorLogService userBehaviorLogService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private RequestRateLimitService requestRateLimitService;

    @TestConfiguration
    static class Config {
        @Bean
        UserBehaviorLogService userBehaviorLogService() {
            return Mockito.mock(UserBehaviorLogService.class);
        }
    }

    private UserDetailsImpl mockUser;

    @BeforeEach
    void setUp() {
        Mockito.reset(userBehaviorLogService);
        mockUser = new UserDetailsImpl(
                7,
                "reader",
                "reader@example.com",
                "hashed",
                "Reader User",
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void testLogBehavior_Success() throws Exception {
        UserBehaviorRequestDto dto = new UserBehaviorRequestDto();
        dto.setBookId(10L);
        dto.setActionType("VIEW_DETAIL");
        dto.setDeviceType("web");

        mockMvc.perform(post("/api/behavior-logs")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isNoContent());

        verify(requestRateLimitService).checkBehaviorLogLimit(any(), eq(7));
        verify(userBehaviorLogService).logBehavior(7, 10, "VIEW_DETAIL", null, "web");
    }

    @Test
    void testLogBehavior_RateLimited() throws Exception {
        UserBehaviorRequestDto dto = new UserBehaviorRequestDto();
        dto.setBookId(10L);
        dto.setActionType("VIEW_DETAIL");

        doThrow(new RateLimitExceededException("行为日志提交过于频繁，请稍后再试", 8))
                .when(requestRateLimitService).checkBehaviorLogLimit(any(), isNull());

        mockMvc.perform(post("/api/behavior-logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.retryAfterSeconds").value(8));
    }
}
