/**
 * @file 通用 UI 组件库
 * @description 提供应用复用的基础 UI 组件：
 *
 *   按钮类：
 *   - ActionButton：多语气操作按钮（primary / secondary / danger / success / ghost）
 *
 *   标签类：
 *   - InfoPill：信息胶囊标签（5 种色调）
 *
 *   状态卡片类：
 *   - EmptyCard：空状态提示卡片
 *   - LoginPromptCard：未登录提示卡片（含登录按钮）
 *   - ErrorCard：错误提示卡片（含重试按钮）
 *
 *   图书展示类：
 *   - CoverImage：图书封面图片（含无封面降级展示）
 *
 *   表单类：
 *   - TextField：文本输入框（支持标签、图标、多行）
 */

import React, { useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
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

/**
 * 操作按钮组件
 * @param tone - 按钮语气色调
 * @param size - 尺寸：sm（紧凑）/ md（标准）
 * @param icon - 可选左侧图标名称
 */
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
  /** 按钮背景色映射 */
  const styleMap = {
    primary: styles.primaryButton,
    secondary: styles.secondaryButton,
    danger: styles.dangerButton,
    success: styles.successButton,
    ghost: styles.ghostButton,
  } as const;

  /** 按钮文字色映射 */
  const textStyleMap = {
    primary: styles.primaryButtonText,
    secondary: styles.secondaryButtonText,
    danger: styles.primaryButtonText,
    success: styles.primaryButtonText,
    ghost: styles.ghostButtonText,
  } as const;

  /** 图标色映射 */
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
        pressed && !disabled ? { opacity: 0.85 } : undefined,
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

/**
 * 信息胶囊标签
 * 用于展示状态、分类等简短信息
 * @param tone - 色调：neutral / primary / warning / danger / success
 */
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

/**
 * 可选中的过滤胶囊标签
 * 用于 Tab 切换、分类筛选等场景
 */
export function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active ? styles.filterChipActive : undefined]}
      onPress={onPress}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={active ? colors.white : colors.textMuted}
        />
      ) : null}
      <Text style={active ? styles.filterChipActiveText : styles.filterChipText}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * 加载状态卡片
 * 替代各页面内联的 "正在加载..." 纯文字，统一为 ActivityIndicator + 文本
 */
export function LoadingCard({ message = "正在加载..." }: { message?: string }) {
  return (
    <View style={[styles.messageCard, styles.loadingCard]}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

/** 空状态提示卡片 */
export function EmptyCard({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}) {
  return (
    <View style={styles.messageCard}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons
          name={icon ?? "inbox-outline"}
          size={32}
          color={colors.textSoft}
        />
      </View>
      <Text style={styles.messageTitle}>{title}</Text>
      {description ? <Text style={styles.messageDescription}>{description}</Text> : null}
    </View>
  );
}

/**
 * 未登录提示卡片
 * 包含引导文案和登录按钮
 */
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
      <View style={styles.loginIconWrap}>
        <MaterialCommunityIcons name="shield-account-outline" size={32} color={colors.primaryDark} />
      </View>
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageDescription}>{description}</Text>
      <ActionButton label="去登录" onPress={onLogin} icon="login" />
    </View>
  );
}

/**
 * 错误提示卡片
 * 显示错误信息，可选重试按钮
 */
export function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={[styles.messageCard, styles.errorCard]}>
      <View style={styles.errorIconWrap}>
        <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.danger} />
      </View>
      <Text style={styles.errorTitle}>加载失败</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? <ActionButton label="重试" onPress={onRetry} tone="secondary" icon="refresh" /> : null}
    </View>
  );
}

/**
 * 图书封面图片组件
 * 有封面 URL 时渐显加载图片；无封面时显示首字母降级展示
 */
export function CoverImage({
  title,
  uri,
  style,
}: {
  title: string;
  uri?: string;
  style?: StyleProp<ImageStyle>;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);

  if (uri && !failed) {
    return (
      <View style={[styles.coverImage, style]}>
        {/* 加载占位 */}
        <View style={styles.coverPlaceholder}>
          <MaterialCommunityIcons name="book-open-variant" size={18} color={colors.textSoft} />
        </View>
        <Animated.Image
          source={{ uri }}
          style={[styles.coverImageInner, { opacity: fadeAnim }]}
          resizeMode="cover"
          onLoad={() => {
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  // 无封面降级：显示书名首字 + 图书图标
  return (
    <View style={[styles.coverFallback, style]}>
      <View style={styles.coverFallbackBadge}>
        <MaterialCommunityIcons name="book-open-variant" size={16} color={colors.primaryDark} />
      </View>
      <Text style={styles.coverFallbackText}>{title.slice(0, 1) || "书"}</Text>
    </View>
  );
}

/**
 * 文本输入框组件
 * 支持标签、提示文本、前置图标、多行输入
 */
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

// ─── 样式定义 ─────────────────────────────────

const styles = StyleSheet.create({
  // ── 按钮样式 ──
  /** 按钮基础样式 */
  buttonBase: {
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 标准尺寸 */
  buttonMd: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  /** 紧凑尺寸 */
  buttonSm: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  /** 主色调按钮 */
  primaryButton: {
    backgroundColor: colors.primary,
    ...shadows.soft,
  },
  /** 成功按钮 */
  successButton: {
    backgroundColor: colors.primaryDark,
    ...shadows.soft,
  },
  /** 次级按钮（边框样式） */
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  /** 危险按钮 */
  dangerButton: {
    backgroundColor: colors.danger,
    ...shadows.soft,
  },
  /** 幽灵按钮（柔和背景） */
  ghostButton: {
    backgroundColor: colors.primarySoft,
  },
  /** 禁用态 */
  disabledButton: {
    opacity: 0.6,
  },
  /** 按压态（微缩放反馈） */
  pressedButton: {
    transform: [{ scale: 0.985 }],
  },
  /** 按钮内容布局（图标 + 文字） */
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  /** 主色调按钮文字 */
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  /** 次级按钮文字 */
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  /** 幽灵按钮文字 */
  ghostButtonText: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 15,
  },

  // ── 胶囊标签样式 ──
  /** 胶囊基础样式 */
  pill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  pillNeutral: { backgroundColor: colors.surfaceAlt },
  pillPrimary: { backgroundColor: colors.primarySoft },
  pillWarning: { backgroundColor: colors.accentSoft },
  pillDanger: { backgroundColor: colors.dangerSoft },
  pillSuccess: { backgroundColor: colors.successSoft },
  pillText: { fontSize: 12, fontWeight: "700" },
  pillTextNeutral: { color: colors.text },
  pillTextPrimary: { color: colors.primaryDark },
  pillTextWarning: { color: colors.accent },
  pillTextDanger: { color: colors.danger },
  pillTextSuccess: { color: colors.primaryDark },

  // ── 过滤胶囊标签样式 ──
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  filterChipActiveText: {
    color: colors.white,
    fontWeight: "700",
  },

  // ── 消息卡片样式 ──
  /** 消息卡片基础样式 */
  messageCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
    ...shadows.card,
  },
  messageTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  messageDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  /** 加载卡片 */
  loadingCard: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  /** 空状态图标容器 */
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 登录提示图标容器 */
  loginIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 错误卡片变体 */
  errorCard: {
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  errorIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: "800",
  },
  errorMessage: {
    color: colors.danger,
    lineHeight: 21,
    textAlign: "center",
  },

  // ── 封面图片样式 ──
  /** 封面图片容器 */
  coverImage: {
    width: 64,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    ...shadows.soft,
  },
  /** 封面加载占位 */
  coverPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  /** 封面图片（绝对定位，覆盖占位层） */
  coverImageInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.sm,
  },
  /** 封面降级展示容器 */
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
  /** 封面降级图标徽章 */
  coverFallbackBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 封面降级首字 */
  coverFallbackText: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "800",
  },

  // ── 表单输入框样式 ──
  /** 输入组容器 */
  fieldGroup: {
    gap: 6,
  },
  /** 输入标签 */
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  /** 输入提示 */
  fieldHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  /** 输入框外壳 */
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
  /** 多行输入框外壳 */
  fieldWrapMultiline: {
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
  },
  /** 多行模式下图标顶部对齐 */
  fieldIconTop: {
    marginTop: 2,
  },
  /** 输入框文本 */
  fieldInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
  },
  /** 多行输入框文本 */
  fieldInputMultiline: {
    minHeight: 112,
    textAlignVertical: "top",
  },
});
