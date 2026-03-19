import React, { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import { toast } from "sonner";

import {
  BookForm,
  buildBookSubmitPayload,
  createInitialBookFormData,
  validateBookForm,
} from "@/components/modules/admin/books/BookForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import {
  formatBookMutationError,
  refreshAdminBookData,
} from "@/hooks/books/useAdminBookData";
import { adminService } from "@/services/api/adminService";

export default function NewBookPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(createInitialBookFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationError = validateBookForm(formData);

    if (validationError) {
      toast.error(validationError);

      return;
    }

    setIsSubmitting(true);
    try {
      const created = await adminService.createBook(
        buildBookSubmitPayload(formData, false),
      );

      await refreshAdminBookData(created.id);
      toast.success(`《${formData.title}》入库成功`);
      await router.push("/dashboard/books");
    } catch (error: any) {
      toast.error(formatBookMutationError(error, "入库失败，请稍后重试"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1100px] space-y-6">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold">新书入库</h1>
            <p className="text-small text-default-500">
              复用现有图书 DTO，填写基础元数据并创建初始副本。
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              startContent={<Icon icon="solar:arrow-left-bold" />}
              variant="flat"
              onPress={() => router.push("/dashboard/books")}
            >
              返回列表
            </Button>
            <Button
              color="primary"
              isLoading={isSubmitting}
              startContent={!isSubmitting ? <Icon icon="solar:check-circle-bold" /> : null}
              onPress={handleSubmit}
            >
              保存并入库
            </Button>
          </div>
        </div>

        <Card className="border border-default-100 shadow-sm">
          <CardHeader className="flex flex-col items-start gap-1">
            <h2 className="text-lg font-semibold">基础信息</h2>
            <p className="text-small text-default-400">
              这些字段会直接提交到 `/api/books` 的创建 DTO。
            </p>
          </CardHeader>
          <CardBody>
            <BookForm formData={formData} onChange={setFormData} />
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  );
}
