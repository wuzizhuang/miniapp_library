package com.example.library.dto.rbac;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Permission response DTO.
 */
@Data
public class PermissionDto {
    private Integer permissionId;
    private String name;
    private String description;
    private LocalDateTime createTime;
}
