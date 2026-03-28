import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Pagination,
  Spinner,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  User,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  serviceAppointmentService,
  ServiceAppointment,
  ServiceAppointmentPageResult,
} from "@/services/api/serviceAppointmentService";
import { ApiServiceAppointmentStatus } from "@/types/api";

type AppointmentFilter = ApiServiceAppointmentStatus | "all";

const statusConfig: Record<
  ApiServiceAppointmentStatus,
  { label: string; color: "warning" | "success" | "danger" | "default" }
> = {
  PENDING: { label: "待处理", color: "warning" },
  COMPLETED: { label: "已完成", color: "success" },
  CANCELLED: { label: "已取消", color: "danger" },
  MISSED: { label: "已失约", color: "default" },
};

const serviceTypeConfig: Record<ServiceAppointment["serviceType"], string> = {
  RETURN_BOOK: "到馆还书",
  PICKUP_BOOK: "预约取书",
  CONSULTATION: "馆员咨询",
};

const methodConfig: Record<ServiceAppointment["method"], string> = {
  COUNTER: "人工柜台",
  SMART_LOCKER: "智能柜",
};

const tabs: Array<{ key: AppointmentFilter; label: string; icon: string }> = [
  { key: "all", label: "全部", icon: "solar:bill-list-bold" },
  { key: "PENDING", label: "待处理", icon: "solar:hourglass-bold" },
  { key: "COMPLETED", label: "已完成", icon: "solar:check-circle-bold" },
  { key: "MISSED", label: "已失约", icon: "solar:alarm-pause-bold" },
  { key: "CANCELLED", label: "已取消", icon: "solar:close-circle-bold" },
];

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN");
}

function getConfirmMessage(status: ApiServiceAppointmentStatus) {
  switch (status) {
    case "COMPLETED":
      return "确认将该服务预约标记为已完成？";
    case "MISSED":
      return "确认将该服务预约标记为已失约？";
    case "CANCELLED":
      return "确认取消该服务预约？";
    default:
      return "确认更新该服务预约状态？";
  }
}

function getSuccessMessage(status: ApiServiceAppointmentStatus) {
  switch (status) {
    case "COMPLETED":
      return "服务预约已标记为完成";
    case "MISSED":
      return "服务预约已标记为失约";
    case "CANCELLED":
      return "服务预约已取消";
    default:
      return "服务预约状态已更新";
  }
}

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<AppointmentFilter>("all");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");

  // 从 URL query 中读取 keyword（从用户详情页跳转时携带）
  React.useEffect(() => {
    if (!router.isReady) return;
    const qKeyword = Array.isArray(router.query.keyword)
      ? router.query.keyword[0]
      : router.query.keyword;

    if (qKeyword) {
      setKeyword(qKeyword);
    }
  }, [router.isReady]);  
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<ServiceAppointmentPageResult<ServiceAppointment>>(
    ["admin-service-appointments", filter, keyword, page],
    () => serviceAppointmentService.getAllAppointments(filter, keyword, page - 1, 10),
  );
  const { data: stats = [] } = useSWR(
    ["admin-service-appointments-stats", keyword],
    () => serviceAppointmentService.getAppointmentStats(keyword),
  );
  const items = data?.items ?? [];
  const statsMap = Object.fromEntries(stats.map((item) => [item.key, item.value ?? 0]));

  const handleProcess = async (appointmentId: number, status: ApiServiceAppointmentStatus) => {
    if (!confirm(getConfirmMessage(status))) {
      return;
    }

    const currentKey = `${appointmentId}:${status}`;

    setProcessingKey(currentKey);

    try {
      await serviceAppointmentService.updateAppointmentStatus(appointmentId, { status });
      await Promise.all([
        mutate(),
        globalMutate(["admin-service-appointments-stats", keyword]),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "my-service-appointments-page",
          undefined,
          { revalidate: true },
        ),
        globalMutate("notification-unread-count"),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "my-notifications-page",
          undefined,
          { revalidate: true },
        ),
      ]);
      toast.success(getSuccessMessage(status));
    } catch (requestError: any) {
      toast.error(getApiErrorMessage(requestError, "操作失败，请稍后重试"));
    } finally {
      setProcessingKey(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">服务预约管理</h1>
          <p className="text-default-500">处理读者的到馆还书、预约取书与馆员咨询预约。</p>
        </div>

        <Tabs
          aria-label="Filter appointments"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary",
          }}
          color="primary"
          selectedKey={filter}
          variant="underlined"
          onSelectionChange={(key) => {
            setFilter(key as AppointmentFilter);
            setPage(1);
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              title={(
                <div className="flex items-center space-x-2">
                  <Icon icon={tab.icon} />
                  <span>{tab.label}</span>
                </div>
              )}
            />
          ))}
        </Tabs>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border border-default-100 shadow-sm">
            <CardBody className="py-4">
              <p className="text-xs text-default-400">全部预约</p>
              <p className="mt-1 text-2xl font-bold">
                {Object.values(statsMap).reduce((sum, value) => sum + Number(value ?? 0), 0)}
              </p>
            </CardBody>
          </Card>
          <Card className="border border-warning-100 shadow-sm">
            <CardBody className="py-4">
              <p className="text-xs text-default-400">待处理</p>
              <p className="mt-1 text-2xl font-bold text-warning-600">{statsMap.PENDING ?? 0}</p>
            </CardBody>
          </Card>
          <Card className="border border-success-100 shadow-sm">
            <CardBody className="py-4">
              <p className="text-xs text-default-400">已完成</p>
              <p className="mt-1 text-2xl font-bold text-success-600">{statsMap.COMPLETED ?? 0}</p>
            </CardBody>
          </Card>
          <Card className="border border-default-200 shadow-sm">
            <CardBody className="py-4">
              <p className="text-xs text-default-400">已失约</p>
              <p className="mt-1 text-2xl font-bold">{statsMap.MISSED ?? 0}</p>
            </CardBody>
          </Card>
        </div>

        <Input
          isClearable
          placeholder="搜索读者 / 图书 / 备注"
          value={keyword}
          startContent={<Icon icon="solar:magnifer-linear" width={16} className="text-default-400" />}
          onClear={() => {
            setKeyword("");
            setPage(1);
          }}
          onValueChange={(value) => {
            setKeyword(value);
            setPage(1);
          }}
        />

        {error && !data ? (
          <RequestErrorCard
            message={getApiErrorMessage(error, "服务预约列表加载失败，请稍后重试。")}
            title="服务预约列表加载失败"
            onRetry={() => void mutate()}
          />
        ) : (
          <Table aria-label="Service appointments table" className="bg-content1 rounded-xl shadow-sm">
            <TableHeader>
              <TableColumn>服务类型</TableColumn>
              <TableColumn>读者</TableColumn>
              <TableColumn>预约时间</TableColumn>
              <TableColumn>预约方式</TableColumn>
              <TableColumn>关联信息</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn align="end">操作</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={filter === "all" ? "暂无服务预约记录" : "当前筛选条件下暂无记录"}
              isLoading={isLoading}
              items={items}
              loadingContent={<Spinner />}
            >
              {(item) => (
                <TableRow key={item.appointmentId}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{serviceTypeConfig[item.serviceType]}</p>
                      {item.notes ? (
                        <p className="text-xs text-default-400 line-clamp-2">{item.notes}</p>
                      ) : (
                        <p className="text-xs text-default-300">无备注</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <User
                      name={item.userFullName || item.username}
                      description={item.username}
                      avatarProps={{ size: "sm", radius: "full" }}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(item.scheduledTime)}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {methodConfig[item.method]}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {item.bookTitle ? (
                        <p className="text-sm">{item.bookTitle}</p>
                      ) : (
                        <p className="text-sm text-default-400">无关联图书</p>
                      )}
                      {item.loanId ? (
                        <p className="text-xs text-default-400">借阅 #{item.loanId}</p>
                      ) : null}
                      {item.returnLocation ? (
                        <p className="text-xs text-default-400">归还地点：{item.returnLocation}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={statusConfig[item.status].color}
                      size="sm"
                      variant="dot"
                      className="border-none"
                    >
                      {statusConfig[item.status].label}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {item.status === "PENDING" ? (
                        <>
                          <Button
                            color="success"
                            size="sm"
                            variant="flat"
                            isLoading={processingKey === `${item.appointmentId}:COMPLETED`}
                            onPress={() => void handleProcess(item.appointmentId, "COMPLETED")}
                          >
                            {item.serviceType === "RETURN_BOOK" ? "审核通过并归还" : "完成"}
                          </Button>
                          <Button
                            color="warning"
                            size="sm"
                            variant="flat"
                            isLoading={processingKey === `${item.appointmentId}:MISSED`}
                            onPress={() => void handleProcess(item.appointmentId, "MISSED")}
                          >
                            标记失约
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            variant="flat"
                            isLoading={processingKey === `${item.appointmentId}:CANCELLED`}
                            onPress={() => void handleProcess(item.appointmentId, "CANCELLED")}
                          >
                            取消
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm text-default-300">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {data && data.totalPages > 1 ? (
          <div className="flex justify-center">
            <Pagination
              showControls
              color="primary"
              page={page}
              total={data.totalPages}
              variant="flat"
              onChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
