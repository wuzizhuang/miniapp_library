/**
 * @file 图书目录页面
 * @description 全量馆藏检索屏幕，支持多维度联合筛选。
 *
 *   功能特性：
 *   - 关键词、题名、作者、出版社的多字段搜索
 *   - 分类筛选 + 可借状态过滤
 *   - 排序方式切换
 *   - 发现关键词标签（快速填充检索词）
 *   - 支持从首页传入 presetKeyword 预设搜索
 *   - 下拉刷新
 *
 *   页面结构：
 *   1. 概要卡片 - 当前图书数量 + 分类数量
 *   2. 筛选器卡片 - BooksFiltersCard 组件
 *   3. 当前筛选标签 + 发现关键词标签
 *   4. 图书列表 - BookCatalogCard 列表
 *
 *   数据来源：useBooksCatalog() Hook
 */

import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type CompositeNavigationProp, type RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen } from "../components/Screen";
import { EmptyCard, ErrorCard, InfoPill } from "../components/Ui";
import { BookCatalogCard } from "../features/books/BookCatalogCard";
import { BooksFiltersCard } from "../features/books/BooksFiltersCard";
import { CatalogTagSection } from "../features/books/CatalogTagSection";
import { useBooksCatalog } from "../features/books/useBooksCatalog";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";

export function BooksScreen() {
  const route = useRoute<RouteProp<MainTabParamList, "BooksTab">>();
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList, "BooksTab">,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { user } = useAuth();

  // 从 Hook 中解构所有筛选状态和数据
  const {
    keyword, setKeyword,
    titleKeyword, setTitleKeyword,
    authorKeyword, setAuthorKeyword,
    publisherKeyword, setPublisherKeyword,
    selectedCategory, setSelectedCategory,
    selectedSort, setSelectedSort,
    availableOnly, setAvailableOnly,
    books, categories,
    favoriteIds, loanedIds, reservedIds,
    loading, refreshing, errorMessage,
    discoveryKeywords, activeFilters,
    loadAll, resetFilters,
  } = useBooksCatalog(user);

  // 处理从首页传入的预设搜索关键词
  React.useEffect(() => {
    const presetKeyword = route.params?.presetKeyword?.trim();

    if (!presetKeyword) {
      return;
    }

    setKeyword(presetKeyword);
    // 消费后清除参数，避免重复触发
    navigation.setParams({ presetKeyword: undefined });
  }, [navigation, route.params?.presetKeyword, setKeyword]);

  return (
    <Screen
      title="图书目录"
      subtitle="支持关键词、题名、作者、出版社、分类和可借状态的联合检索。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadAll(true);
      }}
    >
      {/* 概要卡片 */}
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="book-search-outline" size={24} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryBody}>
            <Text style={styles.summaryTitle}>探索馆藏</Text>
            <Text style={styles.summaryText}>
              当前展示 {books.length} 本图书，可按分类、作者、出版社和可借状态快速缩小范围。
            </Text>
          </View>
        </View>
        <View style={styles.summaryPills}>
          <InfoPill label={`${categories.length} 个分类`} tone="primary" icon="shape-outline" />
          <InfoPill
            label={availableOnly ? "仅看可借" : "全量馆藏"}
            tone={availableOnly ? "success" : "neutral"}
            icon={availableOnly ? "check-circle-outline" : "bookshelf"}
          />
        </View>
      </Card>

      {/* 筛选器 */}
      <BooksFiltersCard
        keyword={keyword}
        onKeywordChange={setKeyword}
        titleKeyword={titleKeyword}
        onTitleKeywordChange={setTitleKeyword}
        authorKeyword={authorKeyword}
        onAuthorKeywordChange={setAuthorKeyword}
        publisherKeyword={publisherKeyword}
        onPublisherKeywordChange={setPublisherKeyword}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        availableOnly={availableOnly}
        onAvailableOnlyChange={setAvailableOnly}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        onReset={resetFilters}
      />

      {/* 当前筛选标签 + 发现关键词 */}
      <CatalogTagSection title="当前筛选" items={activeFilters} />
      <CatalogTagSection groups={discoveryKeywords} onKeywordPress={setKeyword} />

      {/* 错误态 */}
      {errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadAll(true);
          }}
        />
      ) : null}

      {/* 空态 */}
      {!loading && !errorMessage && books.length === 0 ? (
        <EmptyCard title="未找到相关图书" description="试试调整关键词、作者、出版社、分类或排序方式。" />
      ) : null}

      {/* 加载态 */}
      {loading ? (
        <Card tone="muted">
          <Text style={styles.loadingText}>正在加载馆藏目录...</Text>
        </Card>
      ) : null}

      {/* 图书列表 */}
      {!loading && !errorMessage && books.length > 0 ? (
        books.map((book) => (
          <BookCatalogCard
            key={book.bookId}
            book={book}
            favoriteIds={favoriteIds}
            loanedIds={loanedIds}
            reservedIds={reservedIds}
            onPress={(bookId) => navigation.navigate("BookDetail", { bookId })}
          />
        ))
      ) : null}
    </Screen>
  );
}

// ─── 样式定义 ─────────────────────────────────

const styles = StyleSheet.create({
  summaryCard: { gap: spacing.md },
  summaryHeader: { flexDirection: "row", gap: spacing.md },
  summaryIconWrap: {
    width: 52, height: 52, borderRadius: 20,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
  },
  summaryBody: { flex: 1, gap: 4 },
  summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  summaryText: { color: colors.textMuted, lineHeight: 21 },
  summaryPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  loadingText: { color: colors.textMuted, lineHeight: 21 },
});
