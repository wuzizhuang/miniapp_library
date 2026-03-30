package com.example.library.dto.rbac;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Role response DTO including assigned permissions.
 */
@Data
public class RoleDto {
    private Integer roleId;
    private String name;
    private String displayName;
    private String description;
    private List<PermissionDto> permissions;
    private LocalDateTime createTime;
}
