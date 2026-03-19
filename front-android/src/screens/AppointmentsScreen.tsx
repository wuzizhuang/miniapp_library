import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
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

const serviceTypes: ApiServiceAppointmentType[] = ["RETURN_BOOK", "PICKUP_BOOK", "CONSULTATION"];
const methods: ApiServiceAppointmentMethod[] = ["COUNTER", "SMART_LOCKER"];
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
      <Screen title="服务预约" subtitle="对应 Web 端到馆还书、取书和馆员咨询预约。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="服务预约" subtitle="对应 Web 端 `/my/appointments` 的创建、查询与取消。" refreshing={refreshing} onRefresh={() => { void loadData(true); }}>
      <Card>
        <SectionTitle>新建预约</SectionTitle>
        <View style={styles.optionWrap}>
          {serviceTypes.map((item) => (
            <ActionButton
              key={item}
              label={serviceTypeLabels[item]}
              onPress={() => setForm((current) => ({ ...current, serviceType: item }))}
              tone={form.serviceType === item ? "primary" : "secondary"}
            />
          ))}
        </View>
        <View style={styles.optionWrap}>
          {methods.map((item) => (
            <ActionButton
              key={item}
              label={methodLabels[item]}
              onPress={() => setForm((current) => ({ ...current, method: item }))}
              tone={form.method === item ? "primary" : "secondary"}
            />
          ))}
        </View>
        <TextInput
          value={form.scheduledTime}
          onChangeText={(value) => setForm((current) => ({ ...current, scheduledTime: value }))}
          placeholder="预约时间，如 2026-03-10T18:30"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={form.loanId}
          onChangeText={(value) => setForm((current) => ({ ...current, loanId: value }))}
          placeholder={loanOptions.length > 0 ? `关联借阅，可填 ${loanOptions[0].loanId}` : "关联借阅（可选）"}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {form.serviceType === "RETURN_BOOK" ? (
          <View style={styles.optionWrap}>
            {availableReturnLocations.map((item) => (
              <ActionButton
                key={item.value}
                label={item.label}
                onPress={() => setForm((current) => ({ ...current, returnLocation: item.value }))}
                tone={form.returnLocation === item.value ? "primary" : "secondary"}
              />
            ))}
          </View>
        ) : null}
        <TextInput
          value={form.notes}
          onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
          multiline
          numberOfLines={4}
          placeholder="备注说明"
          placeholderTextColor={colors.textMuted}
          style={styles.textarea}
        />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <ActionButton
          label={submitting ? "提交中..." : "提交预约"}
          onPress={() => {
            void handleCreate();
          }}
          disabled={submitting}
        />
      </Card>

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
            <SectionTitle>待处理预约</SectionTitle>
            {pending.length === 0 ? (
              <EmptyCard title="暂无待处理预约" />
            ) : (
              pending.map((item) => (
                <View
                  key={item.appointmentId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.appointmentId ? styles.highlightCard : undefined,
                  ]}
                >
                  <Text style={styles.itemTitle}>{serviceTypeLabels[item.serviceType]}</Text>
                  <Text style={styles.itemMeta}>预约时间 {item.scheduledTime}</Text>
                  <Text style={styles.itemMeta}>方式 {methodLabels[item.method]}</Text>
                  {item.returnLocation ? <Text style={styles.itemMeta}>归还地点 {item.returnLocation}</Text> : null}
                  {item.bookTitle ? <Text style={styles.itemMeta}>关联图书 {item.bookTitle}</Text> : null}
                  <InfoPill label={statusLabels[item.status]} tone="warning" />
                  <ActionButton
                    label={actingId === item.appointmentId ? "取消中..." : "取消预约"}
                    onPress={() => {
                      void handleCancel(item.appointmentId);
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
              <EmptyCard title="暂无历史服务预约" />
            ) : (
              history.map((item) => (
                <View
                  key={item.appointmentId}
                  style={[
                    styles.itemCard,
                    route.params?.highlightId === item.appointmentId ? styles.highlightCard : undefined,
                  ]}
                >
                  <Text style={styles.itemTitle}>{serviceTypeLabels[item.serviceType]}</Text>
                  <Text style={styles.itemMeta}>预约时间 {item.scheduledTime}</Text>
                  <Text style={styles.itemMeta}>方式 {methodLabels[item.method]}</Text>
                  {item.returnLocation ? <Text style={styles.itemMeta}>归还地点 {item.returnLocation}</Text> : null}
                  <InfoPill label={statusLabels[item.status]} />
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
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
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
  textarea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    textAlignVertical: "top",
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
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  itemMeta: {
    color: colors.textMuted,
  },
});
