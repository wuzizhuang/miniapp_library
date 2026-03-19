package com.example.library.controller;

import com.example.library.dto.DashboardAnalyticsDto;
import com.example.library.dto.DashboardStatsDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.StatisticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WebMvc test for {@link DashboardController}.
 */
@WebMvcTest(DashboardController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StatisticsService statisticsService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public StatisticsService statisticsService() {
            return Mockito.mock(StatisticsService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(statisticsService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetCoreStats_AdminSuccess() throws Exception {
        DashboardStatsDto stats = new DashboardStatsDto();
        when(statisticsService.getCoreDashboardStatistics()).thenReturn(stats);

        mockMvc.perform(get("/api/admin/dashboard/stats"))
                .andExpect(status().isOk());

        verify(statisticsService).getCoreDashboardStatistics();
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetCoreStats_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/stats"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetCoreStats_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "report:view" })
    void testGetCoreStats_LibrarianWithReportViewSuccess() throws Exception {
        DashboardStatsDto stats = new DashboardStatsDto();
        when(statisticsService.getCoreDashboardStatistics()).thenReturn(stats);

        mockMvc.perform(get("/api/admin/dashboard/stats"))
                .andExpect(status().isOk());

        verify(statisticsService).getCoreDashboardStatistics();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAnalytics_AdminSuccess() throws Exception {
        DashboardAnalyticsDto analytics = new DashboardAnalyticsDto();
        when(statisticsService.getDashboardAnalytics()).thenReturn(analytics);

        mockMvc.perform(get("/api/admin/dashboard/analytics"))
                .andExpect(status().isOk());

        verify(statisticsService).getDashboardAnalytics();
    }
}
