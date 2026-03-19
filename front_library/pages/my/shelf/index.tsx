import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Pagination,
  Skeleton,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { AppImage } from "@/components/common/AppImage";
import DefaultLayout from "@/components/layouts/default";
import { favoriteService } from "@/services/api/favoriteService";
import { loanService, MyLoan } from "@/services/api/loanService";
import { Book } from "@/types/book";

type ShelfSection = "all" | "favorites" | "active" | "history";
type ShelfViewMode = "list" | "grid";

type ShelfItem =
  | {
      type: "favorite";
      key: string;
      title: string;
      subtitle: string;
      cover?: string;
      href: string;
      primaryLabel: string;
      primaryColor: "success" | "warning";
      meta: string[];
      secondaryLabel?: string;
    }
  | {
      type: "loan";
      key: string;
      title: string;
      subtitle: string;
      cover?: string;
      href: string;
      primaryLabel: string;
      primaryColor: "primary" | "warning" | "success" | "danger";
      meta: string[];
      secondaryLabel?: string;
    };

function buildFavoriteItem(book: Book): ShelfItem {
  return {
    type: "favorite",
    key: `favorite-${book.bookId}`,
    title: book.title,
    subtitle: book.authorNames.join(", ") || "未知作者",
    cover: book.coverUrl,
    href: `/books/${book.bookId}`,
    primaryLabel: book.availableCount > 0 ? "可借阅" : "暂无库存",
    primaryColor: book.availableCount > 0 ? "success" : "warning",
    meta: [
      book.categoryNames.join(", ") || "未分类",
      `可借副本 ${book.availableCount ?? 0}`,
      book.isbn ? `ISBN ${book.isbn}` : "无 ISBN",
    ],
  };
}

function buildLoanItem(loan: MyLoan): ShelfItem {
  const primaryColorMap: Record<
    MyLoan["status"],
    "primary" | "warning" | "success" | "danger"
  > = {
    BORROWED: "primary",
    OVERDUE: "danger",
    RETURNED: "success",
    LOST: "warning",
  };

  const primaryLabelMap: Record<MyLoan["status"], string> = {
    BORROWED: "借阅中",
    OVERDUE: "已逾期",
    RETURNED: "已归还",
    LOST: "已挂失",
  };

  let secondaryLabel: string | undefined;

  if (loan.status === "OVERDUE" && loan.daysOverdue != null) {
    secondaryLabel = `逾期 ${loan.daysOverdue} 天`;
  } else if (loan.status === "BORROWED" && loan.daysRemaining != null) {
    secondaryLabel = `剩余 ${loan.daysRemaining} 天`;
  }

  return {
    type: "loan",
    key: `loan-${loan.loanId}`,
    title: loan.bookTitle,
    subtitle: loan.bookAuthorNames || "未知作者",
    cover: loan.bookCover,
    href: `/my/loan-tracking/${loan.loanId}`,
    primaryLabel: primaryLabelMap[loan.status],
    primaryColor: primaryColorMap[loan.status],
    secondaryLabel,
    meta: [
      loan.categoryName || "未分类",
      `借出 ${loan.borrowDate}`,
      `应还 ${loan.dueDate}`,
    ],
  };
}

function matchesQuery(item: ShelfItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [item.title, item.subtitle, ...item.meta]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function getEmptyCopy(section: ShelfSection, hasQuery: boolean): string {
  if (hasQuery) {
    return "没有匹配的书目，试试换个关键词。";
  }

  if (section === "favorites") {
    return "你还没有收藏任何图书。";
  }

  if (section === "active") {
    return "当前没有进行中的借阅。";
  }

  if (section === "history") {
    return "历史借阅记录为空。";
  }

  return "当前书架没有可展示的内容。";
}

const SECTION_OPTIONS: Array<{ key: ShelfSection; label: string; hint: string }> = [
  { key: "all", label: "全部", hint: "混合查看收藏与借阅记录" },
  { key: "favorites", label: "收藏", hint: "只看你标记过的图书" },
  { key: "active", label: "当前借阅", hint: "查看仍在借阅期内的图书" },
  { key: "history", label: "历史借阅", hint: "回顾已完成或历史借阅记录" },
];

const PAGE_SIZE = 12;

export default function ShelfPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ShelfViewMode>("list");
  const [section, setSection] = useState<ShelfSection>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: favorites = [],
    isLoading: favoritesLoading,
    error: favoritesError,
  } = useSWR("my-favorites-shelf", () => favoriteService.getMyFavorites(), {
    revalidateOnFocus: true,
  });
  const {
    data: activeLoans = [],
    isLoading: activeLoading,
    error: activeError,
  } = useSWR("my-active-loans-shelf", loanService.getMyLoans);
  const {
    data: historyLoans = [],
    isLoading: historyLoading,
    error: historyError,
  } = useSWR("my-history-loans-shelf", loanService.getMyLoanHistory);

  const isLoading = favoritesLoading || activeLoading || historyLoading;
  const hasError = favoritesError || activeError || historyError;

  const allItems = useMemo(() => {
    const favoriteItems = favorites.map(buildFavoriteItem);
    const activeItems = activeLoans.map(buildLoanItem);
    const historyItems = historyLoans.map(buildLoanItem);

    if (section === "favorites") {
      return favoriteItems;
    }
    if (section === "active") {
      return activeItems;
    }
    if (section === "history") {
      return historyItems;
    }

    return [...activeItems, ...favoriteItems, ...historyItems];
  }, [activeLoans, favorites, historyLoans, section]);

  const filteredItems = useMemo(
    () => allItems.filter((item) => matchesQuery(item, searchQuery)),
    [allItems, searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredItems, currentPage],
  );

  // Reset to page 1 when section or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [section, searchQuery]);

  const stats = useMemo(
    () => [
      {
        label: "我的收藏",
        value: favorites.length,
        icon: "solar:heart-bold-duotone",
        color: "text-rose-300",
        bg: "bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(190,24,93,0.08))]",
      },
      {
        label: "当前借阅",
        value: activeLoans.length,
        icon: "solar:book-bookmark-bold-duotone",
        color: "text-sky-300",
        bg: "bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(37,99,235,0.08))]",
      },
      {
        label: "历史借阅",
        value: historyLoans.length,
        icon: "solar:history-bold-duotone",
        color: "text-amber-200",
        bg: "bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(180,83,9,0.08))]",
      },
    ],
    [activeLoans.length, favorites.length, historyLoans.length],
  );

  const activeSectionMeta = SECTION_OPTIONS.find((item) => item.key === section) ?? SECTION_OPTIONS[0];

  return (
    <DefaultLayout>
      <section className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(10,15,28,0.86))] shadow-[0_28px_80px_-40px_rgba(2,6,23,0.88)]">
          <div className="relative px-6 py-8 md:px-8 md:py-10">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-sky-500/12 blur-3xl" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-3">
                <p className="text-sm uppercase tracking-[0.32em] text-sky-200/75">My Shelf</p>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                  我的书架
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  汇总你的收藏、当前借阅和历史借阅，统一查看状态并快速跳转到图书详情或借阅跟踪。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-sky-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(14,165,233,0.05))] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-sky-200">当前筛选</p>
                  <p className="mt-2 text-lg font-semibold text-white">{activeSectionMeta.label}</p>
                  <p className="mt-1 text-sm text-slate-300">{activeSectionMeta.hint}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">当前结果</p>
                  <p className="mt-2 text-lg font-semibold text-white">{filteredItems.length} 条</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {searchQuery.trim() ? `关键词：${searchQuery.trim()}` : "未使用关键词筛选"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(15,23,42,0.72))] shadow-[0_20px_45px_-30px_rgba(2,6,23,0.86)]"
            >
              <CardBody className="flex flex-row items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-black text-white">{stat.value}</p>
                </div>
                <div className={`rounded-2xl p-3 ${stat.bg}`}>
                  <Icon className={stat.color} icon={stat.icon} width={24} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.76))] p-4 shadow-[0_22px_50px_-32px_rgba(2,6,23,0.9)] md:flex-row md:items-center">
          <Input
            isClearable
            className="flex-1"
            classNames={{
              inputWrapper:
                "border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
              input: "text-slate-100 placeholder:text-slate-500",
            }}
            placeholder="搜索书名、作者、分类、ISBN..."
            startContent={<Icon className="text-slate-500" icon="solar:magnifer-linear" width={18} />}
            value={searchQuery}
            onClear={() => setSearchQuery("")}
            onValueChange={setSearchQuery}
          />

          <div className="flex flex-wrap gap-2">
            {SECTION_OPTIONS.map((item) => (
              <Button
                key={item.key}
                className={
                  section === item.key
                    ? "border border-sky-400/40 bg-sky-500 text-white shadow-[0_12px_30px_-16px_rgba(37,99,235,0.9)]"
                    : "border border-white/8 bg-white/[0.05] text-slate-300"
                }
                color={section === item.key ? "primary" : "default"}
                variant={section === item.key ? "solid" : "flat"}
                onPress={() => setSection(item.key as ShelfSection)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-1.5">
            <Button
              aria-label="切换为列表视图"
              isIconOnly
              className={viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-300"}
              size="sm"
              variant={viewMode === "list" ? "solid" : "light"}
              onPress={() => setViewMode("list")}
            >
              <Icon icon="solar:list-bold" width={18} />
            </Button>
            <Button
              aria-label="切换为网格视图"
              isIconOnly
              className={viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-300"}
              size="sm"
              variant={viewMode === "grid" ? "solid" : "light"}
              onPress={() => setViewMode("grid")}
            >
              <Icon icon="solar:widget-2-bold" width={18} />
            </Button>
          </div>
        </div>

        {hasError ? (
          <Card className="border border-danger-500/30 bg-danger-500/10 shadow-none">
            <CardBody className="flex flex-row items-center gap-3 p-5 text-danger-100">
              <Icon icon="solar:danger-triangle-bold" width={20} />
              <span>书架数据加载失败，请稍后刷新重试。</span>
            </CardBody>
          </Card>
        ) : null}

        {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4 md:grid-cols-4" : "space-y-4"}>
            {[1, 2, 3, 4].map((item) => (
              <Skeleton
                key={item}
                className={viewMode === "grid" ? "aspect-[3/4] rounded-3xl" : "h-40 rounded-3xl"}
              />
            ))}
          </div>
        ) : pagedItems.length === 0 ? (
          <Card className="border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(30,41,59,0.46))] shadow-none">
            <CardBody className="py-16 text-center text-slate-400">
              <Icon className="mx-auto mb-3 opacity-50" icon="solar:book-bookmark-bold-duotone" width={48} />
              <p className="text-base font-medium text-slate-200">
                {getEmptyCopy(section, searchQuery.trim().length > 0)}
              </p>
            </CardBody>
          </Card>
        ) : viewMode === "list" ? (
          <div className="space-y-4">
            {pagedItems.map((item) => (
              <Card
                key={item.key}
                isPressable
                className="w-full border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(11,18,32,0.84))] shadow-[0_20px_50px_-34px_rgba(2,6,23,0.92)] transition-transform hover:-translate-y-0.5 hover:border-white/20"
                onPress={() => router.push(item.href)}
              >
                <CardBody className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                  <div className="h-32 w-24 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/8">
                    <AppImage
                      alt={item.title}
                      className="h-full w-full object-cover"
                      fill
                      sizes="96px"
                      src={item.cover}
                      wrapperClassName="h-full w-full"
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold text-white">{item.title}</h3>
                          <Chip color={item.primaryColor} size="sm" variant="flat">
                            {item.primaryLabel}
                          </Chip>
                          {item.secondaryLabel ? (
                            <Chip className="border-white/15 text-slate-200" color="default" size="sm" variant="bordered">
                              {item.secondaryLabel}
                            </Chip>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {item.type === "favorite" ? "Favorite Entry" : "Loan Record"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.meta.map((meta) => (
                        <Chip
                          key={`${item.key}-${meta}`}
                          className="bg-white/[0.06] text-slate-300"
                          size="sm"
                          variant="flat"
                        >
                          {meta}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div className="flex md:w-40 md:justify-end">
                    <Button
                      className="min-w-[124px] shadow-[0_16px_36px_-20px_rgba(37,99,235,0.95)]"
                      color="primary"
                      endContent={<Icon icon="solar:arrow-right-bold" width={16} />}
                      onPress={() => router.push(item.href)}
                    >
                      {item.type === "favorite" ? "查看图书" : "借阅详情"}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {pagedItems.map((item) => (
              <Card
                key={item.key}
                isPressable
                className="border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(11,18,32,0.84))] shadow-[0_18px_40px_-30px_rgba(2,6,23,0.92)]"
                onPress={() => router.push(item.href)}
              >
                <CardBody className="p-3">
                  <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-3xl bg-white/[0.06]">
                    <AppImage
                      alt={item.title}
                      className="h-full w-full object-cover"
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      src={item.cover}
                      wrapperClassName="h-full w-full"
                    />
                    <div className="absolute left-3 top-3">
                      <Chip color={item.primaryColor} size="sm" variant="solid">
                        {item.primaryLabel}
                      </Chip>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="line-clamp-2 text-sm font-bold text-white">{item.title}</h3>
                    <p className="line-clamp-1 text-xs text-slate-400">{item.subtitle}</p>
                    {item.secondaryLabel ? (
                      <p className="text-xs font-medium text-sky-300">{item.secondaryLabel}</p>
                    ) : null}
                    <Button
                      className="w-full"
                      color="primary"
                      size="sm"
                      variant="flat"
                      onPress={() => router.push(item.href)}
                    >
                      {item.type === "favorite" ? "查看图书" : "借阅详情"}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-6 flex justify-center">
            <Pagination
              showControls
              color="primary"
              page={currentPage}
              total={totalPages}
              onChange={setCurrentPage}
            />
          </div>
        ) : null}
      </section>
    </DefaultLayout>
  );
}
