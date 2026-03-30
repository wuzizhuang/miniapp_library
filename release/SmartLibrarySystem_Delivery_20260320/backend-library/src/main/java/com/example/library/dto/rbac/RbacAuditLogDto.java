package com.example.library.dto.rbac;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * RBAC audit log response DTO.
 */
@Data
public class RbacAuditLogDto {
    private Long logId;
    private Integer actorUserId;
    private String actorUsername;
    private String actionType;
    private String targetType;
    private String targetId;
    private String detail;
    private LocalDateTime createTime;
}
