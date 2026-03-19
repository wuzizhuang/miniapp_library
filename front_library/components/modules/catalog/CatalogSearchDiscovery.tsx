import {
  Button,
  Card,
  CardBody,
  Chip,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { getApiErrorMessage } from "@/lib/apiError";
import { ApiSearchLogDto } from "@/types/api";

interface CatalogSearchDiscoveryProps {
  history: ApiSearchLogDto[];
  historyError?: unknown;
  historyLoading: boolean;
  hotKeywords: string[];
  hotKeywordsError?: unknown;
  hotKeywordsLoading: boolean;
  isLoggedIn: boolean;
  keyword: string;
  suggestions: string[];
  suggestionsError?: unknown;
  suggestionsLoading: boolean;
  onSelectKeyword: (keyword: string) => void;
}

function KeywordList({
  emptyText,
  icon,
  items,
  loading,
  title,
  onSelectKeyword,
  error,
}: {
  emptyText: string;
  error?: unknown;
  icon: string;
  items: string[];
  loading: boolean;
  title: string;
  onSelectKeyword: (keyword: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="text-slate-400 dark:text-slate-400" icon={icon} width={18} />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">{title}</h3>
      </div>
      {loading ? (
        <div className="flex min-h-10 items-center">
          <Spinner color="primary" size="sm" />
        </div>
      ) : error ? (
        <p className="text-sm text-danger-600 dark:text-danger-300">
          {getApiErrorMessage(error, `${title}暂时不可用，请稍后重试。`)}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Button
              key={`${title}-${item}`}
              className="border border-slate-200/80 bg-white/82 text-slate-700 hover:bg-slate-100 dark:border-white/8 dark:bg-white/6 dark:text-slate-100 dark:hover:bg-white/12"
              radius="full"
              size="sm"
              startContent={<Icon icon="solar:magnifer-linear" width={14} />}
              variant="flat"
              onPress={() => onSelectKeyword(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CatalogSearchDiscovery({
  history,
  historyError,
  historyLoading,
  hotKeywords,
  hotKeywordsError,
  hotKeywordsLoading,
  isLoggedIn,
  keyword,
  suggestions,
  suggestionsError,
  suggestionsLoading,
  onSelectKeyword,
}: CatalogSearchDiscoveryProps) {
  const trimmedKeyword = keyword.trim();
  const uniqueHistoryKeywords = Array.from(
    new Set(
      history
        .map((item) => item.keyword?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 8);

  if (trimmedKeyword) {
    return (
      <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 shadow-[0_28px_70px_-44px_rgba(148,163,184,0.28)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.78))] dark:shadow-[0_28px_70px_-44px_rgba(15,23,42,0.95)]">
        <CardBody className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Icon className="text-primary" icon="solar:widget-6-bold-duotone" width={20} />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">搜索联想</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                正在为 “{trimmedKeyword}” 提供联想词，点击即可跳到对应目录结果。
              </p>
            </div>
            <Chip className="border border-primary/20 bg-primary/10 text-primary-700 dark:border-primary/30 dark:bg-primary/15 dark:text-primary-50" size="sm" variant="flat">
              实时建议
            </Chip>
          </div>
          <KeywordList
            emptyText="暂时没有匹配的联想词，试试更短或更通用的关键词。"
            error={suggestionsError}
            icon="solar:chat-round-bold-duotone"
            items={suggestions}
            loading={suggestionsLoading}
            title="联想词"
            onSelectKeyword={onSelectKeyword}
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 shadow-[0_28px_70px_-44px_rgba(148,163,184,0.28)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.76))] dark:shadow-[0_28px_70px_-44px_rgba(15,23,42,0.95)]">
      <CardBody className="grid gap-6 p-4 md:grid-cols-2 md:gap-8 md:p-5">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="text-warning-500" icon="solar:fire-bold-duotone" width={20} />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">热门搜索</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              当前系统热度最高的检索词，可直接带你回到目录结果。
            </p>
          </div>
          <KeywordList
            emptyText="当前还没有热门搜索关键词。"
            error={hotKeywordsError}
            icon="solar:fire-square-bold"
            items={hotKeywords}
            loading={hotKeywordsLoading}
            title="热词"
            onSelectKeyword={onSelectKeyword}
          />
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="text-secondary-500" icon="solar:history-bold-duotone" width={20} />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">最近搜索</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {isLoggedIn
                ? "登录用户最近的检索记录，点击可再次检索。"
                : "登录后可查看并复用最近搜索记录。"}
            </p>
          </div>
          {!isLoggedIn ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-white/12 dark:bg-white/5 dark:text-slate-400">
              登录后，这里会显示你的最近搜索历史。
            </div>
          ) : (
            <KeywordList
              emptyText="还没有搜索历史，试试先搜索一本书。"
              error={historyError}
              icon="solar:history-bold"
              items={uniqueHistoryKeywords}
              loading={historyLoading}
              title="历史记录"
              onSelectKeyword={onSelectKeyword}
            />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
