import React, { useEffect, useMemo, useState } from "react";
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
      <Screen title="我的通知" subtitle="对应 Web 端消息中心与业务跳转语义。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="我的通知" subtitle="支持单条已读、全部已读、删除、清空已读和业务跳转。" refreshing={refreshing} onRefresh={() => { void loadData(true); }}>
      {loading ? <Card><Text style={styles.helperText}>正在加载通知...</Text></Card> : null}
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
            <SectionTitle>操作</SectionTitle>
            <View style={styles.actionRow}>
              {unreadCount > 0 ? (
                <ActionButton
                  label={actingType === "markAll" ? "处理中..." : "全部已读"}
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
                  onPress={() => {
                    void clearRead();
                  }}
                  tone="danger"
                  disabled={actingType !== null}
                />
              ) : null}
            </View>
          </Card>

          <Card>
            <SectionTitle>通知列表</SectionTitle>
            {items.length === 0 ? (
              <EmptyCard title="暂无任何通知" />
            ) : (
              items.map((item) => {
                const target = resolveNotificationTarget(item);

                return (
                  <Pressable
                    key={item.notificationId}
                    style={[styles.itemCard, !item.isRead ? styles.unreadCard : undefined]}
                    onPress={() => {
                      void openTarget(item);
                    }}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemTime}>{formatRelativeTime(item.createTime)}</Text>
                    </View>
                    <Text style={styles.itemContent}>{item.content}</Text>
                    <View style={styles.badgeRow}>
                      <InfoPill label={item.type} tone={!item.isRead ? "warning" : "neutral"} />
                      {!item.isRead ? <InfoPill label="未读" tone="danger" /> : null}
                    </View>
                    <View style={styles.actionRow}>
                      {!item.isRead ? (
                        <ActionButton
                          label={actingId === item.notificationId ? "处理中..." : "标记已读"}
                          onPress={() => {
                            void markRead(item.notificationId);
                          }}
                          tone="secondary"
                          disabled={actingId !== null}
                        />
                      ) : null}
                      {target ? (
                        <ActionButton
                          label="查看相关"
                          onPress={() => {
                            void openTarget(item);
                          }}
                          tone="secondary"
                          disabled={actingId !== null}
                        />
                      ) : null}
                      <ActionButton
                        label={actingId === item.notificationId ? "删除中..." : "删除"}
                        onPress={() => {
                          void deleteOne(item.notificationId);
                        }}
                        tone="danger"
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

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  unreadCard: {
    borderColor: colors.primary,
    backgroundColor: "#f1faf7",
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
  },
  itemTime: {
    color: colors.textMuted,
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
