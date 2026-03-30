package com.example.library.service.impl;

import com.example.library.dto.rbac.RbacAuditLogDto;
import com.example.library.entity.RbacAuditLog;
import com.example.library.repository.RbacAuditLogRepository;
import com.example.library.service.RbacAuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Default implementation for RBAC audit logging.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RbacAuditLogServiceImpl implements RbacAuditLogService {

    private final RbacAuditLogRepository rbacAuditLogRepository;

    @Override
    @Transactional
    public void log(
            Integer actorUserId,
            String actorUsername,
            String actionType,
            String targetType,
            String targetId,
            String detail) {
        if (actorUsername == null || actorUsername.isBlank() ||
                actionType == null || actionType.isBlank() ||
                targetType == null || targetType.isBlank()) {
            return;
        }

        try {
            RbacAuditLog event = new RbacAuditLog();
            event.setActorUserId(actorUserId);
            event.setActorUsername(actorUsername);
            event.setActionType(actionType);
            event.setTargetType(targetType);
            event.setTargetId(targetId);
            event.setDetail(detail);
            rbacAuditLogRepository.save(event);
        } catch (Exception e) {
            // Auditing must not block business operations.
            log.error("Failed to persist RBAC audit log: {}", e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RbacAuditLogDto> getLogs(int page, int size) {
        return getLogs(page, size, null, null, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RbacAuditLogDto> getLogs(
            int page,
            int size,
            String actionType,
            String actorUsername,
            LocalDateTime fromTime,
            LocalDateTime toTime) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);

        String action = normalize(actionType);
        String actor = normalize(actorUsername);

        return rbacAuditLogRepository
                .search(action, actor, fromTime, toTime, PageRequest.of(safePage, safeSize))
                .map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RbacAuditLogDto> getLogsForExport(
            int maxRows,
            String actionType,
            String actorUsername,
            LocalDateTime fromTime,
            LocalDateTime toTime) {
        int safeMaxRows = Math.min(Math.max(maxRows, 1), 20000);
        int pageSize = 500;
        String action = normalize(actionType);
        String actor = normalize(actorUsername);

        List<RbacAuditLogDto> rows = new ArrayList<>();
        int page = 0;
        while (rows.size() < safeMaxRows) {
            Page<RbacAuditLog> result = rbacAuditLogRepository.search(
                    action,
                    actor,
                    fromTime,
                    toTime,
                    PageRequest.of(page, pageSize));
            for (RbacAuditLog log : result.getContent()) {
                if (rows.size() >= safeMaxRows) {
                    break;
                }
                rows.add(toDto(log));
            }
            if (result.isLast() || result.getContent().isEmpty()) {
                break;
            }
            page++;
        }
        return rows;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private RbacAuditLogDto toDto(RbacAuditLog log) {
        RbacAuditLogDto dto = new RbacAuditLogDto();
        dto.setLogId(log.getLogId());
        dto.setActorUserId(log.getActorUserId());
        dto.setActorUsername(log.getActorUsername());
        dto.setActionType(log.getActionType());
        dto.setTargetType(log.getTargetType());
        dto.setTargetId(log.getTargetId());
        dto.setDetail(log.getDetail());
        dto.setCreateTime(log.getCreateTime());
        return dto;
    }
}
