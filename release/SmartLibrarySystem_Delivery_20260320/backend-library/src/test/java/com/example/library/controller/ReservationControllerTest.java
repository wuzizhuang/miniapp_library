package com.example.library.controller;

import com.example.library.dto.ReservationCreateDto;
import com.example.library.dto.ReservationDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.ReservationService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for {@link ReservationController}.
 */
@WebMvcTest(ReservationController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ReservationService reservationService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public ReservationService reservationService() {
            return Mockito.mock(ReservationService.class);
        }
    }

    private UserDetailsImpl mockUser;

    @BeforeEach
    void setUp() {
        Mockito.reset(reservationService);
        mockUser = new UserDetailsImpl(1, "testuser", "test@example.com", "hashed", "Test User",
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void testCreateReservation_Success() throws Exception {
        ReservationCreateDto createDto = new ReservationCreateDto();
        createDto.setBookId(5);

        ReservationDto result = new ReservationDto();
        result.setReservationId(1);
        result.setBookId(5);
        when(reservationService.createReservation(any(ReservationCreateDto.class))).thenReturn(result);

        mockMvc.perform(post("/api/reservations")
                .with(user(mockUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reservationId").value(1));
    }

    @Test
    void testGetMyReservations_Success() throws Exception {
        ReservationDto dto = new ReservationDto();
        dto.setReservationId(1);
        when(reservationService.getUserReservations(any(Integer.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/reservations/me").with(user(mockUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].reservationId").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllReservations_AdminSuccess() throws Exception {
        ReservationDto dto = new ReservationDto();
        dto.setReservationId(2);
        when(reservationService.getAllReservations(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/reservations").param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].reservationId").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllReservations_WithKeywordSuccess() throws Exception {
        ReservationDto dto = new ReservationDto();
        dto.setReservationId(3);
        when(reservationService.getAllReservations(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/reservations")
                .param("status", "PENDING")
                .param("keyword", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].reservationId").value(3));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testFulfillReservation_AdminSuccess() throws Exception {
        mockMvc.perform(put("/api/reservations/1/fulfill"))
                .andExpect(status().isNoContent());

        verify(reservationService).fulfillReservation(1);
    }

    @Test
    @WithMockUser(roles = "USER")
    void testFulfillReservation_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(put("/api/reservations/1/fulfill"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER", authorities = { "reservation:manage" })
    void testFulfillReservation_WithPermissionSuccess() throws Exception {
        mockMvc.perform(put("/api/reservations/1/fulfill"))
                .andExpect(status().isNoContent());

        verify(reservationService).fulfillReservation(1);
    }

    @Test
    void testCreateReservation_Unauthorized() throws Exception {
        ReservationCreateDto createDto = new ReservationCreateDto();
        createDto.setBookId(5);

        mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isUnauthorized());
    }
}
