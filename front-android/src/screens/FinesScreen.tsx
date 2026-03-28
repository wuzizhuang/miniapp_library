/**
 * @file 罚款管理页面
 * @description 读者罚款列表屏幕，对应 Web 端待缴与历史罚款记录。
 *
 *   页面结构：
 *   1. 概要卡片 - 待处理数量、待缴总额、历史记录数量
 *   2. 待缴罚款 - 支持立即缴纳操作
 *   3. 历史记录 - 只读展示
 *
 *   罚款类型：
 *   - OVERDUE → 逾期罚款
 *   - LOST → 遗失赔偿
 *   - DAMAGE → 损坏赔偿
 *
 *   状态映射：PENDING / PAID / WAIVED
 *
 *   事件驱动：监听 fines / loans / overview / notifications 自动刷新
 */
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

  /** 处理罚款支付 */
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
      <Screen title="我的罚款" subtitle="待缴费用和历史记录">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen
      title="我的罚款"
      subtitle="待缴费用和处理记录"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="cash-multiple" size={26} color={colors.danger} />
          </View>
          <View style={styles.summaryBody}>
            <InfoPill label="罚款中心" tone="warning" icon="cash-lock" />
            <Text style={styles.summaryTitle}>及时处理借阅费用</Text>
            <Text style={styles.summaryText}>逾期、遗失或损坏产生的费用会汇总在这里，处理完成后会同步更新总览与通知。</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <StatCard icon="alert-circle-outline" value={pending.length} label="待处理" />
          <StatCard icon="cash" valueLabel={formatCurrency(pendingTotal)} label="待缴总额" danger />
          <StatCard icon="history" value={history.length} label="历史记录" />
        </View>
      </Card>

      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载罚款记录...</Text>
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
            <SectionTitle>待缴罚款</SectionTitle>
            {pending.length === 0 ? (
              <EmptyCard title="当前没有待缴罚款" />
            ) : (
              pending.map((item) => (
                <FineCard
                  key={item.fineId}
                  item={item}
                  highlighted={route.params?.highlightId === item.fineId}
                  action={
                    <ActionButton
                      label={actingId === item.fineId ? "支付中..." : "立即缴纳"}
                      icon="cash-check"
                      onPress={() => {
                        void handlePay(item.fineId);
                      }}
                      tone="danger"
                      disabled={actingId !== null}
                    />
                  }
                />
              ))
            )}
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>历史记录</SectionTitle>
            {history.length === 0 ? (
              <EmptyCard title="暂无历史罚款记录" />
            ) : (
              history.map((item) => (
                <FineCard
                  key={item.fineId}
                  item={item}
                  highlighted={route.params?.highlightId === item.fineId}
                />
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

/** 单条罚款卡片组件 */
function FineCard({
  item,
  highlighted,
  action,
}: {
  item: MyFine;
  highlighted?: boolean;
  action?: React.ReactNode;
}) {
  const meta = getFineMeta(item.status, item.type);

  return (
    <View style={[styles.itemCard, highlighted ? styles.highlightCard : undefined]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIconWrap}>
          <MaterialCommunityIcons name={meta.icon} size={18} color={meta.iconColor} />
        </View>
        <View style={styles.itemHeaderBody}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>{meta.title}</Text>
            <InfoPill label={formatCurrency(item.amount)} tone={item.status === "PENDING" ? "danger" : "neutral"} icon="cash" />
          </View>
          <Text style={styles.itemMeta}>{item.bookTitle || "未关联图书"}</Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <InfoPill label={meta.statusLabel} tone={meta.statusTone} icon={meta.statusIcon} />
      </View>
      <Text style={styles.itemMeta}>产生日期 {item.createTime}</Text>
      {item.paidTime ? <Text style={styles.itemMeta}>处理日期 {item.paidTime}</Text> : null}
      {item.reason ? <Text style={styles.itemReason}>{item.reason}</Text> : null}
      {action}
    </View>
  );
}

function StatCard({
  icon,
  value,
  valueLabel,
  label,
  danger = false,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  value?: number;
  valueLabel?: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={18} color={danger ? colors.danger : colors.primaryDark} />
      <Text style={[styles.statValue, danger ? styles.statValueDanger : undefined]}>{valueLabel ?? value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** 根据罚款状态和类型返回元数据（标题、图标、状态文案、色调） */
function getFineMeta(itemStatus: MyFine["status"], type: MyFine["type"]) {
  const titleMap = {
    OVERDUE: "逾期罚款",
    LOST: "遗失赔偿",
    DAMAGE: "损坏赔偿",
  } as const;

  const iconMap = {
    OVERDUE: "clock-alert-outline",
    LOST: "book-remove-outline",
    DAMAGE: "book-alert-outline",
  } as const;

  const statusMap = {
    PENDING: { statusLabel: "待处理", statusTone: "danger" as const, statusIcon: "alert-circle-outline" as const },
    PAID: { statusLabel: "已支付", statusTone: "success" as const, statusIcon: "check-circle-outline" as const },
    WAIVED: { statusLabel: "已减免", statusTone: "neutral" as const, statusIcon: "minus-circle-outline" as const },
  } as const;

  return {
    title: titleMap[type],
    icon: iconMap[type],
    iconColor: type === "OVERDUE" ? colors.accent : colors.danger,
    ...statusMap[itemStatus],
  };
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
    backgroundColor: colors.dangerSoft,
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
    fontSize: 20,
    fontWeight: "800",
  },
  statValueDanger: {
    color: colors.danger,
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
  itemTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  itemMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  itemReason: {
    color: colors.text,
    lineHeight: 21,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
});
