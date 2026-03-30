package com.example.library.controller;

import com.example.library.dto.rbac.PermissionCreateDto;
import com.example.library.dto.rbac.PermissionDto;
import com.example.library.dto.rbac.RoleCreateDto;
import com.example.library.dto.rbac.RoleDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.PermissionService;
import com.example.library.service.RbacAuditLogService;
import com.example.library.service.RoleService;
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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for {@link AdminRoleController}.
 */
@WebMvcTest(AdminRoleController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class AdminRoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoleService roleService;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private RbacAuditLogService rbacAuditLogService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public RoleService roleService() {
            return Mockito.mock(RoleService.class);
        }

        @Bean
        public PermissionService permissionService() {
            return Mockito.mock(PermissionService.class);
        }

        @Bean
        public RbacAuditLogService rbacAuditLogService() {
            return Mockito.mock(RbacAuditLogService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(roleService, permissionService, rbacAuditLogService);
    }

    // ─── Role ───────────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllRoles_AdminSuccess() throws Exception {
        RoleDto role = new RoleDto();
        role.setRoleId(1);
        role.setName("ADMIN");
        when(roleService.getAllRoles()).thenReturn(List.of(role));

        mockMvc.perform(get("/api/admin/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("ADMIN"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetAllRoles_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/roles"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreateRole_AdminSuccess() throws Exception {
        RoleCreateDto dto = new RoleCreateDto();
        dto.setName("LIBRARIAN");
        dto.setDisplayName("图书管理员");
        dto.setDescription("可管理书籍");

        RoleDto role = new RoleDto();
        role.setRoleId(2);
        role.setName("LIBRARIAN");
        when(roleService.createRole(any(RoleCreateDto.class))).thenReturn(role);

        mockMvc.perform(post("/api/admin/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("LIBRARIAN"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteRole_AdminSuccess() throws Exception {
        mockMvc.perform(delete("/api/admin/roles/1"))
                .andExpect(status().isNoContent());

        verify(roleService).deleteRole(1);
    }

    // ─── Permission ──────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllPermissions_AdminSuccess() throws Exception {
        PermissionDto p = new PermissionDto();
        p.setPermissionId(1);
        p.setName("READ_BOOK");
        when(permissionService.getAllPermissions()).thenReturn(List.of(p));

        mockMvc.perform(get("/api/admin/permissions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("READ_BOOK"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreatePermission_AdminSuccess() throws Exception {
        PermissionCreateDto dto = new PermissionCreateDto();
        dto.setName("book:delete");
        dto.setDescription("可以删除书籍");

        PermissionDto p = new PermissionDto();
        p.setPermissionId(2);
        p.setName("book:delete");
        when(permissionService.createPermission(any())).thenReturn(p);

        mockMvc.perform(post("/api/admin/permissions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("book:delete"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeletePermission_AdminSuccess() throws Exception {
        mockMvc.perform(delete("/api/admin/permissions/1"))
                .andExpect(status().isNoContent());

        verify(permissionService).deletePermission(1);
    }

    // ─── Role–Permission Assignment ──────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void testAssignPermissionToRole_Success() throws Exception {
        RoleDto role = new RoleDto();
        role.setRoleId(1);
        when(roleService.assignPermission(1, 2)).thenReturn(role);

        mockMvc.perform(post("/api/admin/roles/1/permissions/2"))
                .andExpect(status().isOk());

        verify(roleService).assignPermission(1, 2);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testRevokePermissionFromRole_Success() throws Exception {
        RoleDto role = new RoleDto();
        role.setRoleId(1);
        when(roleService.revokePermission(1, 2)).thenReturn(role);

        mockMvc.perform(delete("/api/admin/roles/1/permissions/2"))
                .andExpect(status().isOk());

        verify(roleService).revokePermission(1, 2);
    }

    // ─── User–Role Assignment ─────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void testAssignRoleToUser_Success() throws Exception {
        mockMvc.perform(post("/api/admin/users/10/roles/1"))
                .andExpect(status().isOk());

        verify(roleService).assignRoleToUser(10, 1);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testRevokeRoleFromUser_Success() throws Exception {
        mockMvc.perform(delete("/api/admin/users/10/roles/1"))
                .andExpect(status().isNoContent());

        verify(roleService).revokeRoleFromUser(10, 1);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetUserRoles_Success() throws Exception {
        RoleDto role = new RoleDto();
        role.setRoleId(1);
        role.setName("USER");
        when(roleService.getUserRoles(10)).thenReturn(List.of(role));

        mockMvc.perform(get("/api/admin/users/10/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("USER"));
    }
}
