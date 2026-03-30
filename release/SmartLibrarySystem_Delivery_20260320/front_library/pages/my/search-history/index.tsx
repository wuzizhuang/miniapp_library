import React from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Skeleton,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import DefaultLayout from "@/components/layouts/default";
import { getApiErrorMessage } from "@/lib/apiError";
import { searchService } from "@/services/api/searchService";

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SearchHistoryPage() {
  const router = useRouter();
  const { data: historyData, error: historyError, isLoading, mutate: mutateHistory } = useSWR(
    "my-search-history",
    () => searchService.getMyHistory(0, 50),
  );
  const { data: hotKeywords = [], error: hotKeywordsError } = useSWR(
    "search-hot-keywords-page",
    () => searchService.getHotKeywords(10),
  );

  const history = historyData?.content ?? [];

  return (
    <DefaultLayout>
      <section className="container mx-auto max-w-4xl px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">搜索历史</h1>
          <p className="mt-2 text-default-500">查看最近检索记录，并一键回到对应的书目结果页。</p>
        </div>

        <Card className="mb-6 border border-default-100 shadow-sm">
          <CardHeader className="px-5 pb-0 pt-5">
            <div>
              <h2 className="text-lg font-semibold">热门搜索</h2>
              <p className="text-sm text-default-400">来自当前已接入的后端热词接口</p>
            </div>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2 px-5 pb-5 pt-4">
            {hotKeywordsError ? (
              <p className="text-sm text-danger-600">热门搜索暂时不可用，请稍后刷新重试。</p>
            ) : hotKeywords.length === 0 ? (
              <p className="text-sm text-default-400">暂无热门关键词</p>
            ) : (
              hotKeywords.map((keyword) => (
                <Button
                  key={keyword}
                  size="sm"
                  variant="flat"
                  onPress={() => router.push(`/books?query=${encodeURIComponent(keyword)}`)}
                >
                  {keyword}
                </Button>
              ))
            )}
          </CardBody>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : historyError ? (
          <RequestErrorCard
            message={getApiErrorMessage(historyError, "搜索历史加载失败，请稍后重试。")}
            title="搜索历史加载失败"
            onRetry={() => void mutateHistory()}
          />
        ) : history.length === 0 ? (
          <Card className="border border-dashed border-default-200 shadow-none">
            <CardBody className="py-16 text-center text-default-400">
              <Icon className="mx-auto mb-3 opacity-40" icon="solar:magnifer-zoom-in-bold-duotone" width={52} />
              <p className="text-base font-medium text-default-600">还没有搜索历史</p>
              <p className="mt-1 text-sm">从顶部搜索框或馆藏目录发起检索后，记录会自动出现在这里。</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.searchId} className="border border-default-100 shadow-sm">
                <CardBody className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{item.keyword}</h2>
                      <Chip size="sm" variant="flat">
                        {item.resultCount ?? 0} 条结果
                      </Chip>
                    </div>
                    <p className="text-sm text-default-400">{formatTime(item.searchTime)}</p>
                  </div>
                  <Button
                    color="primary"
                    size="sm"
                    variant="flat"
                    onPress={() => router.push(`/books?query=${encodeURIComponent(item.keyword)}`)}
                  >
                    再搜一次
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
