import React, { useEffect, useState } from "react";
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
    <Screen title="借阅追踪" subtitle="对应 Web 端 `/my/loan-tracking/[id]` 的读者借阅详情。" refreshing={refreshing} onRefresh={() => { void loadData(true); }}>
      {loading ? <Card><Text style={styles.helperText}>正在加载借阅详情...</Text></Card> : null}
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
          <Card>
            <View style={styles.heroRow}>
              <CoverImage title={loan.bookTitle} uri={loan.bookCover} style={styles.cover} />
              <View style={styles.heroBody}>
                <Text style={styles.title}>{loan.bookTitle}</Text>
                <Text style={styles.meta}>{loan.bookAuthorNames || "未知作者"}</Text>
                <View style={styles.badgeRow}>
                  <InfoPill
                    label={loan.status === "BORROWED" ? "借阅中" : loan.status === "OVERDUE" ? "已逾期" : loan.status === "RETURNED" ? "已归还" : "已挂失"}
                    tone={loan.status === "OVERDUE" ? "danger" : loan.status === "RETURNED" ? "success" : loan.status === "LOST" ? "warning" : "primary"}
                  />
                  <InfoPill label={`续借 ${loan.renewalCount} / 2`} />
                </View>
              </View>
            </View>
          </Card>

          <Card>
            <SectionTitle>借阅信息</SectionTitle>
            <InfoRow label="借阅编号" value={`#${loan.loanId}`} />
            <InfoRow label="副本编号" value={`#${loan.copyId}`} />
            <InfoRow label="馆藏位置" value={loan.locationCode || "--"} />
            <InfoRow label="借出日期" value={loan.borrowDate} />
            <InfoRow label="应还日期" value={loan.dueDate} />
            <InfoRow label="归还日期" value={loan.returnDate || "--"} />
          </Card>

          {(loan.status === "BORROWED" || loan.status === "OVERDUE") ? (
            <Card>
              <SectionTitle>读者自助操作</SectionTitle>
              <Text style={styles.helperText}>
                遗失登记需由馆员在后台处理，读者端只保留续借和归还。
              </Text>
              <View style={styles.actionRow}>
                {loan.canRenew ? (
                  <ActionButton
                    label={acting === "renew" ? "续借中..." : "续借"}
                    onPress={() => {
                      void handleAction("renew");
                    }}
                    tone="secondary"
                    disabled={acting !== null}
                  />
                ) : null}
                <ActionButton
                  label={acting === "return" ? "归还中..." : "归还"}
                  onPress={() => {
                    void handleAction("return");
                  }}
                  tone="success"
                  disabled={acting !== null}
                />
              </View>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  heroRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cover: {
    width: 86,
    height: 120,
  },
  heroBody: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
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
  actionRow: {
    gap: spacing.sm,
  },
});
