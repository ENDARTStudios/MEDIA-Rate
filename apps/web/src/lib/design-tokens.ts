export const colors = {
  primary: {
    50: "#E8EAF1",
    100: "#C5C8DC",
    200: "#9DA1C2",
    300: "#767BA8",
    400: "#565C93",
    500: "#3D4380",
    600: "#2B306A",
    700: "#1D2154",
    800: "#13173E",
    900: "#0F0F23",
    950: "#080812",
    DEFAULT: "#0F0F23",
  },
  secondary: {
    50: "#EDEBF4",
    100: "#D1CEDE",
    200: "#B1ABC4",
    300: "#9188AA",
    400: "#7A7096",
    500: "#635883",
    600: "#514771",
    700: "#3E365E",
    800: "#2D274A",
    900: "#1E1B4B",
    950: "#131031",
    DEFAULT: "#1E1B4B",
  },
  accent: {
    50: "#FFF1F2",
    100: "#FFE4E6",
    200: "#FECDD3",
    300: "#FDA4AF",
    400: "#FB7185",
    500: "#F43F5E",
    600: "#E11D48",
    700: "#BE123C",
    800: "#9F1239",
    900: "#881337",
    950: "#4C0519",
    DEFAULT: "#E11D48",
  },
} as const;

export const surface = {
  background: "#000000",
  card: "#18181B",
  elevated: "#1A1A2E",
  overlay: "rgba(10, 10, 20, 0.9)",
  ring: "#312E81",
  border: "#312E81",
} as const;

export const text = {
  primary: "#F8FAFC",
  secondary: "#94A3B8",
  muted: "#64748B",
  inverse: "#0F0F23",
} as const;

export const score = {
  high: "#22C55E",
  medium: "#EAB308",
  low: "#EF4444",
} as const;

export const fonts = {
  heading: "'Inter', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const shadows = {
  card: "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)",
  elevated: "0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)",
  modal: "0 10px 25px rgba(0,0,0,0.6), 0 4px 10px rgba(0,0,0,0.4)",
  glow:
    "0 0 15px rgba(225, 29, 72, 0.3), 0 0 30px rgba(225, 29, 72, 0.15)",
} as const;

export const radii = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
  full: "9999px",
} as const;

export const transitions = {
  fast: "150ms ease",
  base: "200ms ease",
  slow: "300ms ease",
} as const;

export const breakpoints = {
  xs: "360px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1440px",
} as const;
