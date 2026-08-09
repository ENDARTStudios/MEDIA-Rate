export const colors = {
  bg: "#05050A",
  cb: "#12121C",
  ce: "#1B1B2C",
  bd: "#2A2A3D",
  accent: {
    critics: "#38BDF8",
    audience: "#E11D48",
    brand: "#E11D48",
    indigo: "#818CF8",
    sky: "#38BDF8",
    emerald: "#34D399",
    amber: "#FBBF24",
    pink: "#F472B6",
    violet: "#A78BFA",
  },
  text: {
    primary: "#F5F5F7",
    secondary: "#A0A0B8",
    // D-203 define #6B6B85; Ajuste AA: #80809B (5.3:1 sobre #05050A) —
    // o valor original (3.99:1) falha WCAG AA para texto normal.
    muted: "#80809B",
  },
  score: {
    9: "#34D399",
    8: "#38BDF8",
    7: "#818CF8",
    6: "#F59E0B",
    5: "#F97316",
    low: "#F87171",
    high: "#34D399",
    medium: "#FBBF24",
  },
  media: {
    movie: "#818CF8",
    series: "#38BDF8",
    game: "#34D399",
    book: "#FBBF24",
    comic: "#F472B6",
    manga: "#A78BFA",
  },
  surface: {
    background: "#05050A",
    card: "#12121C",
    elevated: "#1B1B2C",
    overlay: "rgba(5, 5, 10, 0.92)",
    ring: "#818CF8",
    border: "#2A2A3D",
  },
} as const;

export function scoreColor(score: number, scale: "0-10" | "0-100" = "0-10"): string {
  const n = scale === "0-100" ? score / 10 : score;
  if (n >= 9) return colors.score[9];
  if (n >= 8) return colors.score[8];
  if (n >= 7) return colors.score[7];
  if (n >= 6) return colors.score[6];
  if (n >= 5) return colors.score[5];
  return colors.score.low;
}

export function scoreLabel(score: number, scale: "0-10" | "0-100" = "0-10"): string {
  const n = scale === "0-100" ? score / 10 : score;
  if (n >= 9) return "score9";
  if (n >= 8) return "score8";
  if (n >= 7) return "score7";
  if (n >= 6) return "score6";
  if (n >= 5) return "score5";
  return "scoreLow";
}

export const elevation = {
  0: { bg: "#05050A", z: 0, shadow: "none" },
  1: { bg: "#12121C", z: 10, shadow: "0 1px 2px rgba(0,0,0,0.4)" },
  2: { bg: "#12121C", z: 20, shadow: "0 2px 8px rgba(0,0,0,0.5)" },
  3: { bg: "#1B1B2C", z: 30, shadow: "0 4px 16px rgba(0,0,0,0.6), 0 0 1px rgba(129,140,248,0.06)" },
  floating: {
    bg: "#1B1B2C",
    z: 40,
    shadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 1px rgba(129,140,248,0.08)",
  },
  overlay: { bg: "rgba(5,5,10,0.92)", z: 50, shadow: "none" },
} as const;

export const motion = {
  duration: {
    instant: 0,
    fast: 0.15,
    normal: 0.2,
    slow: 0.4,
    page: 0.3,
    modal: 0.3,
    tooltip: 0.15,
    scoreRing: 0.8,
  },
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
    pageEnter: {
      initial: { opacity: 0, y: 16, filter: "blur(4px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      exit: { opacity: 0, y: -16, filter: "blur(4px)" },
    },
  },
} as const;

export const typography = {
  display: {
    size: "3.5rem",
    lineHeight: "1.1",
    weight: "700",
    tracking: "-0.02em",
    font: "'Space Grotesk', sans-serif",
  },
  h1: {
    size: "2.5rem",
    lineHeight: "1.2",
    weight: "600",
    tracking: "-0.015em",
    font: "'Space Grotesk', sans-serif",
  },
  h2: {
    size: "2rem",
    lineHeight: "1.25",
    weight: "600",
    tracking: "-0.01em",
    font: "'Space Grotesk', sans-serif",
  },
  h3: {
    size: "1.5rem",
    lineHeight: "1.3",
    weight: "600",
    tracking: "-0.005em",
    font: "'Space Grotesk', sans-serif",
  },
  h4: {
    size: "1.25rem",
    lineHeight: "1.35",
    weight: "600",
    tracking: "0",
    font: "'Space Grotesk', sans-serif",
  },
  body: {
    size: "1rem",
    lineHeight: "1.6",
    weight: "400",
    tracking: "0",
    font: "'Inter', sans-serif",
  },
  bodySmall: {
    size: "0.875rem",
    lineHeight: "1.5",
    weight: "400",
    tracking: "0",
    font: "'Inter', sans-serif",
  },
  caption: {
    size: "0.75rem",
    lineHeight: "1.4",
    weight: "400",
    tracking: "0.01em",
    font: "'Inter', sans-serif",
  },
  label: {
    size: "0.75rem",
    lineHeight: "1",
    weight: "500",
    tracking: "0.05em",
    font: "'Inter', sans-serif",
  },
  button: {
    size: "0.875rem",
    lineHeight: "1",
    weight: "600",
    tracking: "0.01em",
    font: "'Inter', sans-serif",
  },
  overline: {
    size: "0.625rem",
    lineHeight: "1",
    weight: "600",
    tracking: "0.1em",
    font: "'Inter', sans-serif",
  },
  score: {
    size: "4.5rem",
    lineHeight: "1",
    weight: "700",
    tracking: "-0.03em",
    font: "'Space Grotesk', sans-serif",
  },
} as const;

export const spacing = {
  "xs": "0.25rem",
  "sm": "0.5rem",
  "md": "0.75rem",
  "lg": "1rem",
  "xl": "1.5rem",
  "2xl": "2rem",
  "3xl": "3rem",
  "4xl": "4rem",
} as const;

export const blur = { none: "0px", sm: "4px", md: "8px", lg: "16px", xl: "24px" } as const;

export const focus = { ring: "2px", offset: "2px", color: "#818CF8" } as const;

export const opacity = { hover: 0.85, disabled: 0.4, overlay: 0.5 } as const;

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  drawer: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  toast: 70,
} as const;

export const surface = {
  background: "#05050A",
  card: "#12121C",
  elevated: "#1B1B2C",
  overlay: "rgba(5, 5, 10, 0.92)",
  ring: focus.color,
  border: "#2A2A3D",
} as const;

export const text = {
  primary: "#F5F5F7",
  secondary: "#A0A0B8",
  muted: "#80809B",
  inverse: "#05050A",
} as const;
export const score = {
  9: "#34D399",
  8: "#38BDF8",
  7: "#818CF8",
  6: "#F59E0B",
  5: "#F97316",
  low: "#F87171",
  high: "#34D399",
  medium: "#FBBF24",
} as const;
export const fonts = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

/**
 * Tokens de categoria (Parte 2.3 da D-203): cor de accent + ícone Lucide
 * por tipo de mídia. Consumidos por CategoryChip/MediaCard/filtros/hero.
 */
import { Clapperboard, Tv, Gamepad2, BookOpen, BookImage, BookMarked } from "lucide-react";
import type { MediaType } from "@/lib/types";

export const CATEGORY_TOKENS: Record<
  MediaType,
  { color: string; icon: typeof Clapperboard; labelKey: string }
> = {
  movie: { color: colors.media.movie, icon: Clapperboard, labelKey: "catalog.filme" },
  series: { color: colors.media.series, icon: Tv, labelKey: "catalog.serie" },
  game: { color: colors.media.game, icon: Gamepad2, labelKey: "catalog.game" },
  book: { color: colors.media.book, icon: BookOpen, labelKey: "catalog.livro" },
  comic: { color: colors.media.comic, icon: BookImage, labelKey: "catalog.comic" },
  manga: { color: colors.media.manga, icon: BookMarked, labelKey: "catalog.manga" },
};
export const shadows = {
  card: elevation[1].shadow,
  elevated: elevation[2].shadow,
  modal: elevation.floating.shadow,
} as const;
export const radii = {
  sm: "0.375rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  full: "9999px",
} as const;
export const transitions = { fast: "150ms ease", base: "200ms ease", slow: "400ms ease" } as const;
export const breakpoints = {
  xs: "360px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1440px",
} as const;
