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

import { RbacRole } from "@/services/api/adminService";

interface SettingsRolesProps {
  filteredRoles: RbacRole[];
  pendingKey: string | null;
  roleDescription: string;
  roleDisplayName: string;
  roleKeyword: string;
  roleName: string;
  rolesLoading: boolean;
  selectedRoleId: number | null;
  onDeleteRole: (role: RbacRole) => void;
  onRoleDescriptionChange: (value: string) => void;
  onRoleDisplayNameChange: (value: string) => void;
  onRoleKeywordChange: (value: string) => void;
  onRoleNameChange: (value: string) => void;
  onSelectRole: (roleId: number) => void;
  onSubmitCreateRole: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function SettingsRoles({
  filteredRoles,
  onDeleteRole,
  onRoleDescriptionChange,
  onRoleDisplayNameChange,
  onRoleKeywordChange,
  onRoleNameChange,
  onSelectRole,
  onSubmitCreateRole,
  pendingKey,
  roleDescription,
  roleDisplayName,
  roleKeyword,
  roleName,
  rolesLoading,
  selectedRoleId,
}: SettingsRolesProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Card className="border border-default-200">
        <CardHeader className="pb-2">
          <div>
            <h2 className="font-semibold">新建角色</h2>
            <p className="text-xs text-default-500">
              角色编码需大写，如 `LIBRARIAN_ASSIST`
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <form className="grid grid-cols-1 gap-3" onSubmit={onSubmitCreateRole}>
            <Input
              isRequired
              label="角色编码"
              placeholder="例如 CATALOGER"
              value={roleName}
              onValueChange={onRoleNameChange}
            />
            <Input
              label="角色显示名"
              placeholder="例如 编目管理员"
              value={roleDisplayName}
              onValueChange={onRoleDisplayNameChange}
            />
            <Input
              label="角色描述"
              placeholder="描述角色职责"
              value={roleDescription}
              onValueChange={onRoleDescriptionChange}
            />
            <Button
              color="primary"
              isLoading={pendingKey === "create-role"}
              startContent={<Icon icon="solar:shield-plus-bold" />}
              type="submit"
            >
              创建角色
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="border border-default-200">
        <CardHeader>
          <div className="w-full space-y-2">
            <h2 className="font-semibold">角色列表</h2>
            <Input
              placeholder="搜索角色编码/名称"
              size="sm"
              value={roleKeyword}
              onValueChange={onRoleKeywordChange}
            />
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {rolesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : filteredRoles.length === 0 ? (
            <p className="text-sm text-default-500">暂无角色</p>
          ) : (
            filteredRoles.map((role) => {
              const active = role.roleId === selectedRoleId;

              return (
                <button
                  key={role.roleId}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-default-200 hover:border-default-400"
                  }`}
                  type="button"
                  onClick={() => onSelectRole(role.roleId)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {role.displayName || role.name}
                      </p>
                      <p className="text-xs text-default-500">{role.name}</p>
                    </div>
                    <Button
                      aria-label="删除角色"
                      color="danger"
                      isIconOnly
                      isLoading={pendingKey === `delete-role-${role.roleId}`}
                      size="sm"
                      variant="light"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteRole(role);
                      }}
                    >
                      <Icon icon="solar:trash-bin-trash-bold" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Chip size="sm" variant="flat">
                      权限 {role.permissions?.length ?? 0}
                    </Chip>
                  </div>
                </button>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
}
