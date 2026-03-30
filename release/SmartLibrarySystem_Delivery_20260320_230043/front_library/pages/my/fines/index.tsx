import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
    Card,
    CardBody,
    Chip,
    Button,
    Spinner,
    Pagination,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import DefaultLayout from "@/components/layouts/default";
import { fineService, FineStatus } from "@/services/api/fineService";
import { refreshFineData, useMyFinesPage } from "@/hooks/fines/useFineData";
import { getApiErrorMessage } from "@/lib/apiError";

const statusConfig: Record<
    FineStatus,
    { label: string; color: "danger" | "success" | "default" }
> = {
    PENDING: { label: "待缴纳", color: "danger" },
    PAID: { label: "已缴清", color: "success" },
    WAIVED: { label: "已豁免", color: "default" },
};

const typeConfig: Record<string, { label: string; icon: string }> = {
    OVERDUE: { label: "逾期罚款", icon: "solar:clock-circle-bold" },
    LOST: { label: "遗失赔偿", icon: "solar:book-cross-bold" },
    DAMAGE: { label: "损坏赔偿", icon: "solar:danger-triangle-bold" },
};

export default function FinesPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [paying, setPaying] = useState<number | null>(null);

    const { data: finesPage, error, isLoading } = useMyFinesPage(page, 10);
    const highlightId = useMemo(() => {
        const raw = router.query.highlight;
        const value = Array.isArray(raw) ? raw[0] : raw;

        return value ? Number(value) : null;
    }, [router.query.highlight]);

    const fines = finesPage?.items ?? [];
    const totalPages = finesPage?.totalPages ?? 1;
    const pending = fines?.filter((f) => f.status === "PENDING") ?? [];
    const history = fines?.filter((f) => f.status !== "PENDING") ?? [];
    const totalPending = pending.reduce((s, f) => s + f.amount, 0);

    useEffect(() => {
        if (!highlightId || !fines?.length) {
            return;
        }

        const timer = window.setTimeout(() => {
            document.getElementById(`fine-${highlightId}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 100);

        return () => window.clearTimeout(timer);
    }, [highlightId, fines]);

    const handlePay = async (fineId: number) => {
        if (!confirm("确认缴纳该笔罚款？")) return;
        setPaying(fineId);
        try {
            await fineService.payFine(fineId);
            await refreshFineData();
            toast.success("罚款已缴纳");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "缴纳失败，请稍后重试"));
        } finally {
            setPaying(null);
        }
    };

    return (
        <DefaultLayout>
            <section className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-1">罚款记录</h1>
                    <p className="text-default-500">查看并处理您的借阅罚款</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Spinner size="lg" label="加载罚款记录..." />
                    </div>
                ) : error ? (
                    <Card className="border border-danger-200 bg-danger-50">
                        <CardBody className="py-12 text-center text-danger-700">
                            <Icon icon="solar:danger-circle-bold-duotone" width={48} className="mx-auto mb-3" />
                            <p className="font-medium">罚款记录加载失败</p>
                            <p className="text-sm mt-1">
                                {error instanceof Error ? error.message : "请稍后刷新重试"}
                            </p>
                        </CardBody>
                    </Card>
                ) : (
                    <>
                        {/* 待缴总额 Banner */}
                        {pending.length > 0 && (
                            <Card className="mb-8 bg-gradient-to-r from-danger-500 to-rose-600 text-white shadow-lg border-none">
                                <CardBody className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/80 text-sm mb-1">当前页待缴罚款总额</p>
                                            <p className="text-4xl font-black">¥{totalPending.toFixed(2)}</p>
                                            <p className="text-white/70 text-xs mt-2">{pending.length} 笔待处理</p>
                                        </div>
                                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                            <Icon icon="solar:wallet-money-bold-duotone" width={36} className="text-white" />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        )}

                        {/* 待缴罚款 */}
                        {pending.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Icon icon="solar:danger-triangle-bold-duotone" className="text-danger" width={20} />
                                    待缴罚款
                                </h2>
                                <div className="space-y-4">
                                    {pending.map((f) => {
                                        const typeCfg = typeConfig[f.type] ?? typeConfig.OVERDUE;

                                        return (
                                            <Card
                                                key={f.fineId}
                                                id={`fine-${f.fineId}`}
                                                className={`border-l-4 shadow-sm ${highlightId === f.fineId ? "border-primary bg-primary-50 ring-2 ring-primary-200" : "border-danger bg-content1"}`}
                                            >
                                                <CardBody className="p-5">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex gap-3 flex-1">
                                                            <div className="w-10 h-10 bg-danger-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                                <Icon icon={typeCfg.icon} className="text-danger" width={20} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-semibold">{typeCfg.label}</span>
                                                                    <Chip size="sm" color="danger" variant="flat">¥{f.amount.toFixed(2)}</Chip>
                                                                </div>
                                                                {f.bookTitle && (
                                                                    <p className="text-sm text-default-600 mb-1">书目：{f.bookTitle}</p>
                                                                )}
                                                                {f.reason && (
                                                                    <p className="text-xs text-default-400">{f.reason}</p>
                                                                )}
                                                                <p className="text-xs text-default-400 mt-1">产生日期：{f.createTime}</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            isLoading={paying === f.fineId}
                                                            onPress={() => handlePay(f.fineId)}
                                                            startContent={<Icon icon="solar:credit-card-bold" width={16} />}
                                                        >
                                                            立即缴纳
                                                        </Button>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 历史记录 */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Icon icon="solar:history-bold-duotone" className="text-default-400" width={20} />
                                历史记录
                            </h2>
                            {history.length === 0 && pending.length === 0 ? (
                                <Card className="border-2 border-dashed border-default-200">
                                    <CardBody className="py-12 text-center text-default-400">
                                        <Icon icon="solar:smile-circle-bold-duotone" width={48} className="mx-auto mb-3 opacity-40" />
                                        <p className="font-medium">暂无罚款记录</p>
                                        <p className="text-sm mt-1">您的借阅记录良好，继续保持！</p>
                                    </CardBody>
                                </Card>
                            ) : history.length === 0 ? null : (
                                <div className="space-y-3">
                                    {history.map((f) => {
                                        const typeCfg = typeConfig[f.type] ?? typeConfig.OVERDUE;
                                        const stCfg = statusConfig[f.status];

                                        return (
                                            <Card
                                                key={f.fineId}
                                                id={`fine-${f.fineId}`}
                                                className={`shadow-none border ${highlightId === f.fineId ? "bg-primary-50 border-primary-200 ring-2 ring-primary-200" : "bg-default-50 border-default-100"}`}
                                            >
                                                <CardBody className="p-4">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-medium text-sm">{typeCfg.label} - ¥{f.amount.toFixed(2)}</p>
                                                            </div>
                                                            {f.bookTitle && <p className="text-xs text-default-400">{f.bookTitle}</p>}
                                                            <p className="text-xs text-default-400 mt-0.5">{f.createTime}</p>
                                                        </div>
                                                        <Chip color={stCfg.color} size="sm" variant="flat">{stCfg.label}</Chip>
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
