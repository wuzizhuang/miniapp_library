/**
 * @file 底部 Tab 导航器
 * @description 应用的主导航容型，包含三个底部 Tab：
 *   - HomeTab（首页）
 *   - BooksTab（图书目录）
 *   - MyTab（我的）
 *
 *   设计特点：
 *   - 浮动样式 Tab Bar（absolute 定位 + 圆角 + 阴影）
 *   - 选中态图标使用实心版本 + 主色调柔和背景
 *   - 图标自动切换 outline ↔ filled 版本
 */

import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";

import { BooksScreen } from "../screens/BooksScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MyScreen } from "../screens/MyScreen";
import { colors, radius, shadows } from "../theme";
import type { MainTabParamList } from "./types";

/** 创建底部 Tab 导航器实例 */
const Tab = createBottomTabNavigator<MainTabParamList>();

/** Tab 元数据（标签名和图标名） */
const tabMeta: Record<keyof MainTabParamList, { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = {
  HomeTab: { label: "首页", icon: "home-variant-outline" },
  BooksTab: { label: "图书", icon: "bookshelf" },
  MyTab: { label: "我的", icon: "account-circle-outline" },
};

/**
 * 底部 Tab 导航器组件
 * Tab Bar 使用浮动设计（圆角 + 阴影 + absolute 定位）
 */
export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 14,
          height: 72,
          borderTopWidth: 0,
          borderRadius: radius.lg,
          backgroundColor: colors.surfaceElevated,
          ...shadows.floating,
        },
        tabBarIcon: ({ color, focused }) => {
          const meta = tabMeta[route.name];

          return (
            <View style={[styles.iconWrap, focused ? styles.iconWrapActive : undefined]}>
              <MaterialCommunityIcons
                name={focused ? getFocusedIcon(meta.icon) : meta.icon}
                size={22}
                color={focused ? colors.primaryDark : color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: "首页", tabBarLabel: tabMeta.HomeTab.label }}
      />
      <Tab.Screen
        name="BooksTab"
        component={BooksScreen}
        options={{ title: "图书", tabBarLabel: tabMeta.BooksTab.label }}
      />
      <Tab.Screen
        name="MyTab"
        component={MyScreen}
        options={{ title: "我的", tabBarLabel: tabMeta.MyTab.label }}
      />
    </Tab.Navigator>
  );
}

/**
 * 获取选中态图标名称
 * 将 outline 图标映射为 filled 图标
 */
function getFocusedIcon(name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]) {
  if (name === "home-variant-outline") {
    return "home-variant";
  }

  if (name === "account-circle-outline") {
    return "account-circle";
  }

  return name;
}

/** 样式定义 */
const styles = StyleSheet.create({
  /** Tab 项内边距 */
  tabItem: {
    paddingTop: 8,
  },
  /** Tab 标签文字样式 */
  tabLabel: {
    fontSize: 12,
    fontWeight: "700",
    paddingBottom: 4,
  },
  /** 图标容器 */
  iconWrap: {
    width: 42,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 选中态图标容器（主色调柔和背景） */
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
});
