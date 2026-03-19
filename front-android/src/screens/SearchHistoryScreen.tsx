import React, { useEffect, useState } from "react";
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
      {loading ? <Card><Text style={styles.helperText}>正在加载搜索历史...</Text></Card> : null}
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
          <Card>
            <SectionTitle>热门搜索</SectionTitle>
            {hotKeywords.length === 0 ? (
              <Text style={styles.helperText}>暂无热门关键词</Text>
            ) : (
              <View style={styles.keywordWrap}>
                {hotKeywords.map((keyword) => (
                  <Pressable key={keyword} style={styles.keywordChip} onPress={() => openBooksSearch(keyword)}>
                    <Text style={styles.keywordText}>{keyword}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          <Card>
            <SectionTitle>历史记录</SectionTitle>
            {history.length === 0 ? (
              <EmptyCard title="还没有搜索历史" description="从馆藏目录发起检索后，记录会自动出现在这里。" />
            ) : (
              history.map((item) => (
                <View key={item.searchId} style={styles.historyCard}>
                  <View style={styles.historyMain}>
                    <Text style={styles.historyKeyword}>{item.keyword}</Text>
                    <Text style={styles.historyMeta}>
                      {typeof item.resultCount === "number" ? `${item.resultCount} 条结果 · ` : ""}
                      {formatTime(item.searchTime)}
                    </Text>
                  </View>
                  <ActionButton
                    label="再搜一次"
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

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
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
    paddingVertical: 8,
  },
  keywordText: {
    color: colors.text,
    fontWeight: "700",
  },
  historyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  historyMain: {
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
