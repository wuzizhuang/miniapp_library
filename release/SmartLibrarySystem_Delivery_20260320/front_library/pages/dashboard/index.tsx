import type { NextPageWithLayout } from "@/pages/_app";

import React, { ReactElement, useMemo } from "react";
import { Card, CardBody, CardHeader, Chip, Skeleton, Spacer } from "@heroui/react";
import useSWR from "swr";
import dynamic from "next/dynamic";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import AdminLayout from "@/components/layouts/AdminLayout";
import { RecentLoans } from "@/components/modules/admin/dashboard/RecentLoans";
import { getApiErrorMessage } from "@/lib/apiError";
import { adminService } from "@/services/api/adminService";

const ActivityChart = dynamic(
  () =>
    import("@/components/modules/admin/dashboard/ActivityChart").then(
      (mod) => mod.ActivityChart,
    ),
  { ssr: false },
);

const reservationLabels: Record<string, string> = {
  PENDING: "排队中",
  AWAITING_PICKUP: "待取书",
  FULFILLED: "已完成",
  CANCELLED: "已取消",
  EXPIRED: "已过期",
};

const fineLabels: Record<string, string> = {
  PENDING: "待缴",
  PAID: "已支付",
  WAIVED: "已豁免",
};

const behaviorColors = [
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-lime-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
];

const DashboardPage: NextPageWithLayout = () => {
  const { data, error, isLoading, mutate } = useSWR(
    "dashboard-analytics",
    adminService.getDashboardAnalytics,
  );

  const statCards = [
    {
      title: "可借副本",
      value: data?.summary.totalBooks ?? 0,
      trend: "当前库存可用量",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "活跃借阅",
      value: data?.summary.activeLoans ?? 0,
      trend: "含借阅中与逾期",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      text: "text-violet-600 dark:text-violet-400",
    },
    {
      title: "逾期借阅",
      value: data?.summary.overdueLoans ?? 0,
      trend: "需要优先处理",
      bg: "bg-danger-50 dark:bg-danger-900/20",
      text: "text-danger-600 dark:text-danger-400",
    },
    {
      title: "待处理罚款",
      value: `¥${Number(data?.summary.pendingFines ?? 0).toFixed(2)}`,
      trend: "未支付金额总计",
      bg: "bg-success-50 dark:bg-success-900/20",
      text: "text-success-600 dark:text-success-400",
    },
  ];

  const reservationStatus = useMemo(
    () => (data?.reservationStatus ?? []).filter((item) => item.value > 0),
    [data?.reservationStatus],
  );
  const fineStatus = useMemo(
    () => (data?.fineStatus ?? []).filter((item) => item.value > 0),
    [data?.fineStatus],
  );
  const topKeywords = useMemo(
    () => (data?.topKeywords ?? []).filter((item) => item.value > 0),
    [data?.topKeywords],
  );
  const behaviorActions = useMemo(
    () =>
      [...(data?.behaviorActions ?? [])]
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value),
    [data?.behaviorActions],
  );
  const maxBehaviorValue = useMemo(
    () => behaviorActions.reduce((max, item) => Math.max(max, item.value), 0),
    [behaviorActions],
  );

  if (error && !data) {
    return (
      <div className="max-w-[1600px] mx-auto">
        <RequestErrorCard
          message={getApiErrorMessage(error, "仪表盘数据加载失败，请稍后重试。")}
          title="仪表盘数据加载失败"
          onRetry={() => void mutate()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          仪表盘
        </h1>
        <p className="text-default-500 text-sm">
          这里汇总了借阅、预约、罚款和近期流转的实时概况。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="border-none bg-white dark:bg-content1"
            shadow="sm"
          >
            <CardBody className="p-5">
              <div className="flex flex-col gap-1">
                <span className="text-default-500 text-sm font-medium">
                  {card.title}
                </span>
                <Skeleton className="rounded-lg" isLoaded={!isLoading}>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  </span>
                </Skeleton>
              </div>
              <div className="mt-4">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${card.bg} ${card.text}`}
                >
                  {card.trend}
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 h-[400px]">
        <div className="lg:col-span-2 h-full">
          <Skeleton
            className="rounded-2xl h-full w-full"
            isLoaded={!isLoading}
          >
            <ActivityChart data={data?.loanTrend || []} />
          </Skeleton>
        </div>

        <Card className="shadow-sm border-none bg-white dark:bg-content1 h-full">
          <CardHeader className="px-6 py-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                运营分布
              </h3>
              <p className="text-sm text-gray-500">预约与罚款状态占比</p>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-0 space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-default-700">预约状态</p>
              <div className="flex flex-wrap gap-2">
                {reservationStatus.length === 0 ? (
                  <span className="text-sm text-default-400">暂无预约数据</span>
                ) : reservationStatus.map((item) => (
                  <Chip key={item.key} color="primary" variant="flat">
                    {reservationLabels[item.key] ?? item.label}: {item.value}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-default-700">罚款状态</p>
              <div className="flex flex-wrap gap-2">
                {fineStatus.length === 0 ? (
                  <span className="text-sm text-default-400">暂无罚款数据</span>
                ) : fineStatus.map((item) => (
                  <Chip key={item.key} color="success" variant="flat">
                    {fineLabels[item.key] ?? item.label}: {item.value}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-default-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-default-400">
                Analytics Note
              </p>
              <p className="mt-2 text-sm text-default-600">
                趋势图与明细都直接来自后台统计接口，不再依赖前端用大列表临时聚合。
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="w-full">
        <Skeleton
          className="rounded-2xl min-h-[300px]"
          isLoaded={!isLoading}
        >
          <RecentLoans loans={data?.recentLoans || []} />
        </Skeleton>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border-none bg-white dark:bg-content1">
          <CardHeader className="px-6 py-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                搜索信号
              </h3>
              <p className="text-sm text-gray-500">热门检索词直接来自搜索历史聚合</p>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-0 space-y-4">
            {topKeywords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-default-200 py-10 text-center text-default-400">
                暂无热门搜索数据
              </div>
            ) : (
              topKeywords.map((item, index) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-2xl border border-default-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-default-400">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-default-800">
                      {item.label}
                    </span>
                  </div>
                  <Chip color="primary" variant="flat">
                    {item.value} 次
                  </Chip>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className="shadow-sm border-none bg-white dark:bg-content1">
          <CardHeader className="px-6 py-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                行为埋点分布
              </h3>
              <p className="text-sm text-gray-500">后台已开始消费详情浏览、借阅和预约等前端埋点</p>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-0 space-y-4">
            {behaviorActions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-default-200 py-10 text-center text-default-400">
                暂无行为埋点数据
              </div>
            ) : (
              behaviorActions.map((item, index) => (
                <div key={item.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-default-700">
                      {item.label}
                    </span>
                    <span className="text-sm text-default-400">
                      {item.value}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-default-100">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${
                        behaviorColors[index % behaviorColors.length]
                      }`}
                      style={{
                        width: `${maxBehaviorValue > 0 ? Math.max(12, (item.value / maxBehaviorValue) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Spacer y={4} />
    </div>
  );
};

DashboardPage.getLayout = function getLayout(page: ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};

export default DashboardPage;
