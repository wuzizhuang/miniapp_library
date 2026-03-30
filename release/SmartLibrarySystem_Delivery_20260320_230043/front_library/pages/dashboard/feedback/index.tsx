import { useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from "@heroui/react";
import { toast } from "sonner";

import AdminLayout from "@/components/layouts/AdminLayout";
import { getApiErrorMessage } from "@/lib/apiError";
import { feedbackService } from "@/services/api/feedbackService";
import { ApiFeedbackDto, ApiFeedbackMessageDto, ApiFeedbackStatus } from "@/types/api";

const STATUS_OPTIONS: Array<{ key: ApiFeedbackStatus; label: string }> = [
  { key: "SUBMITTED", label: "已提交" },
  { key: "IN_PROGRESS", label: "处理中" },
  { key: "RESOLVED", label: "已解决" },
  { key: "REJECTED", label: "已驳回" },
];

const STATUS_META: Record<
  ApiFeedbackStatus,
  { label: string; color: "default" | "warning" | "success" | "danger" | "primary" }
> = {
  SUBMITTED: { label: "已提交", color: "warning" },
  IN_PROGRESS: { label: "处理中", color: "primary" },
  RESOLVED: { label: "已解决", color: "success" },
  REJECTED: { label: "已驳回", color: "danger" },
};

export default function AdminFeedbackPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ApiFeedbackStatus | "">("");
  const [selected, setSelected] = useState<ApiFeedbackDto | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyStatus, setReplyStatus] = useState<ApiFeedbackStatus>("IN_PROGRESS");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    ["admin-feedback", page, statusFilter],
    () => feedbackService.getAdminFeedback(page - 1, 10, statusFilter || undefined),
  );
  const { data: stats = [] } = useSWR(
    "admin-feedback-stats",
    feedbackService.getFeedbackStats,
  );

  const openReplyModal = (item: ApiFeedbackDto) => {
    setSelected(item);
    setReplyContent("");
    setReplyStatus(item.status === "SUBMITTED" ? "IN_PROGRESS" : item.status);
  };

  const closeReplyModal = () => {
    setSelected(null);
    setReplyContent("");
    setReplyStatus("IN_PROGRESS");
  };

  const handleReply = async () => {
    if (!selected) return;
    if (!replyContent.trim()) {
      toast.error("请填写回复内容");

      return;
    }

    try {
      setSubmitting(true);
      const updated = await feedbackService.replyFeedback(selected.feedbackId, {
        replyContent: replyContent.trim(),
        status: replyStatus,
      });

      toast.success("回复已发送");
      setSelected(updated);
      setReplyContent("");
      await Promise.all([
        mutate(
          (current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              content: current.content.map((item) =>
                item.feedbackId === updated.feedbackId ? updated : item,
              ),
            };
          },
          { revalidate: false },
        ),
        globalMutate("admin-feedback-stats"),
      ]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "操作失败，请稍后重试"));
    } finally {
      setSubmitting(false);
    }
  };

  const renderMessage = (message: ApiFeedbackMessageDto, index: number) => {
    const isAdminMessage = message.senderType === "ADMIN";

    return (
      <div
        key={`${message.messageId ?? "legacy"}-${index}`}
        className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
            isAdminMessage
              ? "bg-primary text-primary-foreground"
              : "bg-default-100 text-default-700"
          }`}
        >
          <div className={`mb-1 flex items-center gap-2 text-xs ${isAdminMessage ? "text-primary-foreground/80" : "text-default-400"}`}>
            <span>{message.senderName}</span>
            <span>
              {String(message.createTime ?? "").slice(0, 16).replace("T", " ")}
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  };

  const statusStats = useMemo(() => {
    const next: Record<ApiFeedbackStatus, number> = {
      SUBMITTED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      REJECTED: 0,
    };

    for (const item of stats ?? []) {
      const key = item.key as ApiFeedbackStatus;

      if (key in next) {
        next[key] = item.value ?? 0;
      }
    }

    return next;
  }, [stats]);

  const filterOptions = useMemo(
    () => [{ key: "ALL", label: "全部状态" }, ...STATUS_OPTIONS],
    [],
  );

  return (
    <AdminLayout>
      <div className="max-w-[1200px] mx-auto space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">反馈处理中心</h1>
            <p className="text-default-500 text-small">
              受理用户反馈并给出处理回复，回复后用户会收到系统通知。
            </p>
          </div>
          <div className="w-full md:w-[220px]">
            <Select
              label="状态筛选"
              selectedKeys={statusFilter ? [statusFilter] : ["ALL"]}
              items={filterOptions}
              size="sm"
              variant="bordered"
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as ApiFeedbackStatus | "ALL";

                setStatusFilter(value === "ALL" ? "" : value);
                setPage(1);
              }}
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATUS_OPTIONS.map((item) => (
            <Card key={item.key} className="border border-default-200 shadow-none">
              <CardBody className="py-3">
                <p className="text-xs text-default-500">{item.label}</p>
                <p className="text-xl font-bold">{statusStats[item.key]}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card className="border border-default-200 shadow-none">
          <CardHeader className="pb-0 flex items-center justify-between">
            <h2 className="text-lg font-semibold">反馈列表</h2>
            <span className="text-sm text-default-500">
              共 {data?.totalElements ?? 0} 条
            </span>
          </CardHeader>
          <CardBody className="space-y-4">
            {isLoading && <Spinner label="正在加载反馈..." />}
            {!isLoading && (data?.content?.length ?? 0) === 0 && (
              <p className="text-sm text-default-500">当前筛选条件下暂无反馈。</p>
            )}
            {(data?.content ?? []).map((item) => (
              <div
                key={item.feedbackId}
                className="rounded-xl border border-default-100 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.subject}</p>
                    <p className="text-xs text-default-500">
                      用户：{item.username} · 类别：{item.category}
                    </p>
                  </div>
                  <Chip
                    color={STATUS_META[item.status]?.color ?? "default"}
                    size="sm"
                    variant="flat"
                  >
                    {STATUS_META[item.status]?.label ?? item.status}
                  </Chip>
                </div>
                <p className="text-sm text-default-700 whitespace-pre-wrap">
                  {item.content}
                </p>
                {(item.messages?.length ?? 0) > 1 && (
                  <div className="rounded-lg bg-default-50 p-3 text-sm text-default-600 whitespace-pre-wrap">
                    会话消息：{item.messages?.length ?? 0} 条
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-default-400">
                  <span>
                    提交：{String(item.createTime ?? "").slice(0, 16).replace("T", " ")}
                  </span>
                  <Button
                    color="primary"
                    size="sm"
                    variant="flat"
                    onPress={() => openReplyModal(item)}
                  >
                    打开会话
                  </Button>
                </div>
              </div>
            ))}
            {(data?.totalPages ?? 0) > 1 && (
              <div className="flex justify-center">
                <Pagination
                  page={page}
                  showControls
                  total={data?.totalPages ?? 1}
                  onChange={setPage}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={!!selected} size="2xl" onOpenChange={() => closeReplyModal()}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>反馈会话</ModalHeader>
              <ModalBody className="space-y-4">
                <p className="text-sm text-default-600">
                  主题：{selected?.subject ?? "-"}
                </p>
                <div className="rounded-xl border border-default-200 bg-default-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-default-500">
                    <span>完整对话</span>
                    <span>{selected?.messages?.length ?? 0} 条消息</span>
                  </div>
                  <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {(selected?.messages ?? []).map((message, index) =>
                      renderMessage(message, index),
                    )}
                  </div>
                </div>
                <Select
                  label="处理状态"
                  selectedKeys={[replyStatus]}
                  variant="bordered"
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as ApiFeedbackStatus;

                    if (value) {
                      setReplyStatus(value);
                    }
                  }}
                >
                  {STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>
                <Textarea
                  label="回复内容"
                  minRows={4}
                  placeholder="继续回复用户，支持多轮沟通"
                  value={replyContent}
                  variant="bordered"
                  onValueChange={setReplyContent}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  onPress={() => {
                    onClose();
                    closeReplyModal();
                  }}
                >
                  取消
                </Button>
                <Button color="primary" isLoading={submitting} onPress={handleReply}>
                  发送回复
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AdminLayout>
  );
}
