package com.example.library.controller;

import com.example.library.dto.FineDto;
import com.example.library.entity.Fine;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.FineSecurityService;
import com.example.library.service.FineService;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for {@link FineController}.
 */
@WebMvcTest(FineController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class FineControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FineService fineService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private FineSecurityService fineSecurityService;

    @TestConfiguration
    static class Config {
        @Bean
        public FineService fineService() {
            return Mockito.mock(FineService.class);
        }
    }

    private UserDetailsImpl mockUser;
    private FineDto fineDto;

    @BeforeEach
    void setUp() {
        Mockito.reset(fineService);
        Mockito.reset(fineSecurityService);
        when(fineSecurityService.isFineOwner(any(), anyInt())).thenReturn(false);
        mockUser = new UserDetailsImpl(1, "testuser", "test@example.com", "hashed",
                "Test User", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        fineDto = new FineDto();
        fineDto.setFineId(1);
        fineDto.setAmount(new BigDecimal("5.00"));
    }

    @Test
    void testGetMyFines_Success() throws Exception {
        when(fineService.getFinesByUser(1, 0, 10))
                .thenReturn(new PageImpl<>(List.of(fineDto)));

        mockMvc.perform(get("/api/fines/me").with(user(mockUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].fineId").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllFines_AdminSuccess() throws Exception {
        when(fineService.getAllFines(0, 10, null, null))
                .thenReturn(new PageImpl<>(List.of(fineDto)));

        mockMvc.perform(get("/api/fines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].fineId").value(1));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetAllFines_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/fines"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testWaiveFine_AdminSuccess() throws Exception {
        FineDto waived = new FineDto();
        waived.setFineId(1);
        waived.setStatus(Fine.FineStatus.WAIVED);
        when(fineService.waiveFine(1)).thenReturn(waived);

        mockMvc.perform(post("/api/fines/1/waive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WAIVED"));
        // Fine.FineStatus.WAIVED serializes as "WAIVED"
    }

    @Test
    @WithMockUser(roles = "USER")
    void testWaiveFine_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(post("/api/fines/1/waive"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "fine:waive" })
    void testWaiveFine_LibrarianWithFineWaiveSuccess() throws Exception {
        FineDto waived = new FineDto();
        waived.setFineId(1);
        waived.setStatus(Fine.FineStatus.WAIVED);
        when(fineService.waiveFine(1)).thenReturn(waived);

        mockMvc.perform(post("/api/fines/1/waive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WAIVED"));
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "loan:manage" })
    void testGetAllFines_LibrarianWithLoanManageSuccess() throws Exception {
        when(fineService.getAllFines(0, 10, null, null))
                .thenReturn(new PageImpl<>(List.of(fineDto)));

        mockMvc.perform(get("/api/fines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].fineId").value(1));
    }

    @Test
    void testGetMyFines_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/fines/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("请先登录后再继续"))
                .andExpect(jsonPath("$.path").value("/api/fines/me"));
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "fine:waive" })
    void testGetAllFines_LibrarianWithFineWaiveSuccess() throws Exception {
        when(fineService.getAllFines(0, 10, null, null))
                .thenReturn(new PageImpl<>(List.of(fineDto)));

        mockMvc.perform(get("/api/fines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].fineId").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllFines_FilterByStatus() throws Exception {
        when(fineService.getAllFines(0, 10, Fine.FineStatus.PENDING, null))
                .thenReturn(new PageImpl<>(List.of(fineDto)));

        mockMvc.perform(get("/api/fines").param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].fineId").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllFines_FilterByKeyword() throws Exception {
        when(fineService.getAllFines(0, 10, null, "alice"))
                .thenReturn(new PageImpl<>(List.of(fineDto)));

        mockMvc.perform(get("/api/fines").param("keyword", "alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].fineId").value(1));
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "fine:waive" })
    void testGetPendingTotal_LibrarianWithFineWaiveSuccess() throws Exception {
        when(fineService.getTotalPendingFines()).thenReturn(new BigDecimal("88.50"));

        mockMvc.perform(get("/api/fines/pending-total"))
                .andExpect(status().isOk())
                .andExpect(content().string("88.50"));
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "loan:manage" })
    void testPayFine_LibrarianWithLoanManageSuccess() throws Exception {
        FineDto paid = new FineDto();
        paid.setFineId(1);
        paid.setStatus(Fine.FineStatus.PAID);
        when(fineService.payFine(1)).thenReturn(paid);

        mockMvc.perform(post("/api/fines/1/pay"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));
    }

    @Test
    void testPayFine_Unauthorized() throws Exception {
        mockMvc.perform(post("/api/fines/1/pay"))
                .andExpect(status().isUnauthorized());
    }
}
