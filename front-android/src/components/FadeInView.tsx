/**
 * @file 淡入动画包裹器
 * @description 子组件挂载时自动执行 opacity 0→1 + translateY 8→0 的淡入动画（200ms）。
 *   用于数据加载完成后的内容渲染，避免页面"突然出现"的生硬切换。
 */

import React, { useEffect, useRef } from "react";
import { Animated, type ViewStyle, type StyleProp } from "react-native";

interface FadeInViewProps {
  children: React.ReactNode;
  /** 动画时长（毫秒），默认 200 */
  duration?: number;
  /** 额外样式 */
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({ children, duration = 200, style }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
