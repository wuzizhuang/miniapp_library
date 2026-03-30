package com.example.library.controller;

import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WebMvc test for {@link SearchController}.
 */
@WebMvcTest(SearchController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class SearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SearchService searchService;

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
        public SearchService searchService() {
            return Mockito.mock(SearchService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(searchService);
    }

    @Test
    @WithMockUser
    void testGetHotKeywords_Success() throws Exception {
        when(searchService.getHotKeywords(10)).thenReturn(List.of("Java", "Spring", "Redis"));

        mockMvc.perform(get("/api/search/hot").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0]", is("Java")));
    }

    @Test
    @WithMockUser
    void testGetSearchSuggestions_Success() throws Exception {
        when(searchService.getSearchSuggestions("Sp", 10)).thenReturn(List.of("Spring", "SpringBoot"));

        mockMvc.perform(get("/api/search/suggestions")
                .param("keyword", "Sp")
                .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0]", is("Spring")));

        verify(requestRateLimitService).checkSearchSuggestionLimit(any());
    }

    @Test
    @WithMockUser
    void testGetSearchSuggestions_EmptyKeyword_ReturnsEmpty() throws Exception {
        when(searchService.getSearchSuggestions("", 10)).thenReturn(List.of());

        mockMvc.perform(get("/api/search/suggestions")
                .param("keyword", "")
                .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @WithMockUser
    void testGetSearchSuggestions_RateLimited() throws Exception {
        doThrow(new com.example.library.exception.RateLimitExceededException("搜索联想请求过于频繁，请稍后再试", 15))
                .when(requestRateLimitService).checkSearchSuggestionLimit(any());

        mockMvc.perform(get("/api/search/suggestions")
                .param("keyword", "Sp")
                .param("limit", "10"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.retryAfterSeconds").value(15));
    }

    @Test
    void testGetMySearchHistory_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/search/history"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("请先登录后再继续"))
                .andExpect(jsonPath("$.path").value("/api/search/history"));
    }

    @Test
    void testGetMySearchHistory_Success() throws Exception {
        when(searchService.getUserSearchHistory(1, 0, 20))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/search/history")
                .with(user(new UserDetailsImpl(
                        1,
                        "reader",
                        "reader@example.com",
                        "hashed",
                        "Reader",
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"))))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
