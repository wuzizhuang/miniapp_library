import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { fineService, type MyFine } from "../services/fine";
import { getErrorMessage } from "../services/http";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";
import { formatCurrency } from "../utils/format";

export function FinesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Fines">>();
  const { user } = useAuth();
  const [items, setItems] = useState<MyFine[]>([]);
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
      const response = await fineService.getMyFines();
      setItems(response);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "罚款记录加载失败"));
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
      if (event === "fines" || event === "loans" || event === "overview" || event === "notifications") {
        void loadData(true);
      }
    });
  }, [user]);

  const pending = useMemo(() => items.filter((item) => item.status === "PENDING"), [items]);
  const history = useMemo(() => items.filter((item) => item.status !== "PENDING"), [items]);
  const pendingTotal = useMemo(
    () => pending.reduce((sum, item) => sum + item.amount, 0),
    [pending],
  );

  async function handlePay(fineId: number) {
    try {
      setActingId(fineId);
      await fineService.payFine(fineId);
      emitAppEvent("fines");
      emitAppEvent("overview");
      emitAppEvent("notifications");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "罚款支付失败"));
    } finally {
      setActingId(null);
    }
  }

  if (!user) {
    return (
      <Screen title="我的罚款" subtitle="对应 Web 端待缴与历史罚款记录。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="我的罚款" subtitle="对应 Web 端 `/my/fines` 的待缴与历史罚款语义。" refreshing={refreshing} onRefresh={() => { void loadData(true); }}>
      {loading ? <Card><Text style={styles.helperText}>正在加载罚款记录...</Text></Card> : null}
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
          {pending.length > 0 ? (
            <Card>
              <Text style={styles.bannerTitle}>待缴罚款总额</Text>
              <Text style={styles.bannerAmount}>{formatCurrency(pendingTotal)}</Text>
              <Text style={styles.bannerSubtext}>共 {pending.length} 笔待处理</Text>
            </Card>
          ) : null}

          <Card>
            <SectionTitle>待缴罚款</SectionTitle>
            {pending.length === 0 ? (
              <EmptyCard title="当前没有待缴罚款" />
            ) : (
              pending.map((item) => (
                <View
                  key={item.fineId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.fineId ? styles.highlightCard : undefined,
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.itemTitle}>{item.type}</Text>
                    <InfoPill label={formatCurrency(item.amount)} tone="danger" />
                  </View>
                  <Text style={styles.itemMeta}>{item.bookTitle || "未关联图书"}</Text>
                  <Text style={styles.itemMeta}>产生日期 {item.createTime}</Text>
                  {item.reason ? <Text style={styles.itemMeta}>{item.reason}</Text> : null}
                  <ActionButton
                    label={actingId === item.fineId ? "支付中..." : "立即缴纳"}
                    onPress={() => {
                      void handlePay(item.fineId);
                    }}
                    tone="danger"
                    disabled={actingId !== null}
                  />
                </View>
              ))
            )}
          </Card>

          <Card>
            <SectionTitle>历史记录</SectionTitle>
            {history.length === 0 ? (
              <EmptyCard title="暂无历史罚款记录" />
            ) : (
              history.map((item) => (
                <View
                  key={item.fineId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.fineId ? styles.highlightCard : undefined,
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.itemTitle}>{item.type}</Text>
                    <InfoPill label={item.status} tone={item.status === "PAID" ? "success" : "neutral"} />
                  </View>
                  <Text style={styles.itemMeta}>{item.bookTitle || "未关联图书"}</Text>
                  <Text style={styles.itemMeta}>金额 {formatCurrency(item.amount)}</Text>
                  <Text style={styles.itemMeta}>日期 {item.createTime}</Text>
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
  helperText: {
    color: colors.textMuted,
  },
  bannerTitle: {
    color: colors.textMuted,
  },
  bannerAmount: {
    color: colors.danger,
    fontSize: 32,
    fontWeight: "800",
  },
  bannerSubtext: {
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
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  itemMeta: {
    color: colors.textMuted,
  },
});
