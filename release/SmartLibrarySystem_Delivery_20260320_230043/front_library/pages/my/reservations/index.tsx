import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
    Card,
    CardBody,
    Chip,
    Button,
    Spinner,
    Divider,
    Pagination,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";

import DefaultLayout from "@/components/layouts/default";
import { getApiErrorMessage } from "@/lib/apiError";
import {
    reservationService,
    ReservationStatus,
} from "@/services/api/reservationService";

const statusConfig: Record<
    ReservationStatus,
    { label: string; color: "warning" | "success" | "default" | "danger" | "primary"; icon: string }
> = {
    PENDING: { label: "排队中", color: "warning", icon: "solar:clock-circle-bold" },
    AWAITING_PICKUP: { label: "可取书", color: "success", icon: "solar:check-circle-bold" },
    FULFILLED: { label: "已取书", color: "default", icon: "solar:bookmark-bold" },
    CANCELLED: { label: "已取消", color: "danger", icon: "solar:close-circle-bold" },
    EXPIRED: { label: "已过期", color: "danger", icon: "solar:danger-circle-bold" },
};

export default function ReservationsPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [cancelling, setCancelling] = useState<number | null>(null);

    const { data: reservationsPage, error, isLoading, mutate } = useSWR(
        ["my-reservations-page", page],
        () => reservationService.getMyReservationsPage(page - 1, 10),
    );
    const reservations = reservationsPage?.items ?? [];
    const totalPages = reservationsPage?.totalPages ?? 1;

    const handleCancel = async (id: number) => {
        if (!confirm("确认取消该预约？")) return;
        setCancelling(id);
        try {
            await reservationService.cancelReservation(id);
            await Promise.all([
                mutate(),
                globalMutate("my-reservations"),
                globalMutate("book-detail-my-reservations"),
                globalMutate("my-overview"),
                globalMutate("homepage-my-overview"),
                globalMutate("notification-unread-count"),
                globalMutate(
                    (key) => Array.isArray(key) && key[0] === "my-notifications-page",
                    undefined,
                    { revalidate: true },
                ),
            ]);
            toast.success("预约已取消");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "取消失败，请稍后重试"));
        } finally {
            setCancelling(null);
        }
    };

    const highlightId = useMemo(() => {
        const raw = router.query.highlight;
        const value = Array.isArray(raw) ? raw[0] : raw;

        return value ? Number(value) : null;
    }, [router.query.highlight]);
    const pending = reservations?.filter((r) => r.status === "PENDING" || r.status === "AWAITING_PICKUP") ?? [];
    const history = reservations?.filter((r) => r.status === "FULFILLED" || r.status === "CANCELLED" || r.status === "EXPIRED") ?? [];

    useEffect(() => {
        if (!highlightId || !reservations?.length) {
            return;
        }

        const timer = window.setTimeout(() => {
            document.getElementById(`reservation-${highlightId}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 100);

        return () => window.clearTimeout(timer);
    }, [highlightId, reservations]);

    return (
        <DefaultLayout>
            <section className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-1">我的预约</h1>
                    <p className="text-default-500">管理您的图书预约排队状态</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Spinner size="lg" label="加载预约记录..." />
                    </div>
                ) : error ? (
                    <Card className="border border-danger-200 bg-danger-50">
                        <CardBody className="py-12 text-center text-danger-700">
                            <Icon icon="solar:danger-circle-bold-duotone" width={40} className="mx-auto mb-3" />
                            <p className="font-medium">预约记录加载失败</p>
                            <p className="text-sm mt-1">请稍后刷新重试</p>
                        </CardBody>
                    </Card>
                ) : (
                    <>
                        {/* 进行中的预约 */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Icon icon="solar:hourglass-bold-duotone" className="text-primary" width={22} />
                                进行中的预约
                                <Chip size="sm" color="primary" variant="flat">{pending.length}</Chip>
                            </h2>

                            {pending.length === 0 ? (
                                <Card className="border-2 border-dashed border-default-200">
                                    <CardBody className="py-12 text-center text-default-400">
                                        <Icon icon="solar:bookmark-square-minimalistic-bold-duotone" width={48} className="mx-auto mb-3 opacity-40" />
                                        <p>暂无进行中的预约</p>
                                        <p className="text-sm mt-1">当书库中没有可用副本时，可以发起预约</p>
                                    </CardBody>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {pending.map((r) => {
                                        const cfg = statusConfig[r.status];

                                        return (
                                            <Card
                                                key={r.reservationId}
                                                id={`reservation-${r.reservationId}`}
                                                className={`shadow-sm border-none ${highlightId === r.reservationId ? "bg-primary-50 ring-2 ring-primary-300" : "bg-content1"}`}
                                            >
                                                <CardBody className="p-5">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex gap-4 flex-1">
                                                            <div className="w-12 h-16 rounded-md bg-default-100 flex items-center justify-center flex-shrink-0">
                                                                <Icon icon="solar:book-bold-duotone" width={28} className="text-default-400" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="font-semibold text-lg leading-tight mb-1">{r.bookTitle}</h3>
                                                                {r.bookIsbn && <p className="text-xs text-default-400 mb-2">ISBN: {r.bookIsbn}</p>}
                                                                <div className="flex flex-wrap gap-3 text-sm text-default-500">
                                                                    <span className="flex items-center gap-1">
                                                                        <Icon icon="solar:calendar-bold" width={14} />
                                                                        预约日期: {r.reservationDate}
                                                                    </span>
                                                                    {r.queuePosition && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Icon icon="solar:sort-by-time-bold" width={14} />
                                                                            排队位置: 第 {r.queuePosition} 位
                                                                        </span>
                                                                    )}
                                                                    {r.expiryDate && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Icon icon="solar:clock-circle-bold" width={14} />
                                                                            有效期至: {r.expiryDate}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-3 flex-shrink-0">
                                                            <Chip
                                                                color={cfg.color}
                                                                startContent={<Icon icon={cfg.icon} width={14} />}
                                                                variant="flat"
                                                                size="sm"
                                                            >
                                                                {cfg.label}
                                                            </Chip>
                                                            {r.status === "PENDING" && (
                                                                <Button
                                                                    size="sm"
                                                                    color="danger"
                                                                    variant="flat"
                                                                    isLoading={cancelling === r.reservationId}
                                                                    onPress={() => handleCancel(r.reservationId)}
                                                                >
                                                                    取消预约
                                                                </Button>
                                                            )}
                                                            {r.status === "AWAITING_PICKUP" && (
                                                                <Chip color="success" size="sm" variant="solid">
                                                                    请尽快取书
                                                                </Chip>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <Divider className="my-8" />

                        {/* 历史预约 */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Icon icon="solar:history-bold-duotone" className="text-default-400" width={22} />
                                历史预约
                                <Chip size="sm" variant="flat">{history.length}</Chip>
                            </h2>
                            {history.length === 0 ? (
                                <p className="text-default-400 text-center py-6">暂无历史预约</p>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((r) => {
                                        const cfg = statusConfig[r.status];

                                        return (
                                            <Card
                                                key={r.reservationId}
                                                id={`reservation-${r.reservationId}`}
                                                className={`shadow-none border ${highlightId === r.reservationId ? "bg-primary-50 border-primary-200 ring-2 ring-primary-200" : "bg-default-50 border-default-100"}`}
                                            >
                                                <CardBody className="p-4">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <p className="font-medium">{r.bookTitle}</p>
                                                            <p className="text-xs text-default-400 mt-0.5">预约日期: {r.reservationDate}</p>
                                                        </div>
                                                        <Chip color={cfg.color} size="sm" variant="flat">
                                                            {cfg.label}
                                                        </Chip>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {totalPages > 1 ? (
                            <div className="mt-8 flex justify-center">
                                <Pagination
                                    color="primary"
                                    page={page}
                                    showControls
                                    total={totalPages}
                                    onChange={setPage}
                                />
                            </div>
                        ) : null}
                    </>
                )}
            </section>
        </DefaultLayout>
    );
}
