package com.example.library.service;

import com.example.library.dto.rbac.RoleCreateDto;
import com.example.library.dto.rbac.RoleDto;
import com.example.library.dto.rbac.UserRoleBatchPreviewDto;
import com.example.library.dto.rbac.UserRoleBatchUpdateResultDto;

import java.util.List;

/**
 * Service for managing roles and their permissions.
 */
public interface RoleService {
    /**
     * Returns all roles.
     */
    List<RoleDto> getAllRoles();

    /**
     * Returns a single role by ID.
     */
    RoleDto getRoleById(Integer roleId);

    /**
     * Creates a new role.
     */
    RoleDto createRole(RoleCreateDto dto);

    /**
     * Deletes a role by ID.
     */
    void deleteRole(Integer roleId);

    /**
     * Assigns a permission to a role.
     */
    RoleDto assignPermission(Integer roleId, Integer permissionId);

    /**
     * Revokes a permission from a role.
     */
    RoleDto revokePermission(Integer roleId, Integer permissionId);

    /**
     * Batch assigns permissions to a role.
     */
    RoleDto assignPermissions(Integer roleId, List<Integer> permissionIds);

    /**
     * Batch revokes permissions from a role.
     */
    RoleDto revokePermissions(Integer roleId, List<Integer> permissionIds);

    /**
     * Assigns a role to a user.
     */
    void assignRoleToUser(Integer userId, Integer roleId);

    /**
     * Revokes a role from a user.
     */
    void revokeRoleFromUser(Integer userId, Integer roleId);

    /**
     * Assigns one role to multiple users.
     */
    UserRoleBatchUpdateResultDto assignRoleToUsers(List<Integer> userIds, Integer roleId);

    /**
     * Revokes one role from multiple users.
     */
    UserRoleBatchUpdateResultDto revokeRoleFromUsers(List<Integer> userIds, Integer roleId);

    /**
     * Previews assignment/revocation impact for one role and multiple users.
     */
    UserRoleBatchPreviewDto previewRoleOperation(List<Integer> userIds, Integer roleId);

    /**
     * Returns all roles assigned to a user.
     */
    List<RoleDto> getUserRoles(Integer userId);
}
