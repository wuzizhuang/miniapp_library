import React from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { RbacPermission, RbacRole } from "@/services/api/adminService";

interface PermissionGroup {
  resource: string;
  permissions: RbacPermission[];
}

interface SettingsPermissionsProps {
  assignedPermissionIds: Set<number>;
  filteredPermissionGroups: PermissionGroup[];
  pendingKey: string | null;
  permissionDescription: string;
  permissionKeyword: string;
  permissionName: string;
  permissionsLoading: boolean;
  selectedRole: RbacRole | null;
  selectedRoleId: number | null;
  onDeletePermission: (permission: RbacPermission) => void;
  onPermissionDescriptionChange: (value: string) => void;
  onPermissionKeywordChange: (value: string) => void;
  onPermissionNameChange: (value: string) => void;
  onSubmitCreatePermission: (event: React.FormEvent<HTMLFormElement>) => void;
  onTogglePermission: (permissionId: number) => void;
  onTogglePermissionGroup: (resource: string) => void;
}

export function SettingsPermissions({
  assignedPermissionIds,
  filteredPermissionGroups,
  onDeletePermission,
  onPermissionDescriptionChange,
  onPermissionKeywordChange,
  onPermissionNameChange,
  onSubmitCreatePermission,
  onTogglePermission,
  onTogglePermissionGroup,
  pendingKey,
  permissionDescription,
  permissionKeyword,
  permissionName,
  permissionsLoading,
  selectedRole,
  selectedRoleId,
}: SettingsPermissionsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Card className="border border-default-200">
        <CardHeader className="pb-2">
          <div>
            <h2 className="font-semibold">新建权限</h2>
            <p className="text-xs text-default-500">
              权限编码格式：`resource:action`，例如 `book:write`
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <form className="grid grid-cols-1 gap-3" onSubmit={onSubmitCreatePermission}>
            <Input
              isRequired
              label="权限编码"
              placeholder="例如 appointment:manage"
              value={permissionName}
              onValueChange={onPermissionNameChange}
            />
            <Input
              label="权限描述"
              placeholder="描述权限用途"
              value={permissionDescription}
              onValueChange={onPermissionDescriptionChange}
            />
            <Button
              color="secondary"
              isLoading={pendingKey === "create-permission"}
              startContent={<Icon icon="solar:key-minimalistic-square-bold" />}
              type="submit"
            >
              创建权限
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="border border-default-200">
        <CardHeader>
          <div className="w-full space-y-2">
            <h2 className="font-semibold">角色权限分配</h2>
            <p className="text-xs text-default-500">
              当前角色：{selectedRole ? selectedRole.displayName || selectedRole.name : "未选择"}
            </p>
            <Input
              placeholder="搜索权限编码/描述"
              size="sm"
              value={permissionKeyword}
              onValueChange={onPermissionKeywordChange}
            />
          </div>
        </CardHeader>
        <CardBody>
          {permissionsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : filteredPermissionGroups.length === 0 ? (
            <p className="text-sm text-default-500">暂无权限</p>
          ) : (
            <div className="space-y-4">
              {filteredPermissionGroups.map((group) => {
                const assignedCount = group.permissions.filter((permission) =>
                  assignedPermissionIds.has(permission.permissionId),
                ).length;
                const allAssigned = assignedCount === group.permissions.length;
                const groupActionKey = `toggle-group-${selectedRoleId}-${group.resource}`;

                return (
                  <div
                    key={group.resource}
                    className="rounded-xl border border-default-200 bg-content1 p-3"
                  >
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2">
                        <Chip color="secondary" size="sm" variant="flat">
                          {group.resource}
                        </Chip>
                        <span className="text-xs text-default-500">
                          {assignedCount}/{group.permissions.length} 已授予
                        </span>
                      </div>
                      <Button
                        color={allAssigned ? "warning" : "primary"}
                        isDisabled={!selectedRoleId}
                        isLoading={pendingKey === groupActionKey}
                        size="sm"
                        variant="flat"
                        onPress={() => onTogglePermissionGroup(group.resource)}
                      >
                        {allAssigned ? "整组撤销" : "整组授予"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {group.permissions.map((permission) => {
                        const assigned = assignedPermissionIds.has(permission.permissionId);
                        const actionKey = `toggle-permission-${selectedRoleId}-${permission.permissionId}`;

                        return (
                          <div
                            key={permission.permissionId}
                            className="flex flex-col gap-3 rounded-xl border border-default-200 p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium">{permission.name}</p>
                              <p className="text-xs text-default-500">
                                {permission.description || "无描述"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Chip
                                color={assigned ? "success" : "default"}
                                size="sm"
                                variant="flat"
                              >
                                {assigned ? "已授予" : "未授予"}
                              </Chip>
                              <Button
                                color={assigned ? "warning" : "primary"}
                                isDisabled={!selectedRoleId}
                                isLoading={pendingKey === actionKey}
                                size="sm"
                                variant="flat"
                                onPress={() => onTogglePermission(permission.permissionId)}
                              >
                                {assigned ? "移除" : "授予"}
                              </Button>
                              <Button
                                aria-label="删除权限"
                                color="danger"
                                isIconOnly
                                isLoading={
                                  pendingKey === `delete-permission-${permission.permissionId}`
                                }
                                size="sm"
                                variant="light"
                                onPress={() => onDeletePermission(permission)}
                              >
                                <Icon icon="solar:trash-bin-trash-bold" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
