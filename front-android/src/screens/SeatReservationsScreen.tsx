/**
 * @file 座位预约页面
 * @description 馆内自习与研讨座位的查询、预约和取消。
 *
 *   页面结构：
 *   1. 概要卡片 - 可预约/当前预约/历史数量统计
 *   2. 预约条件表单 - 开始/结束时间、楼层、分区、备注
 *   3. 可选座位列表 - 显示座位信息（类型、电源、靠窗）+ 直接预约按钮
 *   4. 我的当前预约 - 支持取消
 *   5. 历史预约 - 只读展示
 *
 *   座位状态：可用 / 停用 / 冲突
 *   预约状态：ACTIVE / COMPLETED / CANCELLED / MISSED
 *
 *   事件驱动：监听 seatReservations / notifications 自动刷新
 */
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, StyleSheet, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard, TextField } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import {
  seatReservationService,
  type SeatItem,
  type SeatReservationItem,
} from "../services/seatReservation";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

/** 数字补零工具函数 */
function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/** 格式化 Date 为 ISO 输入框用字符串 */
function formatDateTimeInput(date: Date): string {
  return [
    date.getFullYear(),
    padTwoDigits(date.getMonth() + 1),
    padTwoDigits(date.getDate()),
  ].join("-")
    + `T${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;
}

/** 生成默认开始时间（下一个整点） */
function buildDefaultStartTime(): string {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return formatDateTimeInput(next);
}

/** 生成默认结束时间（+3 小时） */
function buildDefaultEndTime(): string {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 3);
  return formatDateTimeInput(next);
}

/** 座位可用状态色调 */
function getSeatStatusTone(item: SeatItem): "success" | "warning" | "danger" {
  if (item.available) {
    return "success";
  }

  return item.status === "UNAVAILABLE" ? "danger" : "warning";
}

/** 预约状态色调 */
function getReservationTone(
  status: SeatReservationItem["status"],
): "primary" | "warning" | "success" | "danger" {
  switch (status) {
    case "ACTIVE":
      return "primary";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "danger";
    case "MISSED":
      return "warning";
  }
}

export function SeatReservationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "SeatReservations">>();
  const { user } = useAuth();
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [reservations, setReservations] = useState<SeatReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingSeatId, setSubmittingSeatId] = useState<number | null>(null);
  const [actingReservationId, setActingReservationId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [filters, setFilters] = useState({
    floorName: "",
    zoneName: "",
    startTime: buildDefaultStartTime(),
    endTime: buildDefaultEndTime(),
    notes: "",
  });

  async function loadData(isRefresh = false) {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");
    try {
      const [seatList, myReservations] = await Promise.all([
        seatReservationService.getSeats({
          floorName: filters.floorName.trim() || undefined,
          zoneName: filters.zoneName.trim() || undefined,
          startTime: filters.startTime || undefined,
          endTime: filters.endTime || undefined,
          availableOnly: false,
        }),
        seatReservationService.getMyReservations(),
      ]);
      setSeats(seatList);
      setReservations(myReservations);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "座位预约数据加载失败"));
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
      if (event === "seatReservations" || event === "notifications") {
        void loadData(true);
      }
    });
  }, [user, filters.floorName, filters.zoneName, filters.startTime, filters.endTime]);

  const activeReservations = useMemo(
    () => reservations.filter((item) => item.status === "ACTIVE"),
    [reservations],
  );
  const historyReservations = useMemo(
    () => reservations.filter((item) => item.status !== "ACTIVE"),
    [reservations],
  );
  const availableSeatCount = useMemo(
    () => seats.filter((item) => item.available).length,
    [seats],
  );

  /** 执行座位查询 */
  async function handleSearch() {
    await loadData(true);
  }

  /** 提交座位预约 */
  async function handleReserve(seatId: number) {
    if (!filters.startTime || !filters.endTime) {
      setErrorMessage("请先填写预约开始和结束时间");
      return;
    }

    try {
      setSubmittingSeatId(seatId);
      setErrorMessage("");
      await seatReservationService.createReservation({
        seatId,
        startTime: filters.startTime,
        endTime: filters.endTime,
        notes: filters.notes.trim() || undefined,
      });
      emitAppEvent("seatReservations");
      emitAppEvent("notifications");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "座位预约失败"));
    } finally {
      setSubmittingSeatId(null);
    }
  }

  /** 取消座位预约 */
  async function handleCancel(reservationId: number) {
    try {
      setActingReservationId(reservationId);
      setErrorMessage("");
      await seatReservationService.cancelReservation(reservationId);
      emitAppEvent("seatReservations");
      emitAppEvent("notifications");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "取消座位预约失败"));
    } finally {
      setActingReservationId(null);
    }
  }

  if (!user) {
    return (
      <Screen title="座位预约" subtitle="馆内自习与研讨座位的查询、预约和取消。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen
      title="座位预约"
      subtitle="先按时间段筛选可用座位，再直接提交预约。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="seat-outline" size={26} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryBody}>
            <InfoPill label="座位预约" tone="primary" icon="calendar-clock-outline" />
            <Text style={styles.summaryTitle}>找到合适的自习位置</Text>
            <Text style={styles.summaryText}>按时间、楼层和分区筛选座位，再直接在当前页面完成预约与取消。</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <StatCard icon="check-circle-outline" value={availableSeatCount} label="可预约" />
          <StatCard icon="calendar-check-outline" value={activeReservations.length} label="当前预约" />
          <StatCard icon="history" value={historyReservations.length} label="历史记录" />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <SectionTitle>预约条件</SectionTitle>
        <TextField
          label="开始时间"
          hint="使用 ISO 时间格式，例如 2026-03-10T18:00"
          icon="calendar-start"
          value={filters.startTime}
          onChangeText={(value) => setFilters((current) => ({ ...current, startTime: value }))}
          placeholder="开始时间，如 2026-03-10T18:00"
        />
        <TextField
          label="结束时间"
          hint="使用 ISO 时间格式，例如 2026-03-10T21:00"
          icon="calendar-end"
          value={filters.endTime}
          onChangeText={(value) => setFilters((current) => ({ ...current, endTime: value }))}
          placeholder="结束时间，如 2026-03-10T21:00"
        />
        <View style={styles.row}>
          <TextField
            label="楼层"
            icon="office-building-outline"
            value={filters.floorName}
            onChangeText={(value) => setFilters((current) => ({ ...current, floorName: value }))}
            placeholder="楼层（可选）"
            containerStyle={styles.flexField}
          />
          <TextField
            label="分区"
            icon="shape-outline"
            value={filters.zoneName}
            onChangeText={(value) => setFilters((current) => ({ ...current, zoneName: value }))}
            placeholder="分区（可选）"
            containerStyle={styles.flexField}
          />
        </View>
        <TextField
          label="预约备注"
          icon="text-box-outline"
          value={filters.notes}
          onChangeText={(value) => setFilters((current) => ({ ...current, notes: value }))}
          placeholder="预约备注（可选）"
        />
        <ActionButton
          label={loading ? "刷新中..." : "查询座位"}
          icon="magnify"
          onPress={() => {
            void handleSearch();
          }}
          disabled={loading}
        />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </Card>

      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载座位与预约记录...</Text>
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
            <SectionTitle>可选座位</SectionTitle>
            {seats.length === 0 ? (
              <EmptyCard title="当前没有匹配的座位" description="可以调整楼层、分区或预约时间后重试。" />
            ) : (
              seats.map((item) => (
                <View
                  key={item.seatId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.seatId ? styles.highlightCard : undefined,
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemIconWrap}>
                      <MaterialCommunityIcons name="seat-outline" size={18} color={colors.primaryDark} />
                    </View>
                    <View style={styles.itemHeaderBody}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.itemTitle}>{item.seatCode}</Text>
                        <InfoPill
                          label={item.available ? "可预约" : item.status === "UNAVAILABLE" ? "停用" : "冲突"}
                          tone={getSeatStatusTone(item)}
                          icon={item.available ? "check-circle-outline" : "alert-circle-outline"}
                        />
                      </View>
                      <Text style={styles.itemMeta}>
                        {item.floorName}
                        {item.zoneName ? ` · ${item.zoneName}` : ""}
                        {item.areaName ? ` · ${item.areaName}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.badgeRow}>
                    <InfoPill label={item.seatType} icon="shape-outline" />
                    {item.hasPower ? <InfoPill label="电源" tone="primary" icon="power-plug-outline" /> : null}
                    {item.nearWindow ? <InfoPill label="靠窗" tone="primary" icon="window-open-variant" /> : null}
                  </View>
                  {item.description ? <Text style={styles.itemMeta}>{item.description}</Text> : null}
                  <ActionButton
                    label={submittingSeatId === item.seatId ? "预约中..." : "预约这个座位"}
                    icon="calendar-plus"
                    onPress={() => {
                      void handleReserve(item.seatId);
                    }}
                    disabled={!item.available || submittingSeatId !== null}
                  />
                </View>
              ))
            )}
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>我的当前预约</SectionTitle>
            {activeReservations.length === 0 ? (
              <EmptyCard title="暂无进行中的座位预约" />
            ) : (
              activeReservations.map((item) => (
                <ReservationCard
                  key={item.reservationId}
                  item={item}
                  highlighted={route.params?.highlightId === item.reservationId}
                  action={
                    <ActionButton
                      label={actingReservationId === item.reservationId ? "取消中..." : "取消预约"}
                      icon="close-circle-outline"
                      onPress={() => {
                        void handleCancel(item.reservationId);
                      }}
                      tone="danger"
                      disabled={actingReservationId !== null}
                    />
                  }
                />
              ))
            )}
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>历史预约</SectionTitle>
            {historyReservations.length === 0 ? (
              <EmptyCard title="暂无历史座位预约" />
            ) : (
              historyReservations.map((item) => (
                <ReservationCard
                  key={item.reservationId}
                  item={item}
                  highlighted={route.params?.highlightId === item.reservationId}
                />
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

/** 座位预约卡片组件 */
function ReservationCard({
  item,
  highlighted,
  action,
}: {
  item: SeatReservationItem;
  highlighted?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <View style={[styles.itemCard, highlighted ? styles.highlightCard : undefined]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIconWrap}>
          <MaterialCommunityIcons name="seat-outline" size={18} color={colors.primaryDark} />
        </View>
        <View style={styles.itemHeaderBody}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>{item.seatCode}</Text>
            <InfoPill
              label={{ ACTIVE: "进行中", COMPLETED: "已完成", CANCELLED: "已取消", MISSED: "已失约" }[item.status] || item.status}
              tone={getReservationTone(item.status)}
              icon={item.status === "ACTIVE" ? "calendar-check-outline" : item.status === "COMPLETED" ? "check-circle-outline" : item.status === "CANCELLED" ? "close-circle-outline" : "alert-circle-outline"}
            />
          </View>
          <Text style={styles.itemMeta}>
            {item.floorName || "-"}
            {item.zoneName ? ` · ${item.zoneName}` : ""}
            {item.areaName ? ` · ${item.areaName}` : ""}
          </Text>
        </View>
      </View>
      <Text style={styles.itemMeta}>{item.startTime} - {item.endTime}</Text>
      <View style={styles.badgeRow}>
        {item.seatType ? <InfoPill label={item.seatType} icon="shape-outline" /> : null}
      </View>
      {item.notes ? <Text style={styles.itemMeta}>备注：{item.notes}</Text> : null}
      {action}
    </View>
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
  sectionCard: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flexField: {
    flex: 1,
  },
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 21,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  highlightCard: {
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
  itemHeaderBody: {
    flex: 1,
    gap: 4,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  itemTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  itemMeta: {
    color: colors.textMuted,
    lineHeight: 21,
  },
});
