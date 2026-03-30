import React, { ReactElement, ReactNode } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableColumn,
  TableHeader,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import { getApiErrorMessage } from "@/lib/apiError";

interface CrudColumn {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
}

interface CrudTablePageProps<T> {
  title: string;
  description: string;
  createLabel: string;
  tableAriaLabel: string;
  loadingLabel: string;
  emptyContent: string;
  columns: CrudColumn[];
  items: T[];
  page: number;
  totalPages?: number;
  error?: unknown;
  errorFallbackMessage?: string;
  errorTitle?: string;
  filterBar?: ReactNode;
  headerExtra?: ReactNode;
  isLoading?: boolean;
  isModalOpen: boolean;
  isModalDismissable?: boolean;
  isSubmitting?: boolean;
  modalBody: ReactNode;
  modalTitle: string;
  submitLabel: string;
  onCreate: () => void;
  onModalOpenChange: (open: boolean) => void;
  onPageChange: (page: number) => void;
  onRetry?: () => void;
  onSubmit: () => void;
  renderRow: (item: T) => ReactElement;
}

export function CrudTablePage<T>({
  columns,
  createLabel,
  description,
  emptyContent,
  error,
  errorFallbackMessage = "列表加载失败，请稍后重试。",
  errorTitle = "列表加载失败",
  filterBar,
  headerExtra,
  isLoading = false,
  isModalOpen,
  isModalDismissable = true,
  isSubmitting = false,
  items,
  loadingLabel,
  modalBody,
  modalTitle,
  onCreate,
  onModalOpenChange,
  onPageChange,
  onRetry,
  onSubmit,
  page,
  renderRow,
  submitLabel,
  tableAriaLabel,
  title,
  totalPages = 1,
}: CrudTablePageProps<T>) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-default-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {headerExtra}
          <Button
            color="primary"
            startContent={<Icon icon="solar:add-circle-bold" />}
            onPress={onCreate}
          >
            {createLabel}
          </Button>
        </div>
      </div>

      {filterBar}

      {error ? (
        <RequestErrorCard
          message={getApiErrorMessage(error, errorFallbackMessage)}
          title={errorTitle}
          onRetry={onRetry}
        />
      ) : (
        <Table aria-label={tableAriaLabel} className="rounded-xl bg-content1 shadow-sm">
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.key} align={column.align ?? "start"}>
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            emptyContent={emptyContent}
            isLoading={isLoading}
            items={items}
            loadingContent={<Spinner label={loadingLabel} />}
          >
            {renderRow}
          </TableBody>
        </Table>
      )}

      {!error && totalPages > 1 ? (
        <div className="flex justify-center">
          <Pagination
            showControls
            color="primary"
            page={page}
            total={totalPages}
            variant="flat"
            onChange={onPageChange}
          />
        </div>
      ) : null}

      <Modal isDismissable={isModalDismissable} isOpen={isModalOpen} onOpenChange={onModalOpenChange}>
        <ModalContent>
          <ModalHeader>{modalTitle}</ModalHeader>
          <ModalBody className="gap-4">{modalBody}</ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => onModalOpenChange(false)}>
              取消
            </Button>
            <Button color="primary" isLoading={isSubmitting} onPress={onSubmit}>
              {submitLabel}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
