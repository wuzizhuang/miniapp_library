import React from "react";
import { useRouter } from "next/router";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Select,
  SelectItem,
  Skeleton,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useAuth } from "@/config/authContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { adminService } from "@/services/api/adminService";
import { hasAnyPermission } from "@/utils/rbac";

const loanStatusMeta: Record<string, { label: string; color: "primary" | "danger" | "success" | "warning" }> = {
  active: { label: "借阅中", color: "primary" },
  overdue: { label: "已逾期", color: "danger" },
  returned: { label: "已归还", color: "success" },
};

const roleMetaMap: Record<
  string,
  { label: string; color: "primary" | "secondary" | "warning" | "default" }
> = {
  ADMIN: { label: "管理员", color: "primary" },
  USER: { label: "普通读者", color: "default" },
  LIBRARIAN: { label: "馆员", color: "secondary" },
  CATALOGER: { label: "录入员", color: "warning" },
};

const identityOptions: Array<{
  key: "STUDENT" | "TEACHER" | "STAFF" | "VISITOR";
  label: string;
}> = [
  { key: "STUDENT", label: "学生" },
  { key: "TEACHER", label: "教师" },
  { key: "STAFF", label: "教职工" },
  { key: "VISITOR", label: "访客" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN");
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const numericId = Number(router.query.id);
  const hasInvalidId = router.isReady && !Number.isFinite(numericId);
  const canViewLoans = hasAnyPermission(currentUser, [
    "loan:read",
    "loan:write",
    "loan:manage",
  ]);
  const canCreateLoan = hasAnyPermission(currentUser, ["loan:manage"]);
  const canManageAppointments = hasAnyPermission(currentUser, ["appointment:manage"]);
  const canManageReservations = hasAnyPermission(currentUser, ["reservation:manage"]);
  const canManageFines = hasAnyPermission(currentUser, ["fine:waive", "loan:manage"]);
  const canManageUserIdentity = hasAnyPermission(currentUser, ["user:manage"]);
  const hasWorkspaceAction =
    canViewLoans ||
    canCreateLoan ||
    canManageAppointments ||
    canManageReservations ||
    canManageFines;
  const [selectedIdentity, setSelectedIdentity] = React.useState<
    "STUDENT" | "TEACHER" | "STAFF" | "VISITOR"
  >("STUDENT");
  const [updatingIdentity, setUpdatingIdentity] = React.useState(false);

  const { data: user, error: userError, isLoading: userLoading, mutate: mutateUser } = useSWR(
    router.isReady && Number.isFinite(numericId) ? ["admin-user-detail", numericId] : null,
    () => adminService.getAdminUserById(numericId),
  );
  const {
    data: overview,
    error: overviewError,
    isLoading: overviewLoading,
    mutate: mutateOverview,
  } = useSWR(
    router.isReady && Number.isFinite(numericId) ? ["admin-user-overview", numericId] : null,
    () => adminService.getAdminUserOverview(numericId),
  );
  const {
    data: loansPage,
    error: loansError,
    isLoading: loansLoading,
    mutate: mutateLoans,
  } = useSWR(
    router.isReady && Number.isFinite(numericId) ? ["admin-user-loans", numericId] : null,
    () => adminService.getAdminUserLoans(numericId, 0, 50),
  );

  const loans = loansPage?.content ?? [];
  const dueSoonLoans = overview?.dueSoonLoans ?? [];

  React.useEffect(() => {
    if (user?.identityType) {
      setSelectedIdentity(user.identityType);
    }
  }, [user?.identityType]);

  const overviewCards = [
    {
      label: "当前借阅",
      value: overview?.activeLoanCount ?? 0,
      icon: "solar:book-bookmark-bold-duotone",
      color: "text-primary",
      bg: "bg-primary-50",
    },
    {
      label: "快到期借阅",
      value: overview?.dueSoonLoanCount ?? 0,
      icon: "solar:alarm-bold-duotone",
      color: "text-warning-600",
      bg: "bg-warning-50",
    },
    {
      label: "当前预约",
      value: overview?.activeReservationCount ?? 0,
      icon: "solar:bookmark-bold-duotone",
      color: "text-secondary-600",
      bg: "bg-secondary-50",
    },
    {
      label: "待处理服务预约",
      value: overview?.pendingServiceAppointmentCount ?? 0,
      icon: "solar:calendar-add-bold-duotone",
      color: "text-success-600",
      bg: "bg-success-50",
    },
    {
      label: "未缴罚款",
      value: (overview?.pendingFineCount ?? 0) > 0 ? `¥${Number(overview?.pendingFineTotal ?? 0).toFixed(2)}` : "0",
      icon: "solar:wallet-money-bold-duotone",
      color: "text-danger",
      bg: "bg-danger-50",
    },
    {
      label: "未读通知",
      value: overview?.unreadNotificationCount ?? 0,
      icon: "solar:bell-bold-duotone",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "收藏数量",
      value: overview?.favoriteCount ?? 0,
      icon: "solar:heart-bold-duotone",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      label: "已完成服务预约",
      value: overview?.completedServiceAppointmentCount ?? 0,
      icon: "solar:check-circle-bold-duotone",
      color: "text-success-700",
      bg: "bg-success-100",
    },
  ];

  const handleToggleStatus = async () => {
    if (!user) {
      return;
    }

    const willBan = user.status === "active";
    const actionText = willBan ? "封禁" : "解封";

    if (!confirm(`确认要${actionText}账号「${user.name}」吗？`)) {
      return;
    }

    try {
      await adminService.updateAdminUserStatus(
        Number(user.id),
        willBan ? "INACTIVE" : "ACTIVE",
      );
      toast.success(`${actionText}成功`);
      await Promise.all([
        mutateUser(),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "admin-users",
          undefined,
          { revalidate: true },
        ),
      ]);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, `${actionText}失败，请稍后重试`));
    }
  };

  const handleUpdateIdentity = async () => {
    if (!user) {
      return;
    }

    try {
      setUpdatingIdentity(true);
      const updatedUser = await adminService.updateAdminUserIdentityType(
        Number(user.id),
        selectedIdentity,
      );

      toast.success("用户身份已更新");
      await Promise.all([
        mutateUser(updatedUser, false),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "admin-users",
          undefined,
          { revalidate: true },
        ),
      ]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "更新用户身份失败，请稍后重试"));
    } finally {
      setUpdatingIdentity(false);
    }
  };

  if (hasInvalidId) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-4xl">
          <RequestErrorCard
            message="当前用户 ID 无效，请返回列表后重新选择。"
            title="用户详情无法加载"
            retryLabel="返回列表"
            onRetry={() => void router.push("/dashboard/users")}
          />
        </div>
      </AdminLayout>
    );
  }

  if (userError && !user) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-4xl">
          <RequestErrorCard
            message={getApiErrorMessage(userError, "用户详情加载失败，请稍后重试。")}
            title="用户详情加载失败"
            onRetry={() => void mutateUser()}
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">用户详情</h1>
            <p className="text-default-500 text-small">查看基础资料、工作台总览和借阅记录。</p>
          </div>
          <div className="flex gap-3">
            <Button
              startContent={<Icon icon="solar:refresh-bold" width={16} />}
              variant="flat"
              onPress={() => {
                void Promise.all([mutateUser(), mutateOverview(), mutateLoans()]);
              }}
            >
              刷新数据
            </Button>
            <Button
              startContent={<Icon icon="solar:arrow-left-bold" width={16} />}
              variant="flat"
              onPress={() => router.push("/dashboard/users")}
            >
              返回列表
            </Button>
            {user ? (
              <Button
                color={user.status === "active" ? "danger" : "success"}
                variant="flat"
                onPress={() => void handleToggleStatus()}
              >
                {user.status === "active" ? "封禁账号" : "恢复账号"}
              </Button>
            ) : null}
          </div>
        </div>

        <Skeleton className="rounded-2xl" isLoaded={!userLoading}>
          <Card className="border border-default-100 shadow-sm">
            <CardHeader className="px-5 pb-0 pt-5">
              <div>
                <h2 className="text-lg font-semibold">{user?.name || "用户信息"}</h2>
                <p className="text-sm text-default-400">{user?.email || "-"}</p>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4 px-5 pb-5 pt-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">用户 ID</p>
                <p className="mt-1 font-semibold">#{user?.id || "-"}</p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">有效角色</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(user?.roles ?? []).map((roleName) => {
                    const roleMeta = roleMetaMap[roleName] ?? {
                      label: roleName,
                      color: "default" as const,
                    };

                    return (
                      <Chip
                        key={roleName}
                        color={roleMeta.color}
                        size="sm"
                        variant={roleName === user?.baseRole ? "dot" : "flat"}
                      >
                        {roleMeta.label}
                      </Chip>
                    );
                  })}
                  {!user?.roles?.length ? (
                    <p className="mt-1 font-semibold">{user?.role || "-"}</p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">账号状态</p>
                <div className="mt-1">
                  <Chip color={user?.status === "active" ? "success" : "danger"} size="sm" variant="flat">
                    {user?.status === "active" ? "正常" : "已封禁"}
                  </Chip>
                </div>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">注册时间</p>
                <p className="mt-1 font-semibold">{user?.joinDate || "-"}</p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">院系</p>
                <p className="mt-1 font-semibold">{user?.department || "-"}</p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">专业</p>
                <p className="mt-1 font-semibold">{user?.major || "-"}</p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">入学年份</p>
                <p className="mt-1 font-semibold">{user?.enrollmentYear || "-"}</p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">兴趣标签</p>
                <p className="mt-1 font-semibold">
                  {user?.interestsTag && user.interestsTag.length > 0 ? user.interestsTag.join(" / ") : "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">权限数量</p>
                <p className="mt-1 font-semibold">{user?.permissions?.length ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="text-xs text-default-400">身份类型</p>
                <p className="mt-1 font-semibold">
                  {identityOptions.find((option) => option.key === user?.identityType)?.label ?? "-"}
                </p>
              </div>
              {canManageUserIdentity ? (
                <div className="rounded-2xl border border-default-200 p-4 md:col-span-2 xl:col-span-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">管理员设置身份</p>
                      <p className="mt-1 text-sm text-default-500">
                        教师身份会直接影响荐书发布权限，修改后立即生效。
                      </p>
                    </div>
                    <div className="w-full lg:max-w-xs">
                      <Select
                        label="身份类型"
                        labelPlacement="outside"
                        selectedKeys={new Set([selectedIdentity])}
                        onSelectionChange={(keys) => {
                          const nextValue = String(Array.from(keys)[0] ?? "STUDENT") as
                            | "STUDENT"
                            | "TEACHER"
                            | "STAFF"
                            | "VISITOR";

                          setSelectedIdentity(nextValue);
                        }}
                      >
                        {identityOptions.map((option) => (
                          <SelectItem key={option.key}>{option.label}</SelectItem>
                        ))}
                      </Select>
                    </div>
                    <Button
                      color="primary"
                      isDisabled={!user || selectedIdentity === user.identityType}
                      isLoading={updatingIdentity}
                      onPress={() => void handleUpdateIdentity()}
                    >
                      保存身份
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </Skeleton>

        <Card className="border border-default-100 shadow-sm">
          <CardHeader className="flex items-center justify-between px-5 pb-0 pt-5">
            <div>
              <h2 className="text-lg font-semibold">用户工作台</h2>
              <p className="text-sm text-default-400">聚合当前借阅、预约、罚款、通知和服务预约状态</p>
            </div>
            <Button size="sm" variant="flat" onPress={() => void mutateOverview()}>
              刷新总览
            </Button>
          </CardHeader>
          <CardBody className="px-5 pb-5 pt-4">
            {overviewLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-2xl" />
                ))}
              </div>
            ) : overviewError ? (
              <RequestErrorCard
                className="border border-danger-200 bg-danger-50 shadow-none"
                bodyClassName="py-10 text-center text-danger-700"
                message={getApiErrorMessage(overviewError, "用户总览加载失败，请稍后重试。")}
                title="用户总览加载失败"
                onRetry={() => void mutateOverview()}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((item) => (
                  <Card key={item.label} className="border border-default-100 shadow-none">
                    <CardBody className="flex flex-row items-center justify-between p-5">
                      <div>
                        <p className="text-sm text-default-500">{item.label}</p>
                        <p className="mt-1 text-2xl font-black text-default-900">{item.value}</p>
                      </div>
                      <div className={`rounded-2xl p-3 ${item.bg}`}>
                        <Icon className={item.color} icon={item.icon} width={24} />
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {!overviewLoading && !overviewError ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="border border-default-100 shadow-sm">
              <CardHeader className="px-5 pb-0 pt-5">
                <div>
                  <h2 className="text-lg font-semibold">快到期借阅提醒</h2>
                  <p className="text-sm text-default-400">优先处理未来 3 天内到期的借阅</p>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 px-5 pb-5 pt-4">
                {dueSoonLoans.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-default-200 py-12 text-center text-default-400">
                    当前没有快到期借阅
                  </div>
                ) : (
                  dueSoonLoans.map((loan) => (
                    <Card key={loan.loanId} className="border border-default-100 shadow-none">
                      <CardBody className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">{loan.bookTitle}</p>
                          <p className="text-sm text-default-500">借阅单号 #{loan.loanId}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip color={loan.status === "OVERDUE" ? "danger" : "warning"} size="sm" variant="flat">
                            {loan.status === "OVERDUE" ? "已逾期" : `剩余 ${loan.daysRemaining ?? 0} 天`}
                          </Chip>
                          <Chip size="sm" variant="bordered">
                            应还 {formatDate(loan.dueDate)}
                          </Chip>
                          {canViewLoans ? (
                            <Button
                              color="primary"
                              size="sm"
                              variant="flat"
                              onPress={() => router.push({ pathname: "/dashboard/loans", query: { userId: user?.id } })}
                            >
                              查看借阅台
                            </Button>
                          ) : null}
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </CardBody>
            </Card>

            <Card className="border border-default-100 shadow-sm">
              <CardHeader className="px-5 pb-0 pt-5">
                <div>
                  <h2 className="text-lg font-semibold">后台快捷入口</h2>
                  <p className="text-sm text-default-400">围绕该用户的高频后台处理动作</p>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 px-5 pb-5 pt-4">
                {canViewLoans ? (
                  <Button color="primary" variant="flat" onPress={() => router.push({ pathname: "/dashboard/loans", query: { userId: user?.id } })}>
                    查看借阅管理
                  </Button>
                ) : null}
                {canCreateLoan ? (
                  <Button
                    color="primary"
                    onPress={() =>
                      router.push({
                        pathname: "/dashboard/loans",
                        query: { userId: user?.id },
                      })
                    }
                  >
                    为该用户代借
                  </Button>
                ) : null}
                {canManageAppointments ? (
                  <Button variant="flat" onPress={() => router.push({ pathname: "/dashboard/appointments", query: { keyword: user?.name || user?.email || '' } })}>
                    查看服务预约
                  </Button>
                ) : null}
                {canManageReservations ? (
                  <Button variant="flat" onPress={() => router.push({ pathname: "/dashboard/reservations", query: { keyword: user?.name || user?.email || '' } })}>
                    查看馆藏预约
                  </Button>
                ) : null}
                {canManageFines ? (
                  <Button variant="flat" onPress={() => router.push({ pathname: "/dashboard/fines", query: { keyword: user?.name || user?.email || '' } })}>
                    查看罚款处理
                  </Button>
                ) : null}
                {!hasWorkspaceAction ? (
                  <div className="rounded-2xl border border-dashed border-default-200 px-4 py-6 text-sm text-default-400">
                    当前账号仅可查看该用户资料，暂无其他跨模块处理权限。
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        ) : null}

        <Card className="border border-default-100 shadow-sm">
          <CardHeader className="flex items-center justify-between px-5 pb-0 pt-5">
            <div>
              <h2 className="text-lg font-semibold">借阅记录</h2>
              <p className="text-sm text-default-400">来自真实后端用户借阅接口</p>
            </div>
            <Button size="sm" variant="flat" onPress={() => void mutateLoans()}>
              刷新
            </Button>
          </CardHeader>
          <CardBody className="space-y-4 px-5 pb-5 pt-4">
            {loansLoading ? (
              <>
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </>
            ) : loansError ? (
              <RequestErrorCard
                className="border border-danger-200 bg-danger-50 shadow-none"
                bodyClassName="py-10 text-center text-danger-700"
                message={getApiErrorMessage(loansError, "借阅记录加载失败，请稍后重试。")}
                title="借阅记录加载失败"
                onRetry={() => void mutateLoans()}
              />
            ) : loans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-default-200 py-12 text-center text-default-400">
                当前没有借阅记录
              </div>
            ) : (
              loans.map((loan) => (
                <Card key={loan.id} className="border border-default-100 shadow-none">
                  <CardBody className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{loan.bookName}</p>
                      <p className="text-sm text-default-500">借出 {loan.borrowDate} / 应还 {loan.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Chip
                        color={loanStatusMeta[loan.status]?.color || "warning"}
                        size="sm"
                        variant="flat"
                      >
                        {loanStatusMeta[loan.status]?.label || loan.status}
                      </Chip>
                      {canViewLoans ? (
                        <Button
                          color="primary"
                          size="sm"
                          variant="flat"
                          onPress={() => router.push({ pathname: "/dashboard/loans", query: { userId: user?.id } })}
                        >
                          查看后台借阅
                        </Button>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  );
}
