/**
 * @file 通知中心页面
 * @description 统一消息中心屏幕，对应 Web 端消息中心与业务跳转语义。
 *
 *   功能特性：
 *   - 消息列表：展示所有通知，区分已读/未读
 *   - 单条操作：标记已读 + 查看相关 + 删除
 *   - 批量操作：全部已读 + 清空已读
 *   - 业务跳转：根据通知类型和关联数据跳转到对应屏幕
 *   - 相对时间："刚刚" / "N 小时前" / 日期
 *
 *   事件驱动：监听 notifications / reservations / fines / appointments / seatReservations 自动刷新
 */
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import {
  notificationService,
  resolveNotificationTarget,
  type NotificationItem,
} from "../services/notification";
import { getErrorMessage } from "../services/http";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

/** 将时间戳转换为相对时间文案 */
function formatRelativeTime(value: string): string {
  const current = Date.now();
  const timestamp = new Date(value).getTime();
  const diffHours = Math.floor((current - timestamp) / (1000 * 60 * 60));

  if (diffHours < 1) {
    return "刚刚";
  }
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  return value.slice(0, 10);
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);
  const [actingType, setActingType] = useState<"markAll" | "clearRead" | null>(null);

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");
    try {
      const response = await notificationService.getNotificationsPage(0, 50);
      setItems(response.content ?? []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "通知加载失败"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData(true);
    }, [user]),
  );

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (
        event === "notifications"
        || event === "reservations"
        || event === "fines"
        || event === "appointments"
        || event === "seatReservations"
      ) {
        void loadData(true);
      }
    });
  }, [user]);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const readCount = useMemo(() => items.filter((item) => item.isRead).length, [items]);

  /** 标记单条通知已读 */
  async function markRead(notificationId: number) {
    try {
      setActingId(notificationId);
      await notificationService.markRead(notificationId);
      emitAppEvent("notifications");
      emitAppEvent("overview");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "标记已读失败"));
    } finally {
      setActingId(null);
    }
  }

  /** 打开通知关联的业务页面 */
  async function openTarget(item: NotificationItem) {
    try {
      if (!item.isRead) {
        await markRead(item.notificationId);
      }
      const target = resolveNotificationTarget(item);

      if (!target) {
        return;
      }

      switch (target.screen) {
        case "LoanTracking":
          navigation.navigate("LoanTracking", { loanId: Number(target.params?.loanId) });
          break;
        case "BookDetail":
          navigation.navigate("BookDetail", { bookId: Number(target.params?.bookId) });
          break;
        case "MainTabs":
          navigation.navigate("MainTabs", target.params as RootStackParamList["MainTabs"]);
          break;
        case "Reservations":
          navigation.navigate("Reservations", target.params as { highlightId?: number } | undefined);
          break;
        case "Appointments":
          navigation.navigate("Appointments", target.params as { highlightId?: number } | undefined);
          break;
        case "SeatReservations":
          navigation.navigate("SeatReservations", target.params as { highlightId?: number } | undefined);
          break;
        case "Fines":
          navigation.navigate("Fines", target.params as { highlightId?: number } | undefined);
          break;
        case "HelpFeedback":
          navigation.navigate("HelpFeedback", target.params as { highlightId?: number } | undefined);
          break;
        case "Recommendations":
          navigation.navigate("Recommendations", target.params as { highlightId?: number } | undefined);
          break;
        default:
          navigation.navigate("Shelf");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "通知跳转失败"));
    }
  }

  /** 删除单条通知 */
  async function deleteOne(notificationId: number) {
    try {
      setActingId(notificationId);
      await notificationService.deleteNotification(notificationId);
      emitAppEvent("notifications");
      emitAppEvent("overview");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "删除通知失败"));
    } finally {
      setActingId(null);
    }
  }

  /** 全部标记已读 */
  async function markAllRead() {
    try {
      setActingType("markAll");
      await notificationService.markAllRead();
      emitAppEvent("notifications");
      emitAppEvent("overview");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "全部已读失败"));
    } finally {
      setActingType(null);
    }
  }

  /** 清空所有已读通知 */
  async function clearRead() {
    try {
      setActingType("clearRead");
      await notificationService.deleteAllRead();
      emitAppEvent("notifications");
      emitAppEvent("overview");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "清空已读失败"));
    } finally {
      setActingType(null);
    }
  }

  if (!user) {
    return (
      <Screen title="我的通知" subtitle="到馆提醒、逾期通知和系统消息">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen
      title="我的通知"
      subtitle="借阅提醒、到馆通知和系统消息中心"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="bell-badge-outline" size={26} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryBody}>
            <InfoPill label="消息中心" tone="primary" icon="message-badge-outline" />
            <Text style={styles.summaryTitle}>统一处理阅读提醒</Text>
            <Text style={styles.summaryText}>到馆待取、逾期提醒和系统消息都会沉淀在这里，方便集中处理。</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <StatCard icon="email-open-outline" value={readCount} label="已读" />
          <StatCard icon="email-outline" value={unreadCount} label="未读" />
          <StatCard icon="message-processing-outline" value={items.length} label="总消息" />
        </View>
      </Card>

      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载通知...</Text>
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
          <Card>
            <SectionTitle>批量操作</SectionTitle>
            <View style={styles.actionRow}>
              {unreadCount > 0 ? (
                <ActionButton
                  label={actingType === "markAll" ? "处理中..." : "全部已读"}
                  icon="email-check-outline"
                  onPress={() => {
                    void markAllRead();
                  }}
                  tone="secondary"
                  disabled={actingType !== null}
                />
              ) : null}
              {readCount > 0 ? (
                <ActionButton
                  label={actingType === "clearRead" ? "处理中..." : "清空已读"}
                  icon="delete-sweep-outline"
                  onPress={() => {
                    void clearRead();
                  }}
                  tone="danger"
                  disabled={actingType !== null}
                />
              ) : null}
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>通知列表</SectionTitle>
            {items.length === 0 ? (
              <EmptyCard title="暂无任何通知" />
            ) : (
              items.map((item) => {
                const target = resolveNotificationTarget(item);
                const meta = getNotificationMeta(item.type);

                return (
                  <Pressable
                    key={item.notificationId}
                    style={({ pressed }) => [
                      styles.itemCard,
                      !item.isRead ? styles.unreadCard : undefined,
                      pressed ? styles.itemCardPressed : undefined,
                    ]}
                    onPress={() => {
                      void openTarget(item);
                    }}
                  >
                    <View style={styles.itemHeader}>
                      <View style={[styles.itemIconWrap, !item.isRead ? styles.itemIconWrapUnread : undefined]}>
                        <MaterialCommunityIcons name={meta.icon} size={18} color={!item.isRead ? colors.primaryDark : colors.textMuted} />
                      </View>
                      <View style={styles.itemHeaderBody}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          <Text style={styles.itemTime}>{formatRelativeTime(item.createTime)}</Text>
                        </View>
                        <Text style={styles.itemContent}>{item.content}</Text>
                      </View>
                    </View>

                    <View style={styles.badgeRow}>
                      <InfoPill label={meta.label} tone={meta.tone} icon={meta.icon} />
                      {!item.isRead ? <InfoPill label="未读" tone="danger" icon="email-outline" /> : null}
                    </View>

                    <View style={styles.actionRow}>
                      {!item.isRead ? (
                        <ActionButton
                          label={actingId === item.notificationId ? "处理中..." : "标记已读"}
                          icon="check"
                          onPress={() => {
                            void markRead(item.notificationId);
                          }}
                          tone="secondary"
                          size="sm"
                          disabled={actingId !== null}
                        />
                      ) : null}
                      {target ? (
                        <ActionButton
                          label="查看相关"
                          icon="open-in-new"
                          onPress={() => {
                            void openTarget(item);
                          }}
                          tone="secondary"
                          size="sm"
                          disabled={actingId !== null}
                        />
                      ) : null}
                      <ActionButton
                        label={actingId === item.notificationId ? "删除中..." : "删除"}
                        icon="trash-can-outline"
                        onPress={() => {
                          void deleteOne(item.notificationId);
                        }}
                        tone="danger"
                        size="sm"
                        disabled={actingId !== null}
                      />
                    </View>
                  </Pressable>
                );
              })
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

/** 根据通知类型返回对应的图标、文案和色调 */
function getNotificationMeta(type: NotificationItem["type"]) {
  switch (type) {
    case "DUE_REMINDER":
      return { label: "借阅提醒", tone: "warning" as const, icon: "clock-alert-outline" as const };
    case "ARRIVAL_NOTICE":
      return { label: "到馆通知", tone: "success" as const, icon: "package-variant-closed" as const };
    case "NEW_BOOK_RECOMMEND":
      return { label: "荐书动态", tone: "primary" as const, icon: "book-open-variant" as const };
    default:
      return { label: "系统消息", tone: "neutral" as const, icon: "bell-outline" as const };
  }
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
    fontSize: 24,
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
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemCardPressed: {
    opacity: 0.92,
  },
  unreadCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  itemHeader: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconWrapUnread: {
    backgroundColor: colors.surfaceElevated,
  },
  itemHeaderBody: {
    flex: 1,
    gap: 4,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  itemTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  itemTime: {
    color: colors.textMuted,
    fontSize: 12,
  },
  itemContent: {
    color: colors.text,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
