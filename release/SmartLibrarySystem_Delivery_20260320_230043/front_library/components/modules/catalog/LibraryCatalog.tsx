"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Button,
  Chip,
  Pagination,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { CatalogFilters } from "./CatalogFilters";
import { CatalogGrid } from "./CatalogGrid";
import { CatalogSearchDiscovery } from "./CatalogSearchDiscovery";
import { CatalogTable } from "./CatalogTable";
import { CatalogToolbar } from "./CatalogToolbar";
import {
  CatalogStatusInfo,
  UserBookState,
  ViewMode,
} from "./catalogTypes";

import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import { useAuth } from "@/config/authContext";
import { useDebounce } from "@/hooks/useDebounce";
import { getApiErrorMessage } from "@/lib/apiError";
import { bookService } from "@/services/api/bookService";
import { favoriteService } from "@/services/api/favoriteService";
import { loanService } from "@/services/api/loanService";
import { reservationService } from "@/services/api/reservationService";
import { searchService } from "@/services/api/searchService";
import { Book } from "@/types/book";


export default function LibraryCatalog() {
  const router = useRouter();
  const { user } = useAuth();

  // --- 1. UI 交互状态 ---
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  // --- 2. 筛选与输入状态 ---
  // searchInputValue 是输入框的实时值，debouncedKeyword 是传给 API 的延迟值
  const [searchInputValue, setSearchInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all"); // 'all' | 'available'

  // 防抖处理：输入停止 500ms 后更新 debouncedKeyword
  const debouncedKeyword = useDebounce(searchInputValue, 500);
  const debouncedSuggestionKeyword = useDebounce(searchInputValue, 250);

  // 从 URL 读取初始筛选条件（支持 /books?query=xxx）
  useEffect(() => {
    if (!router.isReady) return;

    const queryKeyword = router.query.query;
    const queryCategory = router.query.category;
    const queryAvailable = router.query.available;

    if (typeof queryKeyword === "string") {
      setSearchInputValue(queryKeyword);
    }
    if (typeof queryCategory === "string") {
      setSelectedCategory(queryCategory);
    }
    if (typeof queryAvailable === "string") {
      setAvailabilityFilter(queryAvailable === "1" ? "available" : "all");
    }
  }, [router.isReady, router.query.query, router.query.category, router.query.available]);

  // --- 3. SWR 数据获取 (核心优化) ---

  // 3.1 获取分类列表 (自动缓存)
  const {
    data: categories = [],
    error: categoriesError,
    mutate: mutateCategories,
  } = useSWR(
    "/api/categories",
    () => bookService.getCategories(),
    {
      revalidateOnFocus: false, // 分类不经常变，切回窗口时不刷新
    },
  );

  // 3.2 获取图书列表 (依赖 debouncedKeyword 和 selectedCategory)
  // 当 key 数组中的任何参数变化时，SWR 自动重新请求
  const {
    data: books = [],
    error: booksError,
    isLoading: booksLoading,
    mutate: mutateBooks,
  } = useSWR(
    ["/api/books", debouncedKeyword, selectedCategory],
    ([_, keyword, cat]) =>
      bookService.getBooks({
        keyword: keyword,
        categoryId: cat !== "all" ? Number(cat) : undefined,
      }),
    {
      keepPreviousData: true, // 加载新数据时保留旧数据，防止闪烁
      revalidateOnFocus: false,
    },
  );
  const {
    data: suggestions = [],
    error: suggestionsError,
    isLoading: suggestionsLoading,
  } = useSWR(
    debouncedSuggestionKeyword.trim()
      ? ["search-suggestions-catalog", debouncedSuggestionKeyword.trim()]
      : null,
    ([_, keyword]) => searchService.getSuggestions(keyword, 8),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );
  const {
    data: hotKeywords = [],
    error: hotKeywordsError,
    isLoading: hotKeywordsLoading,
  } = useSWR(
    "search-hot-keywords-catalog",
    () => searchService.getHotKeywords(8),
    {
      revalidateOnFocus: false,
    },
  );
  const {
    data: searchHistoryData,
    error: searchHistoryError,
    isLoading: searchHistoryLoading,
  } = useSWR(
    user ? "search-history-catalog" : null,
    () => searchService.getMyHistory(0, 12),
    {
      revalidateOnFocus: false,
    },
  );
  const {
    data: myFavorites = [],
    error: favoritesError,
    mutate: mutateFavorites,
  } = useSWR(
    user ? "my-favorites-shelf" : null,
    () => favoriteService.getMyFavorites(),
  );
  const {
    data: myLoans = [],
    error: loansError,
    mutate: mutateLoans,
  } = useSWR(
    user ? "my-active-loans-shelf" : null,
    loanService.getMyLoans,
  );
  const {
    data: myReservations = [],
    error: reservationsError,
    mutate: mutateReservations,
  } = useSWR(
    user ? "my-reservations" : null,
    reservationService.getMyReservations,
  );

  // --- 4. 监听筛选变化重置页码 ---
  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, selectedCategory, availabilityFilter]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const nextQuery: Record<string, string> = {};

    if (debouncedKeyword.trim()) {
      nextQuery.query = debouncedKeyword.trim();
    }

    if (selectedCategory !== "all") {
      nextQuery.category = selectedCategory;
    }

    if (availabilityFilter === "available") {
      nextQuery.available = "1";
    }

    const currentQuery = {
      query: typeof router.query.query === "string" ? router.query.query : undefined,
      category: typeof router.query.category === "string" ? router.query.category : undefined,
      available: typeof router.query.available === "string" ? router.query.available : undefined,
    };

    if (
      currentQuery.query === nextQuery.query
      && currentQuery.category === nextQuery.category
      && currentQuery.available === nextQuery.available
    ) {
      return;
    }

    void router.replace(
      {
        pathname: "/books",
        query: nextQuery,
      },
      undefined,
      { shallow: true },
    );
  }, [
    availabilityFilter,
    debouncedKeyword,
    router,
    router.isReady,
    router.query.available,
    router.query.category,
    router.query.query,
    selectedCategory,
  ]);

  // --- 5. 前端二次处理 (分页与状态过滤) ---
  const filteredItems = useMemo(() => {
    let filtered = [...books];

    // 过滤库存状态 (前端过滤)
    if (availabilityFilter === "available") {
      filtered = filtered.filter((book) => book.availableCount > 0);
    }

    return filtered;
  }, [books, availabilityFilter]);

  // 计算分页
  const pages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;

    return filteredItems.slice(start, start + rowsPerPage);
  }, [page, filteredItems, rowsPerPage]);
  const totalItems = filteredItems.length;

  // --- 6. 辅助渲染函数 ---
  const handleGoToDetail = (id: number) => {
    void router.push(`/books/${id}`);
  };

  const favoriteBookIds = useMemo(
    () => new Set(myFavorites.map((book) => book.bookId)),
    [myFavorites],
  );
  const loanedBookIds = useMemo(
    () =>
      new Set(
        myLoans
          .filter((loan) => loan.status === "BORROWED" || loan.status === "OVERDUE")
          .map((loan) => loan.bookId)
          .filter((bookId): bookId is number => typeof bookId === "number"),
      ),
    [myLoans],
  );
  const reservedBookIds = useMemo(
    () =>
      new Set(
        myReservations
          .filter(
            (reservation) =>
              reservation.status === "PENDING" || reservation.status === "AWAITING_PICKUP",
          )
          .map((reservation) => reservation.bookId),
      ),
    [myReservations],
  );

  const getUserBookState = useCallback(
    (book: Book): UserBookState => {
      if (loanedBookIds.has(book.bookId)) {
        return "loaned";
      }
      if (reservedBookIds.has(book.bookId)) {
        return "reserved";
      }
      if (favoriteBookIds.has(book.bookId)) {
        return "favorited";
      }
      if (book.availableCount > 0) {
        return "available";
      }

      return "out_of_stock";
    },
    [favoriteBookIds, loanedBookIds, reservedBookIds],
  );

  const getStatusInfo = (book: Book): CatalogStatusInfo => {
    const userState = getUserBookState(book);

    if (userState === "loaned") {
      return { status: "loaned", label: "我在借", color: "primary" };
    }
    if (userState === "reserved") {
      return { status: "reserved", label: "我已预约", color: "secondary" };
    }
    if (userState === "favorited") {
      return { status: "favorited", label: "已收藏", color: "danger" };
    }
    if (book.availableCount > 0) {
      return { status: "available", label: "可借阅", color: "success" };
    } else {
      return { status: "out_of_stock", label: "暂无库存", color: "warning" };
    }
  };

  const getActionLabel = (book: Book): string => {
    const state = getUserBookState(book);

    if (state === "loaned") {
      return "查看借阅";
    }
    if (state === "reserved") {
      return "查看预约";
    }
    if (state === "available") {
      return "借阅";
    }
    if (state === "out_of_stock") {
      return "预约";
    }

    return "查看";
  };
  const requestError =
    booksError ??
    categoriesError ??
    favoritesError ??
    loansError ??
    reservationsError;

  const retryRequests = async () => {
    await Promise.all([
      mutateCategories(),
      mutateBooks(),
      user ? mutateFavorites() : Promise.resolve(undefined),
      user ? mutateLoans() : Promise.resolve(undefined),
      user ? mutateReservations() : Promise.resolve(undefined),
      globalMutate("/api/categories"),
    ]);
  };
  const searchHistory = searchHistoryData?.content ?? [];

  const handleKeywordSelect = (keyword: string) => {
    setSearchInputValue(keyword);
    setPage(1);
  };
  const resetCatalogFilters = () => {
    setSearchInputValue("");
    setSelectedCategory("all");
    setAvailabilityFilter("all");
    setPage(1);
  };
  const selectedCategoryName =
    selectedCategory === "all"
      ? "全部分类"
      : categories.find((category) => String(category.categoryId) === selectedCategory)?.name ?? "当前分类";
  const gridTailPanel = (
    <div className="relative flex h-full min-h-[320px] flex-col justify-between overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(240,247,255,0.96))] p-6 text-slate-800 shadow-[0_28px_60px_-34px_rgba(148,163,184,0.28)] dark:border-slate-700/70 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] dark:text-white dark:shadow-[0_28px_60px_-34px_rgba(15,23,42,0.8)]">
      <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
      <div className="absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-400/15" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-700/70 dark:text-sky-200/75">Continue Browsing</p>
            <h3 className="mt-3 text-2xl font-bold">继续探索馆藏</h3>
          </div>
          <span className="rounded-full border border-slate-200/80 bg-white/80 p-3 text-sky-600 dark:border-white/10 dark:bg-white/10 dark:text-sky-100">
            <Icon icon="solar:library-bold-duotone" width={24} />
          </span>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          尾行空位现在会被一块信息面板接住，不再留下大面积黑区，同时保留一些快速操作。
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Chip className="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white" size="sm" variant="flat">
            当前页 {items.length} 本
          </Chip>
          <Chip className="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white" size="sm" variant="flat">
            共 {totalItems} 本
          </Chip>
          <Chip className="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white" size="sm" variant="flat">
            {selectedCategoryName}
          </Chip>
          <Chip className="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white" size="sm" variant="flat">
            {availabilityFilter === "available" ? "仅看可借" : "所有状态"}
          </Chip>
          {debouncedKeyword.trim() ? (
            <Chip className="bg-primary/10 text-primary-700 dark:bg-primary/25 dark:text-primary-50" size="sm" variant="flat">
              关键词：{debouncedKeyword.trim()}
            </Chip>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">更顺手的下一步</p>
          <p>可以切到表格视图查看更多字段，或者清空筛选继续浏览更多馆藏。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            color="primary"
            radius="full"
            startContent={<Icon icon="solar:list-bold" width={18} />}
            variant="solid"
            onPress={() => setViewMode("table")}
          >
            查看表格
          </Button>
          <Button
            className="border border-slate-200 dark:border-white/10"
            radius="full"
            startContent={<Icon icon="solar:restart-linear" width={18} />}
            variant="flat"
            onPress={resetCatalogFilters}
          >
            清空筛选
          </Button>
        </div>
      </div>
    </div>
  );

  // --- 7. 渲染 ---
  return (
    <div className="w-full h-full min-h-[calc(100vh-200px)]">
      <div className="mb-10 flex w-full flex-col gap-4">
        <CatalogToolbar
          filteredCount={filteredItems.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <CatalogFilters
          availabilityFilter={availabilityFilter}
          categories={categories}
          searchInputValue={searchInputValue}
          selectedCategory={selectedCategory}
          onAvailabilityFilterChange={setAvailabilityFilter}
          onCategoryChange={setSelectedCategory}
          onSearchInputChange={setSearchInputValue}
          onSearchReset={() => setSearchInputValue("")}
        />
        <CatalogSearchDiscovery
          history={searchHistory}
          historyError={searchHistoryError}
          historyLoading={Boolean(user) && searchHistoryLoading}
          hotKeywords={hotKeywords}
          hotKeywordsError={hotKeywordsError}
          hotKeywordsLoading={hotKeywordsLoading}
          isLoggedIn={Boolean(user)}
          keyword={searchInputValue}
          suggestions={suggestions}
          suggestionsError={suggestionsError}
          suggestionsLoading={Boolean(searchInputValue.trim()) && suggestionsLoading}
          onSelectKeyword={handleKeywordSelect}
        />
      </div>

      {/* === 内容区域 === */}
      <div className="min-h-[500px] w-full">
        {booksLoading ? (
          <div className="flex justify-center items-center h-60">
            <Spinner color="primary" label="正在从书库搬运..." size="lg" />
          </div>
        ) : requestError ? (
          <RequestErrorCard
            message={getApiErrorMessage(requestError, "馆藏目录加载失败，请稍后重试。")}
            title="馆藏目录加载失败"
            onRetry={() => {
              void retryRequests();
            }}
          />
        ) : filteredItems.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-[28px] border border-slate-200/80 bg-white/88 px-6 text-center text-slate-600 shadow-[0_28px_70px_-44px_rgba(148,163,184,0.28)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(15,23,42,0.72))] dark:text-slate-300 dark:shadow-[0_28px_70px_-44px_rgba(15,23,42,0.95)]">
            <p className="text-xl font-bold text-slate-900 dark:text-white">未找到相关图书</p>
            <p className="mt-2 text-sm">尝试更换搜索词、切换分类或恢复全部状态。</p>
            <Button
              className="mt-5 border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/8 dark:text-white"
              color="primary"
              radius="full"
              size="sm"
              variant="flat"
              onPress={resetCatalogFilters}
            >
              清除筛选
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <CatalogGrid
            items={items}
            tailPanel={gridTailPanel}
            onSelectBook={handleGoToDetail}
            getActionLabel={getActionLabel}
            getStatusInfo={getStatusInfo}
          />
        ) : (
          <CatalogTable
            items={items}
            onSelectBook={handleGoToDetail}
            getActionLabel={getActionLabel}
            getStatusInfo={getStatusInfo}
          />
        )}
      </div>

      {/* === 底部翻页 === */}
      {!booksLoading && !requestError && filteredItems.length > 0 && (
        <div className="flex justify-center mt-12 mb-8 w-full">
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
            total={pages}
            variant="flat"
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
