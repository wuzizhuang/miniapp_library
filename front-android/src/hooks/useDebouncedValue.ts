/**
 * @file 防抖 Hook
 * @description 对输入值进行防抖处理，延迟指定毫秒后才更新返回值。
 *   常用于搜索输入框，避免每次按键都触发 API 请求。
 */
import { useEffect, useState } from "react";

/**
 * 防抖值 Hook
 * @param value - 需要防抖的原始值
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns 防抖后的值（在 delay 毫秒内无新输入后才更新）
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [delay, value]);

  return debouncedValue;
}
