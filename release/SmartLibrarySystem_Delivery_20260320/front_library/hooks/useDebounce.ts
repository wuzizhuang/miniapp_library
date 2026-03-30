// hooks/useDebounce.ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // 设定计时器
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理计时器 (如果在 delay 时间内 value 变了，之前的计时器会被取消)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
