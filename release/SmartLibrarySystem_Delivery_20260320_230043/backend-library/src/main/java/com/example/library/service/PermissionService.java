package com.example.library.service;

import com.example.library.dto.rbac.PermissionCreateDto;
import com.example.library.dto.rbac.PermissionDto;

import java.util.List;

/**
 * Service for managing system permissions.
 */
public interface PermissionService {
    /**
     * Returns all permissions in the system.
     */
    List<PermissionDto> getAllPermissions();

    /**
     * Creates a new permission.
     */
    PermissionDto createPermission(PermissionCreateDto dto);

    /**
     * Deletes a permission by ID.
     */
    void deletePermission(Integer permissionId);
}
