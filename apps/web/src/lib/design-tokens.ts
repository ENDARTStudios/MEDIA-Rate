export const colors = {
  primary: {
    50: "#E8EAF1", 100: "#C5C8DC", 200: "#9DA1C2", 300: "#767BA8",
    400: "#565C93", 500: "#3D4380", 600: "#2B306A", 700: "#1D2154",
    800: "#13173E", 900: "#0F0F23", 950: "#080812", DEFAULT: "#0F0F23",
  },
  secondary: {
    50: "#EDEBF4", 100: "#D1CEDE", 200: "#B1ABC4", 300: "#9188AA",
    400: "#7A7096", 500: "#635883", 600: "#514771", 700: "#3E365E",
    800: "#2D274A", 900: "#1E1B4B", 950: "#131031", DEFAULT: "#1E1B4B",
  },
  accent: {
    50: "#FFF1F2", 100: "#FFE4E6", 200: "#FECDD3", 300: "#FDA4AF",
    400: "#FB7185", 500: "#F43F5E", 600: "#E11D48", 700: "#BE123C",
    800: "#9F1239", 900: "#881337", 950: "#4C0519", DEFAULT: "#E11D48",
  },
} as const;

// ── ELEVATION ────────────────────────────────────────────
export const elevation = {
  0: { bg: "#000000", z: 0, shadow: "none" },
  1: { bg: "#0A0A0F", z: 10, shadow: "0 1px 2px rgba(0,0,0,0.4)" },
  2: { bg: "#12121A", z: 20, shadow: "0 2px 8px rgba(0,0,0,0.5)" },
  3: { bg: "#181825", z: 30, shadow: "0 4px 16px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.06)" },
  floating: { bg: "#1A1A2E", z: 40, shadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.08)" },
  overlay: { bg: "rgba(0,0,0,0.85)", z: 50, shadow: "none" },
} as const;

// ── MOTION TOKENS ────────────────────────────────────────
export const motion = {
  duration: { instant: 0, fast: 0.15, normal: 0.25, slow: 0.4, page: 0.35, modal: 0.3, tooltip: 0.15 },
  easing: {
    default: [0.25, 0.1, 0.25, 1] as const,
    out: [0, 0, 0.2, 1] as const,
    in: [0.4, 0, 1, 1] as const,
    bounce: [0.34, 1.56, 0.64, 1] as const,
    smooth: [0.4, 0, 0.2, 1] as const,
  },
  presets: {
    fadeUp: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } },
    fadeDown: { initial: { opacity: 0, y: -12 }, animate: { opacity: 1, y: 0 } },
    scaleIn: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
    slideRight: { initial: { opacity: 0, x: -16 }, animate: { opacity: 1, x: 0 } },
    pageEnter: { initial: { opacity: 0, y: 16, filter: "blur(4px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -16, filter: "blur(4px)" } },
  },
} as const;

// ── TYPOGRAPHY SCALE ─────────────────────────────────────
export const typography = {
  display: { size: "3.5rem", lineHeight: "1.1", weight: "700", tracking: "-0.02em" },
  h1: { size: "2.5rem", lineHeight: "1.2", weight: "700", tracking: "-0.015em" },
  h2: { size: "2rem", lineHeight: "1.25", weight: "600", tracking: "-0.01em" },
  h3: { size: "1.5rem", lineHeight: "1.3", weight: "600", tracking: "-0.005em" },
  h4: { size: "1.25rem", lineHeight: "1.35", weight: "600", tracking: "0" },
  body: { size: "1rem", lineHeight: "1.6", weight: "400", tracking: "0" },
  bodySmall: { size: "0.875rem", lineHeight: "1.5", weight: "400", tracking: "0" },
  caption: { size: "0.75rem", lineHeight: "1.4", weight: "400", tracking: "0.01em" },
  label: { size: "0.75rem", lineHeight: "1", weight: "600", tracking: "0.05em", transform: "uppercase" },
  button: { size: "0.875rem", lineHeight: "1", weight: "600", tracking: "0.01em" },
  overline: { size: "0.625rem", lineHeight: "1", weight: "700", tracking: "0.1em", transform: "uppercase" },
} as const;

// ── SPACING ──────────────────────────────────────────────
export const spacing = {
  xs: "0.25rem", sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.5rem", "2xl": "2rem", "3xl": "3rem", "4xl": "4rem",
} as const;

// ── BLUR ─────────────────────────────────────────────────
export const blur = { none: "0px", sm: "4px", md: "8px", lg: "16px", xl: "24px" } as const;

// ── GLOW ─────────────────────────────────────────────────
export const glow = {
  accent: "0 0 30px rgba(225,29,72,0.25), 0 0 8px rgba(225,29,72,0.1)",
  primary: "0 0 30px rgba(15,15,35,0.4), 0 0 8px rgba(29,33,84,0.2)",
  score: { high: "0 0 20px rgba(34,197,94,0.3)", medium: "0 0 20px rgba(234,179,8,0.3)", low: "0 0 20px rgba(239,68,68,0.3)" },
} as const;

// ── FOCUS ────────────────────────────────────────────────
export const focus = { ring: "2px", offset: "2px", color: "#312E81" } as const;

// ── OPACITY ──────────────────────────────────────────────
export const opacity = { hover: 0.8, disabled: 0.4, overlay: 0.5, muted: 0.6 } as const;

// ── Z-INDEX ──────────────────────────────────────────────
export const zIndex = { base: 0, dropdown: 10, sticky: 20, drawer: 30, modal: 40, popover: 50, tooltip: 60, toast: 70 } as const;

// ── LEGACY ALIASES (backward compat) ─────────────────────
export const surface = {
  background: elevation[0].bg,
  card: elevation[1].bg,
  elevated: elevation[3].bg,
  overlay: elevation.overlay.bg,
  ring: focus.color,
  border: "#312E81",
} as const;

export const text = { primary: "#F8FAFC", secondary: "#94A3B8", muted: "#64748B", inverse: "#0F0F23" } as const;
export const score = { high: "#22C55E", medium: "#EAB308", low: "#EF4444" } as const;
export const fonts = { heading: "'Inter', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', 'Fira Code', monospace" } as const;
export const shadows = { card: elevation[1].shadow, elevated: elevation[2].shadow, modal: elevation.floating.shadow, glow: glow.accent } as const;
export const radii = { sm: "0.375rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", "2xl": "1.5rem", full: "9999px" } as const;
export const transitions = { fast: "150ms ease", base: "200ms ease", slow: "300ms ease" } as const;
export const breakpoints = { xs: "360px", sm: "640px", md: "768px", lg: "1024px", xl: "1440px" } as const;
