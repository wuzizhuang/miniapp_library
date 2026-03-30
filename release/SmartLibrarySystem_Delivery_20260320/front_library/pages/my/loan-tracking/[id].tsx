import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Spinner,
  Progress,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";

import { AppImage } from "@/components/common/AppImage";
import { getReturnLocationsByMethod } from "@/constants/returnLocations";
import DefaultLayout from "@/components/layouts/default";
import { getApiErrorMessage } from "@/lib/apiError";
import { loanService, MyLoan } from "@/services/api/loanService";
import { serviceAppointmentService } from "@/services/api/serviceAppointmentService";
import { ApiServiceAppointmentMethod } from "@/types/api";

const statusConfig: Record<
  MyLoan["status"],
  { label: string; color: "primary" | "warning" | "success" | "danger"; icon: string }
> = {
  BORROWED: { label: "借阅中", color: "primary", icon: "solar:book-bold-duotone" },
  OVERDUE: { label: "已逾期", color: "danger", icon: "solar:danger-triangle-bold-duotone" },
  RETURNED: { label: "已归还", color: "success", icon: "solar:check-circle-bold-duotone" },
  LOST: { label: "已挂失", color: "warning", icon: "solar:close-circle-bold-duotone" },
};

const returnMethodOptions: { key: ApiServiceAppointmentMethod; label: string }[] = [
  { key: "COUNTER", label: "人工柜台" },
  { key: "SMART_LOCKER", label: "智能还书柜" },
];

function formatLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function LoanTrackingPage() {
  const router = useRouter();
  const loanId = Number(router.query.id);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnMethod, setReturnMethod] = useState<ApiServiceAppointmentMethod>("COUNTER");
  const [returnLocation, setReturnLocation] = useState("");
  const [returnScheduledTime, setReturnScheduledTime] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  const { data: loan, isLoading, mutate } = useSWR(
    loanId ? `loan-tracking-${loanId}` : null,
    () => loanService.getLoanById(loanId),
  );
  const {
    data: appointmentsPage,
    mutate: mutateAppointments,
  } = useSWR(
    loanId ? ["loan-return-appointments", loanId] : null,
    () => serviceAppointmentService.getMyAppointments(0, 50),
    {
      revalidateOnFocus: false,
    },
  );

  const relatedReturnAppointments = useMemo(() => {
    const items = appointmentsPage?.content ?? [];

    return items
      .filter((item) => item.loanId === loanId && item.serviceType === "RETURN_BOOK")
      .sort((left, right) => {
        const leftTime = new Date(left.createTime).getTime();
        const rightTime = new Date(right.createTime).getTime();

        return rightTime - leftTime;
      });
  }, [appointmentsPage?.content, loanId]);
  const pendingReturnAppointment = relatedReturnAppointments.find((item) => item.status === "PENDING") ?? null;
  const availableReturnLocations = useMemo(
    () => getReturnLocationsByMethod(returnMethod),
    [returnMethod],
  );
  const minimumScheduledTime = formatLocalDateTimeInputValue(new Date());

  useEffect(() => {
    if (!isReturnModalOpen) {
      return;
    }

    const nextDefaultTime = new Date(Date.now() + 30 * 60 * 1000);
    setReturnScheduledTime(formatLocalDateTimeInputValue(nextDefaultTime));
    setReturnNotes("");
  }, [isReturnModalOpen]);

  useEffect(() => {
    if (!availableReturnLocations.some((item) => item.key === returnLocation)) {
      setReturnLocation(availableReturnLocations[0]?.key ?? "");
    }
  }, [availableReturnLocations, returnLocation]);

  const handleRenew = async () => {
    setActionLoading("renew");
    try {
      await loanService.renewLoan(loanId);
      await Promise.all([
        mutate(),
        globalMutate("my-active-loans-shelf"),
        globalMutate("my-history-loans-shelf"),
        globalMutate("my-loans-profile"),
        globalMutate("my-overview"),
        globalMutate("homepage-my-overview"),
      ]);
      toast.success("续借成功");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "续借失败，请稍后重试"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitReturnRequest = async () => {
    if (!returnScheduledTime) {
      toast.error("请选择归还时间");
      return;
    }

    if (!returnLocation) {
      toast.error("请选择归还地点");
      return;
    }

    setActionLoading("return-request");
    try {
      const appointment = await serviceAppointmentService.createAppointment({
        serviceType: "RETURN_BOOK",
        method: returnMethod,
        scheduledTime: returnScheduledTime,
        loanId,
        returnLocation,
        notes: returnNotes.trim() || undefined,
      });

      await Promise.all([
        mutateAppointments(),
        globalMutate("notification-unread-count"),
        globalMutate("my-overview"),
        globalMutate("homepage-my-overview"),
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

      setIsReturnModalOpen(false);
      toast.success("归还申请已提交，等待馆员审核");
      void router.push(`/my/appointments?highlight=${appointment.appointmentId}`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "归还申请提交失败，请稍后重试"));
    } finally {
      setActionLoading(null);
    }
  };

  if (!loanId || Number.isNaN(loanId)) {
    return (
      <DefaultLayout>
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-default-400">无效的借阅 ID</p>
        </section>
      </DefaultLayout>
    );
  }

  const stCfg = loan ? statusConfig[loan.status] : statusConfig.BORROWED;
  const isActive = loan?.status === "BORROWED" || loan?.status === "OVERDUE";
  const timeline: { date: string; label: string; icon: string; color: string; done: boolean }[] = [];

  if (loan) {
    timeline.push({
      date: loan.borrowDate,
      label: "借出图书",
      icon: "solar:book-bold",
      color: "text-primary",
      done: true,
    });
    if (loan.renewalCount > 0) {
      timeline.push({
        date: "",
        label: `已续借 ${loan.renewalCount} 次`,
        icon: "solar:refresh-bold",
        color: "text-secondary",
        done: true,
      });
    }
    if (pendingReturnAppointment) {
      timeline.push({
        date: new Date(pendingReturnAppointment.scheduledTime).toLocaleString("zh-CN"),
        label: `归还申请待审核（${pendingReturnAppointment.returnLocation ?? "地点待确认"}）`,
        icon: "solar:clipboard-check-bold",
        color: "text-warning-600",
        done: false,
      });
    }
    if (loan.status === "OVERDUE") {
      timeline.push({
        date: loan.dueDate,
        label: `逾期 ${loan.daysOverdue ?? 0} 天`,
        icon: "solar:danger-triangle-bold",
        color: "text-danger",
        done: true,
      });
    } else if (loan.status === "RETURNED") {
      timeline.push({
        date: loan.returnDate ?? "",
        label: "已归还",
        icon: "solar:check-circle-bold",
        color: "text-success",
        done: true,
      });
    } else if (loan.status === "LOST") {
      timeline.push({
        date: "",
        label: "已挂失",
        icon: "solar:close-circle-bold",
        color: "text-warning",
        done: true,
      });
    } else {
      timeline.push({
        date: loan.dueDate,
        label: `应还日期（剩余 ${loan.daysRemaining ?? "?"} 天）`,
        icon: "solar:calendar-bold",
        color: "text-warning-600",
        done: false,
      });
    }
  }

  let progressValue = 0;

  if (loan && isActive) {
    const borrowMs = new Date(loan.borrowDate).getTime();
    const dueMs = new Date(loan.dueDate).getTime();
    const nowMs = Date.now();
    const total = dueMs - borrowMs;
    const elapsed = nowMs - borrowMs;

    progressValue = total > 0 ? Math.min(Math.round((elapsed / total) * 100), 100) : 100;
  }

  return (
    <DefaultLayout>
      <section className="container mx-auto min-h-screen max-w-3xl px-4 py-8">
        <Button
          className="mb-6"
          size="sm"
          startContent={<Icon icon="solar:arrow-left-bold" width={16} />}
          variant="light"
          onPress={() => {
            void router.push("/my/shelf");
          }}
        >
          返回书架
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner label="加载借阅详情..." size="lg" />
          </div>
        ) : !loan ? (
          <div className="py-20 text-center text-default-400">
            <Icon className="mx-auto mb-3 opacity-40" icon="solar:book-bookmark-bold-duotone" width={48} />
            <p>未找到该借阅记录</p>
          </div>
        ) : (
          <>
            <Card className="mb-6 border-none bg-content1 shadow-sm">
              <CardBody className="p-6">
                <div className="flex gap-5">
                  <div className="flex-shrink-0">
                    {loan.bookCover ? (
                      <AppImage
                        alt={loan.bookTitle}
                        className="rounded-lg object-cover shadow-md"
                        height={140}
                        src={loan.bookCover}
                        width={100}
                        wrapperClassName="h-[140px] w-[100px] rounded-lg"
                      />
                    ) : (
                      <div className="flex h-[140px] w-[100px] items-center justify-center rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 shadow-md dark:from-primary-900/30 dark:to-primary-800/30">
                        <Icon className="text-primary-400" icon="solar:book-bold-duotone" width={40} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <h1 className="text-xl font-bold leading-tight">{loan.bookTitle}</h1>
                      <Chip
                        color={stCfg.color}
                        size="sm"
                        startContent={<Icon icon={stCfg.icon} width={14} />}
                        variant="flat"
                      >
                        {stCfg.label}
                      </Chip>
                    </div>
                    <div className="space-y-1 text-sm text-default-500">
                      {loan.bookAuthorNames ? (
                        <div className="flex items-center gap-2">
                          <Icon icon="solar:user-bold" width={14} />
                          <span>{loan.bookAuthorNames}</span>
                        </div>
                      ) : null}
                      {loan.categoryName ? (
                        <div className="flex items-center gap-2">
                          <Icon icon="solar:folder-bold" width={14} />
                          <span>{loan.categoryName}</span>
                        </div>
                      ) : null}
                      {loan.bookIsbn ? (
                        <div className="flex items-center gap-2">
                          <Icon icon="solar:barcode-bold" width={14} />
                          <span>ISBN: {loan.bookIsbn}</span>
                        </div>
                      ) : null}
                      {loan.locationCode ? (
                        <div className="flex items-center gap-2">
                          <Icon icon="solar:map-point-bold" width={14} />
                          <span>馆藏位置: {loan.locationCode}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {isActive ? (
              <Card className="mb-6 border border-primary-200 bg-primary-50 shadow-none">
                <CardBody className="px-6 py-4 text-sm text-primary-900">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 flex-shrink-0" icon="solar:clipboard-check-bold-duotone" width={20} />
                    <div>
                      <p className="font-medium">归还需先提交申请并由馆员审核</p>
                      <p className="mt-1 text-primary-800">
                        归还时需要指定地点与时间。馆员在后台审核通过后，系统才会正式完成归还入账。
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : null}

            {pendingReturnAppointment ? (
              <Card className="mb-6 border border-warning-200 bg-warning-50 shadow-none">
                <CardBody className="px-6 py-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1 text-sm text-warning-900">
                      <p className="font-semibold">归还申请待审核</p>
                      <p>归还时间：{new Date(pendingReturnAppointment.scheduledTime).toLocaleString("zh-CN")}</p>
                      <p>归还地点：{pendingReturnAppointment.returnLocation ?? "待确认"}</p>
                      <p>
                        归还方式：
                        {returnMethodOptions.find((item) => item.key === pendingReturnAppointment.method)?.label ??
                          pendingReturnAppointment.method}
                      </p>
                    </div>
                    <Button
                      color="warning"
                      variant="flat"
                      onPress={() => {
                        void router.push(`/my/appointments?highlight=${pendingReturnAppointment.appointmentId}`);
                      }}
                    >
                      查看审核进度
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : null}

            {isActive ? (
              <Card className="mb-6 border border-warning-200 bg-warning-50 shadow-none">
                <CardBody className="px-6 py-4 text-sm text-warning-800">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 flex-shrink-0" icon="solar:shield-warning-bold-duotone" width={20} />
                    <div>
                      <p className="font-medium">遗失登记需由馆员处理</p>
                      <p className="mt-1 text-warning-700">
                        如果图书遗失，请联系馆员处理，系统会由馆员在后台登记遗失并生成赔付记录。
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : null}

            {isActive ? (
              <Card className="mb-6 border-none bg-content1 shadow-sm">
                <CardHeader className="px-6 pb-0 pt-5">
                  <h3 className="text-base font-semibold text-default-700">借阅进度</h3>
                </CardHeader>
                <CardBody className="p-6 pt-3">
                  <Progress
                    showValueLabel
                    className="mb-3"
                    color={loan.status === "OVERDUE" ? "danger" : progressValue > 80 ? "warning" : "primary"}
                    size="md"
                    value={progressValue}
                  />
                  <div className="flex justify-between text-xs text-default-400">
                    <span>借出: {loan.borrowDate}</span>
                    <span className={loan.status === "OVERDUE" ? "font-semibold text-danger" : ""}>
                      应还: {loan.dueDate}
                    </span>
                  </div>
                  <div className="mt-4 text-center">
                    {loan.status === "OVERDUE" ? (
                      <div className="text-danger">
                        <p className="text-3xl font-black">逾期 {loan.daysOverdue} 天</p>
                        <p className="mt-1 text-xs">请尽快提交归还申请以减少罚款</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-3xl font-black text-primary">{loan.daysRemaining}</p>
                        <p className="mt-1 text-xs text-default-400">天后到期</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ) : null}

            <Card className="mb-6 border-none bg-content1 shadow-sm">
              <CardHeader className="px-6 pb-0 pt-5">
                <h3 className="text-base font-semibold text-default-700">借阅时间线</h3>
              </CardHeader>
              <CardBody className="p-6 pt-4">
                <div className="relative">
                  {timeline.map((event, idx) => (
                    <div key={idx} className="mb-5 flex gap-4 last:mb-0">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            event.done ? "bg-default-100" : "border-2 border-dashed border-default-300"
                          }`}
                        >
                          <Icon className={event.color} icon={event.icon} width={16} />
                        </div>
                        {idx < timeline.length - 1 ? <div className="mt-1 w-px flex-1 bg-default-200" /> : null}
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-medium">{event.label}</p>
                        {event.date ? <p className="mt-0.5 text-xs text-default-400">{event.date}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="mb-6 border-none bg-content1 shadow-sm">
              <CardHeader className="px-6 pb-0 pt-5">
                <h3 className="text-base font-semibold text-default-700">借阅信息</h3>
              </CardHeader>
              <CardBody className="p-6 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="mb-0.5 text-xs text-default-400">借阅编号</p>
                    <p className="font-medium">#{loan.loanId}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-default-400">副本编号</p>
                    <p className="font-medium">#{loan.copyId}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-default-400">借出日期</p>
                    <p className="font-medium">{loan.borrowDate}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-default-400">应还日期</p>
                    <p className="font-medium">{loan.dueDate}</p>
                  </div>
                  {loan.returnDate ? (
                    <div>
                      <p className="mb-0.5 text-xs text-default-400">归还日期</p>
                      <p className="font-medium">{loan.returnDate}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="mb-0.5 text-xs text-default-400">续借次数</p>
                    <p className="font-medium">{loan.renewalCount} / 2</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {isActive ? (
              <div className="flex justify-center gap-3">
                {loan.canRenew ? (
                  <Button
                    color="primary"
                    isDisabled={!!actionLoading}
                    isLoading={actionLoading === "renew"}
                    startContent={!actionLoading ? <Icon icon="solar:refresh-bold" width={16} /> : undefined}
                    variant="flat"
                    onPress={() => void handleRenew()}
                  >
                    续借
                  </Button>
                ) : null}
                <Button
                  color="success"
                  isDisabled={!!actionLoading || !!pendingReturnAppointment}
                  startContent={<Icon icon="solar:clipboard-check-bold" width={16} />}
                  variant="flat"
                  onPress={() => setIsReturnModalOpen(true)}
                >
                  {pendingReturnAppointment ? "归还申请待审核" : "提交归还申请"}
                </Button>
              </div>
            ) : null}
          </>
        )}

        <Modal isOpen={isReturnModalOpen} placement="center" size="lg" onOpenChange={setIsReturnModalOpen}>
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">提交归还申请</ModalHeader>
            <ModalBody className="space-y-4">
              <p className="text-sm text-default-500">
                提交后将进入馆员审核流程。审核通过并确认到馆后，系统才会正式完成归还。
              </p>

              <Select
                label="归还方式"
                labelPlacement="outside"
                selectedKeys={new Set([returnMethod])}
                variant="bordered"
                onSelectionChange={(keys) =>
                  setReturnMethod(String(Array.from(keys)[0] ?? "COUNTER") as ApiServiceAppointmentMethod)
                }
              >
                {returnMethodOptions.map((item) => (
                  <SelectItem key={item.key}>{item.label}</SelectItem>
                ))}
              </Select>

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

              <Input
                label="归还时间"
                labelPlacement="outside"
                min={minimumScheduledTime}
                type="datetime-local"
                value={returnScheduledTime}
                variant="bordered"
                onValueChange={setReturnScheduledTime}
              />

              <Textarea
                label="备注"
                labelPlacement="outside"
                minRows={3}
                placeholder="可填写包装破损、附带光盘、需馆员核验等说明"
                value={returnNotes}
                variant="bordered"
                onValueChange={setReturnNotes}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={() => setIsReturnModalOpen(false)}>
                取消
              </Button>
              <Button
                color="success"
                isLoading={actionLoading === "return-request"}
                onPress={() => void handleSubmitReturnRequest()}
              >
                提交审核
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </section>
    </DefaultLayout>
  );
}
