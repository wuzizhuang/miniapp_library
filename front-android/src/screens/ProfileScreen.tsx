import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, ErrorCard, InfoPill, LoginPromptCard } from "../components/Ui";
import type { RootStackParamList } from "../navigation/types";
import { authService } from "../services/auth";
import { getErrorMessage } from "../services/http";
import { userService } from "../services/user";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme";
import type { ApiProfileUpdateDto, ApiUserProfileDto } from "../types/api";
import { emitAppEvent, subscribeAppEvent } from "../utils/events";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, refreshSession } = useAuth();
  const [profile, setProfile] = useState<ApiUserProfileDto | null>(null);
  const [pendingFineTotal, setPendingFineTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<ApiProfileUpdateDto>({
    fullName: "",
    email: "",
    department: "",
    major: "",
    enrollmentYear: undefined,
    interestTags: [],
  });

  async function loadData(isRefresh = false) {
    if (!isRefresh) {
      setLoading(true);
    }

    setErrorMessage("");
    try {
      const [nextProfile, overview] = await Promise.all([
        authService.getMyProfile(),
        userService.getMyOverview(),
      ]);

      setProfile(nextProfile);
      setPendingFineTotal(overview.pendingFineTotal);
      setForm({
        fullName: nextProfile.fullName,
        email: nextProfile.email,
        department: nextProfile.department || "",
        major: nextProfile.major || "",
        enrollmentYear: nextProfile.enrollmentYear,
        interestTags: nextProfile.interestTags ?? [],
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "个人资料加载失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "profile" || event === "overview" || event === "auth") {
        void loadData(true);
      }
    });
  }, [user]);

  async function handleSave() {
    setErrorMessage("");
    setSaving(true);
    try {
      await authService.updateProfile({
        ...form,
        fullName: form.fullName?.trim(),
        email: form.email?.trim(),
      });
      await refreshSession();
      emitAppEvent("profile");
      emitAppEvent("overview");
      await loadData(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "保存失败"));
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <Screen title="个人资料" subtitle="对应 Web 端 `/my/profile` 的个人资料与统计入口。">
        <LoginPromptCard onLogin={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  return (
    <Screen title="个人资料" subtitle="对应 Web 端 `/my/profile` 的资料编辑与概览统计。">
      {loading ? <Card><Text style={styles.helperText}>正在加载个人资料...</Text></Card> : null}
      {!loading && errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadData(true);
          }}
        />
      ) : null}

      {!loading && profile ? (
        <>
          <Card>
            <SectionTitle>账户信息</SectionTitle>
            <Text style={styles.name}>{profile.fullName || profile.username}</Text>
            <View style={styles.badgeRow}>
              <InfoPill label={profile.role} tone="primary" />
              {profile.identityType ? <InfoPill label={profile.identityType} /> : null}
            </View>
            <Text style={styles.helperText}>用户名 {profile.username}</Text>
          </Card>

          <Card>
            <SectionTitle>编辑资料</SectionTitle>
            <TextInput
              value={form.fullName || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))}
              placeholder="姓名"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={form.email || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
              autoCapitalize="none"
              placeholder="邮箱"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={form.department || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, department: value }))}
              placeholder="院系"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={form.major || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, major: value }))}
              placeholder="专业"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={form.enrollmentYear?.toString() || ""}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  enrollmentYear: value ? Number(value) : undefined,
                }))
              }
              keyboardType="numeric"
              placeholder="入学年份"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={(form.interestTags ?? []).join(", ")}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  interestTags: value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="兴趣标签，逗号分隔"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <Text style={styles.helperText}>
              身份类型由管理员统一分配，移动端仅允许编辑个人资料字段。
            </Text>
            <ActionButton
              label={saving ? "保存中..." : "保存资料"}
              onPress={() => {
                void handleSave();
              }}
              disabled={saving}
            />
          </Card>

          <Card>
            <SectionTitle>快捷概览</SectionTitle>
            <Text style={styles.helperText}>待缴罚款总额 ¥{pendingFineTotal.toFixed(2)}</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
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
});
