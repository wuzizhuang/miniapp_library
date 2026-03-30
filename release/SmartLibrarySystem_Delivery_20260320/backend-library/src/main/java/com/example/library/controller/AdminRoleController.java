package com.example.library.controller;

import com.example.library.dto.rbac.PermissionCreateDto;
import com.example.library.dto.rbac.PermissionDto;
import com.example.library.dto.rbac.PermissionBatchUpdateDto;
import com.example.library.dto.rbac.RbacAuditLogDto;
import com.example.library.dto.rbac.RoleCreateDto;
import com.example.library.dto.rbac.RoleDto;
import com.example.library.dto.rbac.UserBatchUpdateDto;
import com.example.library.dto.rbac.UserRoleBatchPreviewDto;
import com.example.library.dto.rbac.UserRoleBatchUpdateResultDto;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.PermissionService;
import com.example.library.service.RbacAuditLogService;
import com.example.library.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Admin endpoints for managing roles, permissions, and user-role assignments.
 * All endpoints require ADMIN authority.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminRoleController {

    private final RoleService roleService;
    private final PermissionService permissionService;
    private final RbacAuditLogService rbacAuditLogService;

    // ─── Role Management ──────────────────────────────────────────────

    @GetMapping("/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RoleDto>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @GetMapping("/roles/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoleDto> getRoleById(@PathVariable Integer id) {
        return ResponseEntity.ok(roleService.getRoleById(id));
    }

    @PostMapping("/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoleDto> createRole(
            @Valid @RequestBody RoleCreateDto dto,
            Authentication authentication) {
        RoleDto created = roleService.createRole(dto);
        audit(
                authentication,
                "CREATE_ROLE",
                "ROLE",
                String.valueOf(created.getRoleId()),
                "name=" + created.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/roles/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRole(@PathVariable Integer id, Authentication authentication) {
        roleService.deleteRole(id);
        audit(authentication, "DELETE_ROLE", "ROLE", String.valueOf(id), null);
        return ResponseEntity.noContent().build();
    }

    // ─── Permission Management ────────────────────────────────────────

    @GetMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PermissionDto>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    @PostMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PermissionDto> createPermission(
            @Valid @RequestBody PermissionCreateDto dto,
            Authentication authentication) {
        PermissionDto created = permissionService.createPermission(dto);
        audit(
                authentication,
                "CREATE_PERMISSION",
                "PERMISSION",
                String.valueOf(created.getPermissionId()),
                "name=" + created.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/permissions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePermission(@PathVariable Integer id, Authentication authentication) {
        permissionService.deletePermission(id);
        audit(authentication, "DELETE_PERMISSION", "PERMISSION", String.valueOf(id), null);
        return ResponseEntity.noContent().build();
    }

    // ─── Role–Permission Assignment ───────────────────────────────────

    @PostMapping("/roles/{roleId}/permissions/{permissionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoleDto> assignPermission(
            @PathVariable Integer roleId,
            @PathVariable Integer permissionId,
            Authentication authentication) {
        RoleDto updated = roleService.assignPermission(roleId, permissionId);
        audit(
                authentication,
                "ASSIGN_PERMISSION_TO_ROLE",
                "ROLE_PERMISSION",
                roleId + ":" + permissionId,
                "roleId=" + roleId + ",permissionId=" + permissionId);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/roles/{roleId}/permissions/{permissionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoleDto> revokePermission(
            @PathVariable Integer roleId,
            @PathVariable Integer permissionId,
            Authentication authentication) {
        RoleDto updated = roleService.revokePermission(roleId, permissionId);
        audit(
                authentication,
                "REVOKE_PERMISSION_FROM_ROLE",
                "ROLE_PERMISSION",
                roleId + ":" + permissionId,
                "roleId=" + roleId + ",permissionId=" + permissionId);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/roles/{roleId}/permissions/batch/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoleDto> assignPermissionsBatch(
            @PathVariable Integer roleId,
            @Valid @RequestBody PermissionBatchUpdateDto dto,
            Authentication authentication) {
        RoleDto updated = roleService.assignPermissions(roleId, dto.getPermissionIds());
        audit(
                authentication,
                "ASSIGN_PERMISSIONS_TO_ROLE_BATCH",
                "ROLE_PERMISSION",
                String.valueOf(roleId),
                "roleId=" + roleId + ",permissionIds=" + dto.getPermissionIds());
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/roles/{roleId}/permissions/batch/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoleDto> revokePermissionsBatch(
            @PathVariable Integer roleId,
            @Valid @RequestBody PermissionBatchUpdateDto dto,
            Authentication authentication) {
        RoleDto updated = roleService.revokePermissions(roleId, dto.getPermissionIds());
        audit(
                authentication,
                "REVOKE_PERMISSIONS_FROM_ROLE_BATCH",
                "ROLE_PERMISSION",
                String.valueOf(roleId),
                "roleId=" + roleId + ",permissionIds=" + dto.getPermissionIds());
        return ResponseEntity.ok(updated);
    }

    // ─── User–Role Assignment ─────────────────────────────────────────

    @GetMapping("/users/{userId}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RoleDto>> getUserRoles(@PathVariable Integer userId) {
        return ResponseEntity.ok(roleService.getUserRoles(userId));
    }

    @PostMapping("/users/{userId}/roles/{roleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> assignRoleToUser(
            @PathVariable Integer userId,
            @PathVariable Integer roleId,
            Authentication authentication) {
        roleService.assignRoleToUser(userId, roleId);
        audit(
                authentication,
                "ASSIGN_ROLE_TO_USER",
                "USER_ROLE",
                userId + ":" + roleId,
                "userId=" + userId + ",roleId=" + roleId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/users/{userId}/roles/{roleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> revokeRoleFromUser(
            @PathVariable Integer userId,
            @PathVariable Integer roleId,
            Authentication authentication) {
        roleService.revokeRoleFromUser(userId, roleId);
        audit(
                authentication,
                "REVOKE_ROLE_FROM_USER",
                "USER_ROLE",
                userId + ":" + roleId,
                "userId=" + userId + ",roleId=" + roleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/roles/{roleId}/users/batch/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserRoleBatchUpdateResultDto> assignRoleToUsersBatch(
            @PathVariable Integer roleId,
            @Valid @RequestBody UserBatchUpdateDto dto,
            Authentication authentication) {
        UserRoleBatchUpdateResultDto result = roleService.assignRoleToUsers(dto.getUserIds(), roleId);
        audit(
                authentication,
                "ASSIGN_ROLE_TO_USERS_BATCH",
                "USER_ROLE",
                String.valueOf(roleId),
                "roleId=" + roleId + ",affected=" + result.getAffectedCount() + ",missing=" + result.getMissingUserIds());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/roles/{roleId}/users/batch/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserRoleBatchUpdateResultDto> revokeRoleFromUsersBatch(
            @PathVariable Integer roleId,
            @Valid @RequestBody UserBatchUpdateDto dto,
            Authentication authentication) {
        UserRoleBatchUpdateResultDto result = roleService.revokeRoleFromUsers(dto.getUserIds(), roleId);
        audit(
                authentication,
                "REVOKE_ROLE_FROM_USERS_BATCH",
                "USER_ROLE",
                String.valueOf(roleId),
                "roleId=" + roleId + ",affected=" + result.getAffectedCount() + ",missing=" + result.getMissingUserIds());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/roles/{roleId}/users/batch/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserRoleBatchPreviewDto> previewRoleOperationBatch(
            @PathVariable Integer roleId,
            @Valid @RequestBody UserBatchUpdateDto dto) {
        return ResponseEntity.ok(roleService.previewRoleOperation(dto.getUserIds(), roleId));
    }

    @GetMapping("/rbac/audits")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<RbacAuditLogDto>> getRbacAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String actorUsername,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toTime) {
        return ResponseEntity.ok(rbacAuditLogService.getLogs(page, size, actionType, actorUsername, fromTime, toTime));
    }

    @GetMapping("/rbac/audits/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportRbacAuditLogs(
            @RequestParam(defaultValue = "5000") int maxRows,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String actorUsername,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toTime) {
        List<RbacAuditLogDto> rows = rbacAuditLogService.getLogsForExport(
                maxRows,
                actionType,
                actorUsername,
                fromTime,
                toTime);

        StringBuilder csv = new StringBuilder();
        csv.append("logId,actionType,targetType,targetId,actorUserId,actorUsername,createTime,detail\n");
        for (RbacAuditLogDto row : rows) {
            csv.append(escapeCsv(row.getLogId())).append(",")
                    .append(escapeCsv(row.getActionType())).append(",")
                    .append(escapeCsv(row.getTargetType())).append(",")
                    .append(escapeCsv(row.getTargetId())).append(",")
                    .append(escapeCsv(row.getActorUserId())).append(",")
                    .append(escapeCsv(row.getActorUsername())).append(",")
                    .append(escapeCsv(row.getCreateTime())).append(",")
                    .append(escapeCsv(row.getDetail())).append("\n");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rbac-audits.csv");
        return ResponseEntity.ok()
                .headers(headers)
                .body("\uFEFF" + csv);
    }

    private void audit(
            Authentication authentication,
            String actionType,
            String targetType,
            String targetId,
            String detail) {
        if (authentication == null) {
            return;
        }

        Integer actorUserId = null;
        String actorUsername = authentication.getName();

        if (authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            actorUserId = userDetails.getId();
            actorUsername = userDetails.getUsername();
        }

        rbacAuditLogService.log(actorUserId, actorUsername, actionType, targetType, targetId, detail);
    }

    private String escapeCsv(Object value) {
        if (value == null) {
            return "";
        }
        String raw = String.valueOf(value);
        if (raw.contains(",") || raw.contains("\"") || raw.contains("\n")) {
            return "\"" + raw.replace("\"", "\"\"") + "\"";
        }
        return raw;
    }
}
