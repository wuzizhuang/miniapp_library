/**
 * @file 搜索历史页面
 * @description 查看最近检索记录，并一键回到对应的书目结果页。
 *
 *   页面结构：
 *   1. 概要卡片 - 热门词数量、历史记录数量
 *   2. 热门搜索 - 热门关键词 Tag 列表（可点击跳转搜索）
 *   3. 历史记录 - 搜索关键词、结果数、时间、“再搜一次”按钮
 *
 *   数据来源：searchService.getMyHistory + searchService.getHotKeywords
 *   页面聚焦时自动刷新
 */
import React, { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, LoginPromptCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { searchService } from "../services/search";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { ApiSearchLogDto } from "../types/api";

/** 格式化时间戳为可读字符串 */
function formatTime(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function SearchHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [history, setHistory] = useState<ApiSearchLogDto[]>([]);
  const [hotKeywords, setHotKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData(isRefresh = false) {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const [historyResponse, hot] = await Promise.all([
        searchService.getMyHistory(0, 50),
        searchService.getHotKeywords(10),
      ]);
      setHistory(historyResponse.content ?? []);
      setHotKeywords(hot ?? []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "搜索历史加载失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (!user) {
        return undefined;
      }

      void loadData(true);
      return undefined;
    }, [user]),
  );

  /** 点击关键词跳转到馆藏目录搜索 */
  function openBooksSearch(keyword: string) {
    navigation.navigate("MainTabs", {
      screen: "BooksTab",
      params: {
        presetKeyword: keyword,
      },
    });
  }

  if (!user) {
    return (
      <Screen title="搜索历史" subtitle="查看最近检索记录，并一键回到对应的书目结果页。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="搜索历史" subtitle="查看最近检索记录，并一键回到对应的书目结果页。">
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="history" size={26} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryBody}>
            <Text style={styles.summaryTitle}>保留你的检索轨迹</Text>
            <Text style={styles.summaryText}>热门搜索和最近历史会在这里汇总，方便快速回到之前看过的书目结果。</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <StatCard icon="fire" value={hotKeywords.length} label="热门词" />
          <StatCard icon="history" value={history.length} label="历史记录" />
        </View>
      </Card>

      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载搜索历史...</Text>
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

      {!loading && !errorMessage ? (
        <>
          <Card style={styles.sectionCard}>
            <SectionTitle>热门搜索</SectionTitle>
            {hotKeywords.length === 0 ? (
              <Text style={styles.helperText}>暂无热门关键词</Text>
            ) : (
              <View style={styles.keywordWrap}>
                {hotKeywords.map((keyword) => (
                  <Pressable key={keyword} style={styles.keywordChip} onPress={() => openBooksSearch(keyword)}>
                    <MaterialCommunityIcons name="trending-up" size={14} color={colors.primaryDark} />
                    <Text style={styles.keywordText}>{keyword}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>历史记录</SectionTitle>
            {history.length === 0 ? (
              <EmptyCard title="还没有搜索历史" description="从馆藏目录发起检索后，记录会自动出现在这里。" />
            ) : (
              history.map((item) => (
                <View key={item.searchId} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyIconWrap}>
                      <MaterialCommunityIcons name="magnify" size={16} color={colors.primaryDark} />
                    </View>
                    <View style={styles.historyMain}>
                      <Text style={styles.historyKeyword}>{item.keyword}</Text>
                      <Text style={styles.historyMeta}>
                        {typeof item.resultCount === "number" ? `${item.resultCount} 条结果 · ` : ""}
                        {formatTime(item.searchTime)}
                      </Text>
                    </View>
                  </View>
                  <ActionButton
                    label="再搜一次"
                    icon="refresh"
                    onPress={() => openBooksSearch(item.keyword)}
                    tone="secondary"
                  />
                </View>
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primaryDark} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.md,
  },
  summaryHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  summaryIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBody: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  summaryText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: 4,
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  sectionCard: {
    gap: spacing.md,
  },
  keywordWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  keywordChip: {
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keywordText: {
    color: colors.text,
    fontWeight: "700",
  },
  historyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  historyHeader: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  historyMain: {
    flex: 1,
    gap: 4,
  },
  historyKeyword: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  historyMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
