/**
 * @file 设计主题令牌
 * @description 定义应用全局的设计系统常量，包括：
 *   - 颜色方案（暖色调米黄系为底，墨绿为主色调）
 *   - 间距尺度（8 → 36）
 *   - 圆角尺度（12 → 36）
 *   - 阴影预设（soft / card / floating 三级）
 *
 *   所有组件和屏幕均通过引用这些令牌来保持视觉一致性。
 */

/** 颜色方案 */
export const colors = {
  background: "#f5efe7",         // 全局背景色（米黄）
  backgroundAccent: "#eadcc7",   // 强调背景
  surface: "#fffaf4",            // 卡片/面板表面色
  surfaceAlt: "#f2e9dc",         // 交替表面色
  surfaceMuted: "#e9ddca",       // 弱化表面色
  surfaceElevated: "#fffdf8",    // 浮层表面色
  border: "#e3d6c2",             // 默认边框色
  borderStrong: "#d3c0a3",       // 强调边框色
  text: "#201a14",               // 主文本色（深棕）
  textMuted: "#6e6458",          // 次级文本色
  textSoft: "#95897b",           // 辅助文本色
  primary: "#157d68",            // 主色调（墨绿）
  primaryDark: "#0d5e50",        // 主色调深色变体
  primarySoft: "#dcefe8",        // 主色调浅色背景
  accent: "#cb8438",             // 强调色（暖橙）
  accentSoft: "#f9ead7",         // 强调色浅色背景
  danger: "#bd4d42",             // 危险/警告色（红）
  dangerSoft: "#fde2dd",         // 危险色浅色背景
  successSoft: "#e0f3ea",        // 成功色浅色背景
  white: "#ffffff",              // 纯白
  shadow: "#1e150c",             // 阴影基色
};

/** 间距尺度（单位：逻辑像素） */
export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

/** 圆角尺度 */
export const radius = {
  sm: 12,
  md: 18,
  lg: 28,
  xl: 36,
};

/**
 * 阴影预设
 * - soft: 轻微浮起（列表项、输入框）
 * - card: 标准卡片阴影
 * - floating: 悬浮组件（FAB、下拉菜单）
 */
export const shadows = {
  soft: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  floating: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};
