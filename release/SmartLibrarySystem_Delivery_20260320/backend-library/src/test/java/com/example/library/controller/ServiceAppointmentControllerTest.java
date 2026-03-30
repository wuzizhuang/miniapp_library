package com.example.library.controller;

import com.example.library.dto.ServiceAppointmentCreateDto;
import com.example.library.dto.ServiceAppointmentDto;
import com.example.library.dto.ServiceAppointmentStatusUpdateDto;
import com.example.library.entity.ServiceAppointment;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.ServiceAppointmentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WebMvc test for {@link ServiceAppointmentController}.
 */
@WebMvcTest(ServiceAppointmentController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
class ServiceAppointmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ServiceAppointmentService serviceAppointmentService;

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
        ServiceAppointmentService serviceAppointmentService() {
            return Mockito.mock(ServiceAppointmentService.class);
        }
    }

    private UserDetailsImpl mockUser;

    @BeforeEach
    void setUp() {
        Mockito.reset(serviceAppointmentService);
        mockUser = new UserDetailsImpl(
                1,
                "reader",
                "reader@example.com",
                "hashed",
                "Reader User",
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void testCreateAppointment_Success() throws Exception {
        ServiceAppointmentCreateDto createDto = new ServiceAppointmentCreateDto();
        createDto.setServiceType(ServiceAppointment.ServiceType.CONSULTATION);
        createDto.setScheduledTime(LocalDateTime.now().plusDays(1));

        ServiceAppointmentDto response = new ServiceAppointmentDto();
        response.setAppointmentId(10);
        response.setServiceType(ServiceAppointment.ServiceType.CONSULTATION);
        when(serviceAppointmentService.createAppointment(anyInt(), any(ServiceAppointmentCreateDto.class))).thenReturn(response);

        mockMvc.perform(post("/api/service-appointments")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.appointmentId").value(10));

        verify(requestRateLimitService).checkServiceAppointmentCreateLimit(any(), eq(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllAppointments_AdminSuccess() throws Exception {
        ServiceAppointmentDto dto = new ServiceAppointmentDto();
        dto.setAppointmentId(12);
        when(serviceAppointmentService.getAllAppointments(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/service-appointments")
                        .param("status", "PENDING")
                        .param("keyword", "reader"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].appointmentId").value(12));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetAllAppointments_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/service-appointments"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER", authorities = { "appointment:manage" })
    void testUpdateAppointmentStatus_WithPermissionSuccess() throws Exception {
        ServiceAppointmentStatusUpdateDto request = new ServiceAppointmentStatusUpdateDto();
        request.setStatus(ServiceAppointment.AppointmentStatus.COMPLETED);

        ServiceAppointmentDto response = new ServiceAppointmentDto();
        response.setAppointmentId(15);
        response.setStatus(ServiceAppointment.AppointmentStatus.COMPLETED);
        when(serviceAppointmentService.updateAppointmentStatus(anyInt(), any(ServiceAppointmentStatusUpdateDto.class)))
                .thenReturn(response);

        mockMvc.perform(put("/api/service-appointments/15/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        verify(serviceAppointmentService).updateAppointmentStatus(anyInt(), any(ServiceAppointmentStatusUpdateDto.class));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testUpdateAppointmentStatus_ForbiddenForNonAdmin() throws Exception {
        ServiceAppointmentStatusUpdateDto request = new ServiceAppointmentStatusUpdateDto();
        request.setStatus(ServiceAppointment.AppointmentStatus.MISSED);

        mockMvc.perform(put("/api/service-appointments/15/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testCreateAppointment_RateLimited() throws Exception {
        ServiceAppointmentCreateDto createDto = new ServiceAppointmentCreateDto();
        createDto.setServiceType(ServiceAppointment.ServiceType.CONSULTATION);
        createDto.setScheduledTime(LocalDateTime.now().plusDays(1));

        doThrow(new com.example.library.exception.RateLimitExceededException("服务预约提交过于频繁，请稍后再试", 90))
                .when(requestRateLimitService).checkServiceAppointmentCreateLimit(any(), eq(1));

        mockMvc.perform(post("/api/service-appointments")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.retryAfterSeconds").value(90));
    }
}
