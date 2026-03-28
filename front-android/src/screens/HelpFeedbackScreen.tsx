/**
 * @file 帮助与反馈页面
 * @description 对应 Web 端帮助与反馈页的真实业务语义。
 *
 *   页面结构：
 *   1. 概要卡片 - 功能介绍
 *   2. 提交反馈表单 - 分类选择、联系方式、主题、详细描述
 *   3. 我的反馈记录 - 历史反馈列表（含管理员回复）
 *
 *   反馈分类：
 *   - BOOK_INFO → 图书信息
 *   - SYSTEM_BUG → 系统缺陷
 *   - SERVICE_EXPERIENCE → 服务体验
 *   - SUGGESTION → 建议意见
 *   - OTHER → 其他
 *
 *   状态：OPEN / SUBMITTED / IN_PROGRESS / RESOLVED / CLOSED / REJECTED
 *   事件驱动：监听 feedback 自动刷新
 */
import React, { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, EmptyCard, ErrorCard, InfoPill, TextField } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { feedbackService } from "../services/feedback";
import { getErrorMessage } from "../services/http";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { ApiFeedbackCategory, ApiFeedbackDto } from "../types/api";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

/** 反馈分类选项配置 */
const categories: Array<{
  value: ApiFeedbackCategory;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}> = [
  { value: "BOOK_INFO", label: "图书信息", icon: "book-edit-outline" },
  { value: "SYSTEM_BUG", label: "系统缺陷", icon: "bug-outline" },
  { value: "SERVICE_EXPERIENCE", label: "服务体验", icon: "account-heart-outline" },
  { value: "SUGGESTION", label: "建议意见", icon: "lightbulb-outline" },
  { value: "OTHER", label: "其他", icon: "dots-horizontal-circle-outline" },
];

/** 反馈状态文案映射 */
const statusLabelMap: Record<string, string> = {
  OPEN: "待处理",
  SUBMITTED: "待处理",
  IN_PROGRESS: "处理中",
  RESOLVED: "已解决",
  CLOSED: "已关闭",
  REJECTED: "已驳回",
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

  /** 提交反馈 */
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
    <Screen
      title="帮助与反馈"
      subtitle="常见问题解答和意见反馈"
      refreshing={refreshing}
      onRefresh={() => {
        void loadData(true);
      }}
    >
      <Card tone="tinted" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="message-alert-outline" size={26} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryBody}>
            <InfoPill label="帮助中心" tone="primary" icon="headset" />
            <Text style={styles.summaryTitle}>把问题和建议直接发给系统</Text>
            <Text style={styles.summaryText}>你可以提交图书信息、系统缺陷、服务体验和其他建议，并在下方查看处理进度。</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <SectionTitle>提交反馈</SectionTitle>
        <View style={styles.categoryRow}>
          {categories.map((item) => (
            <Pressable
              key={item.value}
              style={[
                styles.categoryChip,
                form.category === item.value ? styles.categoryChipActive : undefined,
              ]}
              onPress={() => setForm((current) => ({ ...current, category: item.value }))}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={16}
                color={form.category === item.value ? colors.white : colors.textMuted}
              />
              <Text style={form.category === item.value ? styles.categoryChipActiveText : styles.categoryChipText}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label="联系方式"
          hint="可选，便于后续联系"
          icon="email-outline"
          value={form.contactEmail}
          onChangeText={(value) => setForm((current) => ({ ...current, contactEmail: value }))}
          autoCapitalize="none"
          placeholder="联系方式（可选）"
        />

        <TextField
          label="反馈主题"
          icon="tag-outline"
          value={form.subject}
          onChangeText={(value) => setForm((current) => ({ ...current, subject: value }))}
          placeholder="反馈主题"
        />

        <TextField
          label="详细描述"
          icon="text-box-outline"
          value={form.content}
          onChangeText={(value) => setForm((current) => ({ ...current, content: value }))}
          multiline
          numberOfLines={5}
          placeholder="详细描述问题、复现步骤或建议"
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <ActionButton
          label={submitting ? "提交中..." : user ? "提交反馈" : "登录后提交"}
          icon="send-outline"
          onPress={() => {
            void handleSubmit();
          }}
          disabled={submitting}
        />
      </Card>

      <Card style={styles.sectionCard}>
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
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.itemTitle}>{item.subject}</Text>
                  <Text style={styles.itemMeta}>
                    提交时间 {String(item.createTime ?? "").slice(0, 16).replace("T", " ")}
                  </Text>
                </View>
                <InfoPill
                  label={statusLabelMap[item.status] || item.status}
                  tone={getFeedbackTone(item.status)}
                  icon={getFeedbackIcon(item.status)}
                />
              </View>
              <InfoPill
                label={categories.find((entry) => entry.value === item.category)?.label || item.category}
                icon={categories.find((entry) => entry.value === item.category)?.icon || "tag-outline"}
              />
              <Text style={styles.itemContent}>{item.content}</Text>
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

/** 反馈状态对应的色调 */
function getFeedbackTone(status: string) {
  switch (status) {
    case "RESOLVED":
      return "success" as const;
    case "IN_PROGRESS":
      return "warning" as const;
    case "REJECTED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

/** 反馈状态对应的图标 */
function getFeedbackIcon(status: string) {
  switch (status) {
    case "RESOLVED":
      return "check-circle-outline" as const;
    case "IN_PROGRESS":
      return "progress-clock" as const;
    case "REJECTED":
      return "close-circle-outline" as const;
    default:
      return "clock-outline" as const;
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
  sectionCard: {
    gap: spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  categoryChipActiveText: {
    color: colors.white,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    lineHeight: 21,
  },
  helperText: {
    color: colors.textMuted,
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
    justifyContent: "space-between",
    gap: spacing.sm,
    alignItems: "flex-start",
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
    fontSize: 12,
  },
  itemContent: {
    color: colors.text,
    lineHeight: 22,
  },
  replyBox: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
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
