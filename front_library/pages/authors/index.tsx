"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Pagination,
  Skeleton,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import DefaultLayout from "@/components/layouts/default";
import { AppImage } from "@/components/common/AppImage";
import { useDebounce } from "@/hooks/useDebounce";
import { catalogMetadataService } from "@/services/api/catalogMetadataService";
import { bookService } from "@/services/api/bookService";

const AUTHOR_PAGE_SIZE = 10;
const AUTHOR_BOOK_PAGE_SIZE = 5;

function formatYears(birthYear?: number | null, deathYear?: number | null) {
  if (!birthYear && !deathYear) {
    return "生平信息待补充";
  }

  return `${birthYear ?? "?"} - ${deathYear ?? "今"}`;
}

function buildBiographyPreview(biography?: string) {
  const trimmed = biography?.trim();

  if (!trimmed) {
    return "暂无作者简介，后续可在后台继续补充。";
  }

  return trimmed;
}

export default function AuthorsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [booksPage, setBooksPage] = useState(1);
  const debouncedSearchValue = useDebounce(searchValue, 300);
  const trimmedSearchValue = debouncedSearchValue.trim();

  const {
    data: authorPage,
    isLoading: authorsLoading,
    error: authorsError,
  } = useSWR(
    ["authors-public", page, trimmedSearchValue],
    () =>
      trimmedSearchValue
        ? catalogMetadataService.searchAuthors(trimmedSearchValue, page - 1, AUTHOR_PAGE_SIZE)
        : catalogMetadataService.getAuthors(page - 1, AUTHOR_PAGE_SIZE),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const authors = authorPage?.content ?? [];

  useEffect(() => {
    setPage(1);
  }, [trimmedSearchValue]);

  useEffect(() => {
    if (!authors.length) {
      setSelectedAuthorId(null);
      return;
    }

    const hasSelectedAuthor = authors.some((author) => author.authorId === selectedAuthorId);

    if (!hasSelectedAuthor) {
      setSelectedAuthorId(authors[0].authorId);
      setBooksPage(1);
    }
  }, [authors, selectedAuthorId]);

  const selectedAuthor = useMemo(
    () => authors.find((author) => author.authorId === selectedAuthorId) ?? authors[0] ?? null,
    [authors, selectedAuthorId],
  );

  const {
    data: authorBooksPage,
    isLoading: authorBooksLoading,
    error: authorBooksError,
  } = useSWR(
    selectedAuthor?.authorId ? ["author-books", selectedAuthor.authorId, booksPage] : null,
    ([, authorId, currentPage]) =>
      bookService.getBooksByAuthor(Number(authorId), Number(currentPage) - 1, AUTHOR_BOOK_PAGE_SIZE),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const authorBooks = authorBooksPage?.content ?? [];

  return (
    <DefaultLayout>
      <section className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(251,191,36,0.08),transparent_16%),linear-gradient(180deg,#07101c_0%,#0b1525_42%,#111827_100%)] text-white">
        <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.9),rgba(13,22,38,0.84))] shadow-[0_28px_80px_-40px_rgba(2,6,23,0.82)]">
            <div className="relative px-6 py-8 md:px-8 md:py-10">
              <div className="absolute -left-12 top-6 h-32 w-32 rounded-full bg-sky-500/12 blur-3xl" />
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl space-y-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-sky-200/75">
                    Author Directory
                  </p>
                  <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                    作者名录
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                    按照馆藏目录的浏览方式重构作者页。现在可以像查馆藏一样搜索作者、切换作者，并直接查看这位作者在馆图书。
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,340px)_auto]">
                  <Input
                    isClearable
                    className="min-w-0"
                    classNames={{
                      inputWrapper: "border border-white/10 bg-white/5 backdrop-blur",
                      input: "text-white placeholder:text-slate-500",
                    }}
                    placeholder="搜索作者姓名"
                    startContent={
                      <Icon className="text-slate-500" icon="solar:magnifer-linear" width={18} />
                    }
                    value={searchValue}
                    onClear={() => setSearchValue("")}
                    onValueChange={setSearchValue}
                  />
                  <Button
                    className="border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] text-slate-200"
                    radius="full"
                    startContent={<Icon icon="solar:restart-linear" width={18} />}
                    variant="flat"
                    onPress={() => {
                      setSearchValue("");
                      setPage(1);
                    }}
                  >
                    清空搜索
                  </Button>
                </div>
              </div>

              <div className="relative z-10 mt-6 flex flex-wrap gap-2">
                <Chip className="bg-primary/20 text-primary-50" variant="flat">
                  {trimmedSearchValue ? `检索：${trimmedSearchValue}` : "全部作者"}
                </Chip>
                <Chip className="bg-white/10 text-white" variant="flat">
                  当前页 {authors.length} 位
                </Chip>
                <Chip className="bg-white/10 text-white" variant="flat">
                  共 {authorPage?.totalElements ?? 0} 位作者
                </Chip>
                <Chip className="bg-white/10 text-white" variant="flat">
                  每页 10 位
                </Chip>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.95fr)]">
            <div className="space-y-6">
              {authorsError ? (
                <Card className="border border-danger-500/30 bg-danger-500/10">
                  <CardBody className="py-12 text-center text-danger-100">
                    作者列表加载失败，请稍后刷新重试。
                  </CardBody>
                </Card>
              ) : authorsLoading ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-72 rounded-[28px]" />
                  ))}
                </div>
              ) : authors.length === 0 ? (
                <Card className="border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(30,41,59,0.5))]">
                  <CardBody className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
                    <div className="rounded-full border border-white/10 bg-white/10 p-4 text-slate-300">
                      <Icon icon="solar:user-search-linear" width={28} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">没有找到匹配的作者</p>
                      <p className="mt-2 text-sm text-slate-400">
                        试试输入更短的姓名片段，或者清空后浏览完整作者列表。
                      </p>
                    </div>
                    <Button
                      color="primary"
                      radius="full"
                      variant="flat"
                      onPress={() => setSearchValue("")}
                    >
                      查看全部作者
                    </Button>
                  </CardBody>
                </Card>
              ) : (
                <>
                  <div className="grid gap-5 md:grid-cols-2">
                    {authors.map((author) => {
                      const isSelected = author.authorId === selectedAuthor?.authorId;

                      return (
                        <Card
                          key={author.authorId}
                          className={`overflow-hidden border transition-all ${
                            isSelected
                              ? "border-primary/50 bg-[linear-gradient(180deg,rgba(16,26,48,0.98),rgba(12,19,35,0.95))] shadow-[0_20px_55px_-32px_rgba(37,99,235,0.85)]"
                              : "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(9,14,26,0.9))] shadow-[0_20px_45px_-35px_rgba(0,0,0,0.85)] hover:border-white/20"
                          }`}
                        >
                          <CardHeader className="flex flex-col items-start gap-3 px-5 pt-5">
                            <div className="flex w-full items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                                  Author #{author.authorId}
                                </p>
                                <h2 className="mt-2 truncate text-3xl font-bold text-white">
                                  {author.name}
                                </h2>
                              </div>
                              <Chip
                                className={
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-white/10 text-slate-300"
                                }
                                size="sm"
                                variant="flat"
                              >
                                {isSelected ? "当前查看" : "作者卡片"}
                              </Chip>
                            </div>
                            <p className="text-sm text-slate-400">
                              {formatYears(author.birthYear, author.deathYear)}
                            </p>
                          </CardHeader>

                          <CardBody className="flex h-full flex-col justify-between px-5 pb-5 pt-1">
                            <p className="line-clamp-4 text-sm leading-8 text-slate-300">
                              {buildBiographyPreview(author.biography)}
                            </p>

                            <div className="mt-6 flex items-end justify-between gap-3">
                              <p className="text-xs leading-6 text-slate-500">
                                点击后在右侧查看这位作者的馆藏图书
                              </p>
                              <Button
                                color={isSelected ? "primary" : "default"}
                                radius="full"
                                size="sm"
                                variant={isSelected ? "solid" : "flat"}
                                onPress={() => {
                                  setSelectedAuthorId(author.authorId);
                                  setBooksPage(1);
                                }}
                              >
                                {isSelected ? "正在查看" : "查看作品"}
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>

                  {authorPage && authorPage.totalPages > 1 ? (
                    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.68),rgba(30,41,59,0.48))] px-5 py-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            作者页码 {page} / {authorPage.totalPages}
                          </p>
                          <p className="text-xs text-slate-400">
                            以目录式浏览方式逐页查看作者信息
                          </p>
                        </div>
                        <Pagination
                          showControls
                          color="primary"
                          page={page}
                          radius="full"
                          total={authorPage.totalPages}
                          variant="flat"
                          onChange={setPage}
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="xl:sticky xl:top-24 xl:self-start">
              <Card className="overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,13,24,0.95))] shadow-[0_28px_70px_-36px_rgba(0,0,0,0.85)]">
                <CardHeader className="flex flex-col items-start gap-3 px-5 pt-5">
                  <div className="flex w-full items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Author Works
                      </p>
                      {selectedAuthor ? (
                        <>
                          <h2 className="mt-3 text-3xl font-bold text-white">
                            {selectedAuthor.name}
                          </h2>
                          <p className="mt-2 text-sm text-slate-400">
                            {formatYears(selectedAuthor.birthYear, selectedAuthor.deathYear)}
                          </p>
                        </>
                      ) : (
                        <h2 className="mt-3 text-2xl font-bold text-white">选择作者</h2>
                      )}
                    </div>
                    <Chip className="bg-primary/20 text-primary-50" variant="flat">
                      馆藏作品
                    </Chip>
                  </div>

                  {selectedAuthor ? (
                    <p className="text-sm leading-7 text-slate-300">
                      {buildBiographyPreview(selectedAuthor.biography)}
                    </p>
                  ) : (
                    <p className="text-sm leading-7 text-slate-400">
                      从左侧选择作者后，这里会像馆藏目录侧栏一样展示作者的作品与馆藏状态。
                    </p>
                  )}
                </CardHeader>

                <CardBody className="space-y-4 px-5 pb-5 pt-2">
                  {selectedAuthor ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">作者图书</p>
                          <p className="text-xs text-slate-400">
                            支持继续进入图书详情页查看借阅、预约与馆藏位置。
                          </p>
                        </div>
                        {authorBooksPage ? (
                          <Chip className="bg-white/10 text-white" variant="flat">
                            共 {authorBooksPage.totalElements ?? 0} 本
                          </Chip>
                        ) : null}
                      </div>

                      {authorBooksLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton key={index} className="h-28 rounded-2xl" />
                          ))}
                        </div>
                      ) : authorBooksError ? (
                        <div className="rounded-2xl border border-danger-500/30 bg-danger-500/10 px-4 py-6 text-sm text-danger-100">
                          作者作品加载失败，请重新选择作者或稍后再试。
                        </div>
                      ) : authorBooks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(30,41,59,0.4))] px-4 py-8 text-center text-sm text-slate-400">
                          这位作者暂时还没有可展示的馆藏图书。
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {authorBooks.map((book) => (
                            <button
                              key={book.bookId}
                              className="flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 p-3 text-left transition hover:border-white/20 hover:bg-white/10"
                              type="button"
                              onClick={() => {
                                void router.push(`/books/${book.bookId}`);
                              }}
                            >
                              <AppImage
                                alt={book.title}
                                className="object-cover"
                                height={92}
                                src={book.coverUrl}
                                width={66}
                                wrapperClassName="h-[92px] w-[66px] shrink-0 rounded-xl bg-slate-800"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 font-semibold text-white">
                                      {book.title}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                      {book.categoryNames?.[0] ?? "未分类"}
                                      {book.publishYear ? ` · ${book.publishYear}` : ""}
                                    </p>
                                  </div>
                                  <Chip
                                    className={
                                      book.availableCount > 0
                                        ? "bg-emerald-500/20 text-emerald-200"
                                        : "bg-white/10 text-slate-300"
                                    }
                                    size="sm"
                                    variant="flat"
                                  >
                                    {book.availableCount > 0 ? `可借 ${book.availableCount}` : "暂无库存"}
                                  </Chip>
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                  ISBN {book.isbn || "暂无"}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {authorBooksPage && authorBooksPage.totalPages > 1 ? (
                        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(30,41,59,0.42))] px-4 py-4">
                          <div className="flex flex-col gap-3">
                            <p className="text-xs text-slate-400">
                              作品页码 {booksPage} / {authorBooksPage.totalPages}
                            </p>
                            <Pagination
                              showControls
                              color="primary"
                              page={booksPage}
                              radius="full"
                              size="sm"
                              total={authorBooksPage.totalPages}
                              variant="flat"
                              onChange={setBooksPage}
                            />
                          </div>
                        </div>
                      ) : null}

                      <Button
                        className="w-full"
                        color="primary"
                        radius="full"
                        startContent={<Icon icon="solar:magnifer-linear" width={18} />}
                        variant="solid"
                        onPress={() => {
                          void router.push(`/books?query=${encodeURIComponent(selectedAuthor.name)}`);
                        }}
                      >
                        在馆藏目录中搜索这位作者
                      </Button>
                    </>
                  ) : (
                    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(30,41,59,0.4))] text-sm text-slate-400">
                      选择作者后可查看其作品与馆藏状态
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
