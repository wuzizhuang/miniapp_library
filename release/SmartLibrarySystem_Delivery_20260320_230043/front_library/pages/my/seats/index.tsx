import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import DefaultLayout from "@/components/layouts/default";
import { getApiErrorMessage } from "@/lib/apiError";
import { seatReservationService, SeatItem } from "@/services/api/seatReservationService";
import { ApiSeatReservationDto } from "@/types/api";

const statusMeta: Record<
  string,
  { label: string; color: "primary" | "success" | "danger" | "default" }
> = {
  ACTIVE: { label: "进行中", color: "primary" },
  COMPLETED: { label: "已完成", color: "success" },
  CANCELLED: { label: "已取消", color: "danger" },
};

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("zh-CN");
}

function canCancelReservation(item: ApiSeatReservationDto) {
  return item.status === "ACTIVE" && new Date(item.startTime).getTime() > Date.now();
}

export default function MySeatReservationsPage() {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    date: "",
    startTime: "08:00",
    endTime: "10:00",
    notes: "",
  });
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);
  const {
    data: reservations = [],
    error,
    isLoading,
    mutate,
  } = useSWR("my-seat-reservations", seatReservationService.getMyReservations);

  const activeReservations = useMemo(
    () => reservations.filter((item) => item.status === "ACTIVE"),
    [reservations],
  );
  const historyReservations = useMemo(
    () => reservations.filter((item) => item.status !== "ACTIVE"),
    [reservations],
  );
  const highlightId = useMemo(() => {
    const raw = router.query.highlight;
    const value = Array.isArray(raw) ? raw[0] : raw;

    return value ? Number(value) : null;
  }, [router.query.highlight]);

  useEffect(() => {
    if (!highlightId || !reservations.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById(`seat-reservation-${highlightId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [highlightId, reservations]);

  const refreshReservations = async () => {
    await Promise.all([
      mutate(),
      globalMutate("my-seat-reservations"),
      globalMutate("notification-unread-count"),
      globalMutate("my-overview"),
      globalMutate("homepage-my-overview"),
      globalMutate(
        (key) => Array.isArray(key) && key[0] === "my-notifications-page",
        undefined,
        { revalidate: true },
      ),
    ]);
  };

  // 查询可用座位
  const canQuerySeats = showCreateForm && createForm.date && createForm.startTime && createForm.endTime;
  const queryStartTime = canQuerySeats ? `${createForm.date}T${createForm.startTime}:00` : "";
  const queryEndTime = canQuerySeats ? `${createForm.date}T${createForm.endTime}:00` : "";
  const {
    data: availableSeats = [],
    isLoading: seatsLoading,
  } = useSWR(
    canQuerySeats
      ? ["available-seats", queryStartTime, queryEndTime]
      : null,
    () => seatReservationService.getSeats({
      startTime: queryStartTime,
      endTime: queryEndTime,
      availableOnly: true,
    }),
  );

  const handleCreate = async () => {
    if (!selectedSeatId) {
      toast.error("请先选择一个座位");
      return;
    }
    if (!createForm.date || !createForm.startTime || !createForm.endTime) {
      toast.error("请填写完整的日期和时间");
      return;
    }
    try {
      setCreating(true);
      await seatReservationService.createReservation({
        seatId: selectedSeatId,
        startTime: `${createForm.date}T${createForm.startTime}:00`,
        endTime: `${createForm.date}T${createForm.endTime}:00`,
        notes: createForm.notes.trim() || undefined,
      });
      toast.success("座位预约成功");
      setShowCreateForm(false);
      setCreateForm({ date: "", startTime: "08:00", endTime: "10:00", notes: "" });
      setSelectedSeatId(null);
      await refreshReservations();
    } catch (requestError: unknown) {
      toast.error(getApiErrorMessage(requestError, "座位预约失败，请稍后重试"));
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (reservationId: number) => {
    if (!confirm("确认取消本次座位预约？")) {
      return;
    }

    try {
      setCancellingId(reservationId);
      await seatReservationService.cancelReservation(reservationId);
      toast.success("座位预约已取消");
      await refreshReservations();
    } catch (requestError: unknown) {
      toast.error(getApiErrorMessage(requestError, "取消座位预约失败，请稍后重试"));
    } finally {
      setCancellingId(null);
    }
  };

  const renderReservationCard = (item: ApiSeatReservationDto) => {
    const highlighted = highlightId === item.reservationId;
    const canCancel = canCancelReservation(item);

    return (
      <Card
        key={item.reservationId}
        className={`shadow-sm ${
          highlighted
            ? "border border-primary-300 bg-primary-50 ring-2 ring-primary-200"
            : "border border-default-100"
        }`}
        id={`seat-reservation-${item.reservationId}`}
      >
        <CardBody className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">
                座位 {item.seatCode}
                {item.areaName ? ` · ${item.areaName}` : ""}
              </p>
              <Chip color={statusMeta[item.status]?.color || "default"} size="sm" variant="flat">
                {statusMeta[item.status]?.label || item.status}
              </Chip>
            </div>
            <p className="text-sm text-default-500">
              楼层 / 区域：{item.floorName || "-"} / {item.zoneName || "-"}
            </p>
            <p className="text-sm text-default-500">
              使用时间：{formatDateTime(item.startTime)} 至 {formatDateTime(item.endTime)}
            </p>
            {item.notes ? (
              <p className="text-sm text-default-500">备注：{item.notes}</p>
            ) : null}
          </div>
          {canCancel ? (
            <Button
              color="danger"
              isLoading={cancellingId === item.reservationId}
              size="sm"
              variant="flat"
              onPress={() => void handleCancel(item.reservationId)}
            >
              取消预约
            </Button>
          ) : null}
        </CardBody>
      </Card>
    );
  };

  return (
    <DefaultLayout>
      <section className="container mx-auto max-w-5xl px-4 py-8 min-h-screen">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">座位预约</h1>
            <p className="mt-2 text-default-500">
              查看当前座位预约和历史记录。未开始的预约可在这里直接取消。
            </p>
          </div>
          <Button
            color={showCreateForm ? "default" : "primary"}
            startContent={<Icon icon={showCreateForm ? "solar:close-circle-bold" : "solar:add-circle-bold"} width={20} />}
            variant={showCreateForm ? "flat" : "solid"}
            onPress={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "收起" : "新建座位预约"}
          </Button>
        </div>

        {showCreateForm ? (
          <Card className="mb-6 border border-primary-100 shadow-sm">
            <CardHeader className="px-5 pb-0 pt-5">
              <div>
                <h2 className="text-lg font-semibold">新建座位预约</h2>
                <p className="text-sm text-default-400">选择日期、时间段后查询可用座位，选择后提交预约。</p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 px-5 pb-5 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="日期"
                  labelPlacement="outside"
                  type="date"
                  value={createForm.date}
                  variant="bordered"
                  onValueChange={(v) => {
                    setCreateForm((f) => ({ ...f, date: v }));
                    setSelectedSeatId(null);
                  }}
                />
                <Input
                  label="开始时间"
                  labelPlacement="outside"
                  type="time"
                  value={createForm.startTime}
                  variant="bordered"
                  onValueChange={(v) => {
                    setCreateForm((f) => ({ ...f, startTime: v }));
                    setSelectedSeatId(null);
                  }}
                />
                <Input
                  label="结束时间"
                  labelPlacement="outside"
                  type="time"
                  value={createForm.endTime}
                  variant="bordered"
                  onValueChange={(v) => {
                    setCreateForm((f) => ({ ...f, endTime: v }));
                    setSelectedSeatId(null);
                  }}
                />
              </div>
              <Input
                label="备注（可选）"
                labelPlacement="outside"
                placeholder="如：需要靠窗位置"
                value={createForm.notes}
                variant="bordered"
                onValueChange={(v) => setCreateForm((f) => ({ ...f, notes: v }))}
              />

              {canQuerySeats ? (
                <div className="rounded-2xl border border-default-100 bg-default-50 p-4">
                  <p className="mb-3 text-sm font-medium text-default-600">
                    可用座位 {seatsLoading ? "加载中..." : `(${availableSeats.length} 个)`}
                  </p>
                  {seatsLoading ? (
                    <div className="flex justify-center py-4">
                      <Spinner size="sm" label="查询可用座位..." />
                    </div>
                  ) : availableSeats.length === 0 ? (
                    <p className="text-sm text-default-400">该时段暂无可用座位，请调整时间后重试。</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {availableSeats.map((seat) => (
                        <button
                          key={seat.seatId}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                            selectedSeatId === seat.seatId
                              ? "border-primary bg-primary-50 font-medium text-primary"
                              : "border-default-200 bg-white hover:border-primary/40"
                          }`}
                          type="button"
                          onClick={() => setSelectedSeatId(seat.seatId)}
                        >
                          <p className="font-medium">{seat.seatCode}</p>
                          <p className="text-xs text-default-400">
                            {seat.floorName}{seat.zoneName ? ` · ${seat.zoneName}` : ""}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {seat.hasPower ? <Chip size="sm" variant="flat" className="text-xs">电源</Chip> : null}
                            {seat.nearWindow ? <Chip size="sm" variant="flat" className="text-xs">靠窗</Chip> : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-default-200 py-6 text-center text-sm text-default-400">
                  请先选择日期和时间段以查询可用座位
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="flat"
                  onPress={() => {
                    setShowCreateForm(false);
                    setSelectedSeatId(null);
                  }}
                >
                  取消
                </Button>
                <Button
                  color="primary"
                  isDisabled={!selectedSeatId}
                  isLoading={creating}
                  onPress={() => void handleCreate()}
                >
                  提交预约
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="加载座位预约..." />
          </div>
        ) : error ? (
          <RequestErrorCard
            message={getApiErrorMessage(error, "座位预约加载失败，请稍后重试。")}
            title="座位预约加载失败"
            onRetry={() => void refreshReservations()}
          />
        ) : (
          <div className="space-y-8">
            <Card className="border border-default-100 shadow-sm">
              <CardHeader className="px-5 pb-0 pt-5">
                <div>
                  <h2 className="text-lg font-semibold">当前预约</h2>
                  <p className="text-sm text-default-400">包含即将开始和进行中的座位使用记录</p>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 px-5 pb-5 pt-4">
                {activeReservations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-default-200 py-12 text-center text-default-400">
                    暂无当前座位预约
                  </div>
                ) : (
                  activeReservations.map(renderReservationCard)
                )}
              </CardBody>
            </Card>

            <Card className="border border-default-100 shadow-sm">
              <CardHeader className="px-5 pb-0 pt-5">
                <div>
                  <h2 className="text-lg font-semibold">历史记录</h2>
                  <p className="text-sm text-default-400">已完成或已取消的座位预约会保留在这里</p>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 px-5 pb-5 pt-4">
                {historyReservations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-default-200 py-12 text-center text-default-400">
                    暂无历史座位预约
                  </div>
                ) : (
                  historyReservations.map(renderReservationCard)
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
