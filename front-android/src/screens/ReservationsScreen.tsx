/**
 * @file 预约管理页面
 * @description 读者预约列表屏幕，对应 Web 端预约队列和到馆待取状态。
 *
 *   页面结构：
 *   1. 概要卡片 - 进行中/待取/历史数量统计
 *   2. 进行中的预约 - 支持取消操作
 *   3. 历史预约 - 只读展示
 *
 *   状态映射：
 *   - PENDING → 排队中
 *   - AWAITING_PICKUP → 可取书
 *   - FULFILLED → 已完成
 *   - CANCELLED → 已取消
 *   - EXPIRED → 已过期
 *
 *   事件驱动：监听 reservations / books / notifications 自动刷新
 */
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { SummaryHeroCard } from "../components/SummaryHeroCard";
import { ActionButton, CoverImage, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { reservationService, type MyReservation, type ReservationStatus } from "../services/reservation";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

export function ReservationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Reservations">>();
  const { user } = useAuth();
  const [items, setItems] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");
    try {
      const response = await reservationService.getMyReservations();
      setItems(response);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "预约记录加载失败"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "reservations" || event === "books" || event === "notifications") {
        void loadData(true);
      }
    });
  }, [user]);

  const pending = useMemo(
    () => items.filter((item) => item.status === "PENDING" || item.status === "AWAITING_PICKUP"),
    [items],
  );
  const history = useMemo(
    () => items.filter((item) => item.status !== "PENDING" && item.status !== "AWAITING_PICKUP"),
    [items],
  );

  /** 取消预约 */
  async function handleCancel(reservationId: number) {
    try {
      setActingId(reservationId);
      await reservationService.cancelReservation(reservationId);
      emitAppEvent("reservations");
      emitAppEvent("books");
      emitAppEvent("overview");
      emitAppEvent("notifications");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "取消预约失败"));
    } finally {
      setActingId(null);
    }
  }

  if (!user) {
    return (
      <Screen title="我的预约" subtitle="排队取书和预约进度查看">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen
      title="我的预约"
      subtitle="进行中的预约和历史记录"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <SummaryHeroCard
        icon="calendar-clock-outline"
        pill={{ label: "预约进度", tone: "primary", icon: "calendar-check-outline" }}
        title="追踪排队与待取状态"
        description="当图书没有可借副本时，可以在详情页发起预约，并在这里跟进排队进度。"
        stats={[
          { icon: "timer-sand", value: pending.length, label: "进行中" },
          { icon: "package-variant-closed", value: pending.filter((item) => item.status === "AWAITING_PICKUP").length, label: "待取" },
          { icon: "history", value: history.length, label: "历史预约" },
        ]}
      />

      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载预约记录...</Text>
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
            <SectionTitle>进行中的预约</SectionTitle>
            {pending.length === 0 ? (
              <EmptyCard title="暂无进行中的预约" description="当图书没有可借副本时，可以在详情页发起预约。" />
            ) : (
              pending.map((item) => (
                <ReservationCard
                  key={item.reservationId}
                  item={item}
                  highlighted={route.params?.highlightId === item.reservationId}
                  onPress={() => navigation.navigate("BookDetail", { bookId: item.bookId })}
                  footerAction={
                    item.status === "PENDING" ? (
                      <ActionButton
                        label={actingId === item.reservationId ? "取消中..." : "取消预约"}
                        icon="close-circle-outline"
                        onPress={() => {
                          void handleCancel(item.reservationId);
                        }}
                        tone="danger"
                        disabled={actingId !== null}
                      />
                    ) : null
                  }
                />
              ))
            )}
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>历史预约</SectionTitle>
            {history.length === 0 ? (
              <EmptyCard title="暂无历史预约" />
            ) : (
              history.map((item) => (
                <ReservationCard
                  key={item.reservationId}
                  item={item}
                  highlighted={route.params?.highlightId === item.reservationId}
                  onPress={() => navigation.navigate("BookDetail", { bookId: item.bookId })}
                />
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

/** 单条预约卡片组件 */
function ReservationCard({
  item,
  highlighted,
  onPress,
  footerAction,
}: {
  item: MyReservation;
  highlighted?: boolean;
  onPress: () => void;
  footerAction?: React.ReactNode;
}) {
  const meta = getReservationMeta(item.status);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        highlighted ? styles.highlightCard : undefined,
        pressed ? styles.itemCardPressed : undefined,
      ]}
      onPress={onPress}
    >
      <CoverImage title={item.bookTitle} uri={item.coverUrl} style={styles.itemCover} />
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleWrap}>
            <Text style={styles.itemTitle}>{item.bookTitle}</Text>
            <Text style={styles.itemMeta}>预约日期 {item.reservationDate}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSoft} />
        </View>
        {item.queuePosition ? <Text style={styles.itemMeta}>排队位置 第 {item.queuePosition} 位</Text> : null}
        {item.expiryDate ? <Text style={styles.itemMeta}>有效期至 {item.expiryDate}</Text> : null}
        <View style={styles.badgeRow}>
          <InfoPill label={meta.label} tone={meta.tone} icon={meta.icon} />
        </View>
        {footerAction}
      </View>
    </Pressable>
  );
}



/** 预约状态元数据映射 */
function getReservationMeta(status: ReservationStatus) {
  switch (status) {
    case "AWAITING_PICKUP":
      return { label: "可取书", tone: "success" as const, icon: "package-variant-closed" as const };
    case "PENDING":
      return { label: "排队中", tone: "warning" as const, icon: "timer-sand" as const };
    case "FULFILLED":
      return { label: "已完成", tone: "success" as const, icon: "check-circle-outline" as const };
    case "CANCELLED":
      return { label: "已取消", tone: "neutral" as const, icon: "close-circle-outline" as const };
    default:
      return { label: "已过期", tone: "danger" as const, icon: "clock-alert-outline" as const };
  }
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  sectionCard: {
    gap: spacing.md,
  },
  itemCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
  },
  itemCardPressed: {
    opacity: 0.92,
  },
  highlightCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  itemCover: {
    width: 70,
    height: 102,
  },
  itemBody: {
    flex: 1,
    gap: spacing.xs,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  itemTitleWrap: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  itemMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
