/**
 * @file 我的书架页面
 * @description 聚合收藏、当前借阅和历史借阅的统一管理屏幕。
 *
 *   功能特性：
 *   - 四个分组 Tab：全部 / 收藏 / 当前借阅 / 历史借阅
 *   - 本地搜索过滤（书名、作者、分类）
 *   - 分页展示（每页 12 条）
 *   - 事件驱动自动刷新（favorites / loans / books 事件）
 *   - 页面聚焦时自动刷新
 *
 *   数据来源：favoriteService + loanService
 */
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { SummaryHeroCard } from "../components/SummaryHeroCard";
import { CoverImage, EmptyCard, ErrorCard, InfoPill, LoginPromptCard, ActionButton, TextField } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { favoriteService } from "../services/favorite";
import { getErrorMessage } from "../services/http";
import { loanService } from "../services/loan";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { Book } from "../types/book";
import type { MyLoan } from "../services/loan";
import { subscribeAppEvent } from "../utils/events";
import { joinText } from "../utils/format";

const PAGE_SIZE = 12;

/** 书架分组类型 */
type ShelfSection = "all" | "favorites" | "active" | "history";

type ShelfItem =
  | {
      type: "favorite";
      id: string;
      title: string;
      subtitle: string;
      cover?: string;
      meta: string;
      badge: string;
      tone: "success" | "warning";
      onPress: () => void;
    }
  | {
      type: "loan";
      id: string;
      title: string;
      subtitle: string;
      cover?: string;
      meta: string;
      badge: string;
      tone: "primary" | "warning" | "danger" | "success";
      onPress: () => void;
    };

/** 将收藏图书转换为统一的 ShelfItem */
function buildFavoriteItem(book: Book, navigation: NativeStackNavigationProp<RootStackParamList>): ShelfItem {
  return {
    type: "favorite",
    id: `favorite-${book.bookId}`,
    title: book.title,
    subtitle: joinText(book.authorNames, "未知作者"),
    cover: book.coverUrl,
    meta: `${book.categoryName || "未分类"} · 可借 ${book.availableCopies}`,
    badge: book.availableCopies > 0 ? "可借阅" : "暂无库存",
    tone: book.availableCopies > 0 ? "success" : "warning",
    onPress: () => navigation.navigate("BookDetail", { bookId: book.bookId }),
  };
}

/** 将借阅记录转换为统一的 ShelfItem */
function buildLoanItem(loan: MyLoan, navigation: NativeStackNavigationProp<RootStackParamList>): ShelfItem {
  const toneMap = {
    BORROWED: "primary",
    OVERDUE: "danger",
    RETURNED: "success",
    LOST: "warning",
  } as const;

  const labelMap = {
    BORROWED: "借阅中",
    OVERDUE: "已逾期",
    RETURNED: "已归还",
    LOST: "已挂失",
  } as const;

  return {
    type: "loan",
    id: `loan-${loan.loanId}`,
    title: loan.bookTitle,
    subtitle: loan.bookAuthorNames || "未知作者",
    cover: loan.bookCover,
    meta: `借出 ${loan.borrowDate} · 应还 ${loan.dueDate}`,
    badge: labelMap[loan.status],
    tone: toneMap[loan.status],
    onPress: () => navigation.navigate("LoanTracking", { loanId: loan.loanId }),
  };
}

export function ShelfScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [section, setSection] = useState<ShelfSection>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [favorites, setFavorites] = useState<Book[]>([]);
  const [activeLoans, setActiveLoans] = useState<MyLoan[]>([]);
  const [historyLoans, setHistoryLoans] = useState<MyLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData(isRefresh = false) {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");
    try {
      const [nextFavorites, nextActiveLoans, nextHistoryLoans] = await Promise.all([
        favoriteService.getMyFavorites(),
        loanService.getMyLoans(),
        loanService.getMyLoanHistory(),
      ]);
      setFavorites(nextFavorites);
      setActiveLoans(nextActiveLoans);
      setHistoryLoans(nextHistoryLoans);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "书架加载失败"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData(true);
    }, [user]),
  );

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "favorites" || event === "loans" || event === "books") {
        void loadData(true);
      }
    });
  }, [user]);

  const items = useMemo(() => {
    const favoriteItems = favorites.map((item) => buildFavoriteItem(item, navigation));
    const activeItems = activeLoans.map((item) => buildLoanItem(item, navigation));
    const historyItems = historyLoans.map((item) => buildLoanItem(item, navigation));

    let source = [...activeItems, ...favoriteItems, ...historyItems];

    if (section === "favorites") {
      source = favoriteItems;
    } else if (section === "active") {
      source = activeItems;
    } else if (section === "history") {
      source = historyItems;
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return source;
    }

    return source.filter((item) =>
      [item.title, item.subtitle, item.meta]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [section, favorites, activeLoans, historyLoans, query, navigation]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = useMemo(
    () => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [items, page],
  );

  useEffect(() => {
    setPage(0);
  }, [section, query]);

  if (!user) {
    return (
      <Screen title="我的书架" subtitle="收藏、借阅和阅读记录，一站管理">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen
      title="我的书架"
      subtitle="收藏、当前借阅与历史借阅统一管理"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <SummaryHeroCard
        icon="bookshelf"
        pill={{ label: "阅读中心", tone: "primary", icon: "book-open-page-variant-outline" }}
        title="把你的阅读资产集中起来"
        description="收藏、当前借阅和历史借阅在这里统一管理，方便继续阅读或回看记录。"
        stats={[
          { icon: "heart-outline", value: favorites.length, label: "收藏" },
          { icon: "bookmark-check-outline", value: activeLoans.length, label: "当前借阅" },
          { icon: "history", value: historyLoans.length, label: "历史借阅" },
        ]}
      />

      <Card style={styles.filterCard}>
        <TextField
          icon="magnify"
          value={query}
          onChangeText={setQuery}
          placeholder="搜索书名、作者、分类"
        />
        <View style={styles.tabRow}>
          {[
            { key: "all", label: "全部", icon: "view-grid-outline" },
            { key: "favorites", label: "收藏", icon: "heart-outline" },
            { key: "active", label: "当前借阅", icon: "bookmark-check-outline" },
            { key: "history", label: "历史借阅", icon: "history" },
          ].map((item) => (
            <Pressable
              key={item.key}
              style={[styles.tabChip, section === item.key ? styles.tabChipActive : undefined]}
              onPress={() => setSection(item.key as ShelfSection)}
            >
              <MaterialCommunityIcons
                name={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                size={16}
                color={section === item.key ? colors.white : colors.textMuted}
              />
              <Text style={section === item.key ? styles.tabChipActiveText : styles.tabChipText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载书架...</Text>
        </Card>
      ) : null}

      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadData(true);
          }}
        />
      ) : null}

      {!loading && !errorMessage && items.length === 0 ? (
        <EmptyCard title="当前没有可展示内容" description="试试切换分组或调整搜索词。" />
      ) : null}

      {!loading && !errorMessage && pagedItems.length > 0 ? (
        pagedItems.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.itemCard, pressed ? styles.itemCardPressed : undefined]}
            onPress={item.onPress}
          >
            <CoverImage title={item.title} uri={item.cover} style={styles.itemCover} />
            <View style={styles.itemBody}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSoft} />
              </View>
              <Text style={styles.itemMeta}>{item.meta}</Text>
              <InfoPill label={item.badge} tone={item.tone} icon={item.type === "favorite" ? "heart-outline" : "bookmark-check-outline"} />
            </View>
          </Pressable>
        ))
      ) : null}

      {!loading && !errorMessage && totalPages > 1 ? (
        <Card>
          <View style={styles.paginationRow}>
            <ActionButton
              label="上一页"
              icon="chevron-left"
              onPress={() => setPage((prev) => Math.max(0, prev - 1))}
              tone="secondary"
              disabled={page <= 0}
            />
            <Text style={styles.helperText}>第 {page + 1} / {totalPages} 页</Text>
            <ActionButton
              label="下一页"
              icon="chevron-right"
              onPress={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              tone="secondary"
              disabled={page >= totalPages - 1}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}



const styles = StyleSheet.create({
  filterCard: {
    gap: spacing.md,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  tabChipActiveText: {
    color: colors.white,
    fontWeight: "700",
  },
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  itemCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.992 }],
  },
  itemCover: {
    width: 70,
    height: 102,
  },
  itemBody: {
    flex: 1,
    gap: spacing.xs,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  itemTitleWrap: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  itemSubtitle: {
    color: colors.textMuted,
  },
  itemMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
});
