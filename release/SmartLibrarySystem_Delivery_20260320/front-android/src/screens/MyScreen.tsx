import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, type CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle, StateText } from "../components/Screen";
import { ActionButton, ErrorCard, InfoPill } from "../components/Ui";
import { myQuickLinkItems } from "../features/my/quickLinks";
import { useMyDashboard } from "../features/my/useMyDashboard";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import { formatCurrency } from "../utils/format";

const metricMeta = [
  { key: "activeLoanCount", label: "在借图书", icon: "book-clock-outline" },
  { key: "dueSoonLoanCount", label: "即将到期", icon: "clock-alert-outline" },
  { key: "readyReservationCount", label: "待取预约", icon: "calendar-check-outline" },
  { key: "unreadNotificationCount", label: "未读通知", icon: "bell-ring-outline" },
  { key: "favoriteCount", label: "收藏", icon: "heart-outline" },
  { key: "pendingFineCount", label: "待处理罚款", icon: "cash-lock" },
];

export function MyScreen() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList, "MyTab">,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { user, signOut } = useAuth();
  const { profile, overview, loading, refreshing, errorMessage, loadData } = useMyDashboard({
    user,
    signOut,
  });

  if (!user) {
    return (
      <Screen title="我的" subtitle="登录后查看书架、预约、通知、罚款、反馈和服务预约。">
        <Card tone="tinted" style={styles.guestCard}>
          <View style={styles.guestIconWrap}>
            <MaterialCommunityIcons name="account-lock-outline" size={28} color={colors.primaryDark} />
          </View>
          <Text style={styles.emptyTitle}>当前未登录</Text>
          <Text style={styles.emptyText}>
            Android 端已经接好了认证接口，可以直接使用现有账号登录后查看完整读者中心。
          </Text>
          <ActionButton
            label="去登录"
            icon="login"
            onPress={() => navigation.navigate("Login")}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="我的"
      subtitle="对应 Web 端我的中心，聚合个人资料、重点提醒和读者业务入口。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      {loading ? <StateText>正在加载个人中心数据...</StateText> : null}

      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadData(true);
          }}
        />
      ) : null}

      {profile ? (
        <Card tone="tinted" style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile.fullName || profile.username).slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileBody}>
              <View style={styles.profileNameRow}>
                <Text style={styles.name}>{profile.fullName || profile.username}</Text>
                <InfoPill label={profile.identityType || "READER"} tone="primary" icon="badge-account-outline" />
              </View>
              <Text style={styles.meta}>{profile.email}</Text>
              <Text style={styles.meta}>
                {profile.role} · {profile.department || "未填写院系"}
              </Text>
              <Text style={styles.meta}>
                {profile.major || "未填写专业"}{profile.enrollmentYear ? ` · ${profile.enrollmentYear}` : ""}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {overview ? (
        <>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <SectionTitle>账户总览</SectionTitle>
                <Text style={styles.sectionHint}>把最常看的业务指标集中在一个面板里</Text>
              </View>
              <InfoPill label="读者中心" tone="success" icon="account-check-outline" />
            </View>

            <View style={styles.metrics}>
              {metricMeta.map((item) => (
                <Metric
                  key={item.key}
                  label={item.label}
                  value={Number(overview[item.key as keyof typeof overview] ?? 0)}
                  icon={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                />
              ))}
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <SectionTitle>重点提醒</SectionTitle>
                <Text style={styles.sectionHint}>优先处理会影响借阅体验的事项</Text>
              </View>
              <InfoPill label={`待缴 ${formatCurrency(overview.pendingFineTotal)}`} tone="warning" icon="cash" />
            </View>

            <View style={styles.noticeBoard}>
              <View style={styles.noticeBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.accent} />
                <Text style={styles.noticeBannerText}>
                  {overview.dueSoonLoanCount > 0
                    ? `你有 ${overview.dueSoonLoanCount} 本图书即将到期，建议尽快续借或归还。`
                    : "暂无即将到期借阅，可以安心阅读。"}
                </Text>
              </View>

              {overview.dueSoonLoans.length === 0 ? (
                <Text style={styles.noticeLine}>当前没有需要特别关注的借阅记录。</Text>
              ) : (
                overview.dueSoonLoans.slice(0, 3).map((loan) => (
                  <Pressable
                    key={loan.loanId}
                    style={({ pressed }) => [
                      styles.noticeItem,
                      pressed ? styles.pressedCard : undefined,
                    ]}
                    onPress={() => navigation.navigate("LoanTracking", { loanId: loan.loanId })}
                  >
                    <View style={styles.noticeItemIconWrap}>
                      <MaterialCommunityIcons name="book-arrow-right-outline" size={16} color={colors.primaryDark} />
                    </View>
                    <View style={styles.noticeItemBody}>
                      <Text style={styles.noticeItemTitle}>{loan.bookTitle}</Text>
                      <Text style={styles.noticeItemMeta}>剩余 {loan.daysRemaining} 天</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSoft} />
                  </Pressable>
                ))
              )}
            </View>
          </Card>
        </>
      ) : null}

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <SectionTitle>快捷入口</SectionTitle>
            <Text style={styles.sectionHint}>把个人中心常用操作改成更清晰的卡片网格</Text>
          </View>
        </View>
        <View style={styles.linkGrid}>
          {myQuickLinkItems.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.linkItem, pressed ? styles.pressedCard : undefined]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.linkIconWrap}>
                <MaterialCommunityIcons
                  name={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                  size={20}
                  color={colors.primaryDark}
                />
              </View>
              <Text style={styles.linkTitle}>{item.label}</Text>
              <Text style={styles.linkDescription}>{item.description}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <ActionButton
          label="退出登录"
          icon="logout"
          onPress={() => void signOut()}
          tone="ghost"
        />
      </Card>
    </Screen>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  guestCard: {
    alignItems: "flex-start",
    gap: spacing.md,
  },
  guestIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  profileCard: {
    gap: spacing.md,
  },
  profileTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
  },
  profileBody: {
    flex: 1,
    gap: 4,
  },
  profileNameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  meta: {
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
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 136,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  noticeBoard: {
    gap: spacing.sm,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeBannerText: {
    flex: 1,
    color: colors.text,
    lineHeight: 21,
  },
  noticeLine: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  noticeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  noticeItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeItemBody: {
    flex: 1,
    gap: 2,
  },
  noticeItemTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  noticeItemMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  linkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  linkItem: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 148,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  linkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  linkDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 19,
  },
  pressedCard: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
