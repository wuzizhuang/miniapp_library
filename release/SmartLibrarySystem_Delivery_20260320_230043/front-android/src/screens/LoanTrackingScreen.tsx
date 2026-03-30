/**
 * @file 借阅追踪页面
 * @description 单笔借阅的详情与自助操作屏幕。
 *
 *   页面结构：
 *   1. Hero 卡片 - 封面、书名、状态标签、续借次数、剩余/逾期天数
 *   2. 借阅信息面板 - 借阅编号、副本编号、馆藏位置、借出/应还/归还日期
 *   3. 读者自助操作 - 续借 + 归还（仅 BORROWED / OVERDUE 状态可见）
 *
 *   交互能力：
 *   - 续借（canRenew 时可用）
 *   - 归还
 *   - 遗失登记说明仅由馆员在后台处理
 *
 *   事件驱动：监听 loans / books 事件自动刷新
 */
import React, { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, CoverImage, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { loanService, type MyLoan } from "../services/loan";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

type AppIcon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export function LoanTrackingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "LoanTracking">>();
  const { user } = useAuth();
  const [loan, setLoan] = useState<MyLoan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [acting, setActing] = useState<"renew" | "return" | null>(null);

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");
    try {
      const response = await loanService.getLoanById(route.params.loanId);
      setLoan(response);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "借阅详情加载失败"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [route.params.loanId]);

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "loans" || event === "books") {
        void loadData(true);
      }
    });
  }, [route.params.loanId]);

  /** 处理续借或归还操作 */
  async function handleAction(action: "renew" | "return") {
    try {
      setActing(action);
      if (action === "renew") {
        await loanService.renewLoan(route.params.loanId);
      } else {
        await loanService.returnLoan(route.params.loanId);
      }
      emitAppEvent("loans");
      emitAppEvent("books");
      emitAppEvent("overview");
      emitAppEvent("fines");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, action === "renew" ? "续借失败" : "归还失败"));
    } finally {
      setActing(null);
    }
  }

  if (!user) {
    return (
      <Screen title="借阅追踪" subtitle="仅保留读者自助续借与归还，不提供挂失。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen
      title="借阅追踪"
      subtitle="对应 Web 端 `/my/loan-tracking/[id]` 的读者借阅详情。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载借阅详情...</Text>
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

      {!loading && !errorMessage && !loan ? <EmptyCard title="未找到该借阅记录" /> : null}

      {!loading && !errorMessage && loan ? (
        <>
          <Card tone="tinted" style={styles.heroCard}>
            <View style={styles.heroRow}>
              <CoverImage title={loan.bookTitle} uri={loan.bookCover} style={styles.cover} />
              <View style={styles.heroBody}>
                <InfoPill label="LOAN STATUS" tone="primary" icon="book-arrow-right-outline" />
                <Text style={styles.title}>{loan.bookTitle}</Text>
                <Text style={styles.meta}>{loan.bookAuthorNames || "未知作者"}</Text>
                <View style={styles.badgeRow}>
                  <InfoPill
                    label={getLoanStatusLabel(loan.status)}
                    tone={getLoanStatusTone(loan.status)}
                    icon={getLoanStatusIcon(loan.status)}
                  />
                  <InfoPill label={`续借 ${loan.renewalCount} / 2`} icon="repeat" />
                  {typeof loan.daysRemaining === "number" && loan.status === "BORROWED" ? (
                    <InfoPill label={`剩余 ${loan.daysRemaining} 天`} tone="success" icon="clock-outline" />
                  ) : null}
                  {typeof loan.daysOverdue === "number" && loan.status === "OVERDUE" ? (
                    <InfoPill label={`逾期 ${loan.daysOverdue} 天`} tone="danger" icon="alert-circle-outline" />
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.metricRow}>
              <MiniMetric icon="calendar-arrow-right" label="借出" value={loan.borrowDate} />
              <MiniMetric icon="calendar-clock" label="应还" value={loan.dueDate} />
              <MiniMetric icon="bookmark-check-outline" label="续借" value={String(loan.renewalCount)} />
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>借阅信息</SectionTitle>
            <View style={styles.infoBoard}>
              <InfoRow icon="identifier" label="借阅编号" value={`#${loan.loanId}`} />
              <InfoRow icon="archive-outline" label="副本编号" value={`#${loan.copyId}`} />
              <InfoRow icon="map-marker-outline" label="馆藏位置" value={loan.locationCode || "--"} />
              <InfoRow icon="calendar-import" label="借出日期" value={loan.borrowDate} />
              <InfoRow icon="calendar-alert" label="应还日期" value={loan.dueDate} />
              <InfoRow icon="calendar-check" label="归还日期" value={loan.returnDate || "--"} />
            </View>
          </Card>

          {(loan.status === "BORROWED" || loan.status === "OVERDUE") ? (
            <Card style={styles.sectionCard}>
              <SectionTitle>读者自助操作</SectionTitle>
              <View style={styles.noticeStrip}>
                <MaterialCommunityIcons name="information-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.noticeText}>遗失登记需由馆员在后台处理，读者端只保留续借和归还。</Text>
              </View>
              <View style={styles.actionRow}>
                {loan.canRenew ? (
                  <ActionButton
                    label={acting === "renew" ? "续借中..." : "续借"}
                    icon="repeat"
                    onPress={() => {
                      void handleAction("renew");
                    }}
                    tone="secondary"
                    disabled={acting !== null}
                    style={styles.actionButton}
                  />
                ) : null}
                <ActionButton
                  label={acting === "return" ? "归还中..." : "归还"}
                  icon="check-circle-outline"
                  onPress={() => {
                    void handleAction("return");
                  }}
                  tone="success"
                  disabled={acting !== null}
                  style={styles.actionButton}
                />
              </View>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

/** 迷你指标卡片（借出日期/应还日期/续借次数） */
function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: AppIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.primaryDark} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/** 信息行组件 */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: AppIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.textSoft} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/** 借阅状态文案映射 */
function getLoanStatusLabel(status: MyLoan["status"]) {
  switch (status) {
    case "BORROWED":
      return "借阅中";
    case "OVERDUE":
      return "已逾期";
    case "RETURNED":
      return "已归还";
    default:
      return "已挂失";
  }
}

/** 借阅状态色调映射 */
function getLoanStatusTone(status: MyLoan["status"]) {
  switch (status) {
    case "BORROWED":
      return "primary" as const;
    case "OVERDUE":
      return "danger" as const;
    case "RETURNED":
      return "success" as const;
    default:
      return "warning" as const;
  }
}

/** 借阅状态图标映射 */
function getLoanStatusIcon(status: MyLoan["status"]) {
  switch (status) {
    case "BORROWED":
      return "book-clock-outline" as const;
    case "OVERDUE":
      return "alert-circle-outline" as const;
    case "RETURNED":
      return "check-circle-outline" as const;
    default:
      return "alert-octagon-outline" as const;
  }
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cover: {
    width: 92,
    height: 130,
  },
  heroBody: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30,
  },
  meta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2,
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  metricValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sectionCard: {
    gap: spacing.md,
  },
  infoBoard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    color: colors.textMuted,
  },
  infoValue: {
    flex: 1,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
  },
  noticeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeText: {
    flex: 1,
    color: colors.text,
    lineHeight: 21,
  },
  actionRow: {
    gap: spacing.sm,
  },
  actionButton: {
    width: "100%",
  },
});
