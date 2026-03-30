// Admin Reservations Management Page
import React, { useState } from "react";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    User,
    Chip,
    Tabs,
    Tab,
    Button,
    Spinner,
    Pagination,
    Input,
    Card,
    CardBody,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { toast } from "sonner";
import { mutate as globalMutate } from "swr";

import AdminLayout from "@/components/layouts/AdminLayout";
import { getApiErrorMessage } from "@/lib/apiError";
import {
    reservationService,
    AdminReservation,
    ReservationStatus,
    ReservationPageResult,
} from "@/services/api/reservationService";

const statusConfig: Record<
    ReservationStatus,
    { label: string; color: "warning" | "success" | "default" | "danger" | "primary" }
> = {
    PENDING: { label: "排队中", color: "warning" },
    AWAITING_PICKUP: { label: "可取书", color: "success" },
    FULFILLED: { label: "已取书", color: "default" },
    CANCELLED: { label: "已取消", color: "danger" },
    EXPIRED: { label: "已过期", color: "danger" },
};

export default function AdminReservationsPage() {
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState("");
    const [fulfilling, setFulfilling] = useState<number | null>(null);
    const [cancelling, setCancelling] = useState<number | null>(null);

    const { data, error, isLoading, mutate } = useSWR<ReservationPageResult<AdminReservation>>(
        ["admin-reservations", filter, keyword, page],
        () => reservationService.getAllReservations(filter, keyword, page - 1, 10)
    );
    const { data: stats = [] } = useSWR(
        ["admin-reservations-stats", keyword],
        () => reservationService.getReservationStats(keyword),
    );
    const items = data?.items || [];
    const statsMap = Object.fromEntries(stats.map((item) => [item.key, item.value ?? 0]));

    const handleFulfill = async (id: number) => {
        if (!confirm("确认该读者已来馆取书？")) return;
        setFulfilling(id);
        try {
            await reservationService.fulfillReservation(id);
            await Promise.all([
                mutate(),
                globalMutate(["admin-reservations-stats", keyword]),
                globalMutate("my-reservations"),
                globalMutate(
                    (key) => Array.isArray(key) && key[0] === "my-reservations-page",
                    undefined,
                    { revalidate: true },
                ),
                globalMutate("book-detail-my-reservations"),
                globalMutate("book-detail-my-loans"),
                globalMutate("my-active-loans-shelf"),
                globalMutate("my-history-loans-shelf"),
                globalMutate("my-loans-profile"),
                globalMutate("notification-unread-count"),
                globalMutate(
                    (key) => Array.isArray(key) && key[0] === "my-notifications-page",
                    undefined,
                    { revalidate: true },
                ),
            ]);
            toast.success("已完成履约，借阅记录已生成");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "操作失败，请稍后重试"));
        } finally {
            setFulfilling(null);
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm("确认取消该预约？")) return;
        setCancelling(id);
        try {
            await reservationService.cancelReservation(id);
            await Promise.all([
                mutate(),
                globalMutate(["admin-reservations-stats", keyword]),
                globalMutate("my-reservations"),
                globalMutate(
                    (key) => Array.isArray(key) && key[0] === "my-reservations-page",
                    undefined,
                    { revalidate: true },
                ),
                globalMutate("book-detail-my-reservations"),
                globalMutate("notification-unread-count"),
                globalMutate(
                    (key) => Array.isArray(key) && key[0] === "my-notifications-page",
                    undefined,
                    { revalidate: true },
                ),
            ]);
            toast.success("预约已取消");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "操作失败，请稍后重试"));
        } finally {
            setCancelling(null);
        }
    };

    const tabs = [
        { key: "all", label: "全部", icon: "solar:bill-list-bold" },
        { key: "PENDING", label: "排队中", icon: "solar:hourglass-bold" },
        { key: "AWAITING_PICKUP", label: "待取书", icon: "solar:check-circle-bold" },
        { key: "FULFILLED", label: "已完成", icon: "solar:bookmark-bold" },
    ];

    return (
        <AdminLayout>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold">预约管理</h1>
                    <p className="text-default-500">管理所有读者的图书预约与排队进度</p>
                </div>

                <Tabs
                    aria-label="Filter Reservations"
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
                        setFilter(key as string);
                        setPage(1);
                    }}
                >
                    {tabs.map((t) => (
                        <Tab
                            key={t.key}
                            title={
                                <div className="flex items-center space-x-2">
                                    <Icon icon={t.icon} />
                                    <span>{t.label}</span>
                                </div>
                            }
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
                            <p className="text-xs text-default-400">排队中</p>
                            <p className="mt-1 text-2xl font-bold text-warning-600">{statsMap.PENDING ?? 0}</p>
                        </CardBody>
                    </Card>
                    <Card className="border border-success-100 shadow-sm">
                        <CardBody className="py-4">
                            <p className="text-xs text-default-400">待取书</p>
                            <p className="mt-1 text-2xl font-bold text-success-600">{statsMap.AWAITING_PICKUP ?? 0}</p>
                        </CardBody>
                    </Card>
                    <Card className="border border-default-200 shadow-sm">
                        <CardBody className="py-4">
                            <p className="text-xs text-default-400">已完成</p>
                            <p className="mt-1 text-2xl font-bold">{statsMap.FULFILLED ?? 0}</p>
                        </CardBody>
                    </Card>
                </div>

                <Input
                    isClearable
                    placeholder="搜索书名 / 用户名 / ISBN"
                    value={keyword}
                    onClear={() => {
                        setKeyword("");
                        setPage(1);
                    }}
                    onValueChange={(value) => {
                        setKeyword(value);
                        setPage(1);
                    }}
                    startContent={<Icon icon="solar:magnifer-linear" width={16} className="text-default-400" />}
                />

                <Table aria-label="Reservations table" className="bg-content1 rounded-xl shadow-sm">
                    <TableHeader>
                        <TableColumn>预约书目</TableColumn>
                        <TableColumn>读者</TableColumn>
                        <TableColumn>预约日期</TableColumn>
                        <TableColumn>排队位置</TableColumn>
                        <TableColumn>有效期至</TableColumn>
                        <TableColumn>状态</TableColumn>
                        <TableColumn align="end">操作</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={error ? "加载失败，请稍后重试" : "没有找到相关记录"}
                        isLoading={isLoading}
                        items={items}
                        loadingContent={<Spinner />}
                    >
                        {(item) => {
                            const cfg = statusConfig[item.status];

                            return (
                                <TableRow key={item.reservationId}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-sm">{item.bookTitle}</p>
                                            {item.bookIsbn && (
                                                <p className="text-xs text-default-400">{item.bookIsbn}</p>
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
                                    <TableCell>{item.reservationDate}</TableCell>
                                    <TableCell>
                                        {item.queuePosition != null ? (
                                            <Chip size="sm" color="warning" variant="flat">
                                                第 {item.queuePosition} 位
                                            </Chip>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>{item.expiryDate || "-"}</TableCell>
                                    <TableCell>
                                        <Chip color={cfg.color} size="sm" variant="dot" className="capitalize border-none">
                                            {cfg.label}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            {item.status === "AWAITING_PICKUP" && (
                                                <Button
                                                    color="success"
                                                    size="sm"
                                                    variant="flat"
                                                    isLoading={fulfilling === item.reservationId}
                                                    onPress={() => handleFulfill(item.reservationId)}
                                                >
                                                    确认取书
                                                </Button>
                                            )}
                                            {(item.status === "PENDING" || item.status === "AWAITING_PICKUP") && (
                                                <Button
                                                    color="danger"
                                                    size="sm"
                                                    variant="flat"
                                                    isLoading={cancelling === item.reservationId}
                                                    onPress={() => handleCancel(item.reservationId)}
                                                >
                                                    取消预约
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        }}
                    </TableBody>
                </Table>

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
