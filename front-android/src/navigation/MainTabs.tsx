import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { BooksScreen } from "../screens/BooksScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MyScreen } from "../screens/MyScreen";
import { colors } from "../theme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: "Home", tabBarLabel: "首页" }}
      />
      <Tab.Screen
        name="BooksTab"
        component={BooksScreen}
        options={{ title: "Books", tabBarLabel: "图书" }}
      />
      <Tab.Screen
        name="MyTab"
        component={MyScreen}
        options={{ title: "My", tabBarLabel: "我的" }}
      />
    </Tab.Navigator>
  );
}
