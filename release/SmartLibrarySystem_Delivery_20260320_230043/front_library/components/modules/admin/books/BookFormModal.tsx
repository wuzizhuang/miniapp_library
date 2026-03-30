import React, { useEffect, useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { toast } from "sonner";

import {
  BookForm,
  buildBookSubmitPayload,
  createInitialBookFormData,
  mapAdminBookToFormData,
  validateBookForm,
} from "@/components/modules/admin/books/BookForm";
import { AdminBook } from "@/services/api/adminService";
import { getApiErrorMessage } from "@/lib/apiError";
import { ApiBookRequest } from "@/types/api";

interface BookFormModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  onSubmit: (data: ApiBookRequest) => Promise<void>;
  initialData?: AdminBook | null;
  isLoading: boolean;
}

export const BookFormModal = ({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: BookFormModalProps) => {
  const [formData, setFormData] = useState<ApiBookRequest>(createInitialBookFormData);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialData) {
      setFormData(mapAdminBookToFormData(initialData));

      return;
    }

    setFormData(createInitialBookFormData());
  }, [initialData, isOpen]);

  const handleFormSubmit = async () => {
    const validationError = validateBookForm(formData);

    if (validationError) {
      toast.warning(validationError);

      return;
    }

    try {
      await onSubmit(buildBookSubmitPayload(formData, Boolean(initialData)));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "保存失败，请稍后重试"));
    }
  };

  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="3xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {initialData ? "编辑图书信息" : "入库新书"}
            </ModalHeader>
            <ModalBody>
              <BookForm
                formData={formData}
                isEdit={Boolean(initialData)}
                onChange={setFormData}
              />
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="flat" onPress={onClose}>
                取消
              </Button>
              <Button
                color="primary"
                isLoading={isLoading}
                onPress={handleFormSubmit}
              >
                {initialData ? "保存修改" : "确认入库"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
