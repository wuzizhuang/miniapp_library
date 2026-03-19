import React, { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, StateText } from "../components/Screen";
import { ActionButton } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { authService } from "../services/auth";
import { getErrorMessage } from "../services/http";
import { colors, radius, spacing } from "../theme";

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [submitting, setSubmitting] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    setErrorMessage("");
    setMessage("");

    if (!value.trim()) {
      setErrorMessage("请输入用户名或邮箱");
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
    <Screen title="找回密码" subtitle="对应 Web 端 `/auth/forgot-password` 语义。">
      <Card>
        <Text style={styles.label}>邮箱</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="请输入注册邮箱"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        {errorMessage ? <StateText tone="danger">{errorMessage}</StateText> : null}
        {message ? <StateText>{message}</StateText> : null}

        <ActionButton
          label={submitting ? "提交中..." : "发送找回请求"}
          onPress={() => {
            void handleSubmit();
          }}
          disabled={submitting}
        />

        <ActionButton
          label="返回登录"
          onPress={() => navigation.goBack()}
          tone="secondary"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
});
