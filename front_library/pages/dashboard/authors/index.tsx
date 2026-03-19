import React, { useMemo, useState } from "react";
import {
  Button,
  Input,
  TableCell,
  TableRow,
  Textarea,
  Tooltip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { toast } from "sonner";

import { CrudTablePage } from "@/components/admin/CrudTablePage";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getApiErrorMessage } from "@/lib/apiError";
import { catalogMetadataService } from "@/services/api/catalogMetadataService";
import { ApiAuthorDto } from "@/types/api";

const PAGE_SIZE = 10;

const emptyForm: Partial<ApiAuthorDto> = {
  name: "",
  biography: "",
  birthYear: undefined,
  deathYear: undefined,
};

export default function AuthorsManagementPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editingItem, setEditingItem] = useState<ApiAuthorDto | null>(null);
  const [form, setForm] = useState<Partial<ApiAuthorDto>>(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const swrKey = useMemo(() => ["dashboard-authors", page, keyword], [page, keyword]);
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () => keyword.trim()
      ? catalogMetadataService.searchAuthors(keyword.trim(), page - 1, PAGE_SIZE)
      : catalogMetadataService.getAuthors(page - 1, PAGE_SIZE),
  );

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (item: ApiAuthorDto) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      biography: item.biography,
      birthYear: item.birthYear ?? undefined,
      deathYear: item.deathYear ?? undefined,
    });
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.warning("请输入作者名称");

      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        biography: form.biography?.trim() || undefined,
        birthYear: form.birthYear ?? null,
        deathYear: form.deathYear ?? null,
      };

      if (editingItem?.authorId) {
        await catalogMetadataService.updateAuthor(editingItem.authorId, payload);
        toast.success("作者信息已更新");
      } else {
        await catalogMetadataService.createAuthor(payload);
        toast.success("作者已新增");
      }

      await mutate();
      setIsOpen(false);
    } catch (submitError: unknown) {
      toast.error(getApiErrorMessage(submitError, "保存失败，请稍后重试"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: ApiAuthorDto) => {
    if (!confirm(`确认删除作者“${item.name}”？`)) return;

    setDeletingId(item.authorId);
    try {
      await catalogMetadataService.deleteAuthor(item.authorId);
      await mutate();
      toast.success("作者已删除");
    } catch (deleteError: unknown) {
      toast.error(getApiErrorMessage(deleteError, "删除失败，请稍后重试"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <CrudTablePage
        columns={[
          { key: "author", label: "作者" },
          { key: "lifecycle", label: "生卒年" },
          { key: "biography", label: "简介" },
          { key: "actions", label: "操作", align: "end" },
        ]}
        createLabel="新增作者"
        description="维护图书作者信息，支持搜索、新增、编辑和删除。"
        emptyContent="暂无作者数据"
        error={error}
        filterBar={
          <div className="flex gap-3">
            <Input
              isClearable
              className="max-w-md"
              placeholder="按作者名称搜索"
              startContent={<Icon icon="solar:magnifer-linear" width={16} className="text-default-400" />}
              value={searchInput}
              onClear={() => {
                setSearchInput("");
                setKeyword("");
                setPage(1);
              }}
              onValueChange={setSearchInput}
            />
            <Button
              color="primary"
              variant="flat"
              onPress={() => {
                setKeyword(searchInput);
                setPage(1);
              }}
            >
              搜索
            </Button>
          </div>
        }
        isLoading={isLoading}
        isModalOpen={isOpen}
        isSubmitting={isSubmitting}
        items={data?.content ?? []}
        loadingLabel="加载作者列表..."
        modalBody={
          <>
            <Input
              isRequired
              label="作者名称"
              value={form.name ?? ""}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="出生年份"
                type="number"
                value={form.birthYear?.toString() ?? ""}
                variant="bordered"
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, birthYear: value ? Number(value) : undefined }))
                }
              />
              <Input
                label="逝世年份"
                type="number"
                value={form.deathYear?.toString() ?? ""}
                variant="bordered"
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, deathYear: value ? Number(value) : undefined }))
                }
              />
            </div>
            <Textarea
              label="作者简介"
              minRows={4}
              value={form.biography ?? ""}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, biography: value }))}
            />
          </>
        }
        modalTitle={editingItem ? "编辑作者" : "新增作者"}
        page={page}
        renderRow={(item: ApiAuthorDto) => (
          <TableRow key={item.authorId}>
            <TableCell>
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-default-400">作者 #{item.authorId}</p>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm text-default-500">
                {item.birthYear || "-"} {item.deathYear ? `- ${item.deathYear}` : ""}
              </span>
            </TableCell>
            <TableCell>
              <p className="max-w-xl text-sm text-default-600 line-clamp-3">
                {item.biography || "暂无简介"}
              </p>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Tooltip content="编辑作者">
                  <Button aria-label="编辑作者" isIconOnly size="sm" variant="light" onPress={() => openEdit(item)}>
                    <Icon icon="solar:pen-bold" width={16} />
                  </Button>
                </Tooltip>
                <Tooltip color="danger" content="删除作者">
                  <Button
                    aria-label="删除作者"
                    isIconOnly
                    color="danger"
                    isLoading={deletingId === item.authorId}
                    size="sm"
                    variant="light"
                    onPress={() => handleDelete(item)}
                  >
                    <Icon icon="solar:trash-bin-trash-bold" width={16} />
                  </Button>
                </Tooltip>
              </div>
            </TableCell>
          </TableRow>
        )}
        submitLabel={editingItem ? "保存" : "新增"}
        tableAriaLabel="Authors table"
        title="作者管理"
        totalPages={data?.totalPages}
        onCreate={openCreate}
        onModalOpenChange={setIsOpen}
        onPageChange={setPage}
        onRetry={() => {
          void mutate();
        }}
        onSubmit={() => {
          void handleSubmit();
        }}
      />
    </AdminLayout>
  );
}
