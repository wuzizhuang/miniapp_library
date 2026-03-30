import { Input, Select, SelectItem, Textarea } from "@heroui/react";
import React from "react";
import useSWR from "swr";

import { AdminBook } from "@/services/api/adminService";
import { bookService } from "@/services/api/bookService";
import { ApiBookRequest } from "@/types/api";
import { Author, Category, Publisher } from "@/types/book";
import {
  BOOK_RESOURCE_MODE_OPTIONS,
  normalizeBookResourcePayload,
  ONLINE_ACCESS_TYPE_OPTIONS,
  requiresOnlineResource,
  supportsPhysicalCopies,
  validateBookResourceFields,
} from "@/utils/bookResourceForm";

export const createInitialBookFormData = (): ApiBookRequest => ({
  title: "",
  isbn: "",
  coverUrl: "",
  resourceMode: "PHYSICAL_ONLY",
  description: "",
  publishedYear: new Date().getFullYear(),
  language: "中文",
  publisherId: 0,
  categoryId: 0,
  authorIds: [],
  copyCount: 1,
});

export function mapAdminBookToFormData(initialData: AdminBook): ApiBookRequest {
  return {
    title: initialData.title || "",
    isbn: initialData.isbn || "",
    coverUrl: initialData.cover || "",
    resourceMode: initialData.resourceMode || "PHYSICAL_ONLY",
    description: initialData.description || "",
    publishedYear: initialData.publishedYear || new Date().getFullYear(),
    language: initialData.language || "中文",
    publisherId: initialData.publisherId || 0,
    categoryId: initialData.categoryId || 0,
    authorIds: initialData.authorIds ?? [],
    copyCount: 1,
    onlineAccessUrl: initialData.onlineAccessUrl,
    onlineAccessType: initialData.onlineAccessType,
  };
}

export function validateBookForm(payload: ApiBookRequest): string | null {
  if (!payload.title || !payload.isbn || !payload.language) {
    return "请填写书名、ISBN 和语言";
  }

  if (!payload.categoryId || !payload.publisherId || payload.authorIds.length === 0) {
    return "请至少选择一个分类、出版社和作者";
  }

  if (!/^[0-9-]{10,20}$/.test(payload.isbn.trim())) {
    return "ISBN 格式无效，请输入 10-20 位数字或连字符";
  }

  if (!payload.publishedYear || payload.publishedYear < 0) {
    return "出版年份不能为空";
  }

  return validateBookResourceFields(payload);
}

export function buildBookSubmitPayload(
  payload: ApiBookRequest,
  isEdit: boolean,
): ApiBookRequest {
  return normalizeBookResourcePayload({
    ...payload,
    title: payload.title.trim(),
    isbn: payload.isbn.trim(),
    language: (payload.language ?? "").trim(),
    copyCount: isEdit
      ? undefined
      : supportsPhysicalCopies(payload.resourceMode)
        ? Math.max(1, Number(payload.copyCount ?? 1))
        : 0,
  });
}

interface BookFormProps {
  formData: ApiBookRequest;
  isEdit?: boolean;
  onChange: (formData: ApiBookRequest) => void;
}

export function BookForm({
  formData,
  isEdit = false,
  onChange,
}: BookFormProps) {
  const { data: categories = [] } = useSWR<Category[]>(
    "book-form-categories",
    bookService.getCategories,
  );
  const { data: authors = [] } = useSWR<Author[]>(
    "book-form-authors",
    bookService.getAuthors,
  );
  const { data: publishers = [] } = useSWR<Publisher[]>(
    "book-form-publishers",
    bookService.getPublishers,
  );

  const handleChange = <K extends keyof ApiBookRequest>(
    key: K,
    value: ApiBookRequest[K],
  ) => {
    onChange({
      ...formData,
      [key]: value,
    });
  };

  const handleResourceModeChange = (
    value?: ApiBookRequest["resourceMode"],
  ) => {
    onChange({
      ...formData,
      resourceMode: value ?? "PHYSICAL_ONLY",
      copyCount: supportsPhysicalCopies(value)
        ? Math.max(1, Number(formData.copyCount ?? 1))
        : 0,
      onlineAccessUrl: requiresOnlineResource(value)
        ? formData.onlineAccessUrl
        : undefined,
      onlineAccessType: requiresOnlineResource(value)
        ? formData.onlineAccessType
        : undefined,
    });
  };

  const handleAuthorSelectionChange = (keys: "all" | Set<React.Key>) => {
    if (keys === "all") {
      handleChange(
        "authorIds",
        authors.map((author) => Number(author.authorId)),
      );

      return;
    }

    handleChange(
      "authorIds",
      Array.from(keys).map((key) => Number(key)),
    );
  };

  const showOnlineFields = requiresOnlineResource(formData.resourceMode);
  const selectedResourceMode = BOOK_RESOURCE_MODE_OPTIONS.find(
    (option) => option.key === (formData.resourceMode ?? "PHYSICAL_ONLY"),
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Input
        isRequired
        label="书名"
        placeholder="输入图书标题"
        value={formData.title}
        variant="bordered"
        onValueChange={(value) => handleChange("title", value)}
      />
      <Input
        isRequired
        label="ISBN"
        placeholder="978-..."
        value={formData.isbn}
        variant="bordered"
        onValueChange={(value) => handleChange("isbn", value)}
      />
      <Select
        isRequired
        items={categories}
        label="分类"
        placeholder="选择分类"
        selectedKeys={formData.categoryId ? [String(formData.categoryId)] : []}
        variant="bordered"
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0];

          handleChange("categoryId", selected ? Number(selected) : 0);
        }}
      >
        {(category) => (
          <SelectItem key={String(category.categoryId)}>
            {category.name}
          </SelectItem>
        )}
      </Select>
      <Select
        isRequired
        items={publishers}
        label="出版社"
        placeholder="选择出版社"
        selectedKeys={formData.publisherId ? [String(formData.publisherId)] : []}
        variant="bordered"
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0];

          handleChange("publisherId", selected ? Number(selected) : 0);
        }}
      >
        {(publisher) => (
          <SelectItem key={String(publisher.publisherId)}>
            {publisher.name}
          </SelectItem>
        )}
      </Select>
      <Select
        isRequired
        items={authors}
        label="作者"
        placeholder="至少选择一个作者"
        selectedKeys={new Set(formData.authorIds.map((id) => String(id)))}
        selectionMode="multiple"
        variant="bordered"
        onSelectionChange={handleAuthorSelectionChange}
      >
        {(author) => (
          <SelectItem key={String(author.authorId)}>{author.name}</SelectItem>
        )}
      </Select>
      <Input
        isRequired
        label="出版年份"
        type="number"
        value={String(formData.publishedYear ?? "")}
        variant="bordered"
        onValueChange={(value) =>
          handleChange("publishedYear", value ? Number(value) : undefined)
        }
      />
      <Input
        isRequired
        label="语言"
        placeholder="如：中文 / English"
        value={formData.language ?? ""}
        variant="bordered"
        onValueChange={(value) => handleChange("language", value)}
      />
      {!isEdit && supportsPhysicalCopies(formData.resourceMode) ? (
        <Input
          isRequired
          label="初始副本数量"
          type="number"
          value={String(formData.copyCount ?? 1)}
          variant="bordered"
          onValueChange={(value) =>
            handleChange("copyCount", value ? Number(value) : 1)
          }
        />
      ) : null}
      <Input
        className={isEdit ? "md:col-span-2" : ""}
        label="封面图 URL"
        placeholder="https://..."
        value={formData.coverUrl ?? ""}
        variant="bordered"
        onValueChange={(value) => handleChange("coverUrl", value)}
      />
      <Select
        items={BOOK_RESOURCE_MODE_OPTIONS}
        label="资源模式"
        selectedKeys={[formData.resourceMode ?? "PHYSICAL_ONLY"]}
        variant="bordered"
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as
            | ApiBookRequest["resourceMode"]
            | undefined;

          handleResourceModeChange(selected);
        }}
      >
        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
      </Select>
      <div className="rounded-xl border border-default-200 bg-default-50 px-4 py-3 text-sm text-default-600 md:col-span-2">
        <p className="font-medium text-default-700">
          当前模式: {selectedResourceMode?.label ?? "仅馆藏"}
        </p>
        <p className="mt-1">
          {selectedResourceMode?.description ?? "仅维护实体馆藏与副本信息"}
        </p>
        <p className="mt-2 text-xs text-default-500">
          {showOnlineFields
            ? "该模式下必须填写线上访问策略和有效的 http/https 链接。"
            : "该模式不会保存线上访问信息。"}
          {" "}
          {supportsPhysicalCopies(formData.resourceMode)
            ? isEdit
              ? "实体副本将继续按现有馆藏维护。"
              : "创建时会同步生成实体副本。"
            : "该模式不会创建实体副本。"}
        </p>
      </div>
      <Select
        isDisabled={!showOnlineFields}
        isRequired={showOnlineFields}
        items={ONLINE_ACCESS_TYPE_OPTIONS}
        label="线上访问策略"
        placeholder={showOnlineFields ? "选择访问策略" : "当前资源模式无需填写"}
        selectedKeys={formData.onlineAccessType ? [formData.onlineAccessType] : []}
        variant="bordered"
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as
            | ApiBookRequest["onlineAccessType"]
            | undefined;

          handleChange("onlineAccessType", selected);
        }}
      >
        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
      </Select>
      <Input
        className="md:col-span-2"
        isDisabled={!showOnlineFields}
        isRequired={showOnlineFields}
        label="线上访问链接"
        placeholder={showOnlineFields ? "https://example.com/resource" : "当前资源模式无需填写"}
        type="url"
        value={formData.onlineAccessUrl ?? ""}
        variant="bordered"
        onValueChange={(value) => handleChange("onlineAccessUrl", value)}
      />
      <Textarea
        className="md:col-span-2"
        label="图书简介"
        minRows={isEdit ? 4 : 5}
        placeholder="简要描述图书内容..."
        value={formData.description ?? ""}
        variant="bordered"
        onValueChange={(value) => handleChange("description", value)}
      />
    </div>
  );
}
