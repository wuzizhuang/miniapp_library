import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageStyle,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { colors, radius, shadows, spacing } from "../theme";

export function ActionButton({
  label,
  onPress,
  tone = "primary",
  disabled = false,
  icon,
  size = "md",
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary" | "danger" | "success" | "ghost";
  disabled?: boolean;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}) {
  const styleMap = {
    primary: styles.primaryButton,
    secondary: styles.secondaryButton,
    danger: styles.dangerButton,
    success: styles.successButton,
    ghost: styles.ghostButton,
  } as const;

  const textStyleMap = {
    primary: styles.primaryButtonText,
    secondary: styles.secondaryButtonText,
    danger: styles.primaryButtonText,
    success: styles.primaryButtonText,
    ghost: styles.ghostButtonText,
  } as const;

  const iconColorMap = {
    primary: colors.white,
    secondary: colors.text,
    danger: colors.white,
    success: colors.white,
    ghost: colors.primaryDark,
  } as const;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.buttonBase,
        size === "sm" ? styles.buttonSm : styles.buttonMd,
        styleMap[tone],
        disabled ? styles.disabledButton : undefined,
        pressed && !disabled ? styles.pressedButton : undefined,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.buttonContent}>
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={size === "sm" ? 16 : 18}
            color={iconColorMap[tone]}
          />
        ) : null}
        <Text style={textStyleMap[tone]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function InfoPill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "primary" | "warning" | "danger" | "success";
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
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
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={14}
          color={StyleSheet.flatten(textToneStyle[tone]).color}
        />
      ) : null}
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
      {onRetry ? <ActionButton label="重试" onPress={onRetry} tone="secondary" icon="refresh" /> : null}
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
      <View style={styles.coverFallbackBadge}>
        <MaterialCommunityIcons name="book-open-variant" size={16} color={colors.primaryDark} />
      </View>
      <Text style={styles.coverFallbackText}>{title.slice(0, 1) || "书"}</Text>
    </View>
  );
}

export function TextField({
  label,
  hint,
  icon,
  containerStyle,
  inputStyle,
  multiline = false,
  numberOfLines,
  ...props
}: TextInputProps & {
  label?: string;
  hint?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps["style"];
}) {
  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <View style={[styles.fieldWrap, multiline ? styles.fieldWrapMultiline : undefined]}>
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={colors.textSoft}
            style={multiline ? styles.fieldIconTop : undefined}
          />
        ) : null}
        <TextInput
          placeholderTextColor={colors.textSoft}
          style={[
            styles.fieldInput,
            multiline ? styles.fieldInputMultiline : undefined,
            inputStyle,
          ]}
          multiline={multiline}
          numberOfLines={numberOfLines}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonMd: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonSm: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    ...shadows.soft,
  },
  successButton: {
    backgroundColor: colors.primaryDark,
    ...shadows.soft,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    ...shadows.soft,
  },
  ghostButton: {
    backgroundColor: colors.primarySoft,
  },
  disabledButton: {
    opacity: 0.6,
  },
  pressedButton: {
    transform: [{ scale: 0.985 }],
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  ghostButtonText: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 15,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  pillNeutral: {
    backgroundColor: colors.surfaceAlt,
  },
  pillPrimary: {
    backgroundColor: colors.primarySoft,
  },
  pillWarning: {
    backgroundColor: colors.accentSoft,
  },
  pillDanger: {
    backgroundColor: colors.dangerSoft,
  },
  pillSuccess: {
    backgroundColor: colors.successSoft,
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
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.card,
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
    backgroundColor: "#fff4f2",
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
    ...shadows.soft,
  },
  coverFallback: {
    width: 64,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    ...shadows.soft,
  },
  coverFallbackBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  coverFallbackText: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "800",
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  fieldWrap: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fieldWrapMultiline: {
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
  },
  fieldIconTop: {
    marginTop: 2,
  },
  fieldInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
  },
  fieldInputMultiline: {
    minHeight: 112,
    textAlignVertical: "top",
  },
});
