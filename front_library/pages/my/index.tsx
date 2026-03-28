import React, { useMemo } from "react";
import useSWR from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Skeleton,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import DefaultLayout from "@/components/layouts/default";
import { useAuth } from "@/config/authContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { userService } from "@/services/api/userService";

/**
 * 个人中心中的到期日期格式化工具。
 */
function formatDueDate(value: string) {
  return new Date(value).toLocaleDateString();
}

/**
 * 我的中心首页。
 * 聚合展示借阅、预约、通知、罚款和快捷入口等读者核心状态。
 */
export default function MyOverviewPage() {
  const { user } = useAuth();

  const { data: overview, isLoading, error } = useSWR(
    "my-overview",
    userService.getMyOverview,
  );
  // 到期借阅列表单独 memo，避免页面其他状态更新时重复创建数组引用。
  const dueSoonLoans = useMemo(
    () => overview?.dueSoonLoans ?? [],
    [overview?.dueSoonLoans],
  );

  // 顶部统计卡片统一由后端 overview 数据驱动。
  const overviewStats = [
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
      label: "待取预约",
      value: overview?.readyReservationCount ?? 0,
      icon: "solar:bookmark-square-minimalistic-bold-duotone",
      color: "text-success-600",
      bg: "bg-success-50",
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
  ];

  // 个人中心右侧快捷入口覆盖读者最常用的功能页面。
  const quickLinks = [
    {
      label: "为您推荐",
      desc: "基于您的阅读行为智能推荐图书",
      href: "/my/personal-recommendations",
      icon: "solar:lightbulb-bolt-bold-duotone",
    },
    {
      label: "我的书架",
      desc: "查看收藏、当前借阅和历史借阅",
      href: "/my/shelf",
      icon: "solar:library-bold-duotone",
    },
    {
      label: "我的预约",
      desc: "查看排队进度与到馆待取",
      href: "/my/reservations",
      icon: "solar:bookmark-square-minimalistic-bold-duotone",
    },
    {
      label: "座位预约",
      desc: "查看座位预约时间与取消状态",
      href: "/my/seats",
      icon: "solar:chair-2-bold-duotone",
    },
    {
      label: "服务预约",
      desc: "预约还书、取书或馆员咨询",
      href: "/my/appointments",
      icon: "solar:calendar-add-bold-duotone",
    },
    {
      label: "我的评论",
      desc: "管理已提交的书评和审核状态",
      href: "/my/reviews",
      icon: "solar:chat-round-like-bold-duotone",
    },
    {
      label: "搜索历史",
      desc: "查看最近检索记录与热门关键词",
      href: "/my/search-history",
      icon: "solar:magnifer-zoom-in-bold-duotone",
    },
    {
      label: "我的罚款",
      desc: "处理逾期与遗失罚款",
      href: "/my/fines",
      icon: "solar:wallet-money-bold-duotone",
    },
    {
      label: "我的通知",
      desc: "查看未读提醒和业务通知",
      href: "/my/notifications",
      icon: "solar:bell-bold-duotone",
    },
    {
      label: "推荐动态",
      desc: "查看老师荐书与关注中的推荐",
      href: "/my/recommendations",
      icon: "solar:users-group-rounded-bold-duotone",
    },
    {
      label: "帮助与反馈",
      desc: "提交问题反馈或功能建议",
      href: "/help-feedback",
      icon: "solar:chat-round-dots-bold-duotone",
    },
  ];

  return (
    <DefaultLayout>
      <section className="container mx-auto max-w-6xl px-4 py-8 min-h-screen">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold">我的中心</h1>
          <p className="text-default-500">
            {overview?.fullName || user?.fullName || user?.username || "读者"}，这里汇总了你的借阅、预约、罚款、通知和收藏状态。
          </p>
        </div>

        {error ? (
          <RequestErrorCard
            className="mb-6 border border-danger-200 bg-danger-50 shadow-none"
            message={getApiErrorMessage(error, "部分总览数据加载失败，页面可能只显示部分结果，请稍后刷新重试。")}
            title="我的中心总览加载失败"
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))
            : overviewStats.map((item) => (
              <Card key={item.label} className="border border-default-100 shadow-sm">
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

        {/* 左侧重点展示快到期借阅，右侧提供功能导航。 */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border border-default-100 shadow-sm">
            <CardHeader className="flex items-center justify-between px-5 pt-5 pb-0">
              <div>
                <h2 className="text-lg font-semibold">快到期借阅</h2>
                <p className="text-sm text-default-400">优先处理近 3 天内到期的借阅</p>
              </div>
              <Button as="a" color="primary" href="/my/shelf" size="sm" variant="flat">
                查看书架
              </Button>
            </CardHeader>
            <CardBody className="px-5 pb-5 pt-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              ) : dueSoonLoans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-default-200 p-6 text-center text-default-400">
                  暂无快到期借阅
                </div>
              ) : (
                <div className="space-y-3">
                  {dueSoonLoans.map((loan) => (
                    <Card key={loan.loanId} className="border border-default-100 shadow-none">
                      <CardBody className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{loan.bookTitle}</p>
                          <p className="text-sm text-default-500">借阅单号 #{loan.loanId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Chip color={loan.status === "OVERDUE" ? "danger" : "warning"} size="sm" variant="flat">
                            {loan.status === "OVERDUE" ? "已逾期" : `剩余 ${loan.daysRemaining ?? 0} 天`}
                          </Chip>
                          <Chip size="sm" variant="bordered">
                            应还 {formatDueDate(loan.dueDate)}
                          </Chip>
                          <Button as="a" color="primary" href={`/my/loan-tracking/${loan.loanId}`} size="sm" variant="light">
                            查看
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="border border-default-100 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-0">
              <div>
                <h2 className="text-lg font-semibold">快捷入口</h2>
                <p className="text-sm text-default-400">直接进入常用读者功能</p>
              </div>
            </CardHeader>
            <CardBody className="px-5 pb-5 pt-4">
              {quickLinks.map((item, index) => (
                <React.Fragment key={item.href}>
                  <a className="flex items-center gap-4 py-3 transition-opacity hover:opacity-80" href={item.href}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-default-100">
                      <Icon icon={item.icon} width={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-default-400">{item.desc}</p>
                    </div>
                    <Icon className="text-default-300" icon="solar:arrow-right-bold" width={18} />
                  </a>
                  {index < quickLinks.length - 1 ? <Divider /> : null}
                </React.Fragment>
              ))}
            </CardBody>
          </Card>
        </div>
      </section>
    </DefaultLayout>
  );
}
