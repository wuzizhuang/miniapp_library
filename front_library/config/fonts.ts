const fallbackSansFamily = [
  '"Segoe UI"',
  '"PingFang SC"',
  '"Microsoft YaHei"',
  '"Noto Sans SC"',
  "ui-sans-serif",
  "system-ui",
  "sans-serif",
].join(", ");

const fallbackMonoFamily = [
  '"Cascadia Code"',
  '"Fira Code"',
  '"SFMono-Regular"',
  "Consolas",
  '"Liberation Mono"',
  "Menlo",
  "monospace",
].join(", ");

/**
 * 使用本地字体栈，避免 next/font/google 在开发和构建时访问外网。
 */
export const fontSans = {
  variable: "",
  style: {
    fontFamily: fallbackSansFamily,
  },
} as const;

/**
 * 等宽字体同样使用本地回退，保证 Windows 开发环境稳定。
 */
export const fontMono = {
  variable: "",
  style: {
    fontFamily: fallbackMonoFamily,
  },
} as const;
