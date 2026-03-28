/**
 * @file 登录页面
 * @description 用户登录屏幕，对应 Web 端的 JWT 登录接口。
 *
 *   功能流程：
 *   1. 用户输入用户名和密码
 *   2. 调用 AuthContext.signIn() 进行登录
 *   3. 登录成功后自动 goBack() 返回上一级
 *   4. 登录失败显示错误文案
 *
 *   页面结构：
 *   - 介绍卡片：说明登录后可恢复的数据（书架、预约、通知等）
 *   - 表单卡片：用户名 + 密码 + 登录按钮 + 注册/找回链接
 *   - 环境说明卡片：模拟器后端地址提示
 */

import React, { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, StateText } from "../components/Screen";
import { ActionButton, InfoPill, TextField } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { getErrorMessage } from "../services/http";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, isSigningIn } = useAuth();

  // ── 表单状态 ──
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /** 处理登录提交 */
  async function handleLogin() {
    setErrorMessage("");

    try {
      await signIn({
        username: username.trim(),
        password,
      });
      // 登录成功，返回上一页
      navigation.goBack();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "登录失败"));
    }
  }

  return (
    <Screen
      title="登录"
      subtitle="输入账号密码，开始使用阅读服务"
      keyboardShouldPersistTaps="handled"
    >
      {/* 介绍卡片：登录后可恢复的功能说明 */}
      <Card tone="tinted" style={styles.introCard}>
        <View style={styles.introTop}>
          <View style={styles.introIconWrap}>
            <MaterialCommunityIcons name="shield-account-outline" size={28} color={colors.primaryDark} />
          </View>
          <View style={styles.introBody}>
            <InfoPill label="安全登录" tone="success" icon="check-decagram-outline" />
            <Text style={styles.introTitle}>恢复你的读者空间</Text>
            <Text style={styles.introText}>
              登录后会自动恢复书架、预约、通知、罚款和个人快照，不需要重复配置。
            </Text>
          </View>
        </View>

        {/* 功能亮点列表 */}
        <View style={styles.featureList}>
          <FeatureRow icon="bookmark-box-multiple-outline" text="同步收藏、当前借阅和历史借阅" />
          <FeatureRow icon="bell-badge-outline" text="接收预约到馆、逾期和系统消息提醒" />
        </View>
      </Card>

      {/* 登录表单卡片 */}
      <Card style={styles.formCard}>
        <TextField
          label="用户名"
          icon="account-outline"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="请输入用户名"
          returnKeyType="next"
        />

        <TextField
          label="密码"
          icon="lock-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="请输入密码"
          returnKeyType="done"
        />

        {/* 错误提示 */}
        {errorMessage ? <StateText tone="danger">{errorMessage}</StateText> : null}

        {/* 登录按钮 */}
        <ActionButton
          label={isSigningIn ? "登录中..." : "登录"}
          icon="login"
          onPress={() => {
            void handleLogin();
          }}
          disabled={isSigningIn}
        />

        {/* 底部链接：注册 / 找回密码 */}
        <View style={styles.linkRow}>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <Text style={styles.linkText}>注册账号</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.linkText}>找回密码</Text>
          </Pressable>
        </View>
      </Card>


    </Screen>
  );
}

/** 功能亮点行组件 */
function FeatureRow({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  text: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.primaryDark} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ─── 样式定义 ─────────────────────────────────

const styles = StyleSheet.create({
  introCard: { gap: spacing.md },
  introTop: { flexDirection: "row", gap: spacing.md },
  introIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  introBody: { flex: 1, gap: spacing.xs },
  introTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  introText: { color: colors.textMuted, lineHeight: 22 },
  featureList: { gap: spacing.sm },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, color: colors.text, lineHeight: 20 },
  formCard: { gap: spacing.md },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  linkText: { color: colors.primaryDark, fontWeight: "700" },
  tipTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  tipText: { color: colors.textMuted, lineHeight: 22 },
});
