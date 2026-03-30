import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import {
  Button,
  Input,
  Pagination,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import DefaultLayout from "@/components/layouts/default";
import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import { useDebounce } from "@/hooks/useDebounce";
import { getApiErrorMessage } from "@/lib/apiError";
import { catalogMetadataService } from "@/services/api/catalogMetadataService";
import { ApiAuthorDto } from "@/types/api";
import { SearchIcon } from "@/components/common/site-icons";

const PAGE_SIZE = 12;

export default function AuthorsPage() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const debouncedKeyword = useDebounce(searchValue, 400);

  const {
    data: authorsData,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR(
    ["authors-list", debouncedKeyword],
    async ([, keyword]) => {
      if (keyword.trim()) {
        const page = await catalogMetadataService.searchAuthors(keyword, 0, 200);
        return page.content;
      }
      const page = await catalogMetadataService.getAuthors(0, 200);
      return page.content;
    },
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  const authors = useMemo<ApiAuthorDto[]>(() => authorsData ?? [], [authorsData]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword]);

  // 从 URL 参数初始化搜索值
  useEffect(() => {
    if (!router.isReady) return;
    const queryKeyword = router.query.q;
    if (typeof queryKeyword === "string") {
      setSearchValue(queryKeyword);
    }
  }, [router.isReady, router.query.q]);

  const totalPages = Math.ceil(authors.length / PAGE_SIZE) || 1;
  const pagedAuthors = useMemo(
    () => authors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [authors, page],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleGoToAuthor = useCallback(
    (authorId: number) => {
      void router.push(`/books?query=author:${authorId}`);
    },
    [router],
  );

  return (
    <DefaultLayout>
      <section className="mx-auto max-w-6xl py-6">
        {/* 顶部标题区 */}
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(140deg,rgba(255,255,255,0.94),rgba(240,247,255,0.96)_55%,rgba(229,241,255,0.98))] px-5 py-6 shadow-[0_28px_70px_-42px_rgba(148,163,184,0.28)] sm:px-7 dark:border-white/10 dark:bg-[linear-gradient(140deg,rgba(15,23,42,0.92),rgba(9,16,34,0.86)_55%,rgba(10,37,84,0.92))] dark:shadow-[0_28px_70px_-42px_rgba(8,15,36,0.85)]">
          <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-400/10" />
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-700/70 dark:text-sky-200/70">
                Authors Directory
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem] dark:text-white">
                作者目录
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                共收录{" "}
                <span className="font-bold text-sky-600 dark:text-sky-300">{authors.length}</span>
                {" "}位作者，可搜索姓名或按字母浏览。
              </p>
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="mt-4 flex w-full flex-col gap-3 rounded-[28px] border border-slate-200/80 bg-white/82 p-3 shadow-[0_24px_60px_-42px_rgba(148,163,184,0.3)] backdrop-blur-xl sm:flex-row sm:items-center sm:p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.76))] dark:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.9)]">
          <Input
            isClearable
            className="w-full sm:max-w-[50%]"
            classNames={{
              input:
                "text-sm text-slate-700 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500",
              inputWrapper:
                "h-14 rounded-2xl border border-slate-200/80 bg-white px-4 shadow-none data-[hover=true]:bg-slate-50 group-data-[focus=true]:border-primary/35 group-data-[focus=true]:bg-white dark:border-white/10 dark:bg-black/25 dark:data-[hover=true]:bg-black/30 dark:group-data-[focus=true]:border-primary/45 dark:group-data-[focus=true]:bg-black/35",
            }}
            placeholder="搜索作者名称..."
            startContent={<SearchIcon className="text-default-400" />}
            value={searchValue}
            onClear={() => setSearchValue("")}
            onValueChange={setSearchValue}
          />
        </div>

        {/* 内容区 */}
        <div className="mt-6 min-h-[400px]">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Spinner color="primary" label="正在加载作者数据..." size="lg" />
            </div>
          ) : fetchError ? (
            <RequestErrorCard
              message={getApiErrorMessage(fetchError, "作者列表加载失败，请稍后重试。")}
              title="作者列表加载失败"
              onRetry={() => {
                void mutate();
              }}
            />
          ) : pagedAuthors.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center rounded-[28px] border border-slate-200/80 bg-white/88 px-6 text-center text-slate-600 shadow-[0_28px_70px_-44px_rgba(148,163,184,0.28)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(15,23,42,0.72))] dark:text-slate-300 dark:shadow-[0_28px_70px_-44px_rgba(15,23,42,0.95)]">
              <p className="text-xl font-bold text-slate-900 dark:text-white">未找到匹配的作者</p>
              <p className="mt-2 text-sm">尝试更换搜索词或查看全部作者。</p>
              <Button
                className="mt-5 border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/8 dark:text-white"
                color="primary"
                radius="full"
                size="sm"
                variant="flat"
                onPress={() => setSearchValue("")}
              >
                清除搜索
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pagedAuthors.map((author) => (
                <button
                  key={author.authorId}
                  className="group rounded-[24px] border border-slate-200/80 bg-white/80 p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:hover:border-white/20"
                  onClick={() => handleGoToAuthor(author.authorId)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 text-lg font-bold text-indigo-600 dark:from-indigo-500/20 dark:to-sky-500/15 dark:text-indigo-200">
                      {author.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {author.name}
                      </p>
                      <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                        {author.biography || "暂无介绍"}
                      </p>
                    </div>
                    <Icon
                      className="text-slate-300 transition group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-300"
                      icon="solar:arrow-right-linear"
                      width={20}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 分页 */}
        {!isLoading && !fetchError && authors.length > PAGE_SIZE && (
          <div className="mt-12 mb-8 flex w-full justify-center">
            <Pagination
              classNames={{
                base: "rounded-full border border-slate-200/80 bg-white/85 px-2 py-2 shadow-lg shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/20",
                cursor: "bg-primary text-white shadow-md shadow-primary/30",
                item: "text-slate-600 data-[hover=true]:bg-slate-100 dark:text-slate-300 dark:data-[hover=true]:bg-white/8",
                next: "text-slate-600 data-[hover=true]:bg-slate-100 dark:text-slate-200 dark:data-[hover=true]:bg-white/8",
                prev: "text-slate-600 data-[hover=true]:bg-slate-100 dark:text-slate-200 dark:data-[hover=true]:bg-white/8",
              }}
              showControls
              color="primary"
              page={page}
              total={totalPages}
              variant="flat"
              onChange={setPage}
            />
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
