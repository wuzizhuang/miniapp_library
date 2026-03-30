import React, { useState, useCallback, useEffect } from "react";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Button,
    Pagination,
    Spinner,
    useDisclosure,
    Tooltip,
    Input,
    Card,
    CardBody,
    Select,
    SelectItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { toast } from "sonner";

import AdminLayout from "@/components/layouts/AdminLayout";
import { useAdminBookDetail } from "@/hooks/books/useAdminBookData";
import {
    bookCopyService,
    BookCopy,
    CopyStatus,
    BookCopyCreateRequest,
    BookCopyUpdateRequest,
} from "@/services/api/bookCopyService";
import { CopyFormModal } from "@/components/modules/admin/copies/CopyFormModal";
import { getApiErrorMessage } from "@/lib/apiError";

const statusColorMap: Record<CopyStatus, "success" | "primary" | "warning" | "danger" | "default"> = {
    AVAILABLE: "success",
    BORROWED: "primary",
    RESERVED: "warning",
    LOST: "danger",
    DAMAGED: "default",
};

const statusLabelMap: Record<CopyStatus, string> = {
    AVAILABLE: "可借",
    BORROWED: "已借出",
    RESERVED: "已预约",
    LOST: "遗失",
    DAMAGED: "损坏",
};

const statusIconMap: Record<CopyStatus, string> = {
    AVAILABLE: "solar:check-circle-bold",
    BORROWED: "solar:book-bold",
    RESERVED: "solar:clock-circle-bold",
    LOST: "solar:danger-triangle-bold",
    DAMAGED: "solar:close-circle-bold",
};

const columns = [
    { key: "id", label: "副本 ID" },
    { key: "bookTitle", label: "书名" },
    { key: "isbn", label: "ISBN" },
    { key: "status", label: "状态" },
    { key: "locationCode", label: "馆藏位置" },
    { key: "price", label: "价格" },
    { key: "acquisitionDate", label: "购入日期" },
    { key: "actions", label: "操作" },
];

const PAGE_SIZE_OPTIONS = [
    { key: "10", label: "10 条/页" },
    { key: "20", label: "20 条/页" },
    { key: "50", label: "50 条/页" },
];

function parseBookId(value: string | string[] | undefined): number | undefined {
    const raw = Array.isArray(value) ? value[0] : value;

    if (!raw) {
        return undefined;
    }

    const parsed = Number(raw);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function CopiesManagementPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState<CopyStatus | "">("");
    const [keyword, setKeyword] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const scopedBookId = router.isReady ? parseBookId(router.query.bookId) : undefined;
    const { data: scopedBook, isLoading: isScopedBookLoading } = useAdminBookDetail(scopedBookId);

    useEffect(() => {
        setPage(1);
    }, [scopedBookId]);

    // Debounced search
    const handleSearch = () => {
        setKeyword(searchInput.trim());
        setPage(1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    const handleStatusChange = (st: CopyStatus | "") => {
        setStatusFilter(st);
        setPage(1);
    };

    const { data, isLoading, mutate } = useSWR(
        ["admin-copies", page, pageSize, scopedBookId, statusFilter, keyword],
        () => bookCopyService.getAll(
            page - 1, pageSize, "id", "DESC",
            statusFilter || undefined,
            keyword || undefined,
            scopedBookId
        )
    );

    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [editingCopy, setEditingCopy] = useState<BookCopy | null>(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

    const handleCreate = () => { setEditingCopy(null); onOpen(); };
    const handleEdit = (copy: BookCopy) => { setEditingCopy(copy); onOpen(); };

    const handleDelete = async (copy: BookCopy) => {
        if (!confirm(`确定删除副本 #${copy.id}（${copy.bookTitle}）？此操作不可撤销。`)) return;
        setDeleteLoading(copy.id);
        try {
            await bookCopyService.delete(copy.id);
            toast.success("删除成功");
            mutate();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "删除失败，请稍后重试"));
        } finally {
            setDeleteLoading(null);
        }
    };

    const handleSubmit = async (payload: BookCopyCreateRequest | BookCopyUpdateRequest) => {
        setSubmitLoading(true);
        try {
            if (editingCopy) {
                await bookCopyService.update(editingCopy.id, payload as BookCopyUpdateRequest);
                toast.success("更新成功");
            } else {
                await bookCopyService.create(payload as BookCopyCreateRequest);
                toast.success("新增成功");
            }
            mutate();
            onClose();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "操作失败，请稍后重试"));
        } finally {
            setSubmitLoading(false);
        }
    };

    const renderCell = useCallback(
        (copy: BookCopy, columnKey: string) => {
            switch (columnKey) {
                case "id":
                    return <span className="font-mono text-sm text-default-500">#{copy.id}</span>;
                case "bookTitle":
                    return (
                        <div className="max-w-[200px]">
                            <p className="font-medium text-sm truncate">{copy.bookTitle}</p>
                            <p className="text-xs text-default-400">图书 #{copy.bookId}</p>
                        </div>
                    );
                case "isbn":
                    return <span className="text-sm text-default-500 font-mono">{copy.isbn || "-"}</span>;
                case "status":
                    return (
                        <Chip
                            color={statusColorMap[copy.status]}
                            size="sm"
                            variant="flat"
                            startContent={<Icon icon={statusIconMap[copy.status]} width={12} />}
                        >
                            {statusLabelMap[copy.status] || copy.status}
                        </Chip>
                    );
                case "locationCode":
                    return copy.locationCode ? (
                        <span className="text-sm flex items-center gap-1">
                            <Icon icon="solar:map-point-bold" width={14} className="text-default-400" />
                            {copy.locationCode}
                        </span>
                    ) : <span className="text-default-300">—</span>;
                case "price":
                    return copy.price != null ? (
                        <span className="text-sm font-medium">¥{copy.price.toFixed(2)}</span>
                    ) : <span className="text-default-300">—</span>;
                case "acquisitionDate":
                    return (
                        <span className="text-sm text-default-500">
                            {copy.acquisitionDate?.slice(0, 10) || "—"}
                        </span>
                    );
                case "actions":
                    return (
                        <div className="flex gap-1">
                            <Tooltip content="编辑副本">
                                <Button aria-label="编辑副本" isIconOnly size="sm" variant="light" onPress={() => handleEdit(copy)}>
                                    <Icon icon="solar:pen-bold" width={16} className="text-default-500" />
                                </Button>
                            </Tooltip>
                            <Tooltip color="danger" content="删除副本">
                                <Button
                                    aria-label="删除副本"
                                    isIconOnly size="sm" variant="light" color="danger"
                                    isLoading={deleteLoading === copy.id}
                                    onPress={() => handleDelete(copy)}
                                >
                                    <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                </Button>
                            </Tooltip>
                        </div>
                    );
                default:
                    return null;
            }
        },
        [deleteLoading]
    );

    // Summary stats from current result
    const totalElements = data?.totalElements ?? 0;
    const hasFilters = !!scopedBookId || !!statusFilter || !!keyword;
    const scopedBookLabel = scopedBook?.title || (scopedBookId ? `图书 #${scopedBookId}` : "");
    const clearScopedBook = () => {
        void router.push("/dashboard/copies");
    };

    return (
        <AdminLayout>
            <div className="max-w-[1200px] mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">副本管理</h1>
                        <p className="text-default-500 text-small">
                            管理图书馆副本，支持按图书、状态和关键词筛选。
                        </p>
                    </div>
                    <Button
                        color="primary"
                        startContent={<Icon icon="solar:add-circle-bold" />}
                        onPress={handleCreate}
                    >
                        新增副本
                    </Button>
                </div>

                {scopedBookId ? (
                    <Card className="shadow-none border border-primary-200 bg-primary-50/50">
                        <CardBody className="flex flex-col gap-3 py-3 px-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                    <Icon icon="solar:book-bookmark-bold" width={16} />
                                    当前图书副本视图
                                </div>
                                <p className="text-sm text-default-600">
                                    {isScopedBookLoading ? "正在加载图书信息..." : `当前只展示 ${scopedBookLabel} 的全部副本。`}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                startContent={<Icon icon="solar:list-bold" width={14} />}
                                onPress={clearScopedBook}
                            >
                                返回全馆副本
                            </Button>
                        </CardBody>
                    </Card>
                ) : null}

                {/* Search + Filter bar */}
                <Card className="shadow-none border border-default-200">
                    <CardBody className="py-3 px-4">
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                            {/* Search */}
                            <Input
                                className="flex-1"
                                placeholder={scopedBookId ? "在当前图书中按书名或 ISBN 继续筛选..." : "搜索书名或 ISBN..."}
                                value={searchInput}
                                onValueChange={setSearchInput}
                                onKeyDown={handleKeyDown}
                                variant="bordered"
                                size="sm"
                                startContent={<Icon icon="solar:magnifer-bold" width={16} className="text-default-400" />}
                                endContent={
                                    searchInput && (
                                        <Button
                                            aria-label="清空搜索条件"
                                            isIconOnly size="sm" variant="light"
                                            onPress={() => { setSearchInput(""); setKeyword(""); setPage(1); }}
                                        >
                                            <Icon icon="solar:close-circle-bold" width={16} className="text-default-400" />
                                        </Button>
                                    )
                                }
                            />
                            <Button
                                size="sm" color="primary" variant="flat"
                                onPress={handleSearch}
                                startContent={<Icon icon="solar:magnifer-bold" width={14} />}
                            >
                                搜索
                            </Button>

                            {/* Status filter */}
                            <div className="flex gap-1.5 flex-wrap">
                                <Chip
                                    className="cursor-pointer"
                                    color={!statusFilter ? "primary" : "default"}
                                    variant={!statusFilter ? "solid" : "bordered"}
                                    size="sm"
                                    onClick={() => handleStatusChange("")}
                                >
                                    全部
                                </Chip>
                                {(Object.entries(statusLabelMap) as [CopyStatus, string][]).map(([k, v]) => (
                                    <Chip
                                        key={k}
                                        className="cursor-pointer"
                                        color={statusFilter === k ? statusColorMap[k] : "default"}
                                        variant={statusFilter === k ? "solid" : "bordered"}
                                        size="sm"
                                        startContent={<Icon icon={statusIconMap[k]} width={12} />}
                                        onClick={() => handleStatusChange(k)}
                                    >
                                        {v}
                                    </Chip>
                                ))}
                            </div>

                            {/* Page size */}
                            <Select
                                className="w-[120px] shrink-0"
                                size="sm"
                                variant="bordered"
                                selectedKeys={[String(pageSize)]}
                                aria-label="每页条数"
                                onSelectionChange={(keys) => {
                                    const v = Array.from(keys)[0];

                                    if (v) { setPageSize(Number(v)); setPage(1); }
                                }}
                            >
                                {PAGE_SIZE_OPTIONS.map((o) => (
                                    <SelectItem key={o.key}>{o.label}</SelectItem>
                                ))}
                            </Select>
                        </div>
                    </CardBody>
                </Card>

                {/* Results summary */}
                <div className="flex items-center justify-between text-sm text-default-500">
                    <span>
                        {scopedBookId
                            ? `${scopedBookLabel}：${totalElements} 条副本`
                            : hasFilters
                                ? `筛选结果: ${totalElements} 条`
                                : `共 ${totalElements} 条副本`}
                        {hasFilters && (
                            <Button
                                size="sm" variant="light" color="primary"
                                className="ml-2"
                                onPress={() => {
                                    setStatusFilter("");
                                    setKeyword("");
                                    setSearchInput("");
                                    setPage(1);
                                    if (scopedBookId) {
                                        clearScopedBook();
                                    }
                                }}
                            >
                                清除筛选
                            </Button>
                        )}
                    </span>
                    <span>
                        第 {page} / {data?.totalPages || 1} 页
                    </span>
                </div>

                {/* Table */}
                <Table
                    aria-label="副本管理列表"
                    bottomContent={
                        (data?.totalPages ?? 0) > 1 ? (
                            <div className="flex justify-center">
                                <Pagination
                                    showControls
                                    total={data?.totalPages ?? 1}
                                    page={page}
                                    onChange={setPage}
                                    color="primary"
                                    size="sm"
                                />
                            </div>
                        ) : null
                    }
                >
                    <TableHeader columns={columns}>
                        {(column) => (
                            <TableColumn
                                key={column.key}
                                align={column.key === "actions" ? "center" : "start"}
                            >
                                {column.label}
                            </TableColumn>
                        )}
                    </TableHeader>
                    <TableBody
                        items={data?.items ?? []}
                        isLoading={isLoading}
                        loadingContent={<Spinner label="加载中..." />}
                        emptyContent={
                            scopedBookId && !statusFilter && !keyword
                                ? "该图书暂无副本数据"
                                : hasFilters
                                ? "未找到匹配的副本，试试调整筛选条件"
                                : "暂无副本数据，点击“新增副本”开始"
                        }
                    >
                    {(item) => (
                        <TableRow key={item.id}>
                            {(columnKey) => (
                                <TableCell>{renderCell(item, String(columnKey))}</TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>

            {/* Modal */ }
    <CopyFormModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onSubmit={handleSubmit}
        initialData={editingCopy}
        initialBookId={scopedBookId}
        isLoading={submitLoading}
    />
        </AdminLayout >
    );
}
