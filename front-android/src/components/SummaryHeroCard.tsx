/**
 * @file 概要卡片共享组件
 * @description 提供页面顶部的统一概要展示卡片，包含：
 *   - 左侧大图标 + 右侧标题/描述/标签
 *   - 底部指标行（2~3 列 StatCard 等分）
 *
 *   被 ShelfScreen、NotificationsScreen、FinesScreen、ReservationsScreen 等
 *   11 个页面共用，消除重复布局代码。
 */

import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "./Screen";
import { InfoPill } from "./Ui";
import { colors, radius, spacing } from "../theme";

type AppIcon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type PillTone = React.ComponentProps<typeof InfoPill>["tone"];

/** 指标项定义 */
export interface StatItem {
  icon: AppIcon;
  label: string;
  value: string | number;
  /** 指标数值是否使用 danger 红色渲染 */
  danger?: boolean;
}

interface SummaryHeroCardProps {
  /** 左侧大图标 */
  icon: AppIcon;
  /** 图标颜色，默认 primaryDark */
  iconColor?: string;
  /** 图标背景色，默认 primarySoft */
  iconBg?: string;
  /** 分类标签 */
  pill: { label: string; tone?: PillTone; icon?: AppIcon };
  /** 标题 */
  title: string;
  /** 描述文案 */
  description: string;
  /** 底部指标列表（2~3 项） */
  stats: StatItem[];
  /** 额外内容（插入在描述和指标行之间） */
  children?: React.ReactNode;
}

/**
 * 概要 Hero 卡片组件
 *
 * 统一的页面顶部概要展示布局：大图标 + 标题描述 + 指标行。
 * 支持自定义图标颜色和额外子内容插槽。
 */
export function SummaryHeroCard({
  icon,
  iconColor = colors.primaryDark,
  iconBg = colors.primarySoft,
  pill,
  title,
  description,
  stats,
  children,
}: SummaryHeroCardProps) {
  return (
    <Card tone="tinted" style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon} size={26} color={iconColor} />
        </View>
        <View style={styles.body}>
          <InfoPill label={pill.label} tone={pill.tone} icon={pill.icon} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
      {children}
      <View style={styles.statRow}>
        {stats.map((item) => (
          <View key={item.label} style={styles.statCard}>
            <MaterialCommunityIcons
              name={item.icon}
              size={18}
              color={item.danger ? colors.danger : colors.primaryDark}
            />
            <Text
              style={[
                styles.statValue,
                item.danger ? styles.statValueDanger : undefined,
              ]}
            >
              {item.value}
            </Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  description: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: 4,
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "800",
  },
  statValueDanger: {
    color: colors.danger,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
