import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

type AppIcon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const snapshotMeta: Array<{
  key: "activeLoanCount" | "readyReservationCount" | "unreadNotificationCount" | "pendingFineCount";
  label: string;
  icon: AppIcon;
}> = [
  { key: "activeLoanCount", label: "在借图书", icon: "book-clock-outline" },
  { key: "readyReservationCount", label: "待取预约", icon: "calendar-check-outline" },
  { key: "unreadNotificationCount", label: "未读通知", icon: "bell-ring-outline" },
  { key: "pendingFineCount", label: "待处理罚款", icon: "cash-lock" },
];

export function HomeScreen() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList, "HomeTab">,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { user, signOut } = useAuth();
  const { homeData, overview, loading, refreshing, errorMessage, loadData } = useHomeData({
    user,
    signOut,
  });

  const welcomeTitle = user
    ? `欢迎回来，${user.fullName || user.username}`
    : "先浏览图书，再登录查看个人数据";
  const welcomeCopy = user
    ? "首页已聚合你的借阅、通知、预约与馆藏推荐，可以直接从这里继续常用操作。"
    : "你可以先浏览真实馆藏数据，登录后再解锁书架、预约、通知和借阅快照。";

  return (
    <Screen
      title="首页"
      subtitle="聚合基础读者能力：馆藏概览、推荐书目、上新书单和个人借阅快照。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <Card tone="tinted" style={styles.welcomeCard}>
        <View style={styles.welcomeTop}>
          <View style={styles.welcomeBody}>
            <InfoPill
              label={user ? "个性化阅读空间" : "访客探索模式"}
              tone={user ? "success" : "neutral"}
              icon={user ? "star-four-points-outline" : "compass-outline"}
            />
            <Text style={styles.welcomeTitle}>{welcomeTitle}</Text>
            <Text style={styles.welcomeText}>{welcomeCopy}</Text>
          </View>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="library-shelves" size={32} color={colors.primaryDark} />
          </View>
        </View>

        <View style={styles.heroHighlightRow}>
          <HeroHighlight
            icon="database-eye-outline"
            title="真实数据"
            description="沿用 public/home 与 users/me/overview"
          />
          <HeroHighlight
            icon="gesture-tap-button"
            title="高频入口"
            description="馆藏浏览、书架、通知和预约直达"
          />
        </View>

        <View style={styles.bannerActions}>
          <ActionButton
            label="浏览馆藏"
            icon="magnify"
            onPress={() => navigation.navigate("BooksTab")}
            style={styles.bannerAction}
          />
          <ActionButton
            label={user ? "打开我的" : "去登录"}
            icon={user ? "account-circle-outline" : "login"}
            onPress={() => {
              if (user) {
                navigation.navigate("MyTab");
                return;
              }

              navigation.navigate("Login");
            }}
            tone="secondary"
            style={styles.bannerAction}
          />
        </View>
      </Card>

      {loading ? (
        <Card tone="muted">
          <Text style={styles.loadingText}>正在加载首页数据...</Text>
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

      {!loading && !errorMessage && homeData ? (
        <>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <SectionTitle>馆藏速览</SectionTitle>
                <Text style={styles.sectionHint}>用更醒目的方式看全局数据</Text>
              </View>
              <InfoPill label="实时概览" tone="primary" icon="chart-donut" />
            </View>

            <View style={styles.statGrid}>
              {homeData.heroStats.map((item, index) => {
                const meta = getStatMeta(item.label, index);

                return (
                  <View key={item.label} style={styles.statCard}>
                    <View style={[styles.statIconWrap, { backgroundColor: meta.backgroundColor }]}>
                      <MaterialCommunityIcons name={meta.icon} size={20} color={meta.iconColor} />
                    </View>
                    <Text style={styles.statValue}>{item.value}</Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          {overview ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <SectionTitle>我的快照</SectionTitle>
                  <Text style={styles.sectionHint}>把当前需要处理的个人事项放到首屏</Text>
                </View>
                <InfoPill label="已登录" tone="success" icon="check-decagram-outline" />
              </View>

              <View style={styles.snapshotGrid}>
                {snapshotMeta.map((item) => (
                  <View key={item.key} style={styles.snapshotCard}>
                    <View style={styles.snapshotIconWrap}>
                      <MaterialCommunityIcons name={item.icon} size={18} color={colors.primaryDark} />
                    </View>
                    <Text style={styles.snapshotValue}>{String(overview[item.key as keyof typeof overview])}</Text>
                    <Text style={styles.snapshotLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.reminderStrip}>
                <MaterialCommunityIcons name="clock-alert-outline" size={18} color={colors.accent} />
                <Text style={styles.reminderText}>
                  {overview.dueSoonLoanCount > 0
                    ? `你有 ${overview.dueSoonLoanCount} 本图书即将到期，建议尽快处理。`
                    : "当前没有即将到期的借阅，阅读节奏很稳。"}
                </Text>
              </View>

              <View style={styles.quickActionRow}>
                <ActionButton
                  label="我的书架"
                  icon="bookmark-box-multiple-outline"
                  onPress={() => navigation.navigate("Shelf")}
                  tone="secondary"
                  style={styles.quickActionButton}
                />
                <ActionButton
                  label="我的通知"
                  icon="bell-badge-outline"
                  onPress={() => navigation.navigate("Notifications")}
                  tone="secondary"
                  style={styles.quickActionButton}
                />
              </View>
            </Card>
          ) : null}

          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <SectionTitle>推荐图书</SectionTitle>
                <Text style={styles.sectionHint}>基于首页接口返回的精选推荐</Text>
              </View>
              <InfoPill label="精选" tone="warning" icon="star-four-points-outline" />
            </View>

            {homeData.featuredBooks.length === 0 ? (
              <EmptyCard title="暂无推荐图书" />
            ) : (
              homeData.featuredBooks.map((book) => (
                <Pressable
                  key={book.id}
                  style={({ pressed }) => [
                    styles.featuredBookCard,
                    pressed ? styles.pressedCard : undefined,
                  ]}
                  onPress={() => navigation.navigate("BookDetail", { bookId: book.id })}
                >
                  <CoverImage title={book.title} uri={book.cover} style={styles.featuredBookCover} />
                  <View style={styles.featuredBookBody}>
                    <View style={styles.featuredBookHeader}>
                      <View style={styles.featuredBookTitleWrap}>
                        <Text style={styles.bookTitle} numberOfLines={2}>
                          {book.title}
                        </Text>
                        <Text style={styles.bookMeta}>{book.author}</Text>
                      </View>
                      <MaterialCommunityIcons
                        name="arrow-top-right"
                        size={18}
                        color={colors.textSoft}
                      />
                    </View>
                    <View style={styles.featuredBookFooter}>
                      {book.tag ? <InfoPill label={book.tag} tone="primary" icon="bookmark-outline" /> : null}
                      <Text style={styles.featuredBookHint}>进入详情页查看借阅与评论</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </Card>

          {homeData.newArrivals.length > 0 ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <SectionTitle>新书上架</SectionTitle>
                  <Text style={styles.sectionHint}>适合横向浏览的一组近期上新</Text>
                </View>
                <InfoPill label="上新" tone="success" icon="book-plus-outline" />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.arrivalShelf}
              >
                {homeData.newArrivals.map((book) => (
                  <Pressable
                    key={book.id}
                    style={({ pressed }) => [
                      styles.arrivalCard,
                      pressed ? styles.pressedCard : undefined,
                    ]}
                    onPress={() => navigation.navigate("BookDetail", { bookId: book.id })}
                  >
                    <CoverImage title={book.title} uri={book.cover} style={styles.arrivalCover} />
                    <Text style={styles.arrivalTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.arrivalMeta} numberOfLines={1}>
                      {book.author}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Card>
          ) : null}

          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <SectionTitle>分类概览</SectionTitle>
                <Text style={styles.sectionHint}>把热门馆藏分布压缩成更轻巧的标签云</Text>
              </View>
            </View>
            <View style={styles.categoryWrap}>
              {homeData.categories.map((category) => (
                <View key={category.categoryId} style={styles.categoryChip}>
                  <MaterialCommunityIcons name="shape-outline" size={14} color={colors.primaryDark} />
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <Text style={styles.categoryCount}>{category.count}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <SectionTitle>快捷入口</SectionTitle>
                <Text style={styles.sectionHint}>把常去的读者操作做成清晰的入口卡片</Text>
              </View>
            </View>
            <View style={styles.entryGrid}>
              {homeQuickLinkItems.map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.entryCard,
                    pressed ? styles.pressedCard : undefined,
                  ]}
                  onPress={() => {
                    if (item.target === "BooksTab") {
                      navigation.navigate("BooksTab");
                      return;
                    }

                    navigation.navigate(item.target);
                  }}
                >
                  <View style={styles.entryIconWrap}>
                    <MaterialCommunityIcons
                      name={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                      size={20}
                      color={colors.primaryDark}
                    />
                  </View>
                  <Text style={styles.entryTitle}>{item.label}</Text>
                  <Text style={styles.entryDescription}>{item.description}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function HeroHighlight({
  icon,
  title,
  description,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  description: string;
}) {
  return (
    <View style={styles.heroHighlightCard}>
      <View style={styles.heroHighlightIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <View style={styles.heroHighlightBody}>
        <Text style={styles.heroHighlightTitle}>{title}</Text>
        <Text style={styles.heroHighlightDescription}>{description}</Text>
      </View>
    </View>
  );
}

function getStatMeta(label: string, index: number) {
  if (label.includes("图书") || label.includes("馆藏")) {
    return {
      icon: "book-open-page-variant-outline" as const,
      backgroundColor: colors.primarySoft,
      iconColor: colors.primaryDark,
    };
  }

  if (label.includes("读者") || label.includes("用户")) {
    return {
      icon: "account-group-outline" as const,
      backgroundColor: colors.accentSoft,
      iconColor: colors.accent,
    };
  }

  if (label.includes("借")) {
    return {
      icon: "swap-horizontal-circle-outline" as const,
      backgroundColor: colors.primarySoft,
      iconColor: colors.primaryDark,
    };
  }

  if (label.includes("预约")) {
    return {
      icon: "calendar-check-outline" as const,
      backgroundColor: colors.accentSoft,
      iconColor: colors.accent,
    };
  }

  const fallbackIcons = [
    "chart-arc",
    "chart-bar-stacked",
    "book-search-outline",
    "star-outline",
  ] as const;

  return {
    icon: fallbackIcons[index % fallbackIcons.length],
    backgroundColor: index % 2 === 0 ? colors.primarySoft : colors.accentSoft,
    iconColor: index % 2 === 0 ? colors.primaryDark : colors.accent,
  };
}

const styles = StyleSheet.create({
  welcomeCard: {
    gap: spacing.md,
  },
  welcomeTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  welcomeBody: {
    flex: 1,
    gap: spacing.sm,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  welcomeTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 32,
  },
  welcomeText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  heroHighlightRow: {
    gap: spacing.sm,
  },
  heroHighlightCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroHighlightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroHighlightBody: {
    flex: 1,
    gap: 2,
  },
  heroHighlightTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  heroHighlightDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  bannerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bannerAction: {
    flex: 1,
  },
  loadingText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  sectionCard: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 132,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  snapshotCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 132,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  snapshotIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  snapshotValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "800",
  },
  snapshotLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  reminderStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reminderText: {
    flex: 1,
    color: colors.text,
    lineHeight: 21,
  },
  quickActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickActionButton: {
    flex: 1,
  },
  featuredBookCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  featuredBookCover: {
    width: 72,
    height: 104,
  },
  featuredBookBody: {
    flex: 1,
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  featuredBookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  featuredBookTitleWrap: {
    flex: 1,
    gap: 4,
  },
  bookTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  bookMeta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  featuredBookFooter: {
    gap: spacing.xs,
  },
  featuredBookHint: {
    color: colors.textSoft,
    fontSize: 12,
  },
  arrivalShelf: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  arrivalCard: {
    width: 148,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  arrivalCover: {
    width: "100%",
    height: 164,
  },
  arrivalTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  arrivalMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  categoryLabel: {
    color: colors.text,
    fontWeight: "600",
  },
  categoryCount: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  entryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  entryCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 148,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  entryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  entryTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  entryDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 19,
  },
  pressedCard: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
