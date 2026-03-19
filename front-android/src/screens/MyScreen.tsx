import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, type CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle, StateText } from "../components/Screen";
import { ActionButton, ErrorCard } from "../components/Ui";
import { myQuickLinkItems } from "../features/my/quickLinks";
import { useMyDashboard } from "../features/my/useMyDashboard";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import { formatCurrency } from "../utils/format";

export function MyScreen() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList, "MyTab">,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { user, signOut } = useAuth();
  const { profile, overview, loading, refreshing, errorMessage, loadData } = useMyDashboard({ user, signOut });

  if (!user) {
    return (
      <Screen title="我的" subtitle="登录后查看书架、预约、通知、罚款、反馈和服务预约。">
        <Card>
          <Text style={styles.emptyTitle}>当前未登录</Text>
          <Text style={styles.emptyText}>Android 端已接好认证接口，可以直接使用现有账号登录。</Text>
          <ActionButton label="去登录" onPress={() => navigation.navigate("Login")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="我的"
      subtitle="对应 Web 端我的中心，聚合个人资料和读者业务入口。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      {loading ? <StateText>Loading profile...</StateText> : null}
      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadData(true);
          }}
        />
      ) : null}

      {profile ? (
        <Card>
          <Text style={styles.name}>{profile.fullName || profile.username}</Text>
          <Text style={styles.meta}>{profile.email}</Text>
          <Text style={styles.meta}>
            {profile.role} · {profile.identityType || "UNKNOWN"}
          </Text>
          <Text style={styles.meta}>
            {profile.department || "未填写院系"} / {profile.major || "未填写专业"}
          </Text>
        </Card>
      ) : null}

      {overview ? (
        <>
          <Card>
            <SectionTitle>账户总览</SectionTitle>
            <View style={styles.metrics}>
              <Metric label="在借图书" value={overview.activeLoanCount} />
              <Metric label="即将到期" value={overview.dueSoonLoanCount} />
              <Metric label="待取预约" value={overview.readyReservationCount} />
              <Metric label="未读通知" value={overview.unreadNotificationCount} />
              <Metric label="收藏" value={overview.favoriteCount} />
              <Metric label="待处理罚款" value={overview.pendingFineCount} />
            </View>
          </Card>

          <Card>
            <SectionTitle>重点提醒</SectionTitle>
            <Text style={styles.noticeLine}>
              待缴罚款金额：{formatCurrency(overview.pendingFineTotal)}
            </Text>
            {overview.dueSoonLoans.length === 0 ? (
              <Text style={styles.noticeLine}>暂无即将到期的借阅。</Text>
            ) : (
              overview.dueSoonLoans.slice(0, 3).map((loan) => (
                <Pressable
                  key={loan.loanId}
                  onPress={() => navigation.navigate("LoanTracking", { loanId: loan.loanId })}
                >
                  <Text style={styles.noticeLine}>
                    {loan.bookTitle} · 剩余 {loan.daysRemaining} 天
                  </Text>
                </Pressable>
              ))
            )}
          </Card>
        </>
      ) : null}

      <Card>
        <SectionTitle>快捷入口</SectionTitle>
        <View style={styles.linkList}>
          {myQuickLinkItems.map((item) => (
            <Pressable
              key={item.label}
              style={styles.linkItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.linkText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <ActionButton label="退出登录" onPress={() => void signOut()} tone="secondary" />
      </Card>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
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
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricCard: {
    width: "47%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4,
  },
  metricValue: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  noticeLine: {
    color: colors.text,
    lineHeight: 22,
  },
  linkList: {
    gap: spacing.sm,
  },
  linkItem: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  linkText: {
    color: colors.text,
    fontWeight: "700",
  },
});
