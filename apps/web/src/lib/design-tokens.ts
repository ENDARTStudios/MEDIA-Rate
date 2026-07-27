export const colors = {
  bg: "#09090F",
  cb: "#11111E",
  bd: "#1C1C2E",
  accent: {
    critics: "#38BDF8",
    audience: "#F59E0B",
    indigo: "#818CF8",
  },
  text: {
    primary: "#EDE7DC",
    secondary: "#9CA3AF",
    muted: "#6B7280",
  },
  score: {
    9: "#34D399",
    8: "#38BDF8",
    7: "#818CF8",
    6: "#F59E0B",
    5: "#F97316",
    low: "#EF4444",
  },
  surface: {
    background: "#09090F",
    card: "#11111E",
    elevated: "#1C1C2E",
    overlay: "rgba(9, 9, 15, 0.92)",
    ring: "#818CF8",
    border: "rgba(129,140,248,0.12)",
  },
} as const;

export function scoreColor(score: number): string {
  if (score >= 9) return colors.score[9];
  if (score >= 8) return colors.score[8];
  if (score >= 7) return colors.score[7];
  if (score >= 6) return colors.score[6];
  if (score >= 5) return colors.score[5];
  return colors.score.low;
}

export function scoreLabel(score: number): string {
  if (score >= 9) return "score9";
  if (score >= 8) return "score8";
  if (score >= 7) return "score7";
  if (score >= 6) return "score6";
  if (score >= 5) return "score5";
  return "scoreLow";
}

export const elevation = {
  0: { bg: "#09090F", z: 0, shadow: "none" },
  1: { bg: "#11111E", z: 10, shadow: "0 1px 2px rgba(0,0,0,0.4)" },
  2: { bg: "#11111E", z: 20, shadow: "0 2px 8px rgba(0,0,0,0.5)" },
  3: { bg: "#1C1C2E", z: 30, shadow: "0 4px 16px rgba(0,0,0,0.6), 0 0 1px rgba(129,140,248,0.06)" },
  floating: { bg: "#1C1C2E", z: 40, shadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 1px rgba(129,140,248,0.08)" },
  overlay: { bg: "rgba(9,9,15,0.92)", z: 50, shadow: "none" },
} as const;

export const motion = {
  duration: { instant: 0, fast: 0.15, normal: 0.2, slow: 0.4, page: 0.3, modal: 0.3, tooltip: 0.15, scoreRing: 0.8 },
  easing: {
    default: [0.25, 0.1, 0.25, 1] as const,
    out: [0, 0, 0.2, 1] as const,
    in: [0.4, 0, 1, 1] as const,
    bounce: [0.34, 1.56, 0.64, 1] as const,
    smooth: [0.4, 0, 0.2, 1] as const,
  },
  presets: {
    fadeUp: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
    fadeUpSlow: { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } },
    pageEnter: { initial: { opacity: 0, y: 16, filter: "blur(4px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -16, filter: "blur(4px)" } },
  },
} as const;

export const typography = {
  display: { size: "3.5rem", lineHeight: "1.1", weight: "700", tracking: "-0.02em", font: "'Space Grotesk', sans-serif" },
  h1: { size: "2.5rem", lineHeight: "1.2", weight: "600", tracking: "-0.015em", font: "'Space Grotesk', sans-serif" },
  h2: { size: "2rem", lineHeight: "1.25", weight: "600", tracking: "-0.01em", font: "'Space Grotesk', sans-serif" },
  h3: { size: "1.5rem", lineHeight: "1.3", weight: "600", tracking: "-0.005em", font: "'Space Grotesk', sans-serif" },
  h4: { size: "1.25rem", lineHeight: "1.35", weight: "600", tracking: "0", font: "'Space Grotesk', sans-serif" },
  body: { size: "1rem", lineHeight: "1.6", weight: "400", tracking: "0", font: "'Inter', sans-serif" },
  bodySmall: { size: "0.875rem", lineHeight: "1.5", weight: "400", tracking: "0", font: "'Inter', sans-serif" },
  caption: { size: "0.75rem", lineHeight: "1.4", weight: "400", tracking: "0.01em", font: "'Inter', sans-serif" },
  label: { size: "0.75rem", lineHeight: "1", weight: "500", tracking: "0.05em", font: "'Inter', sans-serif" },
  button: { size: "0.875rem", lineHeight: "1", weight: "600", tracking: "0.01em", font: "'Inter', sans-serif" },
  overline: { size: "0.625rem", lineHeight: "1", weight: "600", tracking: "0.1em", font: "'Inter', sans-serif" },
  score: { size: "4.5rem", lineHeight: "1", weight: "700", tracking: "-0.03em", font: "'Space Grotesk', sans-serif" },
} as const;

export const spacing = {
  xs: "0.25rem", sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.5rem", "2xl": "2rem", "3xl": "3rem", "4xl": "4rem",
} as const;

export const blur = { none: "0px", sm: "4px", md: "8px", lg: "16px", xl: "24px" } as const;

export const focus = { ring: "2px", offset: "2px", color: "#818CF8" } as const;

export const opacity = { hover: 0.85, disabled: 0.4, overlay: 0.5 } as const;

export const zIndex = { base: 0, dropdown: 10, sticky: 20, drawer: 30, modal: 40, popover: 50, tooltip: 60, toast: 70 } as const;

export const surface = {
  background: "#09090F",
  card: "#11111E",
  elevated: "#1C1C2E",
  overlay: "rgba(9, 9, 15, 0.92)",
  ring: focus.color,
  border: "rgba(129,140,248,0.12)",
} as const;

export const text = { primary: "#EDE7DC", secondary: "#9CA3AF", muted: "#6B7280", inverse: "#09090F" } as const;
export const score = { 9: "#34D399", 8: "#38BDF8", 7: "#818CF8", 6: "#F59E0B", 5: "#F97316", low: "#EF4444" } as const;
export const fonts = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', 'Fira Code', monospace" } as const;
export const shadows = { card: elevation[1].shadow, elevated: elevation[2].shadow, modal: elevation.floating.shadow } as const;
export const radii = { sm: "0.375rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" } as const;
export const transitions = { fast: "150ms ease", base: "200ms ease", slow: "400ms ease" } as const;
export const breakpoints = { xs: "360px", sm: "640px", md: "768px", lg: "1024px", xl: "1440px" } as const;
