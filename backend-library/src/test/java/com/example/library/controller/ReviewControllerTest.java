package com.example.library.controller;

import com.example.library.dto.ReviewDto;
import com.example.library.dto.ReviewResponseDto;
import com.example.library.dto.ReviewUpdateDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.ReviewSecurityService;
import com.example.library.service.ReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for {@link ReviewController}.
 */
@WebMvcTest(ReviewController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class ReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private ReviewSecurityService reviewSecurityService;

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

        @Bean
        public ReviewSecurityService reviewSecurityService() {
            return Mockito.mock(ReviewSecurityService.class);
        }
    }

    private UserDetailsImpl mockUser;

    @BeforeEach
    void setUp() {
        Mockito.reset(reviewService, reviewSecurityService);
        mockUser = new UserDetailsImpl(1, "testuser", "test@example.com", "hashed",
                "Test User", List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void testCreateReview_Success() throws Exception {
        ReviewDto reviewDto = new ReviewDto();
        reviewDto.setBookId(5L);
        reviewDto.setRating(5);
        reviewDto.setCommentText("非常好的书！");

        ReviewResponseDto result = new ReviewResponseDto();
        result.setReviewId(1L);
        result.setCommentText("非常好的书！");
        when(reviewService.createReview(eq(1), any(ReviewDto.class))).thenReturn(result);

        mockMvc.perform(post("/api/reviews")
                .with(user(mockUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reviewDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewId").value(1))
                .andExpect(jsonPath("$.commentText").value("非常好的书！"));
    }

    @Test
    void testGetMyReviews_Success() throws Exception {
        ReviewResponseDto result = new ReviewResponseDto();
        result.setReviewId(1L);
        when(reviewService.getReviewsByUser(eq(1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(result)));

        mockMvc.perform(get("/api/reviews/me").with(user(mockUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].reviewId").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateReview_AdminSuccess() throws Exception {
        ReviewUpdateDto updateDto = new ReviewUpdateDto();
        updateDto.setRating(4);
        updateDto.setCommentText("内容修正");

        ReviewResponseDto result = new ReviewResponseDto();
        result.setReviewId(1L);
        result.setCommentText("内容修正");
        when(reviewSecurityService.isReviewOwner(any(), eq(1))).thenReturn(false);
        when(reviewService.updateReview(eq(1), org.mockito.ArgumentMatchers.<ReviewUpdateDto>any()))
                .thenReturn(result);

        mockMvc.perform(put("/api/reviews/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentText").value("内容修正"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteReview_AdminSuccess() throws Exception {
        when(reviewSecurityService.isReviewOwner(any(), eq(1))).thenReturn(false);

        mockMvc.perform(delete("/api/reviews/1"))
                .andExpect(status().isNoContent());

        verify(reviewService).deleteReview(1);
    }

    @Test
    void testCreateReview_Unauthorized() throws Exception {
        ReviewDto reviewDto = new ReviewDto();
        reviewDto.setBookId(5L);
        reviewDto.setRating(5);
        reviewDto.setCommentText("未认证");

        mockMvc.perform(post("/api/reviews")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reviewDto)))
                .andExpect(status().isUnauthorized());
    }
}
