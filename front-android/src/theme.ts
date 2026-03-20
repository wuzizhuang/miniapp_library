export const colors = {
  background: "#f5efe7",
  backgroundAccent: "#eadcc7",
  surface: "#fffaf4",
  surfaceAlt: "#f2e9dc",
  surfaceMuted: "#e9ddca",
  surfaceElevated: "#fffdf8",
  border: "#e3d6c2",
  borderStrong: "#d3c0a3",
  text: "#201a14",
  textMuted: "#6e6458",
  textSoft: "#95897b",
  primary: "#157d68",
  primaryDark: "#0d5e50",
  primarySoft: "#dcefe8",
  accent: "#cb8438",
  accentSoft: "#f9ead7",
  danger: "#bd4d42",
  dangerSoft: "#fde2dd",
  successSoft: "#e0f3ea",
  white: "#ffffff",
  shadow: "#1e150c",
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 28,
  xl: 36,
};

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
