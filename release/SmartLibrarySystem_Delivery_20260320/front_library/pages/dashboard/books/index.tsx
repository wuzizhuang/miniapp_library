import React, { useCallback, useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
  Chip,
  Tooltip,
  Button,
  Input,
  Pagination,
  Spinner,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useRouter } from "next/router";

// 引入布局、Mock数据和组件
import AdminLayout from "@/components/layouts/AdminLayout";
import { adminService, AdminBook } from "@/services/api/adminService";
import {
  formatBookMutationError,
  refreshAdminBookData,
  useAdminBooks,
} from "@/hooks/books/useAdminBookData";
// 注意：请确保此路径与您实际创建组件的路径一致
import { BookFormModal } from "@/components/modules/admin/books/BookFormModal";

// --- 常量定义 ---

const columns = [
  { name: "图书信息", uid: "info" },
  { name: "ISBN / 分类", uid: "isbn" },
  { name: "库存情况", uid: "stock" },
  { name: "状态", uid: "status" },
  { name: "操作", uid: "actions" },
];

const statusColorMap: Record<string, "success" | "warning" | "danger"> = {
  available: "success",
  low_stock: "warning",
  out_of_stock: "danger",
};

const statusLabelMap: Record<string, string> = {
  available: "库存充足",
  low_stock: "库存紧张",
  out_of_stock: "缺货",
};

export default function AdminBooksPage() {
  const router = useRouter();
  // --- 1. 状态管理 ---
  const [filterValue, setFilterValue] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // --- 2. 数据获取 ---
  const { data, isLoading, mutate } = useAdminBooks(page, rowsPerPage, filterValue);

  // Modal 状态
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editingBook, setEditingBook] = useState<AdminBook | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 3. 数据处理 (过滤 & 分页) ---
  const totalPages = data?.totalPages || 1;
  const paginatedItems = data?.items || [];

  // --- 4. 交互处理 ---

  // 打开新增模态框
  const handleAddClick = () => {
    setEditingBook(null);
    onOpen();
  };

  // 打开编辑模态框
  const handleEditClick = (book: AdminBook) => {
    setEditingBook(book);
    onOpen();
  };
  const handleViewClick = (book: AdminBook) => {
    router.push(`/dashboard/books/${book.id}`);
  };

  // 处理搜索
  const onSearchChange = useCallback((value: string) => {
    setFilterValue(value);
    setPage(1); // 搜索时重置回第一页
  }, []);

  // 处理表单提交
  const handleFormSubmit = async (formData: import("@/types/api").ApiBookRequest) => {
    setIsSubmitting(true);
    try {
      if (editingBook) {
        await adminService.updateBook(editingBook.id, formData);
        await refreshAdminBookData(editingBook.id);
        toast.success(`《${formData.title}》信息更新成功！`);
      } else {
        const created = await adminService.createBook(formData);

        await refreshAdminBookData(created.id);
        toast.success(`新书《${formData.title}》入库成功！`);
      }

      await mutate();
      onOpenChange();
    } catch (error: any) {
      toast.error(formatBookMutationError(error, "操作失败，请重试"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理删除
  const handleDelete = async (id: number, title: string) => {
    toast.promise(
      adminService.deleteBook(id).then(() => mutate()),
      {
        loading: "正在执行下架操作...",
        success: `《${title}》已成功下架`,
        error: "删除失败，该图书可能有关联借阅记录",
      },
    );
  };

  // --- 5. 渲染单元格 ---
  const renderCell = useCallback(
    (book: AdminBook, columnKey: React.Key) => {
      switch (columnKey) {
        case "info":
          return (
            <User
              avatarProps={{ radius: "lg", src: book.cover }}
              classNames={{
                name: "font-bold text-default-700",
                description: "text-default-500",
              }}
              description={book.author}
              name={book.title}
            >
              {book.title}
            </User>
          );
        case "isbn":
          return (
            <div className="flex flex-col">
              <span className="font-mono text-small text-default-600">
                {book.isbn}
              </span>
              <span className="text-tiny text-default-400 capitalize">
                {book.category}
              </span>
            </div>
          );
        case "stock":
          return (
            <div className="flex flex-col">
              <span className="text-small font-bold">
                {book.stock} / {book.total}
              </span>
              <span className="text-tiny text-default-400">可借 / 总量</span>
            </div>
          );
        case "status":
          return (
            <Chip
              className="capitalize"
              color={statusColorMap[book.status]}
              size="sm"
              variant="flat"
            >
              {statusLabelMap[book.status]}
            </Chip>
          );
        case "actions":
          return (
            <div className="relative flex items-center justify-end gap-2">
              <Tooltip content="查看详情">
                <button
                  className="text-lg text-default-400 cursor-pointer active:opacity-50 hover:text-primary transition-colors"
                  onClick={() => handleViewClick(book)}
                >
                  <Icon icon="solar:eye-bold" />
                </button>
              </Tooltip>
              <Tooltip content="编辑详情">
                <button
                  className="text-lg text-default-400 cursor-pointer active:opacity-50 hover:text-primary transition-colors"
                  onClick={() => handleEditClick(book)}
                >
                  <Icon icon="solar:pen-new-square-linear" />
                </button>
              </Tooltip>
              <Tooltip color="danger" content="下架图书">
                <button
                  className="text-lg text-danger cursor-pointer active:opacity-50 transition-colors"
                  onClick={() => handleDelete(book.id, book.title)}
                >
                  <Icon icon="solar:trash-bin-trash-linear" />
                </button>
              </Tooltip>
            </div>
          );
        default:
          return;
      }
    },
    [handleDelete],
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 h-full">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row justify-between gap-3 items-end md:items-center bg-content1 p-4 rounded-xl shadow-sm border border-default-100">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl font-bold tracking-tight">图书管理</h1>
            <p className="text-default-500 text-small">
              管理馆藏书籍与库存状态
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Input
              isClearable
              className="w-full md:w-64"
              placeholder="搜索书名、作者或ISBN..."
              startContent={
                <Icon
                  className="text-default-400"
                  icon="solar:magnifer-linear"
                />
              }
              value={filterValue}
              variant="faded"
              onValueChange={onSearchChange}
            />
            <Button
              className="font-semibold"
              startContent={<Icon icon="solar:note-add-bold-duotone" />}
              variant="flat"
              onPress={handleAddClick}
            >
              快速入库
            </Button>
            <Button
              className="shadow-md shadow-blue-500/20 font-semibold"
              color="primary"
              startContent={<Icon icon="solar:add-circle-bold" />}
              onPress={() => router.push("/dashboard/books/new")}
            >
              新书入库
            </Button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-content1 rounded-xl shadow-sm border border-default-100 overflow-hidden">
          <Table
            aria-label="Books table"
            bottomContent={
              totalPages > 1 ? (
                <div className="flex w-full justify-center px-4 py-2">
                  <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="primary"
                    page={page}
                    total={totalPages}
                    onChange={(page) => setPage(page)}
                  />
                </div>
              ) : null
            }
            classNames={{
              th: "bg-default-50 text-default-500 border-b border-divider",
              td: "py-3 group-data-[odd=true]:bg-default-50/50",
            }}
            shadow="none"
          >
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.uid}
                  align={column.uid === "actions" ? "end" : "start"}
                >
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              emptyContent={
                isLoading ? " " : <div className="p-4">暂无符合条件的图书</div>
              }
              isLoading={isLoading}
              items={paginatedItems}
              loadingContent={<Spinner label="正在加载馆藏数据..." />}
            >
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => (
                    <TableCell>{renderCell(item, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 挂载 Modal 组件 */}
      <BookFormModal
        initialData={editingBook}
        isLoading={isSubmitting}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onSubmit={handleFormSubmit}
      />
    </AdminLayout>
  );
}
