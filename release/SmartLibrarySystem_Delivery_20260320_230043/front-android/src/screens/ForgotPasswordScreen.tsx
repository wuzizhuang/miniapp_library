/**
 * @file 找回密码页面
 * @description 密码找回屏幕，对应 Web 端 `/auth/forgot-password` 流程。
 *
 *   功能流程：
 *   1. 用户输入注册邮箱
 *   2. 调用 authService.forgotPassword() 提交找回请求
 *   3. 后端处理后前端展示成功/失败提示
 */

import React, { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, StateText } from "../components/Screen";
import { ActionButton, InfoPill, TextField } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { authService } from "../services/auth";
import { getErrorMessage } from "../services/http";
import { colors, spacing } from "../theme";

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── 表单与状态 ──
  const [submitting, setSubmitting] = useState(false);
  const [value, setValue] = useState("");          // 邮箱输入值
  const [message, setMessage] = useState("");      // 成功提示
  const [errorMessage, setErrorMessage] = useState("");  // 错误提示

  /** 处理找回密码提交 */
  async function handleSubmit() {
    setErrorMessage("");
    setMessage("");

    if (!value.trim()) {
      setErrorMessage("请输入注册邮箱");
      return;
    }

    setSubmitting(true);
    try {
      const response = await authService.forgotPassword({
        email: value.trim(),
      });
      setMessage(response.message || "找回密码请求已提交，请查看邮箱或联系管理员。");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "找回密码请求失败"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen title="找回密码" subtitle="对应 Web 端 `/auth/forgot-password` 的找回流程语义。">
      {/* 介绍卡片 */}
      <Card tone="tinted" style={styles.introCard}>
        <View style={styles.introRow}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="email-check-outline" size={28} color={colors.primaryDark} />
          </View>
          <View style={styles.introBody}>
            <InfoPill label="邮件找回" tone="warning" icon="email-fast-outline" />
            <Text style={styles.introTitle}>重置账号访问权限</Text>
            <Text style={styles.introText}>输入注册邮箱后，系统会按后端配置继续密码找回流程。</Text>
          </View>
        </View>
      </Card>

      {/* 找回密码表单卡片 */}
      <Card style={styles.formCard}>
        <TextField
          label="邮箱"
          icon="email-outline"
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="请输入注册邮箱"
        />

        {/* 状态提示 */}
        {errorMessage ? <StateText tone="danger">{errorMessage}</StateText> : null}
        {message ? <StateText>{message}</StateText> : null}

        {/* 提交按钮 */}
        <ActionButton
          label={submitting ? "提交中..." : "发送找回请求"}
          icon="send-outline"
          onPress={() => {
            void handleSubmit();
          }}
          disabled={submitting}
        />

        {/* 返回登录 */}
        <ActionButton
          label="返回登录"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          tone="secondary"
        />
      </Card>
    </Screen>
  );
}

// ─── 样式定义 ─────────────────────────────────

const styles = StyleSheet.create({
  introCard: { gap: spacing.md },
  introRow: { flexDirection: "row", gap: spacing.md },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  introBody: { flex: 1, gap: spacing.xs },
  introTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  introText: { color: colors.textMuted, lineHeight: 22 },
  formCard: { gap: spacing.md },
});
