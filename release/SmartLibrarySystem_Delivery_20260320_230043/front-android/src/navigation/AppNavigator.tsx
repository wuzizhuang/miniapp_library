/**
 * @file 根栈导航器
 * @description 应用的顶层导航容器，职责：
 *   1. 设置 NavigationContainer 和自定义主题
 *   2. 注册所有屏幕到 NativeStackNavigator
 *   3. MainTabs 作为默认首屏（底部 Tab 导航器）
 *   4. 其余屏幕通过 push 方式进入
 *
 *   屏幕注册顺序：
 *   - MainTabs（无 header）
 *   - 认证：Login / Register / ForgotPassword
 *   - 功能：BookDetail / Shelf / LoanTracking / Reservations / Fines
 *   - 功能：Notifications / HelpFeedback / Profile
 *   - 功能：Appointments / SeatReservations / Recommendations
 *   - 功能：Reviews / SearchHistory
 */

import React from "react";
import {
  NavigationContainer,
  DefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MainTabs } from "./MainTabs";
import type { MainTabParamList, RootStackParamList } from "./types";
import { colors } from "../theme";
import { AppointmentsScreen } from "../screens/AppointmentsScreen";
import { BookDetailScreen } from "../screens/BookDetailScreen";
import { FinesScreen } from "../screens/FinesScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { HelpFeedbackScreen } from "../screens/HelpFeedbackScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { LoanTrackingScreen } from "../screens/LoanTrackingScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecommendationsScreen } from "../screens/RecommendationsScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { ReservationsScreen } from "../screens/ReservationsScreen";
import { ReviewsScreen } from "../screens/ReviewsScreen";
import { SearchHistoryScreen } from "../screens/SearchHistoryScreen";
import { SeatReservationsScreen } from "../screens/SeatReservationsScreen";
import { ShelfScreen } from "../screens/ShelfScreen";

/** 创建根栈导航器实例 */
const Stack = createNativeStackNavigator<RootStackParamList>();

/** 自定义导航主题（基于应用设计令牌） */
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    primary: colors.primary,
  },
};

/**
 * 应用根导航器组件
 * 包含 NavigationContainer + NativeStackNavigator
 */
export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surfaceElevated,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: "700",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {/* 主页面（底部 Tab 导航器，隐藏顶栏） */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        {/* ── 认证相关屏幕 ── */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "登录" }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: "注册" }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: "找回密码" }}
        />

        {/* ── 图书相关屏幕 ── */}
        <Stack.Screen
          name="BookDetail"
          component={BookDetailScreen}
          options={{ title: "图书详情" }}
        />

        {/* ── 用户功能屏幕 ── */}
        <Stack.Screen
          name="Shelf"
          component={ShelfScreen}
          options={{ title: "我的书架" }}
        />
        <Stack.Screen
          name="LoanTracking"
          component={LoanTrackingScreen}
          options={{ title: "借阅追踪" }}
        />
        <Stack.Screen
          name="Reservations"
          component={ReservationsScreen}
          options={{ title: "我的预约" }}
        />
        <Stack.Screen
          name="Fines"
          component={FinesScreen}
          options={{ title: "我的罚款" }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: "我的通知" }}
        />
        <Stack.Screen
          name="HelpFeedback"
          component={HelpFeedbackScreen}
          options={{ title: "帮助与反馈" }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "个人资料" }}
        />
        <Stack.Screen
          name="Appointments"
          component={AppointmentsScreen}
          options={{ title: "服务预约" }}
        />
        <Stack.Screen
          name="SeatReservations"
          component={SeatReservationsScreen}
          options={{ title: "座位预约" }}
        />
        <Stack.Screen
          name="Recommendations"
          component={RecommendationsScreen}
          options={{ title: "推荐动态" }}
        />
        <Stack.Screen
          name="Reviews"
          component={ReviewsScreen}
          options={{ title: "我的评论" }}
        />
        <Stack.Screen
          name="SearchHistory"
          component={SearchHistoryScreen}
          options={{ title: "搜索历史" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export type { MainTabParamList, RootStackParamList } from "./types";
