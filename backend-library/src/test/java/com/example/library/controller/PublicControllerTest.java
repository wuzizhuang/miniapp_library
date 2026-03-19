package com.example.library.controller;

import com.example.library.dto.DashboardStatsDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.dto.publicapi.PublicAiChatResponseDto;
import com.example.library.entity.Book;
import com.example.library.repository.BookRepository;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.AiChatService;
import com.example.library.service.BookService;
import com.example.library.service.StatisticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WebMvc test for {@link PublicController}.
 */
@WebMvcTest(PublicController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class PublicControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private BookService bookService;

    @MockitoBean
    private StatisticsService statisticsService;

    @MockitoBean
    private BookRepository bookRepository;

    @MockitoBean
    private AiChatService aiChatService;

    @MockitoBean
    private RequestRateLimitService requestRateLimitService;

    @Test
    void testHealthCheck_NoAuthRequired() throws Exception {
        mockMvc.perform(get("/api/public/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void testHomeData_NoAuthRequired() throws Exception {
        BookDetailDto book = new BookDetailDto();
        book.setBookId(1);
        book.setTitle("Clean Code");
        book.setCoverUrl("https://example.com/cover.jpg");

        DashboardStatsDto stats = new DashboardStatsDto();
        stats.setTotalUsers(10L);
        stats.setActiveLoans(3L);
        stats.setAvailableCopies(5L);

        BookRepository.CategoryBookCountView categoryView = new BookRepository.CategoryBookCountView() {
            @Override
            public Integer getCategoryId() {
                return 9;
            }

            @Override
            public String getCategoryName() {
                return "编程";
            }

            @Override
            public Long getBookCount() {
                return 12L;
            }
        };

        when(statisticsService.getCoreDashboardStatistics()).thenReturn(stats);
        when(bookRepository.countByStatus(Book.BookStatus.ACTIVE)).thenReturn(30L);
        when(bookService.getTrendingBooks(anyInt())).thenReturn(List.of(book));
        when(bookService.getNewArrivals(anyInt())).thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(book)));
        when(bookRepository.countBooksByCategory(any())).thenReturn(List.of(categoryView));

        mockMvc.perform(get("/api/public/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.heroStats[0].label", is("馆藏图书")))
                .andExpect(jsonPath("$.featuredBooks[0].title", is("Clean Code")))
                .andExpect(jsonPath("$.categories[0].label", is("编程")));
    }

    @Test
    void testPublicAiChat_NoAuthRequired() throws Exception {
        PublicAiChatResponseDto responseDto = PublicAiChatResponseDto.builder()
                .reply("可以先从《数据库系统概论》开始。")
                .responseId("resp_123")
                .provider("openai")
                .model("gpt-4.1-mini")
                .build();
        when(aiChatService.chat(eq("推荐一本数据库入门书"), eq(null))).thenReturn(responseDto);

        mockMvc.perform(post("/api/public/ai/chat")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("message", "推荐一本数据库入门书"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply", is("可以先从《数据库系统概论》开始。")))
                .andExpect(jsonPath("$.responseId", is("resp_123")));
    }
}
