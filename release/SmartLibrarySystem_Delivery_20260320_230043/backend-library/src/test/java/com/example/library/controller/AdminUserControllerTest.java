package com.example.library.controller;

import com.example.library.dto.user.AdminUserIdentityUpdateDto;
import com.example.library.dto.user.AdminUserStatusUpdateDto;
import com.example.library.dto.user.UserDto;
import com.example.library.entity.User;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminUserController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserService userService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        UserService userService() {
            return Mockito.mock(UserService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(userService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateUserStatus_AdminSuccess() throws Exception {
        AdminUserStatusUpdateDto request = new AdminUserStatusUpdateDto();
        request.setStatus(User.UserStatus.INACTIVE);

        UserDto updated = new UserDto();
        updated.setUserId(1);
        updated.setStatus(User.UserStatus.INACTIVE);

        when(userService.updateUserStatus(1, User.UserStatus.INACTIVE)).thenReturn(updated);

        mockMvc.perform(patch("/api/admin/users/1/status")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        verify(userService).updateUserStatus(1, User.UserStatus.INACTIVE);
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "user:manage" })
    void testUpdateUserStatus_WithPermissionSuccess() throws Exception {
        AdminUserStatusUpdateDto request = new AdminUserStatusUpdateDto();
        request.setStatus(User.UserStatus.ACTIVE);

        UserDto updated = new UserDto();
        updated.setUserId(1);
        updated.setStatus(User.UserStatus.ACTIVE);

        when(userService.updateUserStatus(1, User.UserStatus.ACTIVE)).thenReturn(updated);

        mockMvc.perform(patch("/api/admin/users/1/status")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateUserIdentity_AdminSuccess() throws Exception {
        AdminUserIdentityUpdateDto request = new AdminUserIdentityUpdateDto();
        request.setIdentityType(User.IdentityType.TEACHER);

        UserDto updated = new UserDto();
        updated.setUserId(1);
        updated.setIdentityType(User.IdentityType.TEACHER);

        when(userService.updateUserIdentityType(1, User.IdentityType.TEACHER)).thenReturn(updated);

        mockMvc.perform(patch("/api/admin/users/1/identity")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.identityType").value("TEACHER"));

        verify(userService).updateUserIdentityType(1, User.IdentityType.TEACHER);
    }

    @Test
    @WithMockUser(roles = "USER")
    void testUpdateUserStatus_ForbiddenForNonAdmin() throws Exception {
        AdminUserStatusUpdateDto request = new AdminUserStatusUpdateDto();
        request.setStatus(User.UserStatus.INACTIVE);

        mockMvc.perform(patch("/api/admin/users/1/status")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(userService, never()).updateUserStatus(eq(1), eq(User.UserStatus.INACTIVE));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testUpdateUserIdentity_ForbiddenForNonAdmin() throws Exception {
        AdminUserIdentityUpdateDto request = new AdminUserIdentityUpdateDto();
        request.setIdentityType(User.IdentityType.TEACHER);

        mockMvc.perform(patch("/api/admin/users/1/identity")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(userService, never()).updateUserIdentityType(eq(1), eq(User.IdentityType.TEACHER));
    }
}
