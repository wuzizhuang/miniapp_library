import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from "@heroui/react";
import { toast } from "sonner";

import DefaultLayout from "@/components/layouts/default";
import { useAuth } from "@/config/authContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { feedbackService } from "@/services/api/feedbackService";
import { ApiFeedbackCategory, ApiFeedbackDto, ApiFeedbackMessageDto, ApiFeedbackStatus } from "@/types/api";

const CATEGORY_OPTIONS: Array<{ key: ApiFeedbackCategory; label: string }> = [
  { key: "BOOK_INFO", label: "图书信息问题" },
  { key: "SYSTEM_BUG", label: "系统故障" },
  { key: "SERVICE_EXPERIENCE", label: "服务体验" },
  { key: "SUGGESTION", label: "功能建议" },
  { key: "OTHER", label: "其他" },
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

const FEEDBACK_DRAFT_STORAGE_KEY = "help-feedback:draft";

export default function HelpFeedbackPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [sendingReplyId, setSendingReplyId] = useState<number | null>(null);
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    category: "SUGGESTION" as ApiFeedbackCategory,
    subject: "",
    content: "",
    contactEmail: "",
  });
  const hasHydratedDraftRef = useRef(false);

  const { data, mutate } = useSWR(
    user ? ["my-feedback", page] : null,
    () => feedbackService.getMyFeedback(page - 1, 8),
  );
  const highlightId = useMemo(() => {
    const raw = router.query.highlight;
    const value = Array.isArray(raw) ? raw[0] : raw;

    return value ? Number(value) : null;
  }, [router.query.highlight]);

  useEffect(() => {
    if (!highlightId || !data?.content?.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById(`feedback-${highlightId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [highlightId, data?.content]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawDraft = sessionStorage.getItem(FEEDBACK_DRAFT_STORAGE_KEY);

      if (!rawDraft) {
        return;
      }

      const parsedDraft = JSON.parse(rawDraft) as Partial<typeof form>;

      setForm((current) => ({
        category:
          parsedDraft.category && CATEGORY_OPTIONS.some((item) => item.key === parsedDraft.category)
            ? parsedDraft.category
            : current.category,
        subject: typeof parsedDraft.subject === "string" ? parsedDraft.subject : current.subject,
        content: typeof parsedDraft.content === "string" ? parsedDraft.content : current.content,
        contactEmail:
          typeof parsedDraft.contactEmail === "string"
            ? parsedDraft.contactEmail
            : current.contactEmail,
      }));
    } catch {
      sessionStorage.removeItem(FEEDBACK_DRAFT_STORAGE_KEY);
    } finally {
      hasHydratedDraftRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedDraftRef.current) {
      return;
    }

    const hasDraftContent =
      form.subject.trim().length > 0 ||
      form.content.trim().length > 0 ||
      form.contactEmail.trim().length > 0;

    if (!hasDraftContent && form.category === "SUGGESTION") {
      sessionStorage.removeItem(FEEDBACK_DRAFT_STORAGE_KEY);

      return;
    }

    sessionStorage.setItem(FEEDBACK_DRAFT_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("请先登录后再提交反馈");
      if (typeof window !== "undefined") {
        sessionStorage.setItem(FEEDBACK_DRAFT_STORAGE_KEY, JSON.stringify(form));
      }
      await router.push({
        pathname: "/auth/login",
        query: { redirect: router.asPath || "/help-feedback" },
      });

      return;
    }
    if (!form.subject.trim() || !form.content.trim()) {
      toast.error("请填写反馈主题和详细内容");

      return;
    }

    try {
      setSubmitting(true);
      await feedbackService.createFeedback({
        category: form.category,
        subject: form.subject.trim(),
        content: form.content.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
      });
      toast.success("反馈已提交，我们会尽快处理");
      setForm((prev) => ({ ...prev, subject: "", content: "", contactEmail: "" }));
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(FEEDBACK_DRAFT_STORAGE_KEY);
      }
      setPage(1);
      await mutate();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "提交失败，请稍后重试"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateFeedbackInCurrentPage = async (updated: ApiFeedbackDto) => {
    await mutate(
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
    );
  };

  const handleFollowUp = async (feedbackId: number) => {
    const content = followUpDrafts[feedbackId]?.trim();

    if (!content) {
      toast.error("请输入补充内容");

      return;
    }

    try {
      setSendingReplyId(feedbackId);
      const updated = await feedbackService.followUpFeedback(feedbackId, { content });

      await updateFeedbackInCurrentPage(updated);
      setReplyingId(null);
      setFollowUpDrafts((current) => ({ ...current, [feedbackId]: "" }));
      toast.success("补充内容已发送");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "发送失败，请稍后重试"));
    } finally {
      setSendingReplyId(null);
    }
  };

  const renderMessage = (message: ApiFeedbackMessageDto, index: number) => {
    const isAdminMessage = message.senderType === "ADMIN";

    return (
      <div
        key={`${message.messageId ?? "legacy"}-${index}`}
        className={`flex ${isAdminMessage ? "justify-start" : "justify-end"}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
            isAdminMessage
              ? "bg-primary-50 text-default-700"
              : "bg-default-100 text-default-700"
          }`}
        >
          <div className="mb-1 flex items-center gap-2 text-xs text-default-400">
            <span>{isAdminMessage ? message.senderName || "管理员" : "我"}</span>
            <span>{String(message.createTime ?? "").slice(0, 16).replace("T", " ")}</span>
          </div>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <DefaultLayout>
        <div className="max-w-5xl mx-auto p-6">
          <Spinner label="正在加载..." />
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="border border-default-200">
          <CardHeader className="pb-0 flex-col items-start">
            <h1 className="text-2xl font-bold">帮助与反馈</h1>
            <p className="text-default-500 text-sm">
              你可以提交图书信息问题、系统故障和功能建议，管理员会在后台处理并回复。
            </p>
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="反馈类型"
              selectedKeys={[form.category]}
              variant="bordered"
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as ApiFeedbackCategory;

                if (value) {
                  setForm((prev) => ({ ...prev, category: value }));
                }
              }}
            >
              {CATEGORY_OPTIONS.map((item) => (
                <SelectItem key={item.key}>{item.label}</SelectItem>
              ))}
            </Select>
            <Input
              label="联系方式（可选）"
              placeholder="邮箱或手机号"
              value={form.contactEmail}
              variant="bordered"
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, contactEmail: value }))
              }
            />
            <Input
              className="md:col-span-2"
              label="反馈主题"
              placeholder="一句话概括问题"
              value={form.subject}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, subject: value }))}
            />
            <Textarea
              className="md:col-span-2"
              label="详细描述"
              minRows={4}
              placeholder="请尽量描述复现步骤、页面路径或你希望的改进方式"
              value={form.content}
              variant="bordered"
              onValueChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
            />
            <div className="md:col-span-2 flex justify-end">
              <Button color="primary" isLoading={submitting} onPress={handleSubmit}>
                提交反馈
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200">
          <CardHeader className="pb-0 flex items-center justify-between">
            <h2 className="text-lg font-semibold">我的反馈记录</h2>
            <span className="text-sm text-default-500">
              共 {data?.totalElements ?? 0} 条
            </span>
          </CardHeader>
          <CardBody className="space-y-4">
            {!user && (
              <div className="text-default-500 text-sm">
                登录后可查看你的历史反馈与管理员回复。
              </div>
            )}
            {user && !data && <Spinner label="正在加载反馈记录..." />}
            {user && data && data.content.length === 0 && (
              <div className="text-default-500 text-sm">暂无反馈记录。</div>
            )}
            {user &&
              data?.content.map((item) => (
                <div
                  key={item.feedbackId}
                  id={`feedback-${item.feedbackId}`}
                  className={`rounded-xl border p-4 space-y-2 ${highlightId === item.feedbackId ? "border-primary-300 bg-primary-50 ring-2 ring-primary-200" : "border-default-100"}`}
                >
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="font-semibold">{item.subject}</div>
                    <Chip
                      color={STATUS_META[item.status]?.color ?? "default"}
                      size="sm"
                      variant="flat"
                    >
                      {STATUS_META[item.status]?.label ?? item.status}
                    </Chip>
                  </div>
                  <div className="space-y-3 rounded-xl border border-default-100 bg-content2/60 p-3">
                    {(item.messages ?? []).map((message, index) =>
                      renderMessage(message, index),
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-default-400">
                    <span>
                      提交时间：{String(item.createTime ?? "").slice(0, 16).replace("T", " ")}
                    </span>
                    <Button
                      color="primary"
                      size="sm"
                      variant="flat"
                      onPress={() =>
                        setReplyingId((current) =>
                          current === item.feedbackId ? null : item.feedbackId,
                        )
                      }
                    >
                      {replyingId === item.feedbackId ? "收起输入框" : item.status === "RESOLVED" || item.status === "REJECTED" ? "继续追问" : "补充信息"}
                    </Button>
                  </div>
                  {replyingId === item.feedbackId ? (
                    <div className="space-y-3 rounded-xl border border-primary-100 bg-primary-50/70 p-3">
                      <Textarea
                        label="继续补充"
                        minRows={3}
                        placeholder="继续描述问题进展、补充截图说明或追问管理员"
                        value={followUpDrafts[item.feedbackId] ?? ""}
                        variant="bordered"
                        onValueChange={(value) =>
                          setFollowUpDrafts((current) => ({
                            ...current,
                            [item.feedbackId]: value,
                          }))
                        }
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => setReplyingId(null)}
                        >
                          取消
                        </Button>
                        <Button
                          color="primary"
                          size="sm"
                          isLoading={sendingReplyId === item.feedbackId}
                          onPress={() => handleFollowUp(item.feedbackId)}
                        >
                          发送补充
                        </Button>
                      </div>
                    </div>
                  ) : null}
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
    </DefaultLayout>
  );
}
