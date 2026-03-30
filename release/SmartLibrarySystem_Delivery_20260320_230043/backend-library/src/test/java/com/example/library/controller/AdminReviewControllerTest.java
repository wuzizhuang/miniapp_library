package com.example.library.controller;

import com.example.library.dto.ReviewResponseDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.ReviewService;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WebMvc test for {@link AdminReviewController}.
 */
@WebMvcTest(AdminReviewController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class AdminReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ReviewService reviewService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public ReviewService reviewService() {
            return Mockito.mock(ReviewService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(reviewService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetPendingReviews_AdminSuccess() throws Exception {
        ReviewResponseDto dto = new ReviewResponseDto();
        dto.setReviewId(1L);
        dto.setCommentText("Good book");
        when(reviewService.getPendingReviews(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/admin/reviews/pending")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].reviewId").value(1));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetPendingReviews_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/reviews/pending"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetPendingReviews_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/reviews/pending"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testAuditReview_Approve() throws Exception {
        ReviewResponseDto dto = new ReviewResponseDto();
        dto.setReviewId(1L);
        dto.setRating(5);
        when(reviewService.auditReview(eq(1), eq(true))).thenReturn(dto);

        mockMvc.perform(put("/api/admin/reviews/1/audit")
                .param("approved", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewId").value(1));

        verify(reviewService).auditReview(1, true);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testAuditReview_Reject() throws Exception {
        ReviewResponseDto dto = new ReviewResponseDto();
        dto.setReviewId(1L);
        dto.setCommentText("拒绝原因");
        when(reviewService.auditReview(eq(1), eq(false))).thenReturn(dto);

        mockMvc.perform(put("/api/admin/reviews/1/audit")
                .param("approved", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewId").value(1));

        verify(reviewService).auditReview(1, false);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetReviews_WithFilters() throws Exception {
        ReviewResponseDto dto = new ReviewResponseDto();
        dto.setReviewId(2L);
        dto.setStatus("APPROVED");
        when(reviewService.getAdminReviews(eq(com.example.library.entity.BookReview.ReviewStatus.APPROVED), eq("java"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/admin/reviews")
                .param("page", "0")
                .param("size", "10")
                .param("status", "APPROVED")
                .param("keyword", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].status").value("APPROVED"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetReviews_AllStatusesWithoutKeyword() throws Exception {
        when(reviewService.getAdminReviews(isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/admin/reviews")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetReviews_InvalidStatusReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/admin/reviews")
                .param("status", "foo"))
                .andExpect(status().isBadRequest());
    }
}
