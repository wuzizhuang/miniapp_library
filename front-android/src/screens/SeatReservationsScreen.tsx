import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
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

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateTimeInput(date: Date): string {
  return [
    date.getFullYear(),
    padTwoDigits(date.getMonth() + 1),
    padTwoDigits(date.getDate()),
  ].join("-")
    + `T${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;
}

function buildDefaultStartTime(): string {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return formatDateTimeInput(next);
}

function buildDefaultEndTime(): string {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 3);
  return formatDateTimeInput(next);
}

function getSeatStatusTone(item: SeatItem): "success" | "warning" | "danger" {
  if (item.available) {
    return "success";
  }

  return item.status === "UNAVAILABLE" ? "danger" : "warning";
}

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

  async function handleSearch() {
    await loadData(true);
  }

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
    <Screen title="座位预约" subtitle="先按时间段筛选可用座位，再直接提交预约。" refreshing={refreshing} onRefresh={() => { void loadData(true); }}>
      <Card>
        <SectionTitle>预约条件</SectionTitle>
        <TextInput
          value={filters.startTime}
          onChangeText={(value) => setFilters((current) => ({ ...current, startTime: value }))}
          placeholder="开始时间，如 2026-03-10T18:00"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={filters.endTime}
          onChangeText={(value) => setFilters((current) => ({ ...current, endTime: value }))}
          placeholder="结束时间，如 2026-03-10T21:00"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <View style={styles.row}>
          <TextInput
            value={filters.floorName}
            onChangeText={(value) => setFilters((current) => ({ ...current, floorName: value }))}
            placeholder="楼层（可选）"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.halfInput]}
          />
          <TextInput
            value={filters.zoneName}
            onChangeText={(value) => setFilters((current) => ({ ...current, zoneName: value }))}
            placeholder="分区（可选）"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.halfInput]}
          />
        </View>
        <TextInput
          value={filters.notes}
          onChangeText={(value) => setFilters((current) => ({ ...current, notes: value }))}
          placeholder="预约备注（可选）"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <ActionButton
          label={loading ? "刷新中..." : "查询座位"}
          onPress={() => {
            void handleSearch();
          }}
          disabled={loading}
        />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </Card>

      {loading ? <Card><Text style={styles.helperText}>正在加载座位与预约记录...</Text></Card> : null}
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
                  <View style={styles.headerRow}>
                    <Text style={styles.itemTitle}>{item.seatCode}</Text>
                    <InfoPill
                      label={item.available ? "可预约" : item.status === "UNAVAILABLE" ? "停用" : "冲突"}
                      tone={getSeatStatusTone(item)}
                    />
                  </View>
                  <Text style={styles.itemMeta}>
                    {item.floorName}
                    {item.zoneName ? ` · ${item.zoneName}` : ""}
                    {item.areaName ? ` · ${item.areaName}` : ""}
                  </Text>
                  <View style={styles.tagRow}>
                    <InfoPill label={item.seatType} />
                    {item.hasPower ? <InfoPill label="电源" tone="primary" /> : null}
                    {item.nearWindow ? <InfoPill label="靠窗" tone="primary" /> : null}
                  </View>
                  {item.description ? <Text style={styles.itemMeta}>{item.description}</Text> : null}
                  <ActionButton
                    label={submittingSeatId === item.seatId ? "预约中..." : "预约这个座位"}
                    onPress={() => {
                      void handleReserve(item.seatId);
                    }}
                    disabled={!item.available || submittingSeatId !== null}
                  />
                </View>
              ))
            )}
          </Card>

          <Card>
            <SectionTitle>我的当前预约</SectionTitle>
            {activeReservations.length === 0 ? (
              <EmptyCard title="暂无进行中的座位预约" />
            ) : (
              activeReservations.map((item) => (
                <View
                  key={item.reservationId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.reservationId ? styles.highlightCard : undefined,
                  ]}
                >
                  <View style={styles.headerRow}>
                    <Text style={styles.itemTitle}>{item.seatCode}</Text>
                    <InfoPill label={item.status} tone={getReservationTone(item.status)} />
                  </View>
                  <Text style={styles.itemMeta}>
                    {item.floorName}
                    {item.zoneName ? ` · ${item.zoneName}` : ""}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.startTime} - {item.endTime}
                  </Text>
                  {item.notes ? <Text style={styles.itemMeta}>备注：{item.notes}</Text> : null}
                  <ActionButton
                    label={actingReservationId === item.reservationId ? "取消中..." : "取消预约"}
                    onPress={() => {
                      void handleCancel(item.reservationId);
                    }}
                    tone="danger"
                    disabled={actingReservationId !== null}
                  />
                </View>
              ))
            )}
          </Card>

          <Card>
            <SectionTitle>历史预约</SectionTitle>
            {historyReservations.length === 0 ? (
              <EmptyCard title="暂无历史座位预约" />
            ) : (
              historyReservations.map((item) => (
                <View
                  key={item.reservationId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.reservationId ? styles.highlightCard : undefined,
                  ]}
                >
                  <View style={styles.headerRow}>
                    <Text style={styles.itemTitle}>{item.seatCode}</Text>
                    <InfoPill label={item.status} tone={getReservationTone(item.status)} />
                  </View>
                  <Text style={styles.itemMeta}>
                    {item.floorName}
                    {item.zoneName ? ` · ${item.zoneName}` : ""}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.startTime} - {item.endTime}
                  </Text>
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
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  halfInput: {
    flex: 1,
  },
  helperText: {
    color: colors.textMuted,
  },
  errorText: {
    color: colors.danger,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  highlightCard: {
    borderColor: colors.primary,
    backgroundColor: "#f1faf7",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  itemMeta: {
    color: colors.textMuted,
    lineHeight: 21,
  },
});
