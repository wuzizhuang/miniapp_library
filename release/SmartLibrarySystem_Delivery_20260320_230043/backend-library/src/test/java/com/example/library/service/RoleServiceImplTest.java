package com.example.library.service;

import com.example.library.dto.rbac.RoleCreateDto;
import com.example.library.dto.rbac.RoleDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.PermissionRepository;
import com.example.library.repository.RoleRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.impl.RoleServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * RoleServiceImpl 单元测试。
 *
 * <p>
 * 覆盖：角色创建（名称重复检测）、删除（先从所有用户移除）、权限的分配与撤销、
 * 用户-角色绑定。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RoleService 单元测试")
class RoleServiceImplTest {

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RoleServiceImpl roleService;

    private Role adminRole;
    private Permission readPermission;
    private User user;

    @BeforeEach
    void setUp() {
        adminRole = TestDataFactory.createRole(1, "ROLE_ADMIN", "管理员");
        readPermission = TestDataFactory.createPermission(100, "READ_BOOKS");
        user = TestDataFactory.createUser(1, "alice");
    }

    @Nested
    @DisplayName("getAllRoles / getRoleById — 查询")
    class QueryRoles {

        @Test
        @DisplayName("getAllRoles — 成功：返回所有角色")
        void getAllRoles_success() {
            when(roleRepository.findAll()).thenReturn(List.of(adminRole));

            List<RoleDto> result = roleService.getAllRoles();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("ROLE_ADMIN");
        }

        @Test
        @DisplayName("getRoleById — 成功：返回角色 DTO")
        void getRoleById_success() {
            when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));

            RoleDto result = roleService.getRoleById(1);

            assertThat(result.getRoleId()).isEqualTo(1);
            assertThat(result.getDisplayName()).isEqualTo("管理员");
        }

        @Test
        @DisplayName("getRoleById — 失败：不存在，抛出 ResourceNotFoundException")
        void getRoleById_notFound() {
            when(roleRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> roleService.getRoleById(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("createRole — 创建角色")
    class CreateRole {

        @Test
        @DisplayName("成功：新名称，创建并返回")
        void success() {
            RoleCreateDto dto = new RoleCreateDto();
            dto.setName("ROLE_LIBRARIAN");
            dto.setDisplayName("图书管理员");
            dto.setDescription("负责日常借还书管理");

            when(roleRepository.existsByName("ROLE_LIBRARIAN")).thenReturn(false);
            when(roleRepository.save(any(Role.class))).thenReturn(adminRole);

            RoleDto result = roleService.createRole(dto);

            assertThat(result).isNotNull();
            verify(roleRepository).save(any(Role.class));
        }

        @Test
        @DisplayName("失败：角色名已存在，抛出 BadRequestException")
        void fail_roleNameExists() {
            RoleCreateDto dto = new RoleCreateDto();
            dto.setName("ROLE_ADMIN");

            when(roleRepository.existsByName("ROLE_ADMIN")).thenReturn(true);

            assertThatThrownBy(() -> roleService.createRole(dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already exists");

            verify(roleRepository, never()).save(any(Role.class));
        }
    }

    @Nested
    @DisplayName("deleteRole — 删除角色")
    class DeleteRole {

        @Test
        @DisplayName("成功：先从所有持有该角色的用户中移除，再删除角色")
        void success_removedFromUsersFirst() {
            // 用户 alice 持有 adminRole
            user.getRoles().add(adminRole);

            when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
            when(userRepository.findDistinctByRolesRoleId(1)).thenReturn(List.of(user));

            roleService.deleteRole(1);

            assertThat(user.getRoles()).doesNotContain(adminRole);
            verify(userRepository).saveAll(List.of(user));
            verify(roleRepository).delete(adminRole);
        }

        @Test
        @DisplayName("成功：无用户持有该角色，直接删除")
        void success_noUsersHaveRole() {
            when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
            when(userRepository.findDistinctByRolesRoleId(1)).thenReturn(List.of());

            roleService.deleteRole(1);

            verify(userRepository, never()).saveAll(anyList());
            verify(roleRepository).delete(adminRole);
        }
    }

    @Nested
    @DisplayName("assignPermission / revokePermission — 权限管理")
    class PermissionManagement {

        @Test
        @DisplayName("assignPermission — 成功：权限加入角色")
        void assignPermission_success() {
            when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
            when(permissionRepository.findById(100)).thenReturn(Optional.of(readPermission));
            when(roleRepository.save(any(Role.class))).thenReturn(adminRole);

            RoleDto result = roleService.assignPermission(1, 100);

            assertThat(adminRole.getPermissions()).contains(readPermission);
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("assignPermission — 失败：权限不存在，抛出 ResourceNotFoundException")
        void assignPermission_permissionNotFound() {
            when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
            when(permissionRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> roleService.assignPermission(1, 999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("revokePermission — 成功：权限从角色移除")
        void revokePermission_success() {
            adminRole.getPermissions().add(readPermission);

            when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
            when(permissionRepository.findById(100)).thenReturn(Optional.of(readPermission));
            when(roleRepository.save(any(Role.class))).thenReturn(adminRole);

            roleService.revokePermission(1, 100);

            assertThat(adminRole.getPermissions()).doesNotContain(readPermission);
        }
    }

    @Nested
    @DisplayName("assignRoleToUser / revokeRoleFromUser — 用户角色绑定")
    class UserRoleBinding {

        @Test
        @DisplayName("assignRoleToUser — 成功：角色加入用户")
        void assignRoleToUser_success() {
            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));

            roleService.assignRoleToUser(1, 1);

            assertThat(user.getRoles()).contains(adminRole);
            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("assignRoleToUser — 失败：用户不存在，抛出 ResourceNotFoundException")
        void assignRoleToUser_userNotFound() {
            when(userRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> roleService.assignRoleToUser(999, 1))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("revokeRoleFromUser — 成功：角色从用户移除")
        void revokeRoleFromUser_success() {
            user.getRoles().add(adminRole);

            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));

            roleService.revokeRoleFromUser(1, 1);

            assertThat(user.getRoles()).doesNotContain(adminRole);
            verify(userRepository).save(user);
        }
    }
}
