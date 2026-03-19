import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { feedbackService } from "../services/feedback";
import { getErrorMessage } from "../services/http";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { ApiFeedbackCategory, ApiFeedbackDto } from "../types/api";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

const categories: ApiFeedbackCategory[] = [
  "BOOK_INFO",
  "SYSTEM_BUG",
  "SERVICE_EXPERIENCE",
  "SUGGESTION",
  "OTHER",
];

const categoryLabelMap: Record<ApiFeedbackCategory, string> = {
  BOOK_INFO: "图书信息",
  SYSTEM_BUG: "系统缺陷",
  SERVICE_EXPERIENCE: "服务体验",
  SUGGESTION: "建议意见",
  OTHER: "其他",
};

const statusLabelMap: Record<string, string> = {
  OPEN: "待处理",
  IN_PROGRESS: "处理中",
  RESOLVED: "已解决",
  CLOSED: "已关闭",
};

export function HelpFeedbackScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "HelpFeedback">>();
  const { user } = useAuth();
  const [history, setHistory] = useState<ApiFeedbackDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    category: "SUGGESTION" as ApiFeedbackCategory,
    subject: "",
    content: "",
    contactEmail: "",
  });

  async function loadData(isRefresh = false) {
    if (!user) {
      setHistory([]);
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
      const response = await feedbackService.getMyFeedback(0, 20);
      setHistory(response.content ?? []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "反馈记录加载失败"));
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
      if (event === "feedback") {
        void loadData(true);
      }
    });
  }, [user]);

  async function handleSubmit() {
    setErrorMessage("");

    if (!user) {
      navigation.navigate("Login");
      return;
    }

    if (!form.subject.trim() || !form.content.trim()) {
      setErrorMessage("请填写反馈主题和详细描述");
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.createFeedback({
        category: form.category,
        subject: form.subject.trim(),
        content: form.content.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
      });
      setForm({
        category: "SUGGESTION",
        subject: "",
        content: "",
        contactEmail: "",
      });
      emitAppEvent("feedback");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "反馈提交失败"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen title="帮助与反馈" subtitle="对应 Web 端帮助与反馈页的真实业务语义。" refreshing={refreshing} onRefresh={() => { void loadData(true); }}>
      <Card>
        <SectionTitle>提交反馈</SectionTitle>
        <View style={styles.categoryRow}>
          {categories.map((item) => (
            <ActionButton
              key={item}
              label={categoryLabelMap[item] || item}
              onPress={() => setForm((current) => ({ ...current, category: item }))}
              tone={form.category === item ? "primary" : "secondary"}
            />
          ))}
        </View>
        <TextInput
          value={form.contactEmail}
          onChangeText={(value) => setForm((current) => ({ ...current, contactEmail: value }))}
          autoCapitalize="none"
          placeholder="联系方式（可选）"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={form.subject}
          onChangeText={(value) => setForm((current) => ({ ...current, subject: value }))}
          placeholder="反馈主题"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={form.content}
          onChangeText={(value) => setForm((current) => ({ ...current, content: value }))}
          multiline
          numberOfLines={5}
          placeholder="详细描述问题、复现步骤或建议"
          placeholderTextColor={colors.textMuted}
          style={styles.textarea}
        />
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        <ActionButton
          label={submitting ? "提交中..." : user ? "提交反馈" : "登录后提交"}
          onPress={() => {
            void handleSubmit();
          }}
          disabled={submitting}
        />
      </Card>

      <Card>
        <SectionTitle>我的反馈记录</SectionTitle>
        {!user ? (
          <EmptyCard title="登录后可查看历史反馈" />
        ) : loading ? (
          <Text style={styles.helperText}>正在加载反馈记录...</Text>
        ) : errorMessage ? (
          <ErrorCard
            message={errorMessage}
            onRetry={() => {
              void loadData(true);
            }}
          />
        ) : history.length === 0 ? (
          <EmptyCard title="暂无反馈记录" />
        ) : (
          history.map((item) => (
            <View
              key={item.feedbackId}
              style={[
                styles.itemCard,
                route.params?.highlightId === item.feedbackId ? styles.highlightCard : undefined,
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{item.subject}</Text>
                <Text style={styles.itemMeta}>{statusLabelMap[item.status] || item.status}</Text>
              </View>
              <Text style={styles.itemContent}>{item.content}</Text>
              <Text style={styles.itemMeta}>提交时间 {String(item.createTime ?? "").slice(0, 16).replace("T", " ")}</Text>
              {item.adminReply ? (
                <View style={styles.replyBox}>
                  <Text style={styles.replyTitle}>管理员回复</Text>
                  <Text style={styles.replyText}>{item.adminReply}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
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
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    textAlignVertical: "top",
  },
  errorText: {
    color: colors.danger,
    lineHeight: 21,
  },
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
  itemMeta: {
    color: colors.textMuted,
  },
  itemContent: {
    color: colors.text,
    lineHeight: 22,
  },
  replyBox: {
    borderRadius: radius.sm,
    backgroundColor: "#f1faf7",
    padding: spacing.md,
    gap: spacing.xs,
  },
  replyTitle: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  replyText: {
    color: colors.text,
    lineHeight: 22,
  },
});
