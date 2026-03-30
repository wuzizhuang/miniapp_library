/**
 * @file 格式化工具函数
 * @description 提供通用的数据格式化辅助函数：
 *   - 文本拼接
 *   - 安全数值转换
 *   - 货币格式化
 *   - 日期格式化
 */

/**
 * 将字符串数组拼接为逗号分隔文本
 * @param values - 字符串数组
 * @param fallback - 数组为空时的默认值
 * @returns 拼接结果或 fallback
 */
export function joinText(values: string[], fallback: string): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

/**
 * 安全地将未知类型转换为数值
 * 如果转换结果不是有限数值，返回 0
 */
export function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 将数值格式化为人民币金额（¥0.00）
 */
export function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

/**
 * 将 ISO 日期时间字符串格式化为日期（YYYY-MM-DD）
 * @param value - ISO 格式的日期时间字符串
 * @returns 格式化的日期字符串，空值返回 "--"
 */
export function formatDate(value?: string): string {
  if (!value) {
    return "--";
  }

  return value.slice(0, 10);
}
