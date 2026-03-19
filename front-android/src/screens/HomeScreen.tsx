import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, type CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, CoverImage, EmptyCard, ErrorCard, InfoPill } from "../components/Ui";
import { homeQuickLinkItems } from "../features/home/quickLinks";
import { useHomeData } from "../features/home/useHomeData";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";

export function HomeScreen() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList, "HomeTab">,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { user, signOut } = useAuth();
  const { homeData, overview, loading, refreshing, errorMessage, loadData } = useHomeData({ user, signOut });

  return (
    <Screen
      title="首页"
      subtitle="聚合基础读者能力：馆藏概览、推荐书目和个人借阅快照。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <Card>
        <Text style={styles.bannerTitle}>
          {user ? `欢迎回来，${user.fullName || user.username}` : "先浏览图书，再登录查看个人数据"}
        </Text>
        <Text style={styles.bannerText}>
          沿用 `public/home` 和 `users/me/overview` 的真实接口数据。
        </Text>
        <View style={styles.bannerActions}>
          <ActionButton label="浏览馆藏" onPress={() => navigation.navigate("BooksTab")} />
          <ActionButton
            label={user ? "打开我的" : "去登录"}
            onPress={() => {
              if (user) {
                navigation.navigate("MyTab");
                return;
              }

              navigation.navigate("Login");
            }}
            tone="secondary"
          />
        </View>
      </Card>

      {loading ? <Card><Text style={styles.loadingText}>正在加载首页数据...</Text></Card> : null}
      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadData(true);
          }}
        />
      ) : null}

      {!loading && !errorMessage && homeData ? (
        <>
          <Card>
            <SectionTitle>馆藏速览</SectionTitle>
            <View style={styles.statGrid}>
              {homeData.heroStats.map((item) => (
                <View key={item.label} style={styles.statCard}>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          {overview ? (
            <Card>
              <SectionTitle>我的快照</SectionTitle>
              <View style={styles.statGrid}>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotNumber}>{overview.activeLoanCount}</Text>
                  <Text style={styles.snapshotLabel}>在借</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotNumber}>{overview.readyReservationCount}</Text>
                  <Text style={styles.snapshotLabel}>待取预约</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotNumber}>{overview.unreadNotificationCount}</Text>
                  <Text style={styles.snapshotLabel}>未读通知</Text>
                </View>
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotNumber}>{overview.pendingFineCount}</Text>
                  <Text style={styles.snapshotLabel}>待处理罚款</Text>
                </View>
              </View>
              <View style={styles.quickLinkWrap}>
                <ActionButton label="我的书架" onPress={() => navigation.navigate("Shelf")} tone="secondary" />
                <ActionButton label="我的通知" onPress={() => navigation.navigate("Notifications")} tone="secondary" />
              </View>
            </Card>
          ) : null}

          <Card>
            <SectionTitle>推荐图书</SectionTitle>
            {homeData.featuredBooks.length === 0 ? (
              <EmptyCard title="暂无推荐图书" />
            ) : (
              homeData.featuredBooks.map((book) => (
                <Pressable
                  key={book.id}
                  style={styles.bookRow}
                  onPress={() => navigation.navigate("BookDetail", { bookId: book.id })}
                >
                  <CoverImage title={book.title} uri={book.cover} />
                  <View style={styles.bookBody}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookMeta}>{book.author}</Text>
                    {book.tag ? <InfoPill label={book.tag} tone="primary" /> : null}
                  </View>
                </Pressable>
              ))
            )}
          </Card>

          <Card>
            <SectionTitle>分类概览</SectionTitle>
            <View style={styles.categoryWrap}>
              {homeData.categories.map((category) => (
                <View key={category.categoryId} style={styles.categoryChip}>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <Text style={styles.categoryCount}>{category.count}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <SectionTitle>快捷入口</SectionTitle>
            <View style={styles.entryGrid}>
              {homeQuickLinkItems.map((item) => (
                <Pressable
                  key={item.label}
                  style={styles.entryCard}
                  onPress={() => {
                    if (item.target === "BooksTab") {
                      navigation.navigate("BooksTab");
                      return;
                    }

                    navigation.navigate(item.target);
                  }}
                >
                  <Text style={styles.entryTitle}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bannerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  bannerText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  bannerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    width: "47%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4,
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  snapshotCard: {
    width: "47%",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4,
  },
  snapshotNumber: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "800",
  },
  snapshotLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  quickLinkWrap: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  bookBody: {
    flex: 1,
    gap: 4,
  },
  bookTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  bookMeta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
  },
  categoryLabel: {
    color: colors.text,
    fontWeight: "600",
  },
  categoryCount: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  entryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  entryCard: {
    width: "47%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  entryTitle: {
    color: colors.text,
    fontWeight: "700",
  },
});
