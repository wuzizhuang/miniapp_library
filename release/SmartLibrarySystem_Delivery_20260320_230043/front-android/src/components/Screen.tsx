/**
 * @file 屏幕布局组件
 * @description 提供应用的通用屏幕布局和容器组件：
 *
 *   组件清单：
 *   - Screen：页面级布局（SafeArea + ScrollView + Hero 头部）
 *   - Card：通用卡片容器（三种色调：default / tinted / muted）
 *   - SectionTitle：章节标题
 *   - StateText：状态文本（muted / danger 两种语气）
 *
 *   设计特点：
 *   - Screen 组件带有装饰性光晕效果（heroGlow）
 *   - 统一的 "SMART LIBRARY" 品牌标识
 *   - 内置下拉刷新支持
 */

import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing } from "../theme";

/** Screen 组件属性 */
interface ScreenProps extends ScrollViewProps {
  title: string;              // 页面标题
  subtitle?: string;          // 页面副标题
  refreshing?: boolean;       // 是否正在刷新
  onRefresh?: () => void;     // 下拉刷新回调
  children: React.ReactNode;
}

/**
 * 页面级布局组件
 * 提供 SafeAreaView + ScrollView + Hero 头部区域
 * 支持下拉刷新
 */
export function Screen({
  title,
  subtitle,
  refreshing,
  onRefresh,
  children,
  contentContainerStyle,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        {...props}
      >
        {/* Hero 头部区域（带装饰性光晕） */}
        <View style={styles.hero}>
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowAccent} />
          <Text style={styles.eyebrow}>SMART LIBRARY</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 通用卡片容器
 * @param tone - 色调变体：default（浮层白）/ tinted（表面色）/ muted（交替表面）
 */
export function Card({
  children,
  tone = "default",
  style,
}: {
  children: React.ReactNode;
  tone?: "default" | "tinted" | "muted";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.card,
        tone === "tinted" ? styles.cardTinted : undefined,
        tone === "muted" ? styles.cardMuted : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** 章节标题组件 */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/**
 * 状态文本组件
 * @param tone - 语气：muted（灰色）/ danger（红色）
 */
export function StateText({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "danger";
}) {
  return (
    <Text style={tone === "danger" ? styles.stateDanger : styles.stateMuted}>{children}</Text>
  );
}

// ─── 样式定义 ─────────────────────────────────

const styles = StyleSheet.create({
  /** 安全区域容器 */
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /** 内容区域（含底部 Tab Bar 偏移） */
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 72,
    gap: spacing.md,
  },
  /** Hero 头部区域 */
  hero: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    overflow: "hidden",
    ...shadows.card,
  },
  /** 主色调装饰性光晕（右上角） */
  heroGlowPrimary: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    top: -90,
    right: -48,
  },
  /** 强调色装饰性光晕（右下角） */
  heroGlowAccent: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    bottom: -30,
    right: 28,
  },
  /** 品牌标识文字 */
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  /** 页面标题 */
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
  },
  /** 页面副标题 */
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  /** 卡片基础样式 */
  card: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  /** 卡片 tinted 色调 */
  cardTinted: {
    backgroundColor: colors.surface,
  },
  /** 卡片 muted 色调 */
  cardMuted: {
    backgroundColor: colors.surfaceAlt,
  },
  /** 章节标题 */
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  /** 弱化状态文本 */
  stateMuted: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  /** 危险状态文本 */
  stateDanger: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 21,
  },
});
