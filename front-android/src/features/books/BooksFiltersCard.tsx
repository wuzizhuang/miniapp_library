import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card } from "../../components/Screen";
import { ActionButton } from "../../components/Ui";
import { colors, radius, spacing } from "../../theme";
import type { BookSearchSort, CategoryOption } from "../../types/book";
import { sortOptions } from "./catalog";

interface BooksFiltersCardProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  titleKeyword: string;
  onTitleKeywordChange: (value: string) => void;
  authorKeyword: string;
  onAuthorKeywordChange: (value: string) => void;
  publisherKeyword: string;
  onPublisherKeywordChange: (value: string) => void;
  categories: CategoryOption[];
  selectedCategory: number | null;
  onCategoryChange: (value: number | null) => void;
  availableOnly: boolean;
  onAvailableOnlyChange: (value: boolean) => void;
  selectedSort: BookSearchSort;
  onSortChange: (value: BookSearchSort) => void;
  onReset: () => void;
}

export function BooksFiltersCard({
  keyword,
  onKeywordChange,
  titleKeyword,
  onTitleKeywordChange,
  authorKeyword,
  onAuthorKeywordChange,
  publisherKeyword,
  onPublisherKeywordChange,
  categories,
  selectedCategory,
  onCategoryChange,
  availableOnly,
  onAvailableOnlyChange,
  selectedSort,
  onSortChange,
  onReset,
}: BooksFiltersCardProps) {
  return (
    <Card>
      <Text style={styles.sectionLabel}>综合检索</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={keyword}
          onChangeText={onKeywordChange}
          placeholder="关键词：书名 / 作者 / ISBN / 分类 / 出版社"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        <ActionButton
          label="清空"
          onPress={onReset}
          tone="secondary"
        />
      </View>

      <View style={styles.advancedRow}>
        <TextInput
          value={titleKeyword}
          onChangeText={onTitleKeywordChange}
          placeholder="题名精筛"
          placeholderTextColor={colors.textMuted}
          style={styles.advancedInput}
        />
        <TextInput
          value={authorKeyword}
          onChangeText={onAuthorKeywordChange}
          placeholder="作者"
          placeholderTextColor={colors.textMuted}
          style={styles.advancedInput}
        />
      </View>

      <TextInput
        value={publisherKeyword}
        onChangeText={onPublisherKeywordChange}
        placeholder="出版社"
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
      />

      <Text style={styles.sectionLabel}>分类筛选</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, selectedCategory === null ? styles.filterChipActive : undefined]}
          onPress={() => onCategoryChange(null)}
        >
          <Text style={selectedCategory === null ? styles.filterChipActiveText : styles.filterChipText}>全部</Text>
        </Pressable>
        {categories.map((item) => (
          <Pressable
            key={item.categoryId}
            style={[styles.filterChip, selectedCategory === item.categoryId ? styles.filterChipActive : undefined]}
            onPress={() => onCategoryChange(item.categoryId)}
          >
            <Text style={selectedCategory === item.categoryId ? styles.filterChipActiveText : styles.filterChipText}>
              {item.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.availabilityRow, availableOnly ? styles.availabilityRowActive : undefined]}
        onPress={() => onAvailableOnlyChange(!availableOnly)}
      >
        <Text style={styles.availabilityText}>{availableOnly ? "仅看可借图书" : "显示全部图书"}</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>排序方式</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {sortOptions.map((item) => (
          <Pressable
            key={item.value}
            style={[styles.filterChip, selectedSort === item.value ? styles.filterChipActive : undefined]}
            onPress={() => onSortChange(item.value)}
          >
            <Text style={selectedSort === item.value ? styles.filterChipActiveText : styles.filterChipText}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  advancedRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  advancedInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  filterRow: {
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  filterChipActiveText: {
    color: colors.white,
    fontWeight: "700",
  },
  availabilityRow: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
  },
  availabilityRowActive: {
    backgroundColor: "#dff4ee",
  },
  availabilityText: {
    color: colors.text,
    fontWeight: "700",
  },
});
