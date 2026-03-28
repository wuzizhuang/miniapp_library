/**
 * @file 服务预约页面
 * @description 对应 Web 端到馆还书、取书和馆员咨询预约。
 *
 *   页面结构：
 *   1. 概要卡片 - 待处理/历史/可关联借阅数量
 *   2. 新建预约表单 - 服务类型、办理方式、预约时间、关联借阅、归还地点、备注
 *   3. 待处理预约 - 支持取消
 *   4. 历史记录 - 只读展示
 *
 *   服务类型：
 *   - RETURN_BOOK → 到馆还书（必须关联借阅 + 选择归还地点）
 *   - PICKUP_BOOK → 预约取书
 *   - CONSULTATION → 馆员咨询
 *
 *   办理方式：COUNTER / SMART_LOCKER
 *   状态：PENDING / COMPLETED / CANCELLED / MISSED
 *
 *   事件驱动：监听 appointments / loans / notifications 自动刷新
 */
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard, TextField } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { loanService } from "../services/loan";
import { serviceAppointmentService, type ServiceAppointment } from "../services/serviceAppointment";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type {
  ApiServiceAppointmentMethod,
  ApiServiceAppointmentType,
} from "../types/api";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

/** 服务类型枚举 */
const serviceTypes: ApiServiceAppointmentType[] = ["RETURN_BOOK", "PICKUP_BOOK", "CONSULTATION"];
/** 办理方式枚举 */
const methods: ApiServiceAppointmentMethod[] = ["COUNTER", "SMART_LOCKER"];
/** 归还地点选项（按办理方式过滤） */
const returnLocationOptions: Array<{
  value: string;
  label: string;
  method: ApiServiceAppointmentMethod;
}> = [
  { value: "一层总服务台", label: "一层总服务台", method: "COUNTER" },
  { value: "二层东侧咨询台", label: "二层东侧咨询台", method: "COUNTER" },
  { value: "东门24小时还书柜", label: "东门24小时还书柜", method: "SMART_LOCKER" },
  { value: "南门智能还书柜", label: "南门智能还书柜", method: "SMART_LOCKER" },
];

const serviceTypeLabels: Record<ApiServiceAppointmentType, string> = {
  RETURN_BOOK: "到馆还书",
  PICKUP_BOOK: "预约取书",
  CONSULTATION: "馆员咨询",
};

const methodLabels: Record<ApiServiceAppointmentMethod, string> = {
  COUNTER: "到馆柜台",
  SMART_LOCKER: "智能书柜",
};

const statusLabels: Record<ServiceAppointment["status"], string> = {
  PENDING: "待处理",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  MISSED: "已失约",
};

export function AppointmentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Appointments">>();
  const { user } = useAuth();
  const [items, setItems] = useState<ServiceAppointment[]>([]);
  const [loanOptions, setLoanOptions] = useState<Array<{ loanId: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    serviceType: "CONSULTATION" as ApiServiceAppointmentType,
    method: "COUNTER" as ApiServiceAppointmentMethod,
    scheduledTime: "",
    loanId: "",
    returnLocation: "",
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
      const [appointments, loans] = await Promise.all([
        serviceAppointmentService.getMyAppointments(0, 50),
        loanService.getMyLoans(),
      ]);
      setItems(appointments.content ?? []);
      setLoanOptions(
        loans
          .filter((item) => item.status === "BORROWED" || item.status === "OVERDUE")
          .map((item) => ({
            loanId: item.loanId,
            label: `${item.bookTitle} #${item.loanId}`,
          })),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "服务预约加载失败"));
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
      if (event === "appointments" || event === "loans" || event === "notifications") {
        void loadData(true);
      }
    });
  }, [user]);

  const pending = useMemo(() => items.filter((item) => item.status === "PENDING"), [items]);
  const history = useMemo(() => items.filter((item) => item.status !== "PENDING"), [items]);
  const availableReturnLocations = useMemo(
    () => returnLocationOptions.filter((item) => item.method === form.method),
    [form.method],
  );

  useEffect(() => {
    if (form.serviceType !== "RETURN_BOOK") {
      if (form.returnLocation) {
        setForm((current) => ({ ...current, returnLocation: "" }));
      }
      return;
    }

    if (availableReturnLocations.some((item) => item.value === form.returnLocation)) {
      return;
    }

    setForm((current) => ({
      ...current,
      returnLocation: availableReturnLocations[0]?.value ?? "",
    }));
  }, [availableReturnLocations, form.returnLocation, form.serviceType]);

  /** 提交新预约 */
  async function handleCreate() {
    if (!form.scheduledTime) {
      setErrorMessage("请选择预约时间");
      return;
    }

    if (form.serviceType === "RETURN_BOOK" && !form.loanId) {
      setErrorMessage("到馆还书必须关联借阅记录");
      return;
    }

    if (form.serviceType === "RETURN_BOOK" && !form.returnLocation) {
      setErrorMessage("请选择归还地点");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      await serviceAppointmentService.createAppointment({
        serviceType: form.serviceType,
        method: form.method,
        scheduledTime: form.scheduledTime,
        loanId: form.loanId ? Number(form.loanId) : undefined,
        returnLocation: form.serviceType === "RETURN_BOOK" ? form.returnLocation : undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm({
        serviceType: "CONSULTATION",
        method: "COUNTER",
        scheduledTime: "",
        loanId: "",
        returnLocation: "",
        notes: "",
      });
      emitAppEvent("appointments");
      emitAppEvent("overview");
      emitAppEvent("notifications");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "服务预约提交失败"));
    } finally {
      setSubmitting(false);
    }
  }

  /** 取消预约 */
  async function handleCancel(appointmentId: number) {
    try {
      setActingId(appointmentId);
      await serviceAppointmentService.cancelAppointment(appointmentId);
      emitAppEvent("appointments");
      emitAppEvent("overview");
      emitAppEvent("notifications");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "取消服务预约失败"));
    } finally {
      setActingId(null);
    }
  }

  if (!user) {
    return (
      <Screen title="服务预约" subtitle="还书、取书和馆员咨询预约">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen
      title="服务预约"
      subtitle="创建、查看和取消服务预约"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="desk-lamp" size={26} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryBody}>
            <InfoPill label="服务预约" tone="primary" icon="calendar-check-outline" />
            <Text style={styles.summaryTitle}>把线下业务预约好再出发</Text>
            <Text style={styles.summaryText}>支持到馆还书、预约取书和馆员咨询，让线下流程更可控。</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <StatCard icon="clock-outline" value={pending.length} label="待处理" />
          <StatCard icon="history" value={history.length} label="历史记录" />
          <StatCard icon="bookmark-check-outline" value={loanOptions.length} label="可关联借阅" />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <SectionTitle>新建预约</SectionTitle>
        <View style={styles.optionWrap}>
          {serviceTypes.map((item) => (
            <Pressable
              key={item}
              style={[styles.optionChip, form.serviceType === item ? styles.optionChipActive : undefined]}
              onPress={() => setForm((current) => ({ ...current, serviceType: item }))}
            >
              <Text style={form.serviceType === item ? styles.optionChipActiveText : styles.optionChipText}>
                {serviceTypeLabels[item]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.optionWrap}>
          {methods.map((item) => (
            <Pressable
              key={item}
              style={[styles.optionChip, form.method === item ? styles.optionChipActive : undefined]}
              onPress={() => setForm((current) => ({ ...current, method: item }))}
            >
              <Text style={form.method === item ? styles.optionChipActiveText : styles.optionChipText}>
                {methodLabels[item]}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label="预约时间"
          hint="使用 ISO 时间格式，例如 2026-03-10T18:30"
          icon="calendar-clock-outline"
          value={form.scheduledTime}
          onChangeText={(value) => setForm((current) => ({ ...current, scheduledTime: value }))}
          placeholder="预约时间，如 2026-03-10T18:30"
        />

        <TextField
          label="关联借阅"
          hint={loanOptions.length > 0 ? `可直接填写，例如 ${loanOptions[0].loanId}` : "没有可关联的当前借阅时可留空"}
          icon="bookmark-check-outline"
          value={form.loanId}
          onChangeText={(value) => setForm((current) => ({ ...current, loanId: value }))}
          placeholder={loanOptions.length > 0 ? `关联借阅，可填 ${loanOptions[0].loanId}` : "关联借阅（可选）"}
          keyboardType="numeric"
        />

        {loanOptions.length > 0 ? (
          <View style={styles.loanOptionList}>
            {loanOptions.slice(0, 4).map((item) => (
              <Pressable
                key={item.loanId}
                style={[styles.loanOptionCard, form.loanId === String(item.loanId) ? styles.loanOptionCardActive : undefined]}
                onPress={() => setForm((current) => ({ ...current, loanId: String(item.loanId) }))}
              >
                <Text style={styles.loanOptionTitle}>{`#${item.loanId}`}</Text>
                <Text style={styles.loanOptionMeta}>{item.label.replace(` #${item.loanId}`, "")}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {form.serviceType === "RETURN_BOOK" ? (
          <View style={styles.optionWrap}>
            {availableReturnLocations.map((item) => (
              <Pressable
                key={item.value}
                style={[styles.optionChip, form.returnLocation === item.value ? styles.optionChipActive : undefined]}
                onPress={() => setForm((current) => ({ ...current, returnLocation: item.value }))}
              >
                <Text style={form.returnLocation === item.value ? styles.optionChipActiveText : styles.optionChipText}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <TextField
          label="备注说明"
          icon="text-box-outline"
          value={form.notes}
          onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
          multiline
          numberOfLines={4}
          placeholder="备注说明"
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <ActionButton
          label={submitting ? "提交中..." : "提交预约"}
          icon="calendar-plus"
          onPress={() => {
            void handleCreate();
          }}
          disabled={submitting}
        />
      </Card>

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
            <SectionTitle>待处理预约</SectionTitle>
            {pending.length === 0 ? (
              <EmptyCard title="暂无待处理预约" />
            ) : (
              pending.map((item) => (
                <AppointmentCard
                  key={item.appointmentId}
                  item={item}
                  highlighted={route.params?.highlightId === item.appointmentId}
                  action={
                    <ActionButton
                      label={actingId === item.appointmentId ? "取消中..." : "取消预约"}
                      icon="close-circle-outline"
                      onPress={() => {
                        void handleCancel(item.appointmentId);
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
              <EmptyCard title="暂无历史服务预约" />
            ) : (
              history.map((item) => (
                <AppointmentCard
                  key={item.appointmentId}
                  item={item}
                  highlighted={route.params?.highlightId === item.appointmentId}
                />
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

/** 单条服务预约卡片组件 */
function AppointmentCard({
  item,
  highlighted,
  action,
}: {
  item: ServiceAppointment;
  highlighted?: boolean;
  action?: React.ReactNode;
}) {
  const meta = getAppointmentMeta(item.status);

  return (
    <View style={[styles.itemCard, highlighted ? styles.highlightCard : undefined]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIconWrap}>
          <MaterialCommunityIcons name={meta.icon} size={18} color={meta.iconColor} />
        </View>
        <View style={styles.itemHeaderBody}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>{serviceTypeLabels[item.serviceType]}</Text>
            <InfoPill label={statusLabels[item.status]} tone={meta.tone} icon={meta.icon} />
          </View>
          <Text style={styles.itemMeta}>预约时间 {item.scheduledTime}</Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <InfoPill label={methodLabels[item.method]} icon="storefront-outline" />
        {item.returnLocation ? <InfoPill label={item.returnLocation} icon="map-marker-outline" /> : null}
      </View>
      {item.bookTitle ? <Text style={styles.itemMeta}>关联图书 {item.bookTitle}</Text> : null}
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

/** 服务预约状态元数据映射 */
function getAppointmentMeta(status: ServiceAppointment["status"]) {
  switch (status) {
    case "PENDING":
      return { tone: "warning" as const, icon: "clock-outline" as const, iconColor: colors.accent };
    case "COMPLETED":
      return { tone: "success" as const, icon: "check-circle-outline" as const, iconColor: colors.primaryDark };
    case "CANCELLED":
      return { tone: "neutral" as const, icon: "close-circle-outline" as const, iconColor: colors.textMuted };
    default:
      return { tone: "danger" as const, icon: "alert-circle-outline" as const, iconColor: colors.danger };
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
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  optionChipActiveText: {
    color: colors.white,
    fontWeight: "700",
  },
  loanOptionList: {
    gap: spacing.sm,
  },
  loanOptionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  loanOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  loanOptionTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  loanOptionMeta: {
    color: colors.textMuted,
    marginTop: 2,
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
    lineHeight: 20,
  },
});
