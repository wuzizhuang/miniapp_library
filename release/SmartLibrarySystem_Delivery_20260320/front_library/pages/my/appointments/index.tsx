import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Textarea,
  Chip,
} from "@heroui/react";
import { toast } from "sonner";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import { getReturnLocationsByMethod } from "@/constants/returnLocations";
import DefaultLayout from "@/components/layouts/default";
import { getApiErrorMessage } from "@/lib/apiError";
import { loanService } from "@/services/api/loanService";
import { serviceAppointmentService } from "@/services/api/serviceAppointmentService";
import { ApiServiceAppointmentMethod, ApiServiceAppointmentType } from "@/types/api";

const serviceTypeOptions: { key: ApiServiceAppointmentType; label: string; description: string }[] = [
  { key: "RETURN_BOOK", label: "到馆还书", description: "预约柜台或自助柜归还图书" },
  { key: "PICKUP_BOOK", label: "预约取书", description: "预约到馆领取图书或资源" },
  { key: "CONSULTATION", label: "馆员咨询", description: "预约咨询借阅、资源与服务问题" },
];

const methodOptions: { key: ApiServiceAppointmentMethod; label: string }[] = [
  { key: "COUNTER", label: "人工柜台" },
  { key: "SMART_LOCKER", label: "智能柜" },
];

const statusMeta: Record<string, { label: string; color: "warning" | "success" | "danger" | "default" }> = {
  PENDING: { label: "待处理", color: "warning" },
  COMPLETED: { label: "已完成", color: "success" },
  CANCELLED: { label: "已取消", color: "danger" },
  MISSED: { label: "已失约", color: "default" },
};

function formatLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [serviceType, setServiceType] = useState<ApiServiceAppointmentType>("CONSULTATION");
  const [method, setMethod] = useState<ApiServiceAppointmentMethod>("COUNTER");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loanId, setLoanId] = useState<string>("");
  const [returnLocation, setReturnLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const { data: appointmentsData, error: appointmentsError, isLoading, mutate } = useSWR(
    ["my-service-appointments-page", page],
    () => serviceAppointmentService.getMyAppointments(page - 1, 10),
  );
  const { data: myLoans = [], error: myLoansError } = useSWR(
    "my-active-loans-for-appointments",
    loanService.getMyLoans,
  );

  const appointments = appointmentsData?.content ?? [];
  const totalPages = appointmentsData?.totalPages ?? 1;
  const pendingAppointments = useMemo(
    () => appointments.filter((item) => item.status === "PENDING"),
    [appointments],
  );
  const historyAppointments = useMemo(
    () => appointments.filter((item) => item.status !== "PENDING"),
    [appointments],
  );
  const activeLoans = useMemo(
    () => myLoans.filter((loan) => loan.status === "BORROWED" || loan.status === "OVERDUE"),
    [myLoans],
  );
  const highlightId = useMemo(() => {
    const raw = router.query.highlight;
    const value = Array.isArray(raw) ? raw[0] : raw;

    return value ? Number(value) : null;
  }, [router.query.highlight]);
  const minimumScheduledTime = formatLocalDateTimeInputValue(new Date());
  const availableReturnLocations = useMemo(() => getReturnLocationsByMethod(method), [method]);

  useEffect(() => {
    if (!highlightId || !appointments.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById(`appointment-${highlightId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [highlightId, appointments]);

  useEffect(() => {
    if (serviceType !== "RETURN_BOOK") {
      setReturnLocation("");
      return;
    }

    if (!availableReturnLocations.some((item) => item.key === returnLocation)) {
      setReturnLocation(availableReturnLocations[0]?.key ?? "");
    }
  }, [availableReturnLocations, returnLocation, serviceType]);

  const handleCreate = async () => {
    if (!scheduledTime) {
      toast.error("请选择预约时间");

      return;
    }

    if (serviceType === "RETURN_BOOK" && !loanId) {
      toast.error("到馆还书必须关联一条借阅记录");

      return;
    }

    if (serviceType === "RETURN_BOOK" && !returnLocation) {
      toast.error("请选择归还地点");

      return;
    }

    try {
      setSubmitting(true);
      await serviceAppointmentService.createAppointment({
        serviceType,
        method,
        scheduledTime,
        loanId: loanId ? Number(loanId) : undefined,
        returnLocation: serviceType === "RETURN_BOOK" ? returnLocation : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("服务预约已提交");
      setScheduledTime("");
      setLoanId("");
      setReturnLocation("");
      setNotes("");
      await Promise.all([
        mutate(),
        globalMutate("notification-unread-count"),
        globalMutate("my-overview"),
        globalMutate("homepage-my-overview"),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "loan-return-appointments",
          undefined,
          { revalidate: true },
        ),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "my-notifications-page",
          undefined,
          { revalidate: true },
        ),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "my-service-appointments-page",
          undefined,
          { revalidate: true },
        ),
      ]);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "预约提交失败，请稍后重试"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (appointmentId: number) => {
    if (!confirm("确认取消本次服务预约？")) {
      return;
    }

    try {
      setCancellingId(appointmentId);
      await serviceAppointmentService.cancelAppointment(appointmentId);
      toast.success("预约已取消");
      await Promise.all([
        mutate(),
        globalMutate("notification-unread-count"),
        globalMutate("my-overview"),
        globalMutate("homepage-my-overview"),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "loan-return-appointments",
          undefined,
          { revalidate: true },
        ),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "my-notifications-page",
          undefined,
          { revalidate: true },
        ),
        globalMutate(
          (key) => Array.isArray(key) && key[0] === "my-service-appointments-page",
          undefined,
          { revalidate: true },
        ),
      ]);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "取消失败，请稍后重试"));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <DefaultLayout>
      <section className="container mx-auto max-w-5xl px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">服务预约</h1>
          <p className="mt-2 text-default-500">预约还书、取书或馆员咨询，当前页面已接入真实后端接口。</p>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="border border-default-100 shadow-sm">
            <CardHeader className="px-5 pb-0 pt-5">
              <div>
                <h2 className="text-lg font-semibold">新建预约</h2>
                <p className="text-sm text-default-400">提交后可在下方列表查看状态。</p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 px-5 pb-5 pt-4">
              <Select
                label="服务类型"
                labelPlacement="outside"
                selectedKeys={new Set([serviceType])}
                variant="bordered"
                onSelectionChange={(keys) => setServiceType(String(Array.from(keys)[0] ?? "CONSULTATION") as ApiServiceAppointmentType)}
              >
                {serviceTypeOptions.map((item) => (
                  <SelectItem key={item.key} description={item.description}>
                    {item.label}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="预约方式"
                labelPlacement="outside"
                selectedKeys={new Set([method])}
                variant="bordered"
                onSelectionChange={(keys) => setMethod(String(Array.from(keys)[0] ?? "COUNTER") as ApiServiceAppointmentMethod)}
              >
                {methodOptions.map((item) => (
                  <SelectItem key={item.key}>{item.label}</SelectItem>
                ))}
              </Select>

              <Input
                label="预约时间"
                labelPlacement="outside"
                min={minimumScheduledTime}
                type="datetime-local"
                value={scheduledTime}
                variant="bordered"
                onValueChange={setScheduledTime}
              />

              <Select
                label="关联借阅（可选）"
                labelPlacement="outside"
                placeholder={activeLoans.length > 0 ? "选择关联借阅" : "当前无可关联借阅"}
                selectedKeys={loanId ? new Set([loanId]) : new Set([])}
                variant="bordered"
                onSelectionChange={(keys) => setLoanId(String(Array.from(keys)[0] ?? ""))}
              >
                {activeLoans.map((loan) => (
                  <SelectItem key={String(loan.loanId)}>
                    {loan.bookTitle} #{loan.loanId}
                  </SelectItem>
                ))}
              </Select>
              {myLoansError ? (
                <p className="text-sm text-danger-600">借阅列表加载失败，当前无法关联借阅记录。</p>
              ) : null}

              {serviceType === "RETURN_BOOK" ? (
                <Select
                  label="归还地点"
                  labelPlacement="outside"
                  placeholder="请选择归还地点"
                  selectedKeys={returnLocation ? new Set([returnLocation]) : new Set([])}
                  variant="bordered"
                  onSelectionChange={(keys) => setReturnLocation(String(Array.from(keys)[0] ?? ""))}
                >
                  {availableReturnLocations.map((item) => (
                    <SelectItem key={item.key} description={item.description}>
                      {item.label}
                    </SelectItem>
                  ))}
                </Select>
              ) : null}

              <Textarea
                label="备注"
                labelPlacement="outside"
                minRows={4}
                placeholder="填写到馆说明、咨询主题或特殊需求"
                value={notes}
                variant="bordered"
                onValueChange={setNotes}
              />

              <Button color="primary" isLoading={submitting} onPress={() => void handleCreate()}>
                提交预约
              </Button>
            </CardBody>
          </Card>

          <Card className="border border-default-100 shadow-sm">
            <CardHeader className="px-5 pb-0 pt-5">
              <div>
                <h2 className="text-lg font-semibold">预约说明</h2>
                <p className="text-sm text-default-400">当前后端支持创建、查询和取消预约。</p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 px-5 pb-5 pt-4 text-sm text-default-600">
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="font-medium">到馆还书</p>
                <p className="mt-1">适合需要人工确认的归还场景，可选择关联具体借阅记录。</p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="font-medium">预约取书</p>
                <p className="mt-1">用于到馆领取已准备好的图书或预约资源。</p>
              </div>
              <div className="rounded-2xl bg-default-50 p-4">
                <p className="font-medium">馆员咨询</p>
                <p className="mt-1">适合借阅政策、资源访问和馆内服务相关问题。</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="加载预约记录..." />
          </div>
        ) : appointmentsError ? (
          <RequestErrorCard
            message={getApiErrorMessage(appointmentsError, "预约记录加载失败，请稍后重试。")}
            title="服务预约记录加载失败"
            onRetry={() => void mutate()}
          />
        ) : (
          <div className="space-y-8">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-xl font-semibold">待处理预约</h2>
                <Chip color="warning" size="sm" variant="flat">{pendingAppointments.length}</Chip>
              </div>
              {pendingAppointments.length === 0 ? (
                <Card className="border border-dashed border-default-200 shadow-none">
                  <CardBody className="py-12 text-center text-default-400">
                    <p>暂无待处理预约</p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingAppointments.map((item) => (
                    <Card
                      key={item.appointmentId}
                      className={`shadow-sm ${
                        highlightId === item.appointmentId
                          ? "border border-primary-300 bg-primary-50 ring-2 ring-primary-200"
                          : "border border-default-100"
                      }`}
                      id={`appointment-${item.appointmentId}`}
                    >
                      <CardBody className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">
                              {serviceTypeOptions.find((option) => option.key === item.serviceType)?.label || item.serviceType}
                            </p>
                            <Chip color="warning" size="sm" variant="flat">
                              {statusMeta[item.status]?.label || item.status}
                            </Chip>
                          </div>
                          <p className="text-sm text-default-500">
                            预约时间：{new Date(item.scheduledTime).toLocaleString("zh-CN")}
                          </p>
                          <p className="text-sm text-default-500">
                            方式：{methodOptions.find((option) => option.key === item.method)?.label || item.method}
                          </p>
                          {item.returnLocation ? (
                            <p className="text-sm text-default-500">归还地点：{item.returnLocation}</p>
                          ) : null}
                          {item.bookTitle ? (
                            <p className="text-sm text-default-500">关联图书：{item.bookTitle}</p>
                          ) : null}
                          {item.notes ? <p className="text-sm text-default-500">备注：{item.notes}</p> : null}
                        </div>
                        <Button
                          color="danger"
                          isLoading={cancellingId === item.appointmentId}
                          size="sm"
                          variant="flat"
                          onPress={() => void handleCancel(item.appointmentId)}
                        >
                          取消预约
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-xl font-semibold">历史记录</h2>
                <Chip size="sm" variant="flat">{historyAppointments.length}</Chip>
              </div>
              {historyAppointments.length === 0 ? (
                <Card className="border border-dashed border-default-200 shadow-none">
                  <CardBody className="py-12 text-center text-default-400">
                    <p>暂无历史服务预约</p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-4">
                  {historyAppointments.map((item) => (
                    <Card
                      key={item.appointmentId}
                      className={`shadow-sm ${
                        highlightId === item.appointmentId
                          ? "border border-primary-300 bg-primary-50 ring-2 ring-primary-200"
                          : "border border-default-100"
                      }`}
                      id={`appointment-${item.appointmentId}`}
                    >
                      <CardBody className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {serviceTypeOptions.find((option) => option.key === item.serviceType)?.label || item.serviceType}
                          </p>
                          <p className="text-sm text-default-500">
                            预约时间：{new Date(item.scheduledTime).toLocaleString("zh-CN")}
                          </p>
                          {item.returnLocation ? (
                            <p className="text-sm text-default-500">归还地点：{item.returnLocation}</p>
                          ) : null}
                        </div>
                        <Chip color={statusMeta[item.status]?.color || "default"} size="sm" variant="flat">
                          {statusMeta[item.status]?.label || item.status}
                        </Chip>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 ? (
              <div className="flex justify-center">
                <Pagination
                  color="primary"
                  page={page}
                  showControls
                  total={totalPages}
                  onChange={setPage}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
