/**
 * @file 应用入口组件
 * @description React Native (Expo) 应用的根组件，职责：
 *   1. 引入手势处理库（react-native-gesture-handler，必须在最顶部导入）
 *   2. 提供安全区域上下文（SafeAreaProvider）
 *   3. 注入认证状态管理（AuthProvider）
 *   4. 全局错误边界（ErrorBoundary）：捕获渲染异常，防止白屏
 *   5. 设置状态栏样式
 *   6. 启动期间显示加载指示器，启动完成后渲染导航器
 */

import "react-native-gesture-handler";

import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider, useAuth } from "./src/store/auth";
import { colors } from "./src/theme";

/**
 * 根视图组件
 * 在应用启动引导（bootstrapping）阶段显示加载指示器；
 * 引导完成后渲染主导航器
 */
function Root() {
  const { isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AppNavigator />;
}

/**
 * 应用最外层组件
 * 包裹顺序: SafeAreaProvider → AuthProvider → ErrorBoundary → StatusBar + Root
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ErrorBoundary>
          <StatusBar style="dark" />
          <Root />
        </ErrorBoundary>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

