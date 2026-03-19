import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, StateText } from "../components/Screen";
import { ActionButton } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, isSigningIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setErrorMessage("");

    try {
      await signIn({
        username: username.trim(),
        password,
      });
      navigation.goBack();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Login failed"));
    }
  }

  return (
    <Screen
      title="登录"
      subtitle="沿用 Web 端的 JWT 登录接口、个人资料接口和登录态恢复策略。"
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <Text style={styles.label}>用户名</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="请输入用户名"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>密码</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="请输入密码"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        {errorMessage ? <StateText tone="danger">{errorMessage}</StateText> : null}

        <ActionButton
          label={isSigningIn ? "登录中..." : "登录"}
          onPress={() => {
            void handleLogin();
          }}
          disabled={isSigningIn}
        />

        <View style={styles.linkRow}>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <Text style={styles.linkText}>注册账号</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.linkText}>找回密码</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={styles.tipTitle}>说明</Text>
        <Text style={styles.tipText}>登录后会自动恢复书架、预约、通知、罚款等读者数据。</Text>
        <Text style={styles.tipText}>Android 模拟器默认后端地址建议使用 `10.0.2.2:8089`。</Text>
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
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  linkText: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  tipTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  tipText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
});
