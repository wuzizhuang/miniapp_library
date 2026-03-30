export function joinText(values: string[], fallback: string): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

export function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

export function formatDate(value?: string): string {
  if (!value) {
    return "--";
  }

  return value.slice(0, 10);
}

