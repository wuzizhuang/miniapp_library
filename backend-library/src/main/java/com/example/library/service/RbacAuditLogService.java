package com.example.library.service;

import com.example.library.dto.rbac.RbacAuditLogDto;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for RBAC audit logging and querying.
 */
public interface RbacAuditLogService {

    /**
     * Persists one RBAC audit event.
     */
    void log(
            Integer actorUserId,
            String actorUsername,
            String actionType,
            String targetType,
            String targetId,
            String detail);

    /**
     * Returns RBAC audit logs in reverse chronological order.
     */
    Page<RbacAuditLogDto> getLogs(int page, int size);

    /**
     * Returns filtered RBAC audit logs in reverse chronological order.
     */
    Page<RbacAuditLogDto> getLogs(
            int page,
            int size,
            String actionType,
            String actorUsername,
            LocalDateTime fromTime,
            LocalDateTime toTime);

    /**
     * Returns filtered RBAC logs for export with a maximum row limit.
     */
    List<RbacAuditLogDto> getLogsForExport(
            int maxRows,
            String actionType,
            String actorUsername,
            LocalDateTime fromTime,
            LocalDateTime toTime);
}
