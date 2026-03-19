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

const Stack = createNativeStackNavigator<RootStackParamList>();

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

export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
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
        <Stack.Screen
          name="BookDetail"
          component={BookDetailScreen}
          options={{ title: "图书详情" }}
        />
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
