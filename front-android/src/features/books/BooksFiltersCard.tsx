import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
    <Card tone="tinted" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>DISCOVERY</Text>
          <Text style={styles.title}>多维检索</Text>
          <Text style={styles.subtitle}>支持综合搜索、题名精筛、作者、出版社、分类和排序联动。</Text>
        </View>
        <ActionButton
          label="重置"
          icon="refresh"
          onPress={onReset}
          tone="ghost"
          size="sm"
        />
      </View>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSoft} />
        <TextInput
          value={keyword}
          onChangeText={onKeywordChange}
          placeholder="关键词：书名 / 作者 / ISBN / 分类 / 出版社"
          placeholderTextColor={colors.textSoft}
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <View style={styles.advancedRow}>
        <InputField
          icon="format-title"
          placeholder="题名精筛"
          value={titleKeyword}
          onChangeText={onTitleKeywordChange}
        />
        <InputField
          icon="account-edit-outline"
          placeholder="作者"
          value={authorKeyword}
          onChangeText={onAuthorKeywordChange}
        />
      </View>

      <InputField
        icon="office-building-outline"
        placeholder="出版社"
        value={publisherKeyword}
        onChangeText={onPublisherKeywordChange}
      />

      <View style={styles.block}>
        <Text style={styles.blockTitle}>分类筛选</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="全部"
            active={selectedCategory === null}
            onPress={() => onCategoryChange(null)}
          />
          {categories.map((item) => (
            <FilterChip
              key={item.categoryId}
              label={item.name}
              active={selectedCategory === item.categoryId}
              onPress={() => onCategoryChange(item.categoryId)}
            />
          ))}
        </ScrollView>
      </View>

      <Pressable
        style={[
          styles.availabilityRow,
          availableOnly ? styles.availabilityRowActive : undefined,
        ]}
        onPress={() => onAvailableOnlyChange(!availableOnly)}
      >
        <View style={styles.availabilityIconWrap}>
          <MaterialCommunityIcons
            name={availableOnly ? "check-circle-outline" : "circle-outline"}
            size={18}
            color={availableOnly ? colors.primaryDark : colors.textSoft}
          />
        </View>
        <View style={styles.availabilityCopy}>
          <Text style={styles.availabilityTitle}>{availableOnly ? "仅看可借图书" : "显示全部图书"}</Text>
          <Text style={styles.availabilitySubtitle}>适合快速排除暂不可借的馆藏。</Text>
        </View>
      </Pressable>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>排序方式</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {sortOptions.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              active={selectedSort === item.value}
              onPress={() => onSortChange(item.value)}
            />
          ))}
        </ScrollView>
      </View>
    </Card>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputWrap}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.textSoft} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        style={styles.input}
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active ? styles.filterChipActive : undefined]}
      onPress={onPress}
    >
      <Text style={active ? styles.filterChipActiveText : styles.filterChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
  },
  advancedRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: colors.text,
  },
  block: {
    gap: spacing.sm,
  },
  blockTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surfaceElevated,
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
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  availabilityRowActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  availabilityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  availabilityCopy: {
    flex: 1,
    gap: 2,
  },
  availabilityTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  availabilitySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
