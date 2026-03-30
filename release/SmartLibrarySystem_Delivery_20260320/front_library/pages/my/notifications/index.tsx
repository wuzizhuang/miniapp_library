import React, { useState } from "react";
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
import useSWR from "swr";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";

import DefaultLayout from "@/components/layouts/default";
import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import { getApiErrorMessage } from "@/lib/apiError";
import {
    getNotificationActionLabel,
    notificationService,
    Notification,
    resolveNotificationTarget,
} from "@/services/api/notificationService";
import { ApiNotificationType } from "@/types/api";

const typeConfig: Record<ApiNotificationType, { icon: string; color: string; bg: string }> = {
    DUE_REMINDER: {
        icon: "solar:clock-circle-bold-duotone",
        color: "text-warning-600",
        bg: "bg-warning-50 dark:bg-warning-900/20",
    },
    ARRIVAL_NOTICE: {
        icon: "solar:check-circle-bold-duotone",
        color: "text-success-600",
        bg: "bg-success-50 dark:bg-success-900/20",
    },
    NEW_BOOK_RECOMMEND: {
        icon: "solar:book-bold-duotone",
        color: "text-secondary-600",
        bg: "bg-secondary-50 dark:bg-secondary-900/20",
    },
    SYSTEM: {
        icon: "solar:info-circle-bold-duotone",
        color: "text-primary-600",
        bg: "bg-primary-50 dark:bg-primary-900/20",
    },
};

function formatTime(isoString: string) {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffH < 1) return "刚刚";
    if (diffH < 24) return `${diffH} 小时前`;
    if (diffD < 7) return `${diffD} 天前`;

    return d.toLocaleDateString("zh-CN");
}

export default function NotificationsPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [markingAll, setMarkingAll] = useState(false);
    const [markingId, setMarkingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [clearingRead, setClearingRead] = useState(false);

    const {
        data: notificationsPage,
        error,
        isLoading,
        mutate,
    } = useSWR(
        ["my-notifications-page", page],
        () => notificationService.getNotificationsPage(page - 1, 20),
    );

    const notifications = notificationsPage?.content ?? [];
    const totalPages = notificationsPage?.totalPages ?? 1;

    const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
    const readCount = notifications?.filter((n) => n.isRead).length ?? 0;

    const refreshNotifications = async () => {
        await Promise.all([
            mutate(),
            globalMutate("notification-unread-count"),
            globalMutate("my-overview"),
            globalMutate("homepage-my-overview"),
        ]);
    };

    const handleMarkRead = async (id: number) => {
        setMarkingId(id);
        try {
            await notificationService.markRead(id);
            await refreshNotifications();
            toast.success("已标记为已读");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "标记已读失败"));
        } finally {
            setMarkingId(null);
        }
    };

    const handleMarkAllRead = async () => {
        if (!confirm("确认将所有消息标为已读？")) return;
        setMarkingAll(true);
        try {
            await notificationService.markAllRead();
            await refreshNotifications();
            toast.success("已全部标记为已读");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "全部已读失败"));
        } finally {
            setMarkingAll(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await notificationService.deleteNotification(id);
            await refreshNotifications();
            toast.success("通知已删除");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "删除通知失败"));
        } finally {
            setDeletingId(null);
        }
    };

    const handleClearRead = async () => {
        if (readCount === 0) {
            toast.info("当前没有已读通知可清理");

            return;
        }

        if (!confirm("确认清空所有已读通知？此操作不可撤销。")) return;

        setClearingRead(true);
        try {
            await notificationService.deleteAllRead();
            await refreshNotifications();
            toast.success("已清空所有已读通知");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "清空已读失败"));
        } finally {
            setClearingRead(false);
        }
    };

    const handleOpenTarget = async (notification: Notification) => {
        const target = resolveNotificationTarget(notification);

        if (!target) {
            toast.error("当前通知暂未提供可跳转页面");

            return;
        }

        try {
            if (!notification.isRead) {
                await notificationService.markRead(notification.notificationId);
                await refreshNotifications();
            }
            await router.push(target);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "通知跳转失败，请稍后重试"));
        }
    };

    return (
        <DefaultLayout>
            <section className="container mx-auto px-4 py-8 max-w-3xl min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                            消息中心
                            {unreadCount > 0 && (
                                <Chip color="danger" size="sm" variant="solid">{unreadCount} 未读</Chip>
                            )}
                        </h1>
                        <p className="text-default-500">系统通知与馆务提醒</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {readCount > 0 && (
                            <Button
                                color="danger"
                                variant="flat"
                                size="sm"
                                isLoading={clearingRead}
                                onPress={handleClearRead}
                                startContent={<Icon icon="solar:trash-bin-trash-linear" width={16} />}
                            >
                                清空已读
                            </Button>
                        )}
                        {unreadCount > 0 && (
                            <Button
                                variant="flat"
                                size="sm"
                                isLoading={markingAll}
                                onPress={handleMarkAllRead}
                                startContent={<Icon icon="solar:check-read-bold" width={16} />}
                            >
                                全部已读
                            </Button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Spinner size="lg" label="加载消息..." />
                    </div>
                ) : error ? (
                    <RequestErrorCard
                        title="消息加载失败"
                        message={getApiErrorMessage(error, "请稍后刷新重试")}
                        onRetry={() => {
                            void refreshNotifications();
                        }}
                    />
                ) : !notifications || notifications.length === 0 ? (
                    <Card className="border-2 border-dashed border-default-200">
                        <CardBody className="py-16 text-center text-default-400">
                            <Icon icon="solar:bell-off-bold-duotone" width={52} className="mx-auto mb-3 opacity-40" />
                            <p className="font-medium">暂无任何通知</p>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            {notifications.map((n, idx) => {
                                const cfg = typeConfig[n.type] ?? typeConfig.SYSTEM;
                                const target = resolveNotificationTarget(n);
                                const actionLabel = getNotificationActionLabel(n);

                                return (
                                    <React.Fragment key={n.notificationId}>
                                        <Card
                                            className={`shadow-sm border-none transition-all ${target ? "cursor-pointer hover:shadow-md" : ""} ${n.isRead ? "bg-default-50" : "bg-content1 shadow-md"
                                                }`}
                                        >
                                            <CardBody className="p-5">
                                                <div className="flex gap-4">
                                                    <div
                                                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                                                    >
                                                        <Icon icon={cfg.icon} className={cfg.color} width={24} />
                                                    </div>

                                                    <div
                                                        className={`flex-1 min-w-0 ${target ? "cursor-pointer" : ""}`}
                                                        onClick={target ? () => {
                                                            void handleOpenTarget(n);
                                                        } : undefined}
                                                        onKeyDown={target ? (event) => {
                                                            if (event.key === "Enter" || event.key === " ") {
                                                                event.preventDefault();
                                                                void handleOpenTarget(n);
                                                            }
                                                        } : undefined}
                                                        role={target ? "button" : undefined}
                                                        tabIndex={target ? 0 : undefined}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h3
                                                                className={`font-semibold text-sm leading-tight ${n.isRead ? "text-default-500" : "text-default-900 dark:text-white"
                                                                    }`}
                                                            >
                                                                {n.title}
                                                                {!n.isRead && (
                                                                    <span className="inline-block w-2 h-2 bg-danger rounded-full ml-2 align-middle" />
                                                                )}
                                                            </h3>
                                                            <span className="text-xs text-default-400 flex-shrink-0">
                                                                {formatTime(n.createTime)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-default-500 mt-1 leading-relaxed">
                                                            {n.content}
                                                        </p>
                                                    </div>

                                                    {!n.isRead && (
                                                        <Button
                                                            aria-label="标记当前通知为已读"
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            isLoading={markingId === n.notificationId}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void handleMarkRead(n.notificationId);
                                                            }}
                                                            className="flex-shrink-0"
                                                        >
                                                            <Icon icon="solar:check-read-bold" width={18} className="text-default-400" />
                                                        </Button>
                                                    )}
                                                    <div className="flex flex-shrink-0 items-center gap-1">
                                                        {target && (
                                                            <Button
                                                                size="sm"
                                                                variant="light"
                                                                className="flex-shrink-0"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    void handleOpenTarget(n);
                                                                }}
                                                            >
                                                                {actionLabel}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            aria-label="删除当前通知"
                                                            isIconOnly
                                                            color="danger"
                                                            size="sm"
                                                            variant="light"
                                                            isLoading={deletingId === n.notificationId}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void handleDelete(n.notificationId);
                                                            }}
                                                        >
                                                            <Icon icon="solar:trash-bin-trash-linear" width={18} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>
                                        {idx < notifications.length - 1 && <Divider className="opacity-50" />}
                                    </React.Fragment>
                                );
                            })}
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
