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
      <Card tone="tinted" style={styles.introCard}>
        <View style={styles.introRow}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="account-plus-outline" size={28} color={colors.primaryDark} />
          </View>
          <View style={styles.introBody}>
            <InfoPill label="新账号开通" tone="primary" icon="account-check-outline" />
            <Text style={styles.introTitle}>创建你的读者账号</Text>
            <Text style={styles.introText}>完成注册后即可登录并接入书架、预约、通知和个人数据。</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.formCard}>
        <TextField
          label="用户名"
          icon="account-outline"
          value={form.username}
          onChangeText={(value) => setForm((current) => ({ ...current, username: value }))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="请输入用户名"
        />

        <TextField
          label="姓名"
          icon="card-account-details-outline"
          value={form.fullName}
          onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))}
          placeholder="请输入真实姓名"
        />

        <TextField
          label="邮箱"
          icon="email-outline"
          value={form.email}
          onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="请输入邮箱"
        />

        <TextField
          label="密码"
          icon="lock-outline"
          value={form.password}
          onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
          secureTextEntry
          placeholder="请输入密码"
        />

        <TextField
          label="确认密码"
          icon="shield-check-outline"
          value={form.confirmPassword}
          onChangeText={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
          secureTextEntry
          placeholder="请再次输入密码"
        />

        {errorMessage ? <StateText tone="danger">{errorMessage}</StateText> : null}
        {successMessage ? <StateText>{successMessage}</StateText> : null}

        <ActionButton
          label={submitting ? "提交中..." : "注册"}
          icon="account-plus"
          onPress={() => {
            void handleSubmit();
          }}
          disabled={submitting}
        />

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

const styles = StyleSheet.create({
  introCard: {
    gap: spacing.md,
  },
  introRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  introBody: {
    flex: 1,
    gap: spacing.xs,
  },
  introTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  introText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  formCard: {
    gap: spacing.md,
  },
});
