import type { ApiChatMessageItem } from "@/types/api";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/apiError";
import { publicService } from "@/services/api/publicService";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

// 常用快捷提问，用于降低首次使用门槛。
const quickPrompts = [
  "帮我推荐 3 本适合数据库入门的书",
  "如果想找计算机网络经典教材，应该怎么搜",
  "图书已经借完了，预约流程是怎样的",
  "我想做毕业设计，适合先看哪些软件工程书",
];

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "我是 AI 馆藏助理，可以帮你做图书推荐、关键词建议、借阅规则说明和学习路径梳理。涉及实时馆藏与个人账户数据时，我会提醒你去目录或个人中心核实。",
};

/**
 * 悬浮 AI 助手。
 * 通过公共 AI 接口提供轻量问答能力，主要服务首页和读者前台页面。
 */
export function FloatingAiAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = input.trim().length > 0 && !isSubmitting;
  const conversationCount = Math.max(messages.length - 1, 0);
  const messageCountLabel = useMemo(
    () => (conversationCount > 0 ? `${conversationCount} 条消息` : "待命中"),
    [conversationCount],
  );

  // 面板打开且消息更新后，自动滚动到底部，保证最新回复可见。
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messageViewportRef.current?.scrollTo({
      top: messageViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isOpen, isSubmitting, messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  /**
   * 重置当前会话为欢迎态。
   */
  const resetConversation = () => {
    setMessages([welcomeMessage]);
    setErrorMessage("");
  };

  /**
   * 发送一条消息到公共 AI 服务，并把返回结果追加到对话流中。
   */
  const submitMessage = async (message: string) => {
    const normalized = message.trim();

    if (!normalized) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: normalized,
    };

    setIsOpen(true);
    setInput("");
    setErrorMessage("");
    setIsSubmitting(true);

    // 后端需要完整上下文，因此每次发送都带上当前对话历史。
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);

    try {
      // 欢迎语只用于前端展示，不需要发送给后端。
      const apiMessages: ApiChatMessageItem[] = updatedMessages
        .filter((msg) => msg.id !== "welcome")
        .map((msg) => ({ role: msg.role, content: msg.content }));

      const response = await publicService.chatWithAi({ messages: apiMessages });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.reply,
        },
      ]);
    } catch (error) {
      const nextMessage = getApiErrorMessage(error, "AI 助手暂时不可用，请稍后重试。");

      setErrorMessage(nextMessage);
      toast.error(nextMessage);
      setMessages((current) => current.filter((item) => item.id !== userMessage.id));
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 表单提交统一走 submitMessage，便于键盘回车与快捷提问复用。
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage(input);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(25rem,calc(100vw-1.5rem))] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <section className="pointer-events-auto flex h-[min(72vh,42rem)] w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/95 shadow-[0_32px_90px_-36px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <div className="relative overflow-hidden border-b border-slate-200/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#38bdf8_100%)] px-5 py-4 text-white">
            <div className="absolute -left-6 top-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/14 shadow-[inset_0_1px_10px_rgba(255,255,255,0.35)]">
                  <div className="absolute inset-[6px] rounded-full border border-white/25" />
                  <Icon icon="solar:chat-round-line-bold" width={22} />
                </div>
                <div>
                  <p className="text-base font-semibold">AI 馆藏助理</p>
                  <p className="text-sm text-white/72">像小助手一样常驻在页面右下角</p>
                </div>
              </div>
              <button
                aria-label="收起 AI 助手"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/16"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                <Icon icon="solar:minimize-square-2-linear" width={18} />
              </button>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center gap-2">
              <Chip className="border-none bg-white/12 text-white" radius="full" size="sm" variant="flat">
                Public API
              </Chip>
              <Chip className="border-none bg-white/12 text-white" radius="full" size="sm" variant="flat">
                {messageCountLabel}
              </Chip>
              <Chip className="border-none bg-white/12 text-white" radius="full" size="sm" variant="flat">
                {isSubmitting ? "思考中" : "在线"}
              </Chip>
            </div>
          </div>

          <div className="border-b border-slate-200/70 bg-slate-50/90 px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              快捷提问
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  type="button"
                  onClick={() => {
                    void submitMessage(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={messageViewportRef}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_55%,#f8fafc_100%)] px-4 py-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[1.4rem] px-4 py-3 text-sm leading-6 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.4)] ${
                    message.role === "user"
                      ? "rounded-br-md bg-[linear-gradient(135deg,#2563eb_0%,#0f172a_100%)] text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div
                    className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      message.role === "user" ? "text-white/65" : "text-slate-400"
                    }`}
                  >
                    {message.role === "user" ? "You" : "AI"}
                  </div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isSubmitting ? (
              <div className="flex justify-start">
                <div className="rounded-[1.4rem] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.4)]">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-sky-400 [animation-delay:-0.2s]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.1s]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400" />
                    <span className="ml-1">正在思考...</span>
                  </div>
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <form className="border-t border-slate-200/70 bg-white px-4 py-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="sr-only">发送消息</span>
              <textarea
                className="min-h-[104px] w-full resize-none rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                placeholder="比如：帮我推荐适合毕业设计前期阅读的图书。"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-400">
                提供建议与解释，实时库存和个人借阅状态仍以目录与个人中心为准。
              </p>
              <div className="flex gap-2">
                <Button
                  isDisabled={isSubmitting || messages.length <= 1}
                  radius="full"
                  variant="flat"
                  onPress={resetConversation}
                >
                  新对话
                </Button>
                <Button
                  color="primary"
                  isDisabled={!canSubmit}
                  isLoading={isSubmitting}
                  radius="full"
                  type="submit"
                >
                  发送
                </Button>
              </div>
            </div>
          </form>
        </section>
      ) : null}

      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "收起 AI 助手" : "打开 AI 助手"}
        className="pointer-events-auto group relative inline-flex h-16 w-16 items-center justify-center rounded-full shadow-[0_22px_50px_-18px_rgba(37,99,235,0.65)] transition-transform duration-200 hover:scale-[1.03] focus:outline-none focus:ring-4 focus:ring-sky-200"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_28%,#fef3c7_0%,#7dd3fc_24%,#2563eb_58%,#0f172a_100%)]" />
        <span className="absolute inset-[4px] rounded-full border border-white/25 bg-white/10 shadow-[inset_0_1px_12px_rgba(255,255,255,0.35)]" />
        <span className="absolute -inset-2 rounded-full border border-sky-300/30 opacity-70 transition group-hover:scale-110" />
        <span className="absolute left-3 top-3 h-3 w-3 rounded-full bg-white/80 blur-[1px]" />
        <span className="relative text-white">
          <Icon icon={isOpen ? "solar:close-circle-bold" : "solar:stars-bold"} width={24} />
        </span>
        {conversationCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-bold text-slate-900">
            {conversationCount > 9 ? "9+" : conversationCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
