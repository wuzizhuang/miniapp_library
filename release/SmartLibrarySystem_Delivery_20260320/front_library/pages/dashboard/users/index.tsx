import React, { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
  Chip,
  Button,
  Input,
  Spinner,
  Pagination,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { useRouter } from "next/router";
import { toast } from "sonner";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import AdminLayout from "@/components/layouts/AdminLayout";
import { adminService, AdminUser, AdminUsersPage } from "@/services/api/adminService";
import { useDebounce } from "@/hooks/useDebounce";
import { getApiErrorMessage } from "@/lib/apiError";

const roleMetaMap: Record<
  string,
  { label: string; color: "primary" | "secondary" | "warning" | "default" }
> = {
  ADMIN: { label: "管理员", color: "primary" },
  USER: { label: "普通读者", color: "default" },
  LIBRARIAN: { label: "馆员", color: "secondary" },
  CATALOGER: { label: "录入员", color: "warning" },
};

export default function UsersPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const rowsPerPage = 10;

  const debouncedQuery = useDebounce(searchInput, 300);

  const { data, error, isLoading, mutate } = useSWR<AdminUsersPage>(
    ["admin-users", page, rowsPerPage, debouncedQuery, roleFilter, statusFilter],
    () =>
      adminService.getAdminUsersPage({
        page: page - 1,
        size: rowsPerPage,
        keyword: debouncedQuery || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        status: statusFilter === "all" ? undefined : (statusFilter as "active" | "banned"),
      }),
  );

  const roleOptions = ["all", "ADMIN", "USER", "LIBRARIAN", "CATALOGER"];

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, roleFilter, statusFilter]);

  const users = data?.items ?? [];
  const pages = data?.totalPages ?? 1;
  const totalUsers = data?.totalElements ?? 0;
  const hasUsersError = Boolean(error) && !data;

  const activeCount = users.filter((u) => u.status === "active").length;
  const bannedCount = users.filter((u) => u.status === "banned").length;

  const handleToggleUserStatus = async (user: AdminUser) => {
    const willBan = user.status === "active";
    const actionText = willBan ? "封禁" : "解封";

    if (!confirm(`确认要${actionText}账号「${user.name}」吗？`)) return;

    try {
      setPendingUserId(user.id);
      const updatedUser = await adminService.updateAdminUserStatus(
        Number(user.id),
        willBan ? "INACTIVE" : "ACTIVE",
      );

      mutate(
        (prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === updatedUser.id ? updatedUser : item,
            ),
          };
        },
        false,
      );
      await mutate();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, `${actionText}失败，请稍后重试`));
    } finally {
      setPendingUserId(null);
    }
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">读者与用户</h1>
            <p className="text-default-500 text-sm mt-1">
              支持按姓名、邮箱、ID 检索，并快速筛选角色和状态
            </p>
          </div>
          <Button
            color="primary"
            startContent={<Icon icon="solar:user-plus-bold" />}
            variant="flat"
            onPress={() => router.push("/auth/register")}
          >
            手动注册
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-default-200 bg-content1 p-3">
            <p className="text-xs text-default-500">检索总数</p>
            <p className="text-xl font-semibold">{hasUsersError ? "--" : totalUsers}</p>
          </div>
          <div className="rounded-xl border border-default-200 bg-content1 p-3">
            <p className="text-xs text-default-500">当前页正常</p>
            <p className="text-xl font-semibold text-success">{hasUsersError ? "--" : activeCount}</p>
          </div>
          <div className="rounded-xl border border-default-200 bg-content1 p-3">
            <p className="text-xs text-default-500">当前页封禁</p>
            <p className="text-xl font-semibold text-danger">{hasUsersError ? "--" : bannedCount}</p>
          </div>
          <div className="rounded-xl border border-default-200 bg-content1 p-3">
            <p className="text-xs text-default-500">当前页条数</p>
            <p className="text-xl font-semibold text-primary">
              {hasUsersError ? "--" : users.length}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 bg-content1 border border-default-200 rounded-xl p-3">
          <Input
            isClearable
            className="w-full lg:max-w-md"
            placeholder="查询姓名、邮箱或用户ID"
            startContent={<Icon className="text-default-400" icon="solar:magnifer-linear" />}
            value={searchInput}
            onClear={() => setSearchInput("")}
            onValueChange={setSearchInput}
          />

          <Dropdown>
            <DropdownTrigger>
              <Button
                endContent={<Icon icon="solar:alt-arrow-down-linear" />}
                variant="flat"
              >
                {roleFilter === "all"
                  ? "全部角色"
                  : roleMetaMap[roleFilter]?.label ?? roleFilter}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              disallowEmptySelection
              selectedKeys={new Set([roleFilter])}
              selectionMode="single"
              onSelectionChange={(keys) => {
                const value = String(Array.from(keys)[0] ?? "all");

                setRoleFilter(value);
                setPage(1);
              }}
            >
              {roleOptions.map((role) => (
                <DropdownItem key={role}>
                  {role === "all" ? "全部角色" : roleMetaMap[role]?.label ?? role}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>

          <Dropdown>
            <DropdownTrigger>
              <Button
                endContent={<Icon icon="solar:alt-arrow-down-linear" />}
                variant="flat"
              >
                {statusFilter === "all"
                  ? "全部状态"
                  : statusFilter === "active"
                    ? "正常"
                    : "已封禁"}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              disallowEmptySelection
              selectedKeys={new Set([statusFilter])}
              selectionMode="single"
              onSelectionChange={(keys) => {
                const value = String(Array.from(keys)[0] ?? "all");

                setStatusFilter(value);
                setPage(1);
              }}
            >
              <DropdownItem key="all">全部状态</DropdownItem>
              <DropdownItem key="active">正常</DropdownItem>
              <DropdownItem key="banned">已封禁</DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <div className="lg:ml-auto">
            <Button variant="light" onPress={handleResetFilters}>
              重置筛选
            </Button>
          </div>
        </div>

        {hasUsersError ? (
          <RequestErrorCard
            message={getApiErrorMessage(error, "用户列表加载失败，请稍后重试。")}
            title="用户列表加载失败"
            onRetry={() => void mutate()}
          />
        ) : (
          <Table
            aria-label="Users table"
            color="primary"
            bottomContent={
              pages > 1 ? (
                <div className="flex justify-center w-full py-2">
                  <Pagination
                    isCompact
                    showControls
                    color="primary"
                    page={page}
                    total={pages}
                    onChange={setPage}
                  />
                </div>
              ) : null
            }
            classNames={{
              wrapper: "border border-default-200 shadow-sm rounded-xl",
            }}
          >
            <TableHeader>
              <TableColumn>用户</TableColumn>
              <TableColumn>角色</TableColumn>
              <TableColumn>账号状态</TableColumn>
              <TableColumn>注册时间</TableColumn>
              <TableColumn align="end">操作</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={isLoading ? " " : "没有符合条件的用户"}
              isLoading={isLoading}
              items={users}
              loadingContent={<Spinner label="加载用户列表中..." size="sm" />}
            >
              {(item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <User
                      avatarProps={{ radius: "full", src: item.avatar }}
                      description={item.email}
                      name={item.name}
                    />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const roleMeta = roleMetaMap[item.role] ?? {
                        label: item.role,
                        color: "default" as const,
                      };

                      return (
                        <div className="flex flex-wrap gap-1">
                          {item.roles.map((roleName) => {
                            const effectiveRoleMeta = roleMetaMap[roleName] ?? {
                              label: roleName,
                              color: "default" as const,
                            };

                            return (
                              <Chip
                                key={`${item.id}-${roleName}`}
                                className="capitalize"
                                color={effectiveRoleMeta.color}
                                size="sm"
                                variant={roleName === item.baseRole ? "dot" : "flat"}
                              >
                                {effectiveRoleMeta.label}
                              </Chip>
                            );
                          })}
                          {item.roles.length === 0 ? (
                            <Chip
                              className="capitalize"
                              color={roleMeta.color}
                              size="sm"
                              variant="dot"
                            >
                              {roleMeta.label}
                            </Chip>
                          ) : null}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      className="capitalize"
                      color={item.status === "active" ? "success" : "danger"}
                      size="sm"
                      variant="flat"
                    >
                      {item.status === "active" ? "正常" : "已封禁"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <span className="text-default-400 text-small">
                      {item.joinDate}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="relative flex justify-end items-center gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => router.push(`/dashboard/users/${item.id}`)}
                      >
                        详情
                      </Button>
                      <Button
                        color={item.status === "active" ? "danger" : "success"}
                        isLoading={pendingUserId === item.id}
                        size="sm"
                        variant="flat"
                        onPress={() => handleToggleUserStatus(item)}
                      >
                        {item.status === "active" ? "封禁" : "解封"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
}
