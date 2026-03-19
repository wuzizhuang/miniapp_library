import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { reservationService, type MyReservation } from "../services/reservation";
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
      <Screen title="我的预约" subtitle="对应 Web 端预约队列和到馆待取状态。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="我的预约" subtitle="对应 Web 端 `/my/reservations` 的进行中与历史预约。" refreshing={refreshing} onRefresh={() => { void loadData(true); }}>
      {loading ? <Card><Text style={styles.helperText}>正在加载预约记录...</Text></Card> : null}
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
            <SectionTitle>进行中的预约</SectionTitle>
            {pending.length === 0 ? (
              <EmptyCard title="暂无进行中的预约" description="当图书没有可借副本时，可以在详情页发起预约。" />
            ) : (
              pending.map((item) => (
                <View
                  key={item.reservationId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.reservationId ? styles.highlightCard : undefined,
                  ]}
                >
                  <Text style={styles.itemTitle}>{item.bookTitle}</Text>
                  <Text style={styles.itemMeta}>预约日期 {item.reservationDate}</Text>
                  {item.queuePosition ? <Text style={styles.itemMeta}>排队位置 第 {item.queuePosition} 位</Text> : null}
                  {item.expiryDate ? <Text style={styles.itemMeta}>有效期至 {item.expiryDate}</Text> : null}
                  <View style={styles.badgeRow}>
                    <InfoPill
                      label={item.status === "AWAITING_PICKUP" ? "可取书" : "排队中"}
                      tone={item.status === "AWAITING_PICKUP" ? "success" : "warning"}
                    />
                  </View>
                  {item.status === "PENDING" ? (
                    <ActionButton
                      label={actingId === item.reservationId ? "取消中..." : "取消预约"}
                      onPress={() => {
                        void handleCancel(item.reservationId);
                      }}
                      tone="danger"
                      disabled={actingId !== null}
                    />
                  ) : null}
                </View>
              ))
            )}
          </Card>

          <Card>
            <SectionTitle>历史预约</SectionTitle>
            {history.length === 0 ? (
              <EmptyCard title="暂无历史预约" />
            ) : (
              history.map((item) => (
                <Pressable
                  key={item.reservationId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.reservationId ? styles.highlightCard : undefined,
                  ]}
                >
                  <Text style={styles.itemTitle}>{item.bookTitle}</Text>
                  <Text style={styles.itemMeta}>预约日期 {item.reservationDate}</Text>
                  <InfoPill label={item.status} />
                </Pressable>
              ))
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
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  itemMeta: {
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
