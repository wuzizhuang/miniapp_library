/**
 * @file 全局错误边界组件
 * @description 捕获子组件树中的 JS 渲染异常，防止整个 App 崩溃。
 *   在错误发生时展示友好的中文提示 + 重试按钮，替代 Expo 默认的红屏错误。
 */

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radius, spacing } from "../theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * React 类组件实现的错误边界
 * 使用 getDerivedStateFromError + componentDidCatch 生命周期
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary 捕获到异常:", error, info.componentStack);
  }

  /** 重置错误状态，让子组件重新渲染 */
  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={56}
            color={colors.accent}
          />
        </View>
        <Text style={styles.title}>应用出错了</Text>
        <Text style={styles.description}>
          页面遇到了一些问题，请尝试重新加载。{"\n"}如果问题持续，请重启应用。
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed ? styles.retryButtonPressed : undefined,
          ]}
          onPress={this.handleRetry}
        >
          <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>重新加载</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
