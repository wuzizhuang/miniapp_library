import React, { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen, SectionTitle } from "../components/Screen";
import { ActionButton, ErrorCard, InfoPill, LoginPromptCard, TextField } from "../components/Ui";
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
      {loading ? (
        <Card tone="muted">
          <Text style={styles.helperText}>正在加载个人资料...</Text>
        </Card>
      ) : null}

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
          <Card tone="tinted" style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(profile.fullName || profile.username).slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.heroBody}>
                <Text style={styles.name}>{profile.fullName || profile.username}</Text>
                <Text style={styles.helperText}>用户名 {profile.username}</Text>
                <View style={styles.badgeRow}>
                  <InfoPill label={profile.role} tone="primary" icon="shield-account-outline" />
                  {profile.identityType ? <InfoPill label={profile.identityType} icon="badge-account-outline" /> : null}
                </View>
              </View>
            </View>
            <View style={styles.metricRow}>
              <MetricCard icon="cash" value={`¥${pendingFineTotal.toFixed(2)}`} label="待缴罚款" />
              <MetricCard icon="account-group-outline" value={profile.department || "--"} label="院系" />
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <SectionTitle>编辑资料</SectionTitle>
            <TextField
              label="姓名"
              icon="account-outline"
              value={form.fullName || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))}
              placeholder="姓名"
            />
            <TextField
              label="邮箱"
              icon="email-outline"
              value={form.email || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
              autoCapitalize="none"
              placeholder="邮箱"
            />
            <TextField
              label="院系"
              icon="office-building-outline"
              value={form.department || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, department: value }))}
              placeholder="院系"
            />
            <TextField
              label="专业"
              icon="school-outline"
              value={form.major || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, major: value }))}
              placeholder="专业"
            />
            <TextField
              label="入学年份"
              icon="calendar-range"
              value={form.enrollmentYear?.toString() || ""}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  enrollmentYear: value ? Number(value) : undefined,
                }))
              }
              keyboardType="numeric"
              placeholder="入学年份"
            />
            <TextField
              label="兴趣标签"
              hint="使用逗号分隔多个标签"
              icon="tag-multiple-outline"
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
            />
            <Text style={styles.helperText}>身份类型由管理员统一分配，移动端仅允许编辑个人资料字段。</Text>
            <ActionButton
              label={saving ? "保存中..." : "保存资料"}
              icon="content-save-outline"
              onPress={() => {
                void handleSave();
              }}
              disabled={saving}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function MetricCard({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primaryDark} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "800",
  },
  heroBody: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: 4,
  },
  metricValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sectionCard: {
    gap: spacing.md,
  },
});
