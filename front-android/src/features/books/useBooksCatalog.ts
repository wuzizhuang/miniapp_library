import React, { useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { bookService } from "../../services/book";
import { favoriteService } from "../../services/favorite";
import { getErrorMessage } from "../../services/http";
import { loanService } from "../../services/loan";
import { reservationService } from "../../services/reservation";
import { searchService } from "../../services/search";
import type { Book, BookSearchSort, CategoryOption } from "../../types/book";
import { subscribeAppEvent } from "../../utils/events";
import { sortOptions } from "./catalog";

export interface DiscoveryKeywordGroup {
  group: string;
  items: string[];
}

export function useBooksCatalog(user: unknown) {
  const [keyword, setKeyword] = useState("");
  const [titleKeyword, setTitleKeyword] = useState("");
  const [authorKeyword, setAuthorKeyword] = useState("");
  const [publisherKeyword, setPublisherKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword, 400);
  const debouncedTitleKeyword = useDebouncedValue(titleKeyword, 400);
  const debouncedAuthorKeyword = useDebouncedValue(authorKeyword, 400);
  const debouncedPublisherKeyword = useDebouncedValue(publisherKeyword, 400);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSort, setSelectedSort] = useState<BookSearchSort>("RELEVANCE");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [hotKeywords, setHotKeywords] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loanedIds, setLoanedIds] = useState<Set<number>>(new Set());
  const [reservedIds, setReservedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDiscovery() {
    const [nextCategories, nextHotKeywords] = await Promise.all([
      bookService.getCategories(),
      searchService.getHotKeywords(8),
    ]);

    setCategories(nextCategories);
    setHotKeywords(nextHotKeywords);
  }

  async function loadSearchHistory() {
    if (!user) {
      setSearchHistory([]);
      return;
    }

    try {
      const response = await searchService.getMyHistory(0, 12);
      setSearchHistory((response.content ?? []).map((item) => item.keyword));
    } catch {
      setSearchHistory([]);
    }
  }

  async function loadUserStates() {
    if (!user) {
      setFavoriteIds(new Set());
      setLoanedIds(new Set());
      setReservedIds(new Set());
      return;
    }

    try {
      const [favorites, loans, reservations] = await Promise.all([
        favoriteService.getMyFavorites(),
        loanService.getMyLoans(),
        reservationService.getMyReservations(),
      ]);

      setFavoriteIds(new Set(favorites.map((item) => item.bookId)));
      setLoanedIds(
        new Set(
          loans
            .filter((item) => item.status === "BORROWED" || item.status === "OVERDUE")
            .map((item) => item.bookId)
            .filter((value): value is number => typeof value === "number"),
        ),
      );
      setReservedIds(
        new Set(
          reservations
            .filter((item) => item.status === "PENDING" || item.status === "AWAITING_PICKUP")
            .map((item) => item.bookId),
        ),
      );
    } catch {
      setFavoriteIds(new Set());
      setLoanedIds(new Set());
      setReservedIds(new Set());
    }
  }

  async function loadBooks(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const response = await bookService.getBooks({
        keyword: debouncedKeyword.trim() || undefined,
        title: debouncedTitleKeyword.trim() || undefined,
        author: debouncedAuthorKeyword.trim() || undefined,
        publisher: debouncedPublisherKeyword.trim() || undefined,
        categoryId: selectedCategory ?? undefined,
        availableOnly,
        sort: selectedSort,
        page: 0,
        size: 60,
      });
      setBooks(response.items);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "馆藏目录加载失败"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadAll(isRefresh = false) {
    await Promise.allSettled([
      loadDiscovery(),
      loadSearchHistory(),
      loadUserStates(),
    ]);
    await loadBooks(isRefresh);
  }

  useEffect(() => {
    void loadAll();
  }, [user]);

  useEffect(() => {
    void loadBooks();
  }, [debouncedKeyword, debouncedTitleKeyword, debouncedAuthorKeyword, debouncedPublisherKeyword, selectedCategory, availableOnly, selectedSort]);

  useEffect(() => {
    if (!debouncedKeyword.trim()) {
      setSuggestions([]);
      return;
    }

    void searchService.getSuggestions(debouncedKeyword.trim(), 8)
      .then((items) => setSuggestions(items))
      .catch(() => setSuggestions([]));
  }, [debouncedKeyword]);

  useFocusEffect(
    React.useCallback(() => {
      void loadUserStates();
      void loadSearchHistory();
    }, [user]),
  );

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "books" || event === "favorites" || event === "loans" || event === "reservations") {
        void loadAll(true);
      }
    });
  }, [user, debouncedKeyword, debouncedTitleKeyword, debouncedAuthorKeyword, debouncedPublisherKeyword, selectedCategory, availableOnly, selectedSort]);

  const discoveryKeywords = useMemo<DiscoveryKeywordGroup[]>(() => {
    const result: DiscoveryKeywordGroup[] = [];

    if (suggestions.length > 0) {
      result.push({ group: "联想词", items: suggestions });
    }
    if (hotKeywords.length > 0) {
      result.push({ group: "热门搜索", items: hotKeywords });
    }
    if (searchHistory.length > 0) {
      result.push({ group: "最近搜索", items: searchHistory });
    }

    return result;
  }, [suggestions, hotKeywords, searchHistory]);

  const activeFilters = useMemo(() => {
    const items: string[] = [];

    if (debouncedKeyword.trim()) {
      items.push(`关键词: ${debouncedKeyword.trim()}`);
    }
    if (debouncedTitleKeyword.trim()) {
      items.push(`题名: ${debouncedTitleKeyword.trim()}`);
    }
    if (debouncedAuthorKeyword.trim()) {
      items.push(`作者: ${debouncedAuthorKeyword.trim()}`);
    }
    if (debouncedPublisherKeyword.trim()) {
      items.push(`出版社: ${debouncedPublisherKeyword.trim()}`);
    }
    if (selectedCategory !== null) {
      const match = categories.find((item) => item.categoryId === selectedCategory);
      items.push(`分类: ${match?.name || selectedCategory}`);
    }
    if (availableOnly) {
      items.push("仅看可借");
    }
    if (selectedSort !== "RELEVANCE") {
      items.push(`排序: ${sortOptions.find((item) => item.value === selectedSort)?.label || selectedSort}`);
    }

    return items;
  }, [
    availableOnly,
    categories,
    debouncedAuthorKeyword,
    debouncedKeyword,
    debouncedPublisherKeyword,
    debouncedTitleKeyword,
    selectedCategory,
    selectedSort,
  ]);

  function resetFilters() {
    setKeyword("");
    setTitleKeyword("");
    setAuthorKeyword("");
    setPublisherKeyword("");
    setSelectedCategory(null);
    setAvailableOnly(false);
    setSelectedSort("RELEVANCE");
  }

  return {
    keyword,
    setKeyword,
    titleKeyword,
    setTitleKeyword,
    authorKeyword,
    setAuthorKeyword,
    publisherKeyword,
    setPublisherKeyword,
    selectedCategory,
    setSelectedCategory,
    selectedSort,
    setSelectedSort,
    availableOnly,
    setAvailableOnly,
    books,
    categories,
    favoriteIds,
    loanedIds,
    reservedIds,
    loading,
    refreshing,
    errorMessage,
    discoveryKeywords,
    activeFilters,
    loadAll,
    resetFilters,
  };
}
