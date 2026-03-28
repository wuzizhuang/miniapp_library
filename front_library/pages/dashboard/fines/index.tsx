// Admin Fines Management Page
import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
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
    Spinner,
    Card,
    CardBody,
    Button,
    Input,
    Pagination,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Textarea,
    Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import useSWR from "swr";

import AdminLayout from "@/components/layouts/AdminLayout";
import { useAuth } from "@/config/authContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { AdminFine, fineService, FineStatus } from "@/services/api/fineService";
import {
    ADMIN_FINES_PENDING_TOTAL_KEY,
    refreshFineData,
    useAdminFines,
} from "@/hooks/fines/useFineData";
import { hasAnyPermission } from "@/utils/rbac";

const PAGE_SIZE = 10;

const statusConfig: Record<FineStatus, { label: string; color: "danger" | "success" | "default" }> = {
    PENDING: { label: "待缴纳", color: "danger" },
    PAID: { label: "已缴清", color: "success" },
    WAIVED: { label: "已豁免", color: "default" },
};

const typeLabel: Record<string, string> = {
    OVERDUE: "逾期罚款",
    LOST: "遗失赔偿",
    DAMAGE: "损坏赔偿",
};

export default function AdminFinesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [filter, setFilter] = useState("all");
    const [waivingId, setWaivingId] = useState<number | null>(null);
    const [payingId, setPayingId] = useState<number | null>(null);

    // ── 二次确认弹窗状态 ──────────────────────────────────────
    const [confirmTarget, setConfirmTarget] = useState<{ fine: AdminFine; action: "pay" | "waive" } | null>(null);
    const [waiveReason, setWaiveReason] = useState("");
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");

    // 从 URL query 中读取 keyword（从用户详情页跳转时携带）
    React.useEffect(() => {
      if (!router.isReady) return;
      const qKeyword = Array.isArray(router.query.keyword)
        ? router.query.keyword[0]
        : router.query.keyword;

      if (qKeyword) {
        setSearchInput(qKeyword);
        setKeyword(qKeyword);
      }
    }, [router.isReady]);  

    const { data, error, isLoading, mutate } = useAdminFines(filter, page, PAGE_SIZE, keyword);
    const { data: pendingTotal = 0, mutate: mutatePendingTotal } = useSWR(
        ADMIN_FINES_PENDING_TOTAL_KEY,
        fineService.getAdminPendingTotal,
    );
    const canPayFine = hasAnyPermission(user, ["loan:manage"]);
    const canWaiveFine = hasAnyPermission(user, ["fine:waive"]);
    const hasFineActions = canPayFine || canWaiveFine;

    const updateFineInCurrentPage = async (fineId: number, nextStatus: FineStatus) => {
        await mutate((current) => {
            if (!current) {
                return current;
            }

            const targetItem = current.items.find((item) => item.fineId === fineId);

            if (!targetItem) {
                return current;
            }

            const nextItems = current.items
                .map((item) => (
                    item.fineId === fineId
                        ? {
                            ...item,
                            status: nextStatus,
                            paidTime: new Date().toISOString().slice(0, 10),
                        }
                        : item
                ))
                .filter((item) => (filter === "all" ? true : item.status === filter));

            return {
                ...current,
                items: nextItems,
            };
        }, { revalidate: false });

        await mutatePendingTotal((current) => {
            const targetItem = data?.items.find((item) => item.fineId === fineId);

            if (targetItem == null || targetItem.status !== "PENDING") {
                return current;
            }

            const base = typeof current === "number" ? current : pendingTotal;
            const next = base - targetItem.amount;

            return next > 0 ? next : 0;
        }, { revalidate: false });
    };

    const tabs = [
        { key: "all", label: "全部", icon: "solar:bill-list-bold" },
        { key: "PENDING", label: "待缴", icon: "solar:danger-circle-bold" },
        { key: "PAID", label: "已缴清", icon: "solar:check-circle-bold" },
        { key: "WAIVED", label: "已豁免", icon: "solar:shield-check-bold" },
    ];

    // ── 打开二次确认弹窗 ──────────────────────────────────────
    const openConfirm = (fine: AdminFine, action: "pay" | "waive") => {
        setWaiveReason("");
        setConfirmTarget({ fine, action });
    };

    const closeConfirm = () => {
        setConfirmTarget(null);
        setWaiveReason("");
    };

    const handleConfirmSubmit = async () => {
        if (!confirmTarget) return;

        const { fine, action } = confirmTarget;

        if (action === "waive" && !waiveReason.trim()) {
            toast.error("请填写豁免理由后再提交");

            return;
        }

        if (action === "pay") {
            setPayingId(fine.fineId);
            try {
                await fineService.payFine(fine.fineId);
                await updateFineInCurrentPage(fine.fineId, "PAID");
                await refreshFineData();
                await mutate();
                await mutatePendingTotal();
                toast.success("罚款已登记为已缴");
                closeConfirm();
            } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, "收款失败，请稍后重试"));
            } finally {
                setPayingId(null);
            }
        } else {
            setWaivingId(fine.fineId);
            try {
                await fineService.waiveFine(fine.fineId, waiveReason.trim());
                await updateFineInCurrentPage(fine.fineId, "WAIVED");
                await refreshFineData();
                await mutate();
                await mutatePendingTotal();
                toast.success("罚款已豁免");
                closeConfirm();
            } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, "豁免失败，请稍后重试"));
            } finally {
                setWaivingId(null);
            }
        }
    };

    const handleSearchSubmit = () => {
        setKeyword(searchInput.trim());
        setPage(1);
    };

    const emptyActionLabel = useMemo(() => {
        if (!hasFineActions) {
            return "无可用操作";
        }

        return "-";
    }, [hasFineActions]);

    return (
        <AdminLayout>
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold">罚款管理</h1>
                        <p className="text-default-500">管理全馆逾期及遗失罚款</p>
                    </div>
                    {/* 待缴总额 */}
                    <Card className="border-none bg-danger-50 dark:bg-danger-900/20 shadow-none">
                        <CardBody className="px-5 py-3 flex-row items-center gap-3">
                            <Icon icon="solar:wallet-money-bold-duotone" className="text-danger" width={24} />
                            <div>
                                <p className="text-xs text-danger-600 font-medium">待缴总额</p>
                                <p className="text-xl font-black text-danger">¥{pendingTotal.toFixed(2)}</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <Tabs
                    aria-label="Filter Fines"
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

                <div className="flex flex-col gap-3 rounded-xl border border-default-200 bg-content1 p-3 md:flex-row md:items-center">
                    <Input
                        isClearable
                        className="w-full md:max-w-md"
                        placeholder="搜索罚款 ID、用户名、邮箱、读者姓名、书名或罚款原因"
                        startContent={<Icon icon="solar:magnifer-linear" className="text-default-400" />}
                        value={searchInput}
                        onClear={() => {
                            setSearchInput("");
                            setKeyword("");
                            setPage(1);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                handleSearchSubmit();
                            }
                        }}
                        onValueChange={setSearchInput}
                    />
                    <Button
                        color="primary"
                        startContent={<Icon icon="solar:magnifer-bold" width={16} />}
                        onPress={handleSearchSubmit}
                    >
                        搜索
                    </Button>
                    <div className="text-sm text-default-500 md:ml-auto">
                        当前结果：{data?.totalElements ?? 0} 条
                    </div>
                </div>

                {error ? (
                        <Card className="border border-danger-200 bg-danger-50">
                            <CardBody className="py-12 text-center text-danger-700">
                                <Icon icon="solar:danger-circle-bold-duotone" width={48} className="mx-auto mb-3" />
                                <p className="font-medium">罚款列表加载失败</p>
                                <p className="text-sm mt-1">
                                    {error instanceof Error ? error.message : "请稍后刷新重试"}
                                </p>
                                <Button
                                    className="mt-4"
                                    color="danger"
                                    variant="flat"
                                    onPress={() => {
                                        void mutate();
                                    }}
                                >
                                    重新加载
                                </Button>
                            </CardBody>
                        </Card>
                    ) : (
                    <Table
                        aria-label="Fines table"
                        className="bg-content1 rounded-xl shadow-sm"
                        bottomContent={
                            (data?.totalPages ?? 0) > 1 ? (
                                <div className="flex w-full justify-center px-4 py-2">
                                    <Pagination
                                        isCompact
                                        showControls
                                        color="primary"
                                        page={page}
                                        total={data?.totalPages ?? 1}
                                        onChange={setPage}
                                    />
                                </div>
                            ) : null
                        }
                    >
                        <TableHeader>
                            <TableColumn>读者</TableColumn>
                            <TableColumn>来源书目</TableColumn>
                            <TableColumn>类型</TableColumn>
                            <TableColumn>原因</TableColumn>
                            <TableColumn>金额</TableColumn>
                            <TableColumn>产生日期</TableColumn>
                            <TableColumn>缴纳日期</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn align="end">操作</TableColumn>
                        </TableHeader>
                        <TableBody
                            emptyContent={keyword ? "没有找到符合搜索条件的罚款记录" : "没有找到相关记录"}
                            isLoading={isLoading}
                            items={data?.items || []}
                            loadingContent={<Spinner />}
                        >
                            {(item) => {
                                const stCfg = statusConfig[item.status];

                                return (
                                    <TableRow key={item.fineId}>
                                        <TableCell>
                                            <User
                                                name={item.userFullName || item.username}
                                                description={item.username}
                                                avatarProps={{ size: "sm", radius: "full" }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{item.bookTitle || "-"}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{typeLabel[item.type] || item.type}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-default-500">{item.reason || "-"}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`font-semibold ${item.status === "PENDING" ? "text-danger" : "text-default-600"}`}>
                                                ¥{item.amount.toFixed(2)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-default-500">{item.createTime}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-default-500">{item.paidTime || "-"}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Chip color={stCfg.color} size="sm" variant="dot" className="capitalize border-none">
                                                {stCfg.label}
                                            </Chip>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                {item.status === "PENDING" ? (
                                                    <div className="flex gap-2">
                                                        {canPayFine ? (
                                                            <Button
                                                                color="success"
                                                                size="sm"
                                                                variant="flat"
                                                                startContent={payingId === item.fineId ? undefined : <Icon icon="solar:wallet-money-bold" width={14} />}
                                                                isDisabled={waivingId === item.fineId}
                                                                isLoading={payingId === item.fineId}
                                                                onPress={() => openConfirm(item, "pay")}
                                                            >
                                                                柜台收款
                                                            </Button>
                                                        ) : null}
                                                        {canWaiveFine ? (
                                                            <Button
                                                                color="warning"
                                                                size="sm"
                                                                variant="flat"
                                                                startContent={waivingId === item.fineId ? undefined : <Icon icon="solar:shield-cross-bold" width={14} />}
                                                                isDisabled={payingId === item.fineId}
                                                                isLoading={waivingId === item.fineId}
                                                                onPress={() => openConfirm(item, "waive")}
                                                            >
                                                                豁免
                                                            </Button>
                                                        ) : null}
                                                        {!canPayFine && !canWaiveFine ? (
                                                            <span className="text-xs text-default-400">{emptyActionLabel}</span>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-default-400">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            }}
                        </TableBody>
                    </Table>
                )}

                {/* ── 二次确认弹窗 ──────────────────────────── */}
                <Modal
                    isOpen={!!confirmTarget}
                    onOpenChange={(open) => { if (!open) closeConfirm(); }}
                    size="lg"
                    backdrop="blur"
                >
                    <ModalContent>
                        {() => (
                            <>
                                <ModalHeader className="flex items-center gap-2">
                                    <Icon
                                        icon={confirmTarget?.action === "pay" ? "solar:wallet-money-bold-duotone" : "solar:shield-cross-bold-duotone"}
                                        width={22}
                                        className={confirmTarget?.action === "pay" ? "text-success" : "text-warning"}
                                    />
                                    {confirmTarget?.action === "pay" ? "柜台收款确认" : "罚款豁免确认"}
                                </ModalHeader>
                                <ModalBody className="pb-2">
                                    {confirmTarget && (
                                        <>
                                            <Card className="border border-default-100 shadow-none">
                                                <CardBody className="grid gap-3 p-4 text-sm md:grid-cols-2">
                                                    <div>
                                                        <p className="text-xs text-default-400">读者</p>
                                                        <p className="mt-1 font-semibold">{confirmTarget.fine.userFullName || confirmTarget.fine.username}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-default-400">来源书目</p>
                                                        <p className="mt-1 font-semibold">{confirmTarget.fine.bookTitle || "-"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-default-400">罚款类型</p>
                                                        <p className="mt-1 font-semibold">{typeLabel[confirmTarget.fine.type] || confirmTarget.fine.type}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-default-400">罚款金额</p>
                                                        <p className="mt-1 text-lg font-black text-danger">¥{confirmTarget.fine.amount.toFixed(2)}</p>
                                                    </div>
                                                    {confirmTarget.fine.reason ? (
                                                        <div className="md:col-span-2">
                                                            <p className="text-xs text-default-400">原因</p>
                                                            <p className="mt-1 text-default-600">{confirmTarget.fine.reason}</p>
                                                        </div>
                                                    ) : null}
                                                </CardBody>
                                            </Card>

                                            <Divider />

                                            {confirmTarget.action === "pay" ? (
                                                <div className="rounded-xl border border-success-200 bg-success-50 p-4">
                                                    <p className="text-sm font-medium text-success-800">
                                                        请确认已在柜台实际收取该笔罚款后，再点击下方确认按钮。
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="rounded-xl border border-warning-200 bg-warning-50 p-4">
                                                        <p className="text-sm font-medium text-warning-800">
                                                            豁免将直接减免该笔罚款，请填写理由，以留存审计记录。
                                                        </p>
                                                    </div>
                                                    <Textarea
                                                        isRequired
                                                        label="豁免理由"
                                                        labelPlacement="outside"
                                                        placeholder="请输入豁免理由（必填），例如：首次逾期减免、图书馆系统故障补偿等"
                                                        minRows={3}
                                                        value={waiveReason}
                                                        onValueChange={setWaiveReason}
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}
                                </ModalBody>
                                <ModalFooter>
                                    <Button variant="flat" onPress={closeConfirm}>
                                        取消
                                    </Button>
                                    <Button
                                        color={confirmTarget?.action === "pay" ? "success" : "warning"}
                                        isLoading={
                                            confirmTarget?.action === "pay"
                                                ? payingId === confirmTarget?.fine.fineId
                                                : waivingId === confirmTarget?.fine.fineId
                                        }
                                        isDisabled={confirmTarget?.action === "waive" && !waiveReason.trim()}
                                        onPress={() => void handleConfirmSubmit()}
                                    >
                                        {confirmTarget?.action === "pay" ? "确认收款" : "确认豁免"}
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            </div>
        </AdminLayout>
    );
}
