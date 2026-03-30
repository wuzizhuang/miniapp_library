import React, { useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectItem,
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
import { ApiCategoryDto } from "@/types/api";

const CATEGORY_FETCH_SIZE = 1000;
const TREE_INDENT_PX = 20;

const emptyForm: Partial<ApiCategoryDto> = {
  name: "",
  description: "",
  parentId: null,
};

interface CategoryTreeRow extends ApiCategoryDto {
  depth: number;
  hasChildren: boolean;
  childrenCount: number;
}

const sortCategories = (categories: ApiCategoryDto[]) =>
  [...categories].sort((left, right) => left.name.localeCompare(right.name, "zh-CN") || left.categoryId - right.categoryId);

const buildCategoryRows = (categories: ApiCategoryDto[], collapsedIds: Set<number>): CategoryTreeRow[] => {
  const rows: CategoryTreeRow[] = [];
  const existingIds = new Set(categories.map((item) => item.categoryId));
  const childrenByParentId = new Map<number | null, ApiCategoryDto[]>();

  categories.forEach((category) => {
    const parentKey = category.parentId != null && existingIds.has(category.parentId) ? category.parentId : null;
    const bucket = childrenByParentId.get(parentKey) ?? [];

    bucket.push(category);
    childrenByParentId.set(parentKey, bucket);
  });

  const appendRows = (parentId: number | null, depth: number) => {
    sortCategories(childrenByParentId.get(parentId) ?? []).forEach((category) => {
      const directChildren = childrenByParentId.get(category.categoryId) ?? [];
      const hasChildren = directChildren.length > 0;

      rows.push({
        ...category,
        depth,
        hasChildren,
        childrenCount: directChildren.length,
      });

      if (hasChildren && !collapsedIds.has(category.categoryId)) {
        appendRows(category.categoryId, depth + 1);
      }
    });
  };

  appendRows(null, 0);

  return rows;
};

export default function CategoriesManagementPage() {
  const [editingItem, setEditingItem] = useState<ApiCategoryDto | null>(null);
  const [form, setForm] = useState<Partial<ApiCategoryDto>>(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  const { data, error, isLoading, mutate } = useSWR(
    "dashboard-categories-tree",
    () => catalogMetadataService.getCategories(0, CATEGORY_FETCH_SIZE),
  );
  const categories = data?.content ?? [];
  const categoryRows = buildCategoryRows(categories, collapsedIds);
  const parentOptions = [
    { key: "root", label: "顶级分类" },
    ...(categories
      .filter((item) => item.categoryId !== editingItem?.categoryId)
      .map((item) => ({
        key: String(item.categoryId),
        label: item.name,
      }))),
  ];

  const toggleCollapsed = (categoryId: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (item: ApiCategoryDto) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description,
      parentId: item.parentId ?? null,
    });
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.warning("请输入分类名称");

      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        parentId: form.parentId ?? null,
      };

      if (editingItem?.categoryId) {
        await catalogMetadataService.updateCategory(editingItem.categoryId, payload);
        toast.success("分类已更新");
      } else {
        await catalogMetadataService.createCategory(payload);
        toast.success("分类已新增");
      }

      await mutate();
      setIsOpen(false);
    } catch (submitError: unknown) {
      toast.error(getApiErrorMessage(submitError, "保存失败，请稍后重试"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: ApiCategoryDto) => {
    if (!confirm(`确认删除分类“${item.name}”？`)) return;

    setDeletingId(item.categoryId);
    try {
      await catalogMetadataService.deleteCategory(item.categoryId);
      await mutate();
      toast.success("分类已删除");
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
          { key: "name", label: "分类名称" },
          { key: "parent", label: "父级分类" },
          { key: "description", label: "描述" },
          { key: "actions", label: "操作", align: "end" },
        ]}
        createLabel="新增分类"
        description="按父子层级维护图书分类，可展开或折叠查看。"
        emptyContent="暂无分类数据"
        error={error}
        isLoading={isLoading}
        isModalDismissable={false}
        isModalOpen={isOpen}
        isSubmitting={isSubmitting}
        items={categoryRows}
        loadingLabel="加载分类列表..."
        modalBody={
          <>
            <Input
              isRequired
              label="分类名称"
              value={form.name ?? ""}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            />
            <Select
              items={parentOptions}
              label="父级分类"
              selectedKeys={form.parentId ? [String(form.parentId)] : ["root"]}
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];

                setForm((prev) => ({
                  ...prev,
                  parentId: !selected || selected === "root" ? null : Number(selected),
                }));
              }}
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
            <Textarea
              label="分类描述"
              minRows={4}
              value={form.description ?? ""}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
            />
          </>
        }
        modalTitle={editingItem ? "编辑分类" : "新增分类"}
        page={1}
        renderRow={(item: CategoryTreeRow) => (
          <TableRow key={item.categoryId}>
            <TableCell>
              <div className="flex items-start gap-2" style={{ paddingLeft: `${item.depth * TREE_INDENT_PX}px` }}>
                {item.hasChildren ? (
                  <Button
                    aria-label={collapsedIds.has(item.categoryId) ? `展开 ${item.name}` : `折叠 ${item.name}`}
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => toggleCollapsed(item.categoryId)}
                  >
                    <Icon
                      icon={collapsedIds.has(item.categoryId) ? "solar:alt-arrow-right-linear" : "solar:alt-arrow-down-linear"}
                      width={16}
                    />
                  </Button>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center text-default-300">
                    <Icon icon={item.depth > 0 ? "solar:round-arrow-right-down-linear" : "solar:widget-4-linear"} width={16} />
                  </span>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {item.depth === 0 ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">顶级分类</span>
                    ) : null}
                    {item.hasChildren ? (
                      <span className="rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-500">
                        {item.childrenCount} 个子分类
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-default-400">分类 #{item.categoryId}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>{item.parentName || "顶级分类"}</TableCell>
            <TableCell>
              <p className="max-w-xl text-sm text-default-600 line-clamp-3">
                {item.description || "暂无描述"}
              </p>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Tooltip content="编辑分类">
                  <Button aria-label="编辑分类" isIconOnly size="sm" variant="light" onPress={() => openEdit(item)}>
                    <Icon icon="solar:pen-bold" width={16} />
                  </Button>
                </Tooltip>
                <Tooltip color="danger" content="删除分类">
                  <Button
                    aria-label="删除分类"
                    isIconOnly
                    color="danger"
                    isLoading={deletingId === item.categoryId}
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
        tableAriaLabel="Categories table"
        title="分类管理"
        onCreate={openCreate}
        onModalOpenChange={setIsOpen}
        onPageChange={() => undefined}
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
