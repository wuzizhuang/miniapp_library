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
 * 后台 RBAC 管理控制器。
 * 提供角色、权限、用户角色绑定以及 RBAC 审计日志相关接口。
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminRoleController {

    private final RoleService roleService;
    private final PermissionService permissionService;
    private final RbacAuditLogService rbacAuditLogService;

    // 角色管理

    /**
     * 查询全部角色。
     */
    @GetMapping("/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RoleDto>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    /**
     * 根据角色 ID 查询详情。
     */
    @GetMapping("/roles/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoleDto> getRoleById(@PathVariable Integer id) {
        return ResponseEntity.ok(roleService.getRoleById(id));
    }

    /**
     * 新增角色，并记录 RBAC 审计日志。
     */
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

    /**
     * 删除角色，并记录 RBAC 审计日志。
     */
    @DeleteMapping("/roles/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRole(@PathVariable Integer id, Authentication authentication) {
        roleService.deleteRole(id);
        audit(authentication, "DELETE_ROLE", "ROLE", String.valueOf(id), null);
        return ResponseEntity.noContent().build();
    }

    // 权限管理

    /**
     * 查询全部权限点。
     */
    @GetMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PermissionDto>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    /**
     * 新增权限点，并写入审计日志。
     */
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

    /**
     * 删除权限点，并写入审计日志。
     */
    @DeleteMapping("/permissions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePermission(@PathVariable Integer id, Authentication authentication) {
        permissionService.deletePermission(id);
        audit(authentication, "DELETE_PERMISSION", "PERMISSION", String.valueOf(id), null);
        return ResponseEntity.noContent().build();
    }

    // 角色与权限绑定

    /**
     * 为角色分配单个权限。
     */
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

    /**
     * 从角色移除单个权限。
     */
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

    /**
     * 批量为角色分配权限。
     */
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

    /**
     * 批量从角色移除权限。
     */
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

    // 用户与角色绑定

    /**
     * 查询指定用户当前绑定的角色。
     */
    @GetMapping("/users/{userId}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RoleDto>> getUserRoles(@PathVariable Integer userId) {
        return ResponseEntity.ok(roleService.getUserRoles(userId));
    }

    /**
     * 为指定用户分配角色。
     */
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

    /**
     * 从指定用户撤销角色。
     */
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

    /**
     * 将某个角色批量分配给多个用户。
     */
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

    /**
     * 将某个角色从多个用户身上批量撤销。
     */
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

    /**
     * 预览批量分配/撤销角色的影响结果，不真正提交变更。
     */
    @PostMapping("/roles/{roleId}/users/batch/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserRoleBatchPreviewDto> previewRoleOperationBatch(
            @PathVariable Integer roleId,
            @Valid @RequestBody UserBatchUpdateDto dto) {
        return ResponseEntity.ok(roleService.previewRoleOperation(dto.getUserIds(), roleId));
    }

    /**
     * 分页查询 RBAC 审计日志。
     */
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

    /**
     * 导出 RBAC 审计日志为 CSV 文件。
     */
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

    /**
     * 统一写入 RBAC 审计日志。
     */
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

    /**
     * 对 CSV 字段值做转义，避免逗号、双引号和换行破坏格式。
     */
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
