import React, { useState } from "react";
import {
  Button,
  Input,
  TableCell,
  TableRow,
  Tooltip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { toast } from "sonner";

import { CrudTablePage } from "@/components/admin/CrudTablePage";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getApiErrorMessage } from "@/lib/apiError";
import { catalogMetadataService } from "@/services/api/catalogMetadataService";
import { ApiPublisherDto } from "@/types/api";

const PAGE_SIZE = 20;

const emptyForm: Partial<ApiPublisherDto> = {
  name: "",
  address: "",
  contactInfo: "",
};

export default function PublishersManagementPage() {
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<ApiPublisherDto | null>(null);
  const [form, setForm] = useState<Partial<ApiPublisherDto>>(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    ["dashboard-publishers", page],
    () => catalogMetadataService.getPublishers(page - 1, PAGE_SIZE),
  );

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (item: ApiPublisherDto) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      address: item.address,
      contactInfo: item.contactInfo,
    });
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.warning("请输入出版社名称");

      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address?.trim() || undefined,
        contactInfo: form.contactInfo?.trim() || undefined,
      };

      if (editingItem?.publisherId) {
        await catalogMetadataService.updatePublisher(editingItem.publisherId, payload);
        toast.success("出版社已更新");
      } else {
        await catalogMetadataService.createPublisher(payload);
        toast.success("出版社已新增");
      }

      await mutate();
      setIsOpen(false);
    } catch (submitError: unknown) {
      toast.error(getApiErrorMessage(submitError, "保存失败，请稍后重试"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: ApiPublisherDto) => {
    if (!confirm(`确认删除出版社“${item.name}”？`)) return;

    setDeletingId(item.publisherId);
    try {
      await catalogMetadataService.deletePublisher(item.publisherId);
      await mutate();
      toast.success("出版社已删除");
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
          { key: "publisher", label: "出版社" },
          { key: "address", label: "地址" },
          { key: "contact", label: "联系方式" },
          { key: "actions", label: "操作", align: "end" },
        ]}
        createLabel="新增出版社"
        description="维护出版社名称、地址和联系方式。"
        emptyContent="暂无出版社数据"
        error={error}
        isLoading={isLoading}
        isModalOpen={isOpen}
        isSubmitting={isSubmitting}
        items={data?.content ?? []}
        loadingLabel="加载出版社列表..."
        modalBody={
          <>
            <Input
              isRequired
              label="出版社名称"
              value={form.name ?? ""}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            />
            <Input
              label="地址"
              value={form.address ?? ""}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
            />
            <Input
              label="联系方式"
              value={form.contactInfo ?? ""}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, contactInfo: value }))}
            />
          </>
        }
        modalTitle={editingItem ? "编辑出版社" : "新增出版社"}
        page={page}
        renderRow={(item: ApiPublisherDto) => (
          <TableRow key={item.publisherId}>
            <TableCell>
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-default-400">出版社 #{item.publisherId}</p>
              </div>
            </TableCell>
            <TableCell>{item.address || "-"}</TableCell>
            <TableCell>{item.contactInfo || "-"}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Tooltip content="编辑出版社">
                  <Button aria-label="编辑出版社" isIconOnly size="sm" variant="light" onPress={() => openEdit(item)}>
                    <Icon icon="solar:pen-bold" width={16} />
                  </Button>
                </Tooltip>
                <Tooltip color="danger" content="删除出版社">
                  <Button
                    aria-label="删除出版社"
                    isIconOnly
                    color="danger"
                    isLoading={deletingId === item.publisherId}
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
        tableAriaLabel="Publishers table"
        title="出版社管理"
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
