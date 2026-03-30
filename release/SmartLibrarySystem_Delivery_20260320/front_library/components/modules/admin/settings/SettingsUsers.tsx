import React from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  Input,
  Spinner,
} from "@heroui/react";

import {
  RbacRole,
  UserRoleBatchPreview,
  UserRoleBatchResult,
} from "@/services/api/adminService";

interface SettingsUserOption {
  email: string;
  id: string;
  name: string;
  userId: number;
}

interface SettingsUsersProps {
  assignedUserRoleIds: Set<number>;
  bulkPreview?: UserRoleBatchPreview;
  bulkPreviewKey: readonly unknown[] | null;
  bulkPreviewLoading: boolean;
  bulkRoleId: number | null;
  bulkUserKeyword: string;
  currentPageSelectedCount: number;
  filteredBulkUsers: SettingsUserOption[];
  lastBatchResult: UserRoleBatchResult | null;
  pendingKey: string | null;
  roles: RbacRole[];
  selectedBulkUserIds: number[];
  selectedBulkUserSet: Set<number>;
  selectedUserId: number | null;
  selectableUsers: SettingsUserOption[];
  userPage: number;
  userRolesLoading: boolean;
  usersLoading: boolean;
  usersTotalPages: number;
  onAssignRoleToSelectedUsers: () => void;
  onBulkRoleIdChange: (roleId: number | null) => void;
  onBulkUserKeywordChange: (value: string) => void;
  onClearBulkUserSelection: () => void;
  onExportLastBatchResultCsv: () => void;
  onNextUserPage: () => void;
  onOpenBatchResultModal: (open: boolean) => void;
  onPreviousUserPage: () => void;
  onRevokeRoleFromSelectedUsers: () => void;
  onSelectAllFilteredBulkUsers: () => void;
  onSelectedUserIdChange: (userId: number | null) => void;
  onToggleBulkUserSelection: (userId: number) => void;
  onToggleRoleOnUser: (roleId: number) => void;
}

export function SettingsUsers({
  assignedUserRoleIds,
  bulkPreview,
  bulkPreviewKey,
  bulkPreviewLoading,
  bulkRoleId,
  bulkUserKeyword,
  currentPageSelectedCount,
  filteredBulkUsers,
  lastBatchResult,
  onAssignRoleToSelectedUsers,
  onBulkRoleIdChange,
  onBulkUserKeywordChange,
  onClearBulkUserSelection,
  onExportLastBatchResultCsv,
  onNextUserPage,
  onOpenBatchResultModal,
  onPreviousUserPage,
  onRevokeRoleFromSelectedUsers,
  onSelectAllFilteredBulkUsers,
  onSelectedUserIdChange,
  onToggleBulkUserSelection,
  onToggleRoleOnUser,
  pendingKey,
  roles,
  selectedBulkUserIds,
  selectedBulkUserSet,
  selectedUserId,
  selectableUsers,
  userPage,
  userRolesLoading,
  usersLoading,
  usersTotalPages,
}: SettingsUsersProps) {
  return (
    <Card className="border border-default-200">
      <CardHeader>
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">用户角色分配</h2>
            <p className="text-xs text-default-500">
              为用户分配一个或多个角色，权限将自动继承。
            </p>
          </div>
          <div className="min-w-[240px]">
            <select
              className="w-full rounded-xl border border-default-300 bg-content1 px-3 py-2 text-sm"
              value={selectedUserId ?? ""}
              onChange={(event) => onSelectedUserIdChange(Number(event.target.value))}
            >
              {selectableUsers.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              isDisabled={userPage <= 0 || usersLoading}
              size="sm"
              variant="flat"
              onPress={onPreviousUserPage}
            >
              上一页
            </Button>
            <Chip size="sm" variant="flat">
              用户页 {userPage + 1}/{usersTotalPages}
            </Chip>
            <Button
              isDisabled={userPage >= usersTotalPages - 1 || usersLoading}
              size="sm"
              variant="flat"
              onPress={onNextUserPage}
            >
              下一页
            </Button>
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-default-200 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="text-sm font-semibold">批量用户角色操作</h3>
              <div className="flex flex-wrap gap-2">
                <Chip size="sm" variant="flat">
                  总选中 {selectedBulkUserIds.length}
                </Chip>
                <Chip size="sm" variant="flat">
                  当前页已选 {currentPageSelectedCount}
                </Chip>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                placeholder="搜索用户姓名/邮箱"
                size="sm"
                value={bulkUserKeyword}
                onValueChange={onBulkUserKeywordChange}
              />
              <select
                className="w-full rounded-xl border border-default-300 bg-content1 px-3 py-2 text-sm"
                value={bulkRoleId ?? ""}
                onChange={(event) => onBulkRoleIdChange(Number(event.target.value))}
              >
                {roles.map((role) => (
                  <option key={role.roleId} value={role.roleId}>
                    {role.displayName || role.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" variant="flat" onPress={onSelectAllFilteredBulkUsers}>
                  全选当前页
                </Button>
                <Button size="sm" variant="flat" onPress={onClearBulkUserSelection}>
                  清空全部选择
                </Button>
              </div>
            </div>

            {bulkPreviewKey ? (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                <Chip color="primary" size="sm" variant="flat">
                  目标 {bulkPreview?.requestedCount ?? 0}
                </Chip>
                <Chip color="success" size="sm" variant="flat">
                  将新增 {bulkPreview?.willBeAssignedCount ?? 0}
                </Chip>
                <Chip color="warning" size="sm" variant="flat">
                  将撤销 {bulkPreview?.willBeRevokedCount ?? 0}
                </Chip>
                <Chip color="default" size="sm" variant="flat">
                  不变 {bulkPreview?.alreadyAssignedCount ?? 0}
                </Chip>
                <Chip color="danger" size="sm" variant="flat">
                  缺失 {bulkPreview?.missingUserIds?.length ?? 0}
                </Chip>
              </div>
            ) : null}

            {bulkPreviewLoading ? (
              <div className="flex justify-center py-2">
                <Spinner size="sm" />
              </div>
            ) : null}

            <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-default-200 p-2">
              {usersLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : filteredBulkUsers.length === 0 ? (
                <p className="px-1 text-xs text-default-500">没有匹配用户</p>
              ) : (
                filteredBulkUsers.map((user) => (
                  <label
                    key={user.userId}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-default-100"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Checkbox
                        isSelected={selectedBulkUserSet.has(user.userId)}
                        size="sm"
                        onValueChange={() => onToggleBulkUserSelection(user.userId)}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{user.name}</p>
                        <p className="truncate text-xs text-default-500">{user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-default-400">{user.id}</span>
                  </label>
                ))
              )}
            </div>

            <p className="text-xs text-default-500">
              批量选择现在会跨分页保留；“全选当前页”只会勾选当前页已加载的用户。
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                color="primary"
                isDisabled={!bulkRoleId || selectedBulkUserIds.length === 0}
                isLoading={pendingKey === "bulk-assign-role"}
                size="sm"
                variant="flat"
                onPress={onAssignRoleToSelectedUsers}
              >
                批量分配角色
              </Button>
              <Button
                color="warning"
                isDisabled={!bulkRoleId || selectedBulkUserIds.length === 0}
                isLoading={pendingKey === "bulk-revoke-role"}
                size="sm"
                variant="flat"
                onPress={onRevokeRoleFromSelectedUsers}
              >
                批量撤销角色
              </Button>
            </div>

            {lastBatchResult ? (
              <div className="space-y-2 rounded-xl border border-default-200 bg-default-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">最近一次批量结果</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="flat" onPress={() => onOpenBatchResultModal(true)}>
                      查看详情
                    </Button>
                    <Button size="sm" variant="flat" onPress={onExportLastBatchResultCsv}>
                      导出 CSV
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Chip size="sm" variant="flat">
                    操作 {lastBatchResult.operation}
                  </Chip>
                  <Chip size="sm" variant="flat">
                    成功 {lastBatchResult.affectedCount}
                  </Chip>
                  <Chip size="sm" variant="flat">
                    不变 {lastBatchResult.unchangedCount}
                  </Chip>
                  <Chip color="danger" size="sm" variant="flat">
                    缺失 {lastBatchResult.missingUserIds.length}
                  </Chip>
                  <Chip color="danger" size="sm" variant="flat">
                    失败 {lastBatchResult.failedUserIds.length}
                  </Chip>
                </div>
                {lastBatchResult.missingUserIds.length > 0 ? (
                  <p className="text-xs text-danger-600">
                    缺失用户ID: {lastBatchResult.missingUserIds.slice(0, 20).join(", ")}
                    {lastBatchResult.missingUserIds.length > 20 ? " ..." : ""}
                  </p>
                ) : null}
                {lastBatchResult.unchangedUserIds.length > 0 ? (
                  <p className="text-xs text-default-500">
                    未变更用户ID: {lastBatchResult.unchangedUserIds.slice(0, 20).join(", ")}
                    {lastBatchResult.unchangedUserIds.length > 20 ? " ..." : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {usersLoading || userRolesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !selectedUserId ? (
            <p className="text-sm text-default-500">暂无可分配用户</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {roles.map((role) => {
                const assigned = assignedUserRoleIds.has(role.roleId);
                const actionKey = `toggle-user-role-${selectedUserId}-${role.roleId}`;

                return (
                  <div
                    key={role.roleId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-default-200 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {role.displayName || role.name}
                      </p>
                      <p className="text-xs text-default-500">{role.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip color={assigned ? "success" : "default"} size="sm" variant="flat">
                        {assigned ? "已分配" : "未分配"}
                      </Chip>
                      <Button
                        color={assigned ? "warning" : "primary"}
                        isLoading={pendingKey === actionKey}
                        size="sm"
                        variant="flat"
                        onPress={() => onToggleRoleOnUser(role.roleId)}
                      >
                        {assigned ? "撤销" : "分配"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
