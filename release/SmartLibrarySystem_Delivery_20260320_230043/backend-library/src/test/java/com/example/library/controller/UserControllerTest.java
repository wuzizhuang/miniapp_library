package com.example.library.controller;

import com.example.library.dto.LoanDto;
import com.example.library.dto.user.UserDto;
import com.example.library.dto.user.UserOverviewDto;
import com.example.library.dto.user.UserProfileDto;
import com.example.library.dto.user.UserUpdateDto;
import com.example.library.entity.User;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.LoanService;
import com.example.library.service.UserOverviewService;
import com.example.library.service.UserService;
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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for {@link UserController}.
 */
@WebMvcTest(UserController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserService userService;

    @Autowired
    private LoanService loanService;

    @Autowired
    private UserOverviewService userOverviewService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public UserService userService() {
            return Mockito.mock(UserService.class);
        }

        @Bean
        public LoanService loanService() {
            return Mockito.mock(LoanService.class);
        }

        @Bean
        public UserOverviewService userOverviewService() {
            return Mockito.mock(UserOverviewService.class);
        }
    }

    private UserDto userDto;

    @BeforeEach
    void setUp() {
        Mockito.reset(userService, loanService, userOverviewService);
        userDto = new UserDto();
        userDto.setUserId(1);
        userDto.setUsername("testuser");
        userDto.setEmail("test@example.com");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllUsers_AdminSuccess() throws Exception {
        when(userService.getAllUsers(0, 10))
                .thenReturn(new PageImpl<>(List.of(userDto)));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].username").value("testuser"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetAllUsers_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetAllUsers_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetUserById_AdminSuccess() throws Exception {
        when(userService.getUserById(1)).thenReturn(userDto);

        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetUserOverviewById_AdminSuccess() throws Exception {
        UserOverviewDto overviewDto = new UserOverviewDto();
        overviewDto.setUserId(1);
        overviewDto.setUsername("testuser");
        overviewDto.setPendingServiceAppointmentCount(2L);

        when(userOverviewService.getOverview(1)).thenReturn(overviewDto);

        mockMvc.perform(get("/api/users/1/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.pendingServiceAppointmentCount").value(2));
    }

    @Test
    void testUpdateUser_SelfSuccess() throws Exception {
        UserUpdateDto updateDto = new UserUpdateDto();
        updateDto.setEmail("new@example.com");

        UserDto updated = new UserDto();
        updated.setUserId(1);
        updated.setEmail("new@example.com");
        when(userService.updateUser(eq(1), any(UserUpdateDto.class))).thenReturn(updated);

        UserDetailsImpl principal = new UserDetailsImpl(
                1, "testuser", "test@example.com", "hashed",
                "Test User",
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")));

        mockMvc.perform(put("/api/users/1")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                        .user(principal))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new@example.com"));
    }

    @Test
    void testUpdateUser_AdminForbidden() throws Exception {
        UserUpdateDto updateDto = new UserUpdateDto();
        updateDto.setEmail("new@example.com");

        UserDetailsImpl principal = new UserDetailsImpl(
                2, "admin", "admin@example.com", "hashed",
                "Admin User",
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")));

        mockMvc.perform(put("/api/users/1")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                                .user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isForbidden());

        verify(userService, never()).updateUser(anyInt(), any(UserUpdateDto.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteUser_AdminSuccess() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
                .andExpect(status().isNoContent());

        verify(userService).deleteUser(1);
    }

    @Test
    @WithMockUser(roles = "USER")
    void testDeleteUser_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
                .andExpect(status().isForbidden());

        verify(userService, never()).deleteUser(anyInt());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetUserLoans_AdminSuccess() throws Exception {
        LoanDto loan = new LoanDto();
        loan.setLoanId(1);
        when(loanService.getLoansByUser(eq(1), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(loan)));

        mockMvc.perform(get("/api/users/1/loans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].loanId").value(1));
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "user:manage" })
    void testGetAllUsers_WithUserManagePermissionSuccess() throws Exception {
        when(userService.getAllUsers(0, 10))
                .thenReturn(new PageImpl<>(List.of(userDto)));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].username").value("testuser"));
    }

    @Test
    void testGetMyProfile_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/users/me/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("请先登录后再继续"))
                .andExpect(jsonPath("$.path").value("/api/users/me/profile"));
    }

    @Test
    void testGetMyProfile_AuthenticatedSuccess() throws Exception {
        UserProfileDto profileDto = new UserProfileDto();
        profileDto.setUserId(1);
        profileDto.setUsername("testuser");
        profileDto.setEmail("test@example.com");
        profileDto.setFullName("Test User");
        profileDto.setDepartment("Computer Science");
        profileDto.setMajor("Software Engineering");
        profileDto.setIdentityType(User.IdentityType.STUDENT);
        profileDto.setEnrollmentYear(2024);
        profileDto.setInterestTags(List.of("Java", "Spring"));

        when(userService.getUserProfile("testuser")).thenReturn(profileDto);

        UserDetailsImpl principal = new UserDetailsImpl(
                1, "testuser", "test@example.com", "hashed",
                "Test User",
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")));

        mockMvc.perform(get("/api/users/me/profile")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                        .user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.department").value("Computer Science"))
                .andExpect(jsonPath("$.major").value("Software Engineering"))
                .andExpect(jsonPath("$.identityType").value("STUDENT"))
                .andExpect(jsonPath("$.enrollmentYear").value(2024))
                .andExpect(jsonPath("$.interestTags[0]").value("Java"))
                .andExpect(jsonPath("$.interestTags[1]").value("Spring"));
    }

    @Test
    void testUpdateMyProfile_Unauthorized() throws Exception {
        mockMvc.perform(put("/api/users/me/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"New Name\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("请先登录后再继续"))
                .andExpect(jsonPath("$.path").value("/api/users/me/profile"));
    }

    @Test
    void testUpdateMyProfile_Success() throws Exception {
        com.example.library.dto.user.ProfileUpdateDto updateDto = new com.example.library.dto.user.ProfileUpdateDto();
        updateDto.setFullName("Updated Name");
        updateDto.setDepartment("Physics");

        UserProfileDto updatedProfile = new UserProfileDto();
        updatedProfile.setUserId(1);
        updatedProfile.setUsername("testuser");
        updatedProfile.setFullName("Updated Name");
        updatedProfile.setDepartment("Physics");

        when(userService.updateProfile(eq("testuser"), any(com.example.library.dto.user.ProfileUpdateDto.class)))
                .thenReturn(updatedProfile);

        UserDetailsImpl principal = new UserDetailsImpl(
                1, "testuser", "test@example.com", "hashed",
                "Test User",
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")));

        mockMvc.perform(put("/api/users/me/profile")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                        .user(principal))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Updated Name"))
                .andExpect(jsonPath("$.department").value("Physics"));
    }

    @Test
    void testGetMyOverview_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/users/me/overview"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("请先登录后再继续"))
                .andExpect(jsonPath("$.path").value("/api/users/me/overview"));
    }

    @Test
    void testGetMyOverview_Success() throws Exception {
        UserOverviewDto overviewDto = new UserOverviewDto();
        overviewDto.setUserId(1);
        overviewDto.setUsername("testuser");
        overviewDto.setActiveLoanCount(2L);
        overviewDto.setUnreadNotificationCount(3L);

        when(userOverviewService.getOverview(1)).thenReturn(overviewDto);

        UserDetailsImpl principal = new UserDetailsImpl(
                1, "testuser", "test@example.com", "hashed",
                "Test User",
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")));

        mockMvc.perform(get("/api/users/me/overview")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                        .user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.activeLoanCount").value(2))
                .andExpect(jsonPath("$.unreadNotificationCount").value(3));
    }
}
