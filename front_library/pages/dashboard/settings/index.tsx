import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import useSWR from "swr";
import { toast } from "sonner";

import AdminLayout from "@/components/layouts/AdminLayout";
import { SettingsAudit } from "@/components/modules/admin/settings/SettingsAudit";
import { SettingsAiGateway } from "@/components/modules/admin/settings/SettingsAiGateway";
import { SettingsPermissions } from "@/components/modules/admin/settings/SettingsPermissions";
import { SettingsRoles } from "@/components/modules/admin/settings/SettingsRoles";
import { SettingsUsers } from "@/components/modules/admin/settings/SettingsUsers";
import {
  adminService,
  AdminAiGatewaySettings,
  AdminUser,
  AdminUsersPage,
  RbacAuditLog,
  RbacPermission,
  RbacRole,
  UserRoleBatchPreview,
  UserRoleBatchResult,
} from "@/services/api/adminService";
import { useDebounce } from "@/hooks/useDebounce";
import { getApiErrorMessage } from "@/lib/apiError";

type UserOption = AdminUser & { userId: number };
type SettingsSection = "rolePermission" | "userRole" | "audit" | "aiGateway";

export default function RbacSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("rolePermission");
  const shouldLoadRoles =
    activeSection === "rolePermission" || activeSection === "userRole";
  const shouldLoadPermissions = activeSection === "rolePermission";
  const shouldLoadUserRole = activeSection === "userRole";
  const shouldLoadAudit = activeSection === "audit";
  const shouldLoadAiGateway = activeSection === "aiGateway";

  const { data: roles, isLoading: rolesLoading, mutate: mutateRoles } = useSWR<RbacRole[]>(
    shouldLoadRoles ? "rbac-roles" : null,
    adminService.getRoles,
  );
  const {
    data: permissions,
    isLoading: permissionsLoading,
    mutate: mutatePermissions,
  } = useSWR<RbacPermission[]>(
    shouldLoadPermissions ? "rbac-permissions" : null,
    adminService.getPermissions,
  );
  const {
    data: aiGatewaySettings,
    isLoading: aiGatewayLoading,
    mutate: mutateAiGatewaySettings,
  } = useSWR<AdminAiGatewaySettings>(
    shouldLoadAiGateway ? "admin-ai-gateway-settings" : null,
    adminService.getAiGatewaySettings,
  );

  const [userPage, setUserPage] = useState(0);
  const [bulkUserKeyword, setBulkUserKeyword] = useState("");
  const debouncedBulkUserKeyword = useDebounce(bulkUserKeyword, 300);

  const { data: usersPageData, isLoading: usersLoading } = useSWR<AdminUsersPage>(
    shouldLoadUserRole ? ["rbac-users", userPage, debouncedBulkUserKeyword] : null,
    () =>
      adminService.getAdminUsersPage({
        page: userPage,
        size: 20,
        keyword: debouncedBulkUserKeyword || undefined,
      }),
  );
  const users = usersPageData?.items ?? [];
  const usersTotalPages = usersPageData?.totalPages ?? 1;

  const [auditPage, setAuditPage] = useState(0);
  const [auditActionType, setAuditActionType] = useState("");
  const [auditActorKeyword, setAuditActorKeyword] = useState("");
  const [auditFromDate, setAuditFromDate] = useState("");
  const [auditToDate, setAuditToDate] = useState("");
  const auditFromTimeIso = auditFromDate ? `${auditFromDate}T00:00:00` : undefined;
  const auditToTimeIso = auditToDate ? `${auditToDate}T23:59:59` : undefined;
  const { data: auditPageData, isLoading: auditsLoading, mutate: mutateAudits } = useSWR(
    shouldLoadAudit
      ? ["rbac-audits", auditPage, auditActionType, auditActorKeyword, auditFromDate, auditToDate]
      : null,
    () =>
      adminService.getRbacAuditLogs(auditPage, 10, {
        actionType: auditActionType || undefined,
        actorUsername: auditActorKeyword || undefined,
        fromTime: auditFromTimeIso,
        toTime: auditToTimeIso,
      }),
  );

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const [roleName, setRoleName] = useState("");
  const [roleDisplayName, setRoleDisplayName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  const [permissionName, setPermissionName] = useState("");
  const [permissionDescription, setPermissionDescription] = useState("");
  const [roleKeyword, setRoleKeyword] = useState("");
  const [permissionKeyword, setPermissionKeyword] = useState("");
  const [auditKeyword, setAuditKeyword] = useState("");
  const [bulkRoleId, setBulkRoleId] = useState<number | null>(null);
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<number[]>([]);
  const [cachedUserOptions, setCachedUserOptions] = useState<Record<number, UserOption>>({});
  const [lastBatchResult, setLastBatchResult] = useState<UserRoleBatchResult | null>(null);
  const [isBatchResultModalOpen, setIsBatchResultModalOpen] = useState(false);
  const [isSavingAiGateway, setIsSavingAiGateway] = useState(false);

  const auditActionOptions = [
    "",
    "CREATE_ROLE",
    "DELETE_ROLE",
    "CREATE_PERMISSION",
    "DELETE_PERMISSION",
    "ASSIGN_PERMISSION_TO_ROLE",
    "REVOKE_PERMISSION_FROM_ROLE",
    "ASSIGN_PERMISSIONS_TO_ROLE_BATCH",
    "REVOKE_PERMISSIONS_FROM_ROLE_BATCH",
    "ASSIGN_ROLE_TO_USER",
    "REVOKE_ROLE_FROM_USER",
    "ASSIGN_ROLE_TO_USERS_BATCH",
    "REVOKE_ROLE_FROM_USERS_BATCH",
  ];

  const permissionGroups = useMemo(() => {
    const map = new Map<string, RbacPermission[]>();

    for (const permission of permissions ?? []) {
      const [resource] = (permission.name ?? "").split(":");
      const key = resource || "other";
      const list = map.get(key) ?? [];

      list.push(permission);
      map.set(key, list);
    }

    return Array.from(map.entries())
      .map(([resource, list]) => ({
        resource,
        permissions: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.resource.localeCompare(b.resource));
  }, [permissions]);

  const filteredPermissionGroups = useMemo(() => {
    const keyword = permissionKeyword.trim().toLowerCase();

    if (!keyword) return permissionGroups;

    return permissionGroups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (permission) =>
            permission.name.toLowerCase().includes(keyword) ||
            (permission.description ?? "").toLowerCase().includes(keyword),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [permissionGroups, permissionKeyword]);

  const normalizedUsers = useMemo<UserOption[]>(
    () =>
      (users ?? [])
        .map((user) => ({ ...user, userId: Number(user.id) }))
        .filter((user) => Number.isFinite(user.userId)),
    [users],
  );

  useEffect(() => {
    if (normalizedUsers.length === 0) {
      return;
    }

    setCachedUserOptions((prev) => {
      const next = { ...prev };

      for (const user of normalizedUsers) {
        next[user.userId] = user;
      }

      return next;
    });
  }, [normalizedUsers]);

  const selectedUserOption = useMemo(
    () => (selectedUserId != null ? cachedUserOptions[selectedUserId] ?? null : null),
    [cachedUserOptions, selectedUserId],
  );

  const selectableUsers = useMemo(() => {
    const seen = new Set<number>();
    const items: UserOption[] = [];

    if (selectedUserOption) {
      items.push(selectedUserOption);
      seen.add(selectedUserOption.userId);
    }

    for (const user of normalizedUsers) {
      if (seen.has(user.userId)) {
        continue;
      }

      items.push(user);
      seen.add(user.userId);
    }

    return items;
  }, [normalizedUsers, selectedUserOption]);

  useEffect(() => {
    if (!roles || roles.length === 0) {
      setSelectedRoleId(null);

      return;
    }

    const stillExists = roles.some((role) => role.roleId === selectedRoleId);

    if (!stillExists) {
      setSelectedRoleId(roles[0].roleId);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (selectedUserId != null && selectedUserOption) {
      return;
    }

    if (normalizedUsers.length === 0) {
      setSelectedUserId(null);

      return;
    }

    setSelectedUserId(normalizedUsers[0].userId);
  }, [normalizedUsers, selectedUserId, selectedUserOption]);

  useEffect(() => {
    if (!roles || roles.length === 0) {
      setBulkRoleId(null);

      return;
    }
    const exists = roles.some((role) => role.roleId === bulkRoleId);

    if (!exists) {
      setBulkRoleId(roles[0].roleId);
    }
  }, [roles, bulkRoleId]);

  useEffect(() => {
    setAuditPage(0);
  }, [auditActionType, auditActorKeyword, auditFromDate, auditToDate]);

  useEffect(() => {
    setUserPage(0);
  }, [debouncedBulkUserKeyword]);

  const { data: userRoles, isLoading: userRolesLoading, mutate: mutateUserRoles } = useSWR<RbacRole[]>(
    shouldLoadUserRole && selectedUserId ? ["rbac-user-roles", selectedUserId] : null,
    () => adminService.getUserRoles(selectedUserId as number),
  );

  const selectedRole = useMemo(
    () => (roles ?? []).find((role) => role.roleId === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const assignedPermissionIds = useMemo(
    () => new Set(selectedRole?.permissions?.map((permission) => permission.permissionId) ?? []),
    [selectedRole],
  );

  const assignedUserRoleIds = useMemo(
    () => new Set((userRoles ?? []).map((role) => role.roleId)),
    [userRoles],
  );

  const auditLogs = useMemo<RbacAuditLog[]>(() => auditPageData?.content ?? [], [auditPageData]);

  const filteredRoles = useMemo(() => {
    const keyword = roleKeyword.trim().toLowerCase();

    if (!keyword) return roles ?? [];

    return (roles ?? []).filter(
      (role) =>
        role.name.toLowerCase().includes(keyword) ||
        (role.displayName ?? "").toLowerCase().includes(keyword) ||
        (role.description ?? "").toLowerCase().includes(keyword),
    );
  }, [roles, roleKeyword]);

  const filteredAuditLogs = useMemo(() => {
    const keyword = auditKeyword.trim().toLowerCase();

    if (!keyword) return auditLogs;

    return auditLogs.filter(
      (log) =>
        (log.actionType ?? "").toLowerCase().includes(keyword) ||
        (log.targetType ?? "").toLowerCase().includes(keyword) ||
        (log.targetId ?? "").toLowerCase().includes(keyword) ||
        (log.actorUsername ?? "").toLowerCase().includes(keyword) ||
        (log.detail ?? "").toLowerCase().includes(keyword),
    );
  }, [auditLogs, auditKeyword]);

  const filteredBulkUsers = useMemo(() => {
    const keyword = bulkUserKeyword.trim().toLowerCase();

    if (!keyword) return normalizedUsers;

    return normalizedUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.id.toLowerCase().includes(keyword),
    );
  }, [normalizedUsers, bulkUserKeyword]);

  const selectedBulkUserSet = useMemo(
    () => new Set(selectedBulkUserIds),
    [selectedBulkUserIds],
  );

  const currentPageSelectedCount = useMemo(
    () => normalizedUsers.filter((user) => selectedBulkUserSet.has(user.userId)).length,
    [normalizedUsers, selectedBulkUserSet],
  );

  const sortedSelectedBulkUserIds = useMemo(
    () => [...selectedBulkUserIds].sort((a, b) => a - b),
    [selectedBulkUserIds],
  );

  const bulkPreviewKey = useMemo(
    () =>
      shouldLoadUserRole && bulkRoleId && sortedSelectedBulkUserIds.length > 0
        ? ["rbac-bulk-preview", bulkRoleId, sortedSelectedBulkUserIds.join(",")]
        : null,
    [shouldLoadUserRole, bulkRoleId, sortedSelectedBulkUserIds],
  );

  const {
    data: bulkPreview,
    isLoading: bulkPreviewLoading,
    mutate: mutateBulkPreview,
  } = useSWR<UserRoleBatchPreview>(
    bulkPreviewKey,
    () => adminService.previewRoleOperationBatch(bulkRoleId as number, sortedSelectedBulkUserIds),
  );

  const submitCreateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = roleName.trim().toUpperCase();

    if (!name) {
      toast.error("角色编码不能为空");

      return;
    }

    setPendingKey("create-role");
    try {
      const created = await adminService.createRole({
        name,
        displayName: roleDisplayName.trim() || undefined,
        description: roleDescription.trim() || undefined,
      });

      toast.success(`角色 ${created.name} 已创建`);
      setRoleName("");
      setRoleDisplayName("");
      setRoleDescription("");
      await mutateRoles();
      await mutateAudits();
      setSelectedRoleId(created.roleId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "创建角色失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const submitCreatePermission = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = permissionName.trim().toLowerCase();

    if (!name) {
      toast.error("权限编码不能为空");

      return;
    }

    setPendingKey("create-permission");
    try {
      const created = await adminService.createPermission({
        name,
        description: permissionDescription.trim() || undefined,
      });

      toast.success(`权限 ${created.name} 已创建`);
      setPermissionName("");
      setPermissionDescription("");
      await mutatePermissions();
      await mutateRoles();
      await mutateAudits();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "创建权限失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const deleteRole = async (role: RbacRole) => {
    if (!window.confirm(`确认删除角色 ${role.name} 吗？`)) return;

    setPendingKey(`delete-role-${role.roleId}`);
    try {
      await adminService.deleteRole(role.roleId);
      toast.success(`角色 ${role.name} 已删除`);
      await mutateRoles();
      if (selectedUserId) {
        await mutateUserRoles();
      }
      await mutateAudits();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "删除角色失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const deletePermission = async (permission: RbacPermission) => {
    if (!window.confirm(`确认删除权限 ${permission.name} 吗？`)) return;

    setPendingKey(`delete-permission-${permission.permissionId}`);
    try {
      await adminService.deletePermission(permission.permissionId);
      toast.success(`权限 ${permission.name} 已删除`);
      await mutatePermissions();
      await mutateRoles();
      await mutateAudits();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "删除权限失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const togglePermissionOnRole = async (permissionId: number) => {
    if (!selectedRoleId) return;

    const alreadyAssigned = assignedPermissionIds.has(permissionId);
    const actionKey = `toggle-permission-${selectedRoleId}-${permissionId}`;

    setPendingKey(actionKey);

    try {
      if (alreadyAssigned) {
        await adminService.revokePermissionFromRole(selectedRoleId, permissionId);
      } else {
        await adminService.assignPermissionToRole(selectedRoleId, permissionId);
      }
      await mutateRoles();
      await mutateAudits();
      toast.success(alreadyAssigned ? "权限已移除" : "权限已授予");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "操作失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const toggleRoleOnUser = async (roleId: number) => {
    if (!selectedUserId) return;

    const alreadyAssigned = assignedUserRoleIds.has(roleId);
    const actionKey = `toggle-user-role-${selectedUserId}-${roleId}`;

    setPendingKey(actionKey);

    try {
      if (alreadyAssigned) {
        await adminService.revokeRoleFromUser(selectedUserId, roleId);
      } else {
        await adminService.assignRoleToUser(selectedUserId, roleId);
      }
      await mutateUserRoles();
      await mutateAudits();
      toast.success(alreadyAssigned ? "用户角色已撤销" : "用户角色已分配");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "分配失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const togglePermissionGroup = async (resource: string) => {
    if (!selectedRoleId) return;

    const group = permissionGroups.find((item) => item.resource === resource);

    if (!group || group.permissions.length === 0) return;

    const allAssigned = group.permissions.every((permission) =>
      assignedPermissionIds.has(permission.permissionId),
    );
    const targetPermissionIds = group.permissions.map((permission) => permission.permissionId);

    const actionKey = `toggle-group-${selectedRoleId}-${resource}`;

    setPendingKey(actionKey);
    try {
      if (allAssigned) {
        await adminService.revokePermissionsFromRoleBatch(selectedRoleId, targetPermissionIds);
      } else {
        await adminService.assignPermissionsToRoleBatch(selectedRoleId, targetPermissionIds);
      }
      await mutateRoles();
      await mutateAudits();
      toast.success(allAssigned ? `已撤销 ${resource} 组权限` : `已授予 ${resource} 组权限`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "批量授权失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const formatLogTime = (raw?: string) => {
    if (!raw) return "-";
    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) return raw;

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  };

  const escapeCsv = (value: unknown): string => {
    const raw = String(value ?? "");

    if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
      return `"${raw.replace(/"/g, "\"\"")}"`;
    }

    return raw;
  };

  const downloadCsv = (filename: string, headers: string[], rows: Array<Array<unknown>>) => {
    const csvText = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvText}`], { type: "text/csv;charset=utf-8;" });

    downloadBlob(filename, blob);
  };

  const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const exportLastBatchResultCsv = () => {
    if (!lastBatchResult) {
      toast.error("暂无可导出的批量结果");

      return;
    }
    const rows = [
      ["operation", lastBatchResult.operation],
      ["roleId", lastBatchResult.roleId],
      ["roleName", lastBatchResult.roleName],
      ["requestedCount", lastBatchResult.requestedCount],
      ["processedCount", lastBatchResult.processedCount],
      ["affectedCount", lastBatchResult.affectedCount],
      ["unchangedCount", lastBatchResult.unchangedCount],
      ["missingUserIds", lastBatchResult.missingUserIds.join("|")],
      ["unchangedUserIds", lastBatchResult.unchangedUserIds.join("|")],
      ["failedUserIds", lastBatchResult.failedUserIds.join("|")],
    ];

    downloadCsv(
      `rbac-batch-result-${lastBatchResult.roleName}-${Date.now()}.csv`,
      ["field", "value"],
      rows,
    );
  };

  const exportAuditLogsCsv = async () => {
    try {
      const blob = await adminService.exportRbacAuditLogsCsv(
        {
          actionType: auditActionType || undefined,
          actorUsername: auditActorKeyword || undefined,
          fromTime: auditFromTimeIso,
          toTime: auditToTimeIso,
        },
        10000,
      );

      downloadBlob(`rbac-audits-export-${Date.now()}.csv`, blob);
      toast.success("审计日志已导出");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "导出失败"));
    }
  };

  const clearAuditFilters = () => {
    setAuditActionType("");
    setAuditActorKeyword("");
    setAuditFromDate("");
    setAuditToDate("");
    setAuditKeyword("");
  };

  const copyIds = async (label: string, ids: number[]) => {
    if (!ids || ids.length === 0) {
      toast.error(`${label}为空`);

      return;
    }
    try {
      await navigator.clipboard.writeText(ids.join(","));
      toast.success(`${label}已复制`);
    } catch {
      toast.error("复制失败");
    }
  };

  const idsText = (ids: number[]) => (ids && ids.length > 0 ? ids.join(", ") : "-");

  const toggleBulkUserSelection = (userId: number) => {
    setSelectedBulkUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const selectAllFilteredBulkUsers = () => {
    setSelectedBulkUserIds((prev) => {
      const merged = new Set(prev);

      for (const user of filteredBulkUsers) {
        merged.add(user.userId);
      }

      return Array.from(merged);
    });
  };

  const clearBulkUserSelection = () => {
    setSelectedBulkUserIds([]);
  };

  const assignRoleToSelectedUsers = async () => {
    if (!bulkRoleId || selectedBulkUserIds.length === 0) {
      toast.error("请选择角色和至少一个用户");

      return;
    }

    const preview = bulkPreview;
    const confirmMessage = preview
      ? [
          `即将执行批量分配：`,
          `- 目标用户数: ${preview.requestedCount}`,
          `- 将新增分配: ${preview.willBeAssignedCount}`,
          `- 已持有该角色(不变): ${preview.alreadyAssignedCount}`,
          `- 不存在用户: ${preview.missingUserIds.length}`,
          "",
          "确认继续？",
        ].join("\n")
      : `确认给 ${selectedBulkUserIds.length} 位用户批量分配角色吗？`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setPendingKey("bulk-assign-role");
    try {
      const result = await adminService.assignRoleToUsersBatch(bulkRoleId, selectedBulkUserIds);

      setLastBatchResult(result);
      await mutateUserRoles();
      await mutateAudits();
      await mutateBulkPreview();
      if (result.failedUserIds.length > 0 || result.missingUserIds.length > 0) {
        toast.warning(
          `部分完成：成功 ${result.affectedCount}，未变更 ${result.unchangedCount}，缺失 ${result.missingUserIds.length}，失败 ${result.failedUserIds.length}`,
        );
      } else {
        toast.success(`已为 ${result.affectedCount} 位用户分配角色`);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "批量分配失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const revokeRoleFromSelectedUsers = async () => {
    if (!bulkRoleId || selectedBulkUserIds.length === 0) {
      toast.error("请选择角色和至少一个用户");

      return;
    }

    const preview = bulkPreview;
    const confirmMessage = preview
      ? [
          `即将执行批量撤销：`,
          `- 目标用户数: ${preview.requestedCount}`,
          `- 将撤销成功: ${preview.willBeRevokedCount}`,
          `- 当前未持有该角色(不变): ${preview.validUserCount - preview.willBeRevokedCount}`,
          `- 不存在用户: ${preview.missingUserIds.length}`,
          "",
          "确认继续？",
        ].join("\n")
      : `确认撤销 ${selectedBulkUserIds.length} 位用户的角色吗？`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setPendingKey("bulk-revoke-role");
    try {
      const result = await adminService.revokeRoleFromUsersBatch(bulkRoleId, selectedBulkUserIds);

      setLastBatchResult(result);
      await mutateUserRoles();
      await mutateAudits();
      await mutateBulkPreview();
      if (result.failedUserIds.length > 0 || result.missingUserIds.length > 0) {
        toast.warning(
          `部分完成：成功 ${result.affectedCount}，未变更 ${result.unchangedCount}，缺失 ${result.missingUserIds.length}，失败 ${result.failedUserIds.length}`,
        );
      } else {
        toast.success(`已撤销 ${result.affectedCount} 位用户的角色`);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "批量撤销失败"));
    } finally {
      setPendingKey(null);
    }
  };

  const submitAiGatewaySettings = async (payload: import("@/services/api/adminService").AdminAiGatewaySettingsUpdateRequest) => {
    setIsSavingAiGateway(true);
    try {
      await adminService.updateAiGatewaySettings(payload);
      await mutateAiGatewaySettings();
      toast.success("AI 网关设置已保存");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "AI 网关设置保存失败"));
    } finally {
      setIsSavingAiGateway(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">RBAC 权限中心</h1>
            <p className="text-default-500 text-sm">
              管理角色、权限及用户分配关系，后台菜单与页面会自动按权限生效。
            </p>
          </div>
          <div className="flex gap-2">
            <Chip color="primary" variant="flat">
              角色 {roles ? roles.length : "-"}
            </Chip>
            <Chip color="secondary" variant="flat">
              权限 {permissions ? permissions.length : "-"}
            </Chip>
            <Chip color="success" variant="flat">
              用户 {usersPageData?.totalElements ?? "-"}
            </Chip>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            color={activeSection === "rolePermission" ? "primary" : "default"}
            variant={activeSection === "rolePermission" ? "solid" : "flat"}
            onPress={() => setActiveSection("rolePermission")}
          >
            角色与权限
          </Button>
          <Button
            color={activeSection === "userRole" ? "primary" : "default"}
            variant={activeSection === "userRole" ? "solid" : "flat"}
            onPress={() => setActiveSection("userRole")}
          >
            用户角色分配
          </Button>
          <Button
            color={activeSection === "audit" ? "primary" : "default"}
            variant={activeSection === "audit" ? "solid" : "flat"}
            onPress={() => setActiveSection("audit")}
          >
            审计日志
          </Button>
          <Button
            color={activeSection === "aiGateway" ? "primary" : "default"}
            variant={activeSection === "aiGateway" ? "solid" : "flat"}
            onPress={() => setActiveSection("aiGateway")}
          >
            AI 网关
          </Button>
        </div>

        {activeSection === "rolePermission" ? (
          <>
            <SettingsRoles
              filteredRoles={filteredRoles}
              pendingKey={pendingKey}
              roleDescription={roleDescription}
              roleDisplayName={roleDisplayName}
              roleKeyword={roleKeyword}
              roleName={roleName}
              rolesLoading={rolesLoading}
              selectedRoleId={selectedRoleId}
              onDeleteRole={deleteRole}
              onRoleDescriptionChange={setRoleDescription}
              onRoleDisplayNameChange={setRoleDisplayName}
              onRoleKeywordChange={setRoleKeyword}
              onRoleNameChange={setRoleName}
              onSelectRole={setSelectedRoleId}
              onSubmitCreateRole={submitCreateRole}
            />
            <SettingsPermissions
              assignedPermissionIds={assignedPermissionIds}
              filteredPermissionGroups={filteredPermissionGroups}
              pendingKey={pendingKey}
              permissionDescription={permissionDescription}
              permissionKeyword={permissionKeyword}
              permissionName={permissionName}
              permissionsLoading={permissionsLoading}
              selectedRole={selectedRole}
              selectedRoleId={selectedRoleId}
              onDeletePermission={deletePermission}
              onPermissionDescriptionChange={setPermissionDescription}
              onPermissionKeywordChange={setPermissionKeyword}
              onPermissionNameChange={setPermissionName}
              onSubmitCreatePermission={submitCreatePermission}
              onTogglePermission={togglePermissionOnRole}
              onTogglePermissionGroup={togglePermissionGroup}
            />
          </>
        ) : null}

        {activeSection === "userRole" ? (
          <SettingsUsers
            assignedUserRoleIds={assignedUserRoleIds}
            bulkPreview={bulkPreview}
            bulkPreviewKey={bulkPreviewKey}
            bulkPreviewLoading={bulkPreviewLoading}
            bulkRoleId={bulkRoleId}
            bulkUserKeyword={bulkUserKeyword}
            currentPageSelectedCount={currentPageSelectedCount}
            filteredBulkUsers={filteredBulkUsers}
            lastBatchResult={lastBatchResult}
            pendingKey={pendingKey}
            roles={roles ?? []}
            selectedBulkUserIds={selectedBulkUserIds}
            selectedBulkUserSet={selectedBulkUserSet}
            selectedUserId={selectedUserId}
            selectableUsers={selectableUsers}
            userPage={userPage}
            userRolesLoading={userRolesLoading}
            usersLoading={usersLoading}
            usersTotalPages={usersTotalPages}
            onAssignRoleToSelectedUsers={assignRoleToSelectedUsers}
            onBulkRoleIdChange={setBulkRoleId}
            onBulkUserKeywordChange={setBulkUserKeyword}
            onClearBulkUserSelection={clearBulkUserSelection}
            onExportLastBatchResultCsv={exportLastBatchResultCsv}
            onNextUserPage={() =>
              setUserPage((prev) => Math.min(usersTotalPages - 1, prev + 1))
            }
            onOpenBatchResultModal={setIsBatchResultModalOpen}
            onPreviousUserPage={() => setUserPage((prev) => Math.max(0, prev - 1))}
            onRevokeRoleFromSelectedUsers={revokeRoleFromSelectedUsers}
            onSelectAllFilteredBulkUsers={selectAllFilteredBulkUsers}
            onSelectedUserIdChange={setSelectedUserId}
            onToggleBulkUserSelection={toggleBulkUserSelection}
            onToggleRoleOnUser={toggleRoleOnUser}
          />
        ) : null}

        {activeSection === "audit" ? (
          <SettingsAudit
            auditActionOptions={auditActionOptions}
            auditActionType={auditActionType}
            auditActorKeyword={auditActorKeyword}
            auditFromDate={auditFromDate}
            auditKeyword={auditKeyword}
            auditPage={auditPage}
            auditToDate={auditToDate}
            auditsLoading={auditsLoading}
            filteredAuditLogs={filteredAuditLogs}
            formatLogTime={formatLogTime}
            isLastPage={Boolean(auditPageData?.last)}
            onAuditActionTypeChange={setAuditActionType}
            onAuditActorKeywordChange={setAuditActorKeyword}
            onAuditFromDateChange={setAuditFromDate}
            onAuditKeywordChange={setAuditKeyword}
            onAuditToDateChange={setAuditToDate}
            onClearFilters={clearAuditFilters}
            onExportCsv={exportAuditLogsCsv}
            onNextPage={() => setAuditPage((prev) => prev + 1)}
            onPreviousPage={() => setAuditPage((prev) => Math.max(0, prev - 1))}
          />
        ) : null}

        {activeSection === "aiGateway" ? (
          <SettingsAiGateway
            data={aiGatewaySettings}
            isLoading={aiGatewayLoading}
            pending={isSavingAiGateway}
            onSubmit={submitAiGatewaySettings}
          />
        ) : null}

        <Modal
          isOpen={isBatchResultModalOpen}
          size="3xl"
          onOpenChange={(open) => setIsBatchResultModalOpen(open)}
        >
          <ModalContent>
            <ModalHeader>批量结果详情</ModalHeader>
            <ModalBody>
              {lastBatchResult ? (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Chip size="sm" variant="flat">
                      操作 {lastBatchResult.operation}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      角色 {lastBatchResult.roleName}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      成功 {lastBatchResult.affectedCount}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      不变 {lastBatchResult.unchangedCount}
                    </Chip>
                  </div>

                  <div className="border border-default-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-xs text-danger-600">
                        缺失用户ID ({lastBatchResult.missingUserIds.length})
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => copyIds("缺失用户ID", lastBatchResult.missingUserIds)}
                      >
                        复制
                      </Button>
                    </div>
                    <p className="text-xs break-all">{idsText(lastBatchResult.missingUserIds)}</p>
                  </div>

                  <div className="border border-default-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-xs text-default-600">
                        未变更用户ID ({lastBatchResult.unchangedUserIds.length})
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => copyIds("未变更用户ID", lastBatchResult.unchangedUserIds)}
                      >
                        复制
                      </Button>
                    </div>
                    <p className="text-xs break-all">{idsText(lastBatchResult.unchangedUserIds)}</p>
                  </div>

                  <div className="border border-default-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-xs text-danger-600">
                        失败用户ID ({lastBatchResult.failedUserIds.length})
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => copyIds("失败用户ID", lastBatchResult.failedUserIds)}
                      >
                        复制
                      </Button>
                    </div>
                    <p className="text-xs break-all">{idsText(lastBatchResult.failedUserIds)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-default-500">暂无批量结果</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setIsBatchResultModalOpen(false)}>
                关闭
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </AdminLayout>
  );
}
