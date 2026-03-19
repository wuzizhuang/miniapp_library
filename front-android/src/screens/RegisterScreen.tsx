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

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  async function handleSubmit() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.username.trim() || !form.fullName.trim() || !form.email.trim() || !form.password) {
      setErrorMessage("请完整填写注册信息");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      await authService.register({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setSuccessMessage("注册成功，请返回登录");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "注册失败"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen title="注册" subtitle="保持与 Web 端相同的账号注册接口和字段语义。">
      <Card>
        <Text style={styles.label}>用户名</Text>
        <TextInput
          value={form.username}
          onChangeText={(value) => setForm((current) => ({ ...current, username: value }))}
          autoCapitalize="none"
          placeholder="请输入用户名"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>姓名</Text>
        <TextInput
          value={form.fullName}
          onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))}
          placeholder="请输入真实姓名"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>邮箱</Text>
        <TextInput
          value={form.email}
          onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="请输入邮箱"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>密码</Text>
        <TextInput
          value={form.password}
          onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
          secureTextEntry
          placeholder="请输入密码"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>确认密码</Text>
        <TextInput
          value={form.confirmPassword}
          onChangeText={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
          secureTextEntry
          placeholder="请再次输入密码"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        {errorMessage ? <StateText tone="danger">{errorMessage}</StateText> : null}
        {successMessage ? <StateText>{successMessage}</StateText> : null}

        <ActionButton
          label={submitting ? "提交中..." : "注册"}
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
