package com.example.library.controller;

import com.example.library.dto.NotificationDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WebMvc test for {@link NotificationController}.
 */
@WebMvcTest(NotificationController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NotificationService notificationService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public NotificationService notificationService() {
            return Mockito.mock(NotificationService.class);
        }
    }

    private UserDetailsImpl mockUser;

    @BeforeEach
    void setUp() {
        Mockito.reset(notificationService);
        mockUser = new UserDetailsImpl(1, "testuser", "test@example.com", "hashed",
                "Test User", List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void testGetMyNotifications_Success() throws Exception {
        when(notificationService.getNotificationsByUser(anyInt(), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(new NotificationDto())));

        mockMvc.perform(get("/api/notifications")
                .with(user(mockUser)))
                .andExpect(status().isOk());

        verify(notificationService).getNotificationsByUser(1, 0, 10);
    }

    @Test
    void testGetUnreadCount_Success() throws Exception {
        when(notificationService.getUnreadCount(anyInt())).thenReturn(5L);

        mockMvc.perform(get("/api/notifications/unread-count")
                .with(user(mockUser)))
                .andExpect(status().isOk());

        verify(notificationService).getUnreadCount(1);
    }

    @Test
    void testMarkAsRead_Success() throws Exception {
        mockMvc.perform(put("/api/notifications/100/read")
                .with(user(mockUser)))
                .andExpect(status().isOk());

        verify(notificationService).markAsRead(100L, 1);
    }

    @Test
    void testMarkAllAsRead_Success() throws Exception {
        mockMvc.perform(put("/api/notifications/read-all")
                .with(user(mockUser)))
                .andExpect(status().isOk());

        verify(notificationService).markAllAsRead(1);
    }

    @Test
    void testDeleteNotification_Success() throws Exception {
        mockMvc.perform(delete("/api/notifications/100")
                .with(user(mockUser)))
                .andExpect(status().isNoContent());

        verify(notificationService).deleteNotification(100L, 1);
    }

    @Test
    void testDeleteAllRead_Success() throws Exception {
        mockMvc.perform(delete("/api/notifications/read")
                .with(user(mockUser)))
                .andExpect(status().isNoContent());

        verify(notificationService).deleteAllRead(1);
    }

    @Test
    @WithMockUser
    void testGetMyNotifications_Unauthorized() throws Exception {
        // 仅有 Spring Security 默认 principal、缺少真实 UserDetailsImpl 时，应视为未登录。
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
    }
}
