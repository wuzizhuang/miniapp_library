import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
} from "react-native";

import { colors, radius, spacing } from "../theme";

export function ActionButton({
  label,
  onPress,
  tone = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
}) {
  const styleMap = {
    primary: styles.primaryButton,
    secondary: styles.secondaryButton,
    danger: styles.dangerButton,
    success: styles.successButton,
  } as const;

  const textStyleMap = {
    primary: styles.primaryButtonText,
    secondary: styles.secondaryButtonText,
    danger: styles.primaryButtonText,
    success: styles.primaryButtonText,
  } as const;

  return (
    <Pressable
      style={[styleMap[tone], disabled ? styles.disabledButton : undefined]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={textStyleMap[tone]}>{label}</Text>
    </Pressable>
  );
}

export function InfoPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "primary" | "warning" | "danger" | "success";
}) {
  const toneStyle = {
    neutral: styles.pillNeutral,
    primary: styles.pillPrimary,
    warning: styles.pillWarning,
    danger: styles.pillDanger,
    success: styles.pillSuccess,
  } as const;

  const textToneStyle = {
    neutral: styles.pillTextNeutral,
    primary: styles.pillTextPrimary,
    warning: styles.pillTextWarning,
    danger: styles.pillTextDanger,
    success: styles.pillTextSuccess,
  } as const;

  return (
    <View style={[styles.pill, toneStyle[tone]]}>
      <Text style={[styles.pillText, textToneStyle[tone]]}>{label}</Text>
    </View>
  );
}

export function EmptyCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.messageCard}>
      <Text style={styles.messageTitle}>{title}</Text>
      {description ? <Text style={styles.messageDescription}>{description}</Text> : null}
    </View>
  );
}

export function LoginPromptCard({
  onLogin,
  title = "请先登录",
  description = "登录后即可访问当前页面对应的读者业务。",
}: {
  onLogin: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <View style={styles.messageCard}>
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageDescription}>{description}</Text>
      <ActionButton label="去登录" onPress={onLogin} />
    </View>
  );
}

export function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={[styles.messageCard, styles.errorCard]}>
      <Text style={styles.errorTitle}>加载失败</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? <ActionButton label="重试" onPress={onRetry} tone="secondary" /> : null}
    </View>
  );
}

export function CoverImage({
  title,
  uri,
  style,
}: {
  title: string;
  uri?: string;
  style?: StyleProp<ImageStyle>;
}) {
  if (uri) {
    return <Image source={{ uri }} style={[styles.coverImage, style]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.coverFallback, style]}>
      <Text style={styles.coverFallbackText}>{title.slice(0, 1) || "书"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  successButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pillNeutral: {
    backgroundColor: colors.surfaceAlt,
  },
  pillPrimary: {
    backgroundColor: "#dff4ee",
  },
  pillWarning: {
    backgroundColor: "#fff0d8",
  },
  pillDanger: {
    backgroundColor: "#f8d7d3",
  },
  pillSuccess: {
    backgroundColor: "#dff4ee",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pillTextNeutral: {
    color: colors.text,
  },
  pillTextPrimary: {
    color: colors.primaryDark,
  },
  pillTextWarning: {
    color: colors.accent,
  },
  pillTextDanger: {
    color: colors.danger,
  },
  pillTextSuccess: {
    color: colors.primaryDark,
  },
  messageCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  messageTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  messageDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  errorCard: {
    borderColor: "#efb7ae",
    backgroundColor: "#fff0ed",
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: "800",
  },
  errorMessage: {
    color: colors.danger,
    lineHeight: 21,
  },
  coverImage: {
    width: 64,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  coverFallback: {
    width: 64,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  coverFallbackText: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "800",
  },
});
