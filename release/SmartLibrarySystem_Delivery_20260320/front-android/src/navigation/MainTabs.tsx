import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";

import { BooksScreen } from "../screens/BooksScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MyScreen } from "../screens/MyScreen";
import { colors, radius, shadows } from "../theme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabMeta: Record<keyof MainTabParamList, { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = {
  HomeTab: { label: "首页", icon: "home-variant-outline" },
  BooksTab: { label: "图书", icon: "bookshelf" },
  MyTab: { label: "我的", icon: "account-circle-outline" },
};

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

function getFocusedIcon(name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]) {
  if (name === "home-variant-outline") {
    return "home-variant";
  }

  if (name === "account-circle-outline") {
    return "account-circle";
  }

  return name;
}

const styles = StyleSheet.create({
  tabItem: {
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "700",
    paddingBottom: 4,
  },
  iconWrap: {
    width: 42,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
});
